const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');

const YOOKASSA_API = 'https://api.yookassa.ru/v3/payments';

function buildAuth() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    const err = new Error('YOOKASSA_NOT_CONFIGURED');
    err.statusCode = 503;
    throw err;
  }
  return Buffer.from(`${shopId}:${secretKey}`).toString('base64');
}

router.post('/create', async (req, res) => {
  try {
    const { items, customerName, customerPhone, customerEmail } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    const total = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1), 0);
    if (total <= 0) {
      return res.status(400).json({ error: 'Сумма заказа должна быть больше нуля' });
    }

    // Save order to DB
    const { rows: [order] } = await pool.query(
      `INSERT INTO orders (customer_name, customer_phone, customer_email, total)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [customerName || null, customerPhone || null, customerEmail || null, total]
    );

    for (const item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.id || null, item.name, parseFloat(item.price) || 0, item.quantity || 1]
      );
    }

    // Create payment in YooKassa
    const auth = buildAuth();
    const idempotenceKey = crypto.randomUUID();

    const host = req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol;
    const returnUrl = process.env.RETURN_URL
      || `${proto}://${host}/?order=${order.id}&payment=success`;

    const yooRes = await fetch(YOOKASSA_API, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': idempotenceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: { value: total.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        capture: true,
        description: `Заказ #${order.id}`,
        metadata: { order_id: String(order.id) },
      }),
    });

    if (!yooRes.ok) {
      const errBody = await yooRes.json().catch(() => ({}));
      console.error('YooKassa error:', errBody);
      await pool.query(`DELETE FROM orders WHERE id = $1`, [order.id]);
      return res.status(502).json({ error: 'Ошибка платёжного провайдера', details: errBody });
    }

    const payment = await yooRes.json();

    await pool.query(
      `UPDATE orders SET payment_id = $1 WHERE id = $2`,
      [payment.id, order.id]
    );

    res.json({
      paymentUrl: payment.confirmation.confirmation_url,
      orderId: order.id,
      paymentId: payment.id,
    });
  } catch (err) {
    if (err.message === 'YOOKASSA_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Платёжная система не настроена. Добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в файл .env',
      });
    }
    console.error('Payment create error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Webhook from YooKassa — called when payment status changes
router.post('/webhook', async (req, res) => {
  try {
    const { event, object } = req.body || {};
    if (!event || !object?.id) return res.status(400).json({ error: 'Invalid payload' });

    if (event === 'payment.succeeded') {
      await pool.query(
        `UPDATE orders SET status = 'paid', updated_at = NOW() WHERE payment_id = $1`,
        [object.id]
      );
    } else if (event === 'payment.canceled') {
      await pool.query(
        `UPDATE orders SET status = 'canceled', updated_at = NOW() WHERE payment_id = $1`,
        [object.id]
      );
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// Check order status by order ID
router.get('/order/:orderId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, status, total, customer_name, created_at FROM orders WHERE id = $1`,
      [parseInt(req.params.orderId)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Заказ не найден' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при получении заказа' });
  }
});

module.exports = router;

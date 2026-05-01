const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');

const PRODUCT_QUERY = `
  SELECT
    p.*,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT('id', pi.id, 'filename', pi.filename, 'sort_order', pi.sort_order)
        ORDER BY pi.sort_order
      ) FILTER (WHERE pi.id IS NOT NULL),
      '[]'
    ) AS images,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT('id', pc.id, 'name', pc.name, 'value', pc.value, 'sort_order', pc.sort_order)
        ORDER BY pc.sort_order
      ) FILTER (WHERE pc.id IS NOT NULL),
      '[]'
    ) AS characteristics
  FROM products p
  LEFT JOIN product_images pi ON pi.product_id = p.id
  LEFT JOIN product_characteristics pc ON pc.product_id = p.id
`;

// GET /api/products?page=1&limit=12&search=
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const countParams = search ? [`%${search}%`] : [];
    const countWhere = search ? 'WHERE p.name ILIKE $1' : '';
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM products p ${countWhere}`,
      countParams
    );
    const total = parseInt(countRows[0].count);

    let queryParams, whereClause;
    if (search) {
      queryParams = [limit, offset, `%${search}%`];
      whereClause = 'WHERE p.name ILIKE $3';
    } else {
      queryParams = [limit, offset];
      whereClause = '';
    }

    const { rows: products } = await pool.query(
      `${PRODUCT_QUERY} ${whereClause} GROUP BY p.id ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
      queryParams
    );

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${PRODUCT_QUERY} WHERE p.id = $1 GROUP BY p.id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, description, price, images = [], characteristics = [] } = req.body;

    const { rows } = await client.query(
      'INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING *',
      [name, description, parseFloat(price) || 0]
    );
    const product = rows[0];

    for (let i = 0; i < images.length; i++) {
      await client.query(
        'INSERT INTO product_images (product_id, filename, sort_order) VALUES ($1, $2, $3)',
        [product.id, images[i], i]
      );
    }

    for (let i = 0; i < characteristics.length; i++) {
      const { name: n, value: v } = characteristics[i];
      if (n && n.trim()) {
        await client.query(
          'INSERT INTO product_characteristics (product_id, name, value, sort_order) VALUES ($1, $2, $3, $4)',
          [product.id, n.trim(), v || '', i]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(product);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, description, price, images = [], characteristics = [] } = req.body;
    const { id } = req.params;

    const { rows } = await client.query(
      'UPDATE products SET name=$1, description=$2, price=$3 WHERE id=$4 RETURNING *',
      [name, description, parseFloat(price) || 0, id]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }

    await client.query('DELETE FROM product_images WHERE product_id=$1', [id]);
    for (let i = 0; i < images.length; i++) {
      await client.query(
        'INSERT INTO product_images (product_id, filename, sort_order) VALUES ($1, $2, $3)',
        [id, images[i], i]
      );
    }

    await client.query('DELETE FROM product_characteristics WHERE product_id=$1', [id]);
    for (let i = 0; i < characteristics.length; i++) {
      const { name: n, value: v } = characteristics[i];
      if (n && n.trim()) {
        await client.query(
          'INSERT INTO product_characteristics (product_id, name, value, sort_order) VALUES ($1, $2, $3, $4)',
          [id, n.trim(), v || '', i]
        );
      }
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

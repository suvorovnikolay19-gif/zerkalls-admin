const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');

// Subqueries instead of double JOIN — avoids cartesian product (images × characteristics duplicates)
const IMAGES_SUB = `
  (SELECT COALESCE(JSON_AGG(
    JSON_BUILD_OBJECT('id', pi.id, 'filename', pi.filename, 'sort_order', pi.sort_order)
    ORDER BY pi.sort_order
  ), '[]') FROM product_images pi WHERE pi.product_id = p.id)
`;
const CHARS_SUB = `
  (SELECT COALESCE(JSON_AGG(
    JSON_BUILD_OBJECT('id', pc.id, 'name', pc.name, 'value', pc.value, 'sort_order', pc.sort_order,
      'attribute_id', pc.attribute_id, 'attribute_value_id', pc.attribute_value_id)
    ORDER BY pc.sort_order
  ), '[]') FROM product_characteristics pc WHERE pc.product_id = p.id)
`;

// GET /api/products?page=1&limit=12&search=
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const countParams = search ? [`%${search}%`] : [];
    const countWhere = search ? 'WHERE name ILIKE $1' : '';
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM products ${countWhere}`,
      countParams
    );
    const total = parseInt(countRows[0].count);

    let queryParams, whereClause;
    if (search) {
      queryParams = [`%${search}%`, limit, offset];
      whereClause = 'WHERE p.name ILIKE $1';
    } else {
      queryParams = [limit, offset];
      whereClause = '';
    }
    const limitParam = search ? '$2' : '$1';
    const offsetParam = search ? '$3' : '$2';

    const { rows: products } = await pool.query(
      `SELECT p.*, ${IMAGES_SUB} AS images, ${CHARS_SUB} AS characteristics
       FROM products p
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
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
      `SELECT p.*, ${IMAGES_SUB} AS images, ${CHARS_SUB} AS characteristics
       FROM products p WHERE p.id = $1`,
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
    const { name, description, price, class_id, images = [], characteristics = [] } = req.body;

    const { rows } = await client.query(
      'INSERT INTO products (name, description, price, class_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, parseFloat(price) || 0, class_id || null]
    );
    const product = rows[0];

    for (let i = 0; i < images.length; i++) {
      await client.query(
        'INSERT INTO product_images (product_id, filename, sort_order) VALUES ($1, $2, $3)',
        [product.id, images[i], i]
      );
    }

    for (let i = 0; i < characteristics.length; i++) {
      const { name: n, value: v, attribute_id, attribute_value_id } = characteristics[i];
      if (n && n.trim()) {
        await client.query(
          'INSERT INTO product_characteristics (product_id, name, value, sort_order, attribute_id, attribute_value_id) VALUES ($1, $2, $3, $4, $5, $6)',
          [product.id, n.trim(), v || '', i, attribute_id || null, attribute_value_id || null]
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
    const { name, description, price, class_id, images = [], characteristics = [] } = req.body;
    const { id } = req.params;

    const { rows } = await client.query(
      'UPDATE products SET name=$1, description=$2, price=$3, class_id=$4 WHERE id=$5 RETURNING *',
      [name, description, parseFloat(price) || 0, class_id || null, id]
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
      const { name: n, value: v, attribute_id, attribute_value_id } = characteristics[i];
      if (n && n.trim()) {
        await client.query(
          'INSERT INTO product_characteristics (product_id, name, value, sort_order, attribute_id, attribute_value_id) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, n.trim(), v || '', i, attribute_id || null, attribute_value_id || null]
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

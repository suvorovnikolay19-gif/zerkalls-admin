const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');

// GET /api/mirror-classes — list all with their attributes
router.get('/', async (req, res) => {
  try {
    const { rows: classes } = await pool.query(
      'SELECT * FROM mirror_classes ORDER BY name'
    );
    const { rows: classAttrs } = await pool.query(
      `SELECT mca.class_id, mca.attribute_id, mca.sort_order, a.name AS attr_name
       FROM mirror_class_attributes mca
       JOIN attributes a ON a.id = mca.attribute_id
       ORDER BY mca.class_id, mca.sort_order, a.priority`
    );
    const map = {};
    for (const c of classes) map[c.id] = { ...c, attributes: [] };
    for (const ca of classAttrs) {
      if (map[ca.class_id]) {
        map[ca.class_id].attributes.push({ id: ca.attribute_id, name: ca.attr_name, sort_order: ca.sort_order });
      }
    }
    res.json(Object.values(map));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/mirror-classes
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, attribute_ids = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const { rows } = await client.query(
      'INSERT INTO mirror_classes (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    const cls = rows[0];
    for (let i = 0; i < attribute_ids.length; i++) {
      await client.query(
        'INSERT INTO mirror_class_attributes (class_id, attribute_id, sort_order) VALUES ($1, $2, $3)',
        [cls.id, attribute_ids[i], i]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ ...cls, attributes: [] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/mirror-classes/:id
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, attribute_ids = [] } = req.body;
    const { id } = req.params;
    const { rows } = await client.query(
      'UPDATE mirror_classes SET name=$1 WHERE id=$2 RETURNING *',
      [name.trim(), id]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    await client.query('DELETE FROM mirror_class_attributes WHERE class_id=$1', [id]);
    for (let i = 0; i < attribute_ids.length; i++) {
      await client.query(
        'INSERT INTO mirror_class_attributes (class_id, attribute_id, sort_order) VALUES ($1, $2, $3)',
        [id, attribute_ids[i], i]
      );
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

// DELETE /api/mirror-classes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM mirror_classes WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

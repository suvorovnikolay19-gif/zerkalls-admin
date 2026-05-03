const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');

// GET /api/attributes — list all with their values
router.get('/', async (req, res) => {
  try {
    const { rows: attrs } = await pool.query(
      'SELECT * FROM attributes ORDER BY priority, id'
    );
    const { rows: vals } = await pool.query(
      'SELECT * FROM attribute_values ORDER BY attribute_id, sort_order, id'
    );
    const map = {};
    for (const a of attrs) map[a.id] = { ...a, values: [] };
    for (const v of vals) if (map[v.attribute_id]) map[v.attribute_id].values.push(v);
    res.json(Object.values(map));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/attributes
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const { rows: maxRows } = await pool.query(
      'SELECT COALESCE(MAX(priority), -1) AS mp FROM attributes'
    );
    const priority = maxRows[0].mp + 1;
    const { rows } = await pool.query(
      'INSERT INTO attributes (name, priority) VALUES ($1, $2) RETURNING *',
      [name.trim(), priority]
    );
    res.status(201).json({ ...rows[0], values: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/attributes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM attributes WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/attributes/:id/reorder — swap with neighbor by direction
router.post('/:id/reorder', async (req, res) => {
  const { direction } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: cur } = await client.query('SELECT * FROM attributes WHERE id=$1', [req.params.id]);
    if (!cur[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }

    const q = direction === 'up'
      ? 'SELECT * FROM attributes WHERE priority < $1 ORDER BY priority DESC LIMIT 1'
      : 'SELECT * FROM attributes WHERE priority > $1 ORDER BY priority ASC LIMIT 1';
    const { rows: nbr } = await client.query(q, [cur[0].priority]);

    if (nbr[0]) {
      await client.query('UPDATE attributes SET priority=$1 WHERE id=$2', [nbr[0].priority, cur[0].id]);
      await client.query('UPDATE attributes SET priority=$1 WHERE id=$2', [cur[0].priority, nbr[0].id]);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /api/attributes/:id/values
router.post('/:id/values', async (req, res) => {
  try {
    const { value } = req.body;
    if (!value?.trim()) return res.status(400).json({ error: 'Value required' });
    const { rows: maxRows } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS ms FROM attribute_values WHERE attribute_id=$1',
      [req.params.id]
    );
    const sort_order = maxRows[0].ms + 1;
    const { rows } = await pool.query(
      'INSERT INTO attribute_values (attribute_id, value, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, value.trim(), sort_order]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/attributes/:id/values/:vid
router.delete('/:id/values/:vid', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM attribute_values WHERE id=$1 AND attribute_id=$2',
      [req.params.vid, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

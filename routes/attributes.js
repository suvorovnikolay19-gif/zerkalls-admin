const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');

// GET /api/attributes
router.get('/', async (req, res) => {
  try {
    const { rows: attrs } = await pool.query('SELECT * FROM attributes ORDER BY priority, id');
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
    const { rows: dup } = await pool.query(
      'SELECT id FROM attributes WHERE LOWER(name) = LOWER($1)', [name.trim()]
    );
    if (dup.length) return res.status(409).json({ error: 'Duplicate' });
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

// PUT /api/attributes/:id — rename
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const { rows: dup } = await pool.query(
      'SELECT id FROM attributes WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), req.params.id]
    );
    if (dup.length) return res.status(409).json({ error: 'Duplicate' });
    const { rows } = await pool.query(
      'UPDATE attributes SET name=$1 WHERE id=$2 RETURNING *',
      [name.trim(), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
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

// POST /api/attributes/:id/reorder
router.post('/:id/reorder', async (req, res) => {
  const { direction } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Load full ordered list, then swap positions and reassign sequential priorities
    const { rows: all } = await client.query(
      'SELECT id FROM attributes ORDER BY priority, id'
    );
    const idx = all.findIndex((a) => a.id === parseInt(req.params.id));
    if (idx === -1) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < all.length) {
      [all[idx], all[targetIdx]] = [all[targetIdx], all[idx]];
      for (let i = 0; i < all.length; i++) {
        await client.query('UPDATE attributes SET priority=$1 WHERE id=$2', [i, all[i].id]);
      }
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

// PUT /api/attributes/:id/values/:vid — rename value
router.put('/:id/values/:vid', async (req, res) => {
  try {
    const { value } = req.body;
    if (!value?.trim()) return res.status(400).json({ error: 'Value required' });
    const { rows } = await pool.query(
      'UPDATE attribute_values SET value=$1 WHERE id=$2 AND attribute_id=$3 RETURNING *',
      [value.trim(), req.params.vid, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
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

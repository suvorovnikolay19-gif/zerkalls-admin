const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');

function buildTree(rows, attrId, parentId = null) {
  return rows
    .filter((r) => r.attribute_id === attrId && r.parent_id == parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((r) => ({ ...r, children: buildTree(rows, attrId, r.id) }));
}

// GET /api/attributes
router.get('/', async (req, res) => {
  try {
    const { rows: attrs } = await pool.query('SELECT * FROM attributes ORDER BY priority, id');
    const { rows: vals } = await pool.query('SELECT * FROM attribute_values ORDER BY sort_order, id');
    res.json(attrs.map((a) => ({ ...a, values: buildTree(vals, a.id) })));
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
    const { rows } = await pool.query(
      'INSERT INTO attributes (name, priority) VALUES ($1, $2) RETURNING *',
      [name.trim(), Number(maxRows[0].mp) + 1]
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

// PATCH /api/attributes/:id — toggle strict_values
router.patch('/:id', async (req, res) => {
  try {
    const { strict_values } = req.body;
    const { rows } = await pool.query(
      'UPDATE attributes SET strict_values=$1 WHERE id=$2 RETURNING *',
      [Boolean(strict_values), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
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
    const { rows: all } = await client.query('SELECT id FROM attributes ORDER BY priority, id');
    const targetId = Number(req.params.id);
    const idx = all.findIndex((a) => Number(a.id) === targetId);
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

// POST /api/attributes/:id/values  — parent_id optional for tree
router.post('/:id/values', async (req, res) => {
  try {
    const { value, parent_id } = req.body;
    if (!value?.trim()) return res.status(400).json({ error: 'Value required' });
    const pid = parent_id != null ? Number(parent_id) : null;
    const { rows: maxRows } = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS ms FROM attribute_values
       WHERE attribute_id=$1 AND parent_id IS NOT DISTINCT FROM $2`,
      [req.params.id, pid]
    );
    const { rows } = await pool.query(
      'INSERT INTO attribute_values (attribute_id, value, sort_order, parent_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, value.trim(), Number(maxRows[0].ms) + 1, pid]
    );
    res.status(201).json({ ...rows[0], children: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/attributes/:id/values/:vid
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

// DELETE /api/attributes/:id/values/:vid  — cascades to children via FK
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

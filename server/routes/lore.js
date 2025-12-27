const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET
router.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM lore ORDER BY created_at DESC');
    res.json(result.rows);
});

// POST
router.post('/', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Denegado" });
    const { title, content, category } = req.body;
    const result = await pool.query('INSERT INTO lore (title, content, category) VALUES ($1, $2, $3) RETURNING *', [title, content, category || 'General']);
    res.json({ success: true, lore: result.rows[0] });
});

// PUT
router.put('/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Denegado" });
    const { title, category, content } = req.body;
    const result = await pool.query('UPDATE lore SET title=$1, category=$2, content=$3 WHERE id=$4 RETURNING *', [title, category, content, req.params.id]);
    res.json({ success: true, lore: result.rows[0] });
});

// DELETE
router.delete('/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Denegado" });
    await pool.query('DELETE FROM lore WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

module.exports = router;
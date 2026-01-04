const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isAuth, isAdmin, checkPermission } = require('../middlewares/auth');

// GET - Público, todos pueden leer
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM lore ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST - Requiere permiso para crear
router.post('/', isAuth, checkPermission('edit_lore'), async (req, res) => {
    try {
        const { title, content, category } = req.body;
        const result = await pool.query(
            'INSERT INTO lore (title, content, category) VALUES ($1, $2, $3) RETURNING *', 
            [title, content, category || 'General']
        );
        res.json({ success: true, lore: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT - Requiere permiso para editar
router.put('/:id', isAuth, checkPermission('edit_lore'), async (req, res) => {
    try {
        const { title, category, content } = req.body;
        const result = await pool.query(
            'UPDATE lore SET title=$1, category=$2, content=$3 WHERE id=$4 RETURNING *', 
            [title, category, content, req.params.id]
        );
        res.json({ success: true, lore: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE - Solo admin puede eliminar
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM lore WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
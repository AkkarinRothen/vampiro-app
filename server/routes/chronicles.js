const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Middleware de autenticación
const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: "Acceso denegado. Solo administradores." });
};

// Manejo centralizado de errores de base de datos
const handleDbError = (res, err, message = 'Error en la base de datos') => {
    console.error(message, err);
    return res.status(500).json({ error: message, details: err.message });
};

// ====== RUTAS DE CRÓNICAS ======

// GET todas las crónicas
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM chronicles ORDER BY id DESC'
        );
        return res.json(result.rows);
    } catch (err) {
        return handleDbError(res, err, 'Error al obtener crónicas');
    }
});

// GET una crónica con detalles completos
router.get('/:id', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        
        // Validar ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        // Obtener crónica
        const chronicleResult = await client.query(
            'SELECT * FROM chronicles WHERE id = $1',
            [id]
        );
        
        if (chronicleResult.rows.length === 0) {
            return res.status(404).json({ error: 'Crónica no encontrada' });
        }

        // Obtener personajes asociados
        const charactersResult = await client.query(`
            SELECT c.id, c.name, c.image_url, c.clan 
            FROM characters c 
            INNER JOIN chronicle_characters cc ON c.id = cc.character_id 
            WHERE cc.chronicle_id = $1
            ORDER BY c.name ASC
        `, [id]);
        
        // Obtener secciones
        const sectionsResult = await client.query(
            'SELECT * FROM chronicle_sections WHERE chronicle_id = $1 ORDER BY id ASC',
            [id]
        );

        return res.json({
            info: chronicleResult.rows[0],
            characters: charactersResult.rows,
            sections: sectionsResult.rows
        });
    } catch (err) {
        return handleDbError(res, err, 'Error al obtener detalles de la crónica');
    } finally {
        client.release();
    }
});

// POST crear nueva crónica (Solo Admin)
router.post('/', isAdmin, async (req, res) => {
    try {
        const { title, cover_image } = req.body;
        
        // Validaciones
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'El título es obligatorio' });
        }

        const result = await pool.query(
            'INSERT INTO chronicles (title, cover_image) VALUES ($1, $2) RETURNING *',
            [title.trim(), cover_image || null]
        );
        
        return res.status(201).json({
            success: true,
            chronicle: result.rows[0]
        });
    } catch (err) {
        return handleDbError(res, err, 'Error al crear crónica');
    }
});

// PUT actualizar crónica (Solo Admin)
router.put('/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, cover_image } = req.body;
        
        // Validaciones
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'El título es obligatorio' });
        }

        const result = await pool.query(
            'UPDATE chronicles SET title = $1, cover_image = $2 WHERE id = $3 RETURNING *',
            [title.trim(), cover_image || null, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Crónica no encontrada' });
        }

        return res.json({
            success: true,
            chronicle: result.rows[0]
        });
    } catch (err) {
        return handleDbError(res, err, 'Error al actualizar crónica');
    }
});

// DELETE eliminar crónica (Solo Admin)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const result = await pool.query(
            'DELETE FROM chronicles WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Crónica no encontrada' });
        }

        return res.json({ success: true, message: 'Crónica eliminada' });
    } catch (err) {
        return handleDbError(res, err, 'Error al eliminar crónica');
    }
});

// ====== GESTIÓN DE PERSONAJES EN CRÓNICA ======

// POST agregar personaje a crónica (Solo Admin)
router.post('/:id/join', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { character_id } = req.body;
        
        // Validaciones
        if (!id || isNaN(id) || !character_id || isNaN(character_id)) {
            return res.status(400).json({ error: 'IDs inválidos' });
        }

        await pool.query(
            'INSERT INTO chronicle_characters (chronicle_id, character_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, character_id]
        );
        
        return res.json({ success: true, message: 'Personaje agregado a la crónica' });
    } catch (err) {
        return handleDbError(res, err, 'Error al agregar personaje a la crónica');
    }
});

// DELETE remover personaje de crónica (Solo Admin)
router.delete('/:id/roster/:charId', isAdmin, async (req, res) => {
    try {
        const { id, charId } = req.params;
        
        if (!id || isNaN(id) || !charId || isNaN(charId)) {
            return res.status(400).json({ error: 'IDs inválidos' });
        }

        const result = await pool.query(
            'DELETE FROM chronicle_characters WHERE chronicle_id = $1 AND character_id = $2 RETURNING *',
            [id, charId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Relación no encontrada' });
        }

        return res.json({ success: true, message: 'Personaje removido de la crónica' });
    } catch (err) {
        return handleDbError(res, err, 'Error al remover personaje de la crónica');
    }
});

// ====== SECCIONES (CAPÍTULOS) ======

// POST crear nueva sección (Solo Admin)
router.post('/:id/sections', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, image_url } = req.body;
        
        // Validaciones
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de crónica inválido' });
        }
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'El título de la sección es obligatorio' });
        }

        const result = await pool.query(
            'INSERT INTO chronicle_sections (chronicle_id, title, content, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, title.trim(), content || '', image_url || null]
        );
        
        return res.status(201).json({
            success: true,
            section: result.rows[0]
        });
    } catch (err) {
        return handleDbError(res, err, 'Error al crear sección');
    }
});

// PUT actualizar sección (Solo Admin)
router.put('/sections/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, image_url } = req.body;
        
        // Validaciones
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de sección inválido' });
        }
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'El título de la sección es obligatorio' });
        }

        const result = await pool.query(
            'UPDATE chronicle_sections SET title = $1, content = $2, image_url = $3 WHERE id = $4 RETURNING *',
            [title.trim(), content || '', image_url || null, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sección no encontrada' });
        }

        return res.json({
            success: true,
            section: result.rows[0]
        });
    } catch (err) {
        return handleDbError(res, err, 'Error al actualizar sección');
    }
});

// DELETE eliminar sección (Solo Admin)
router.delete('/sections/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de sección inválido' });
        }

        const result = await pool.query(
            'DELETE FROM chronicle_sections WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sección no encontrada' });
        }

        return res.json({ success: true, message: 'Sección eliminada' });
    } catch (err) {
        return handleDbError(res, err, 'Error al eliminar sección');
    }
});

module.exports = router;
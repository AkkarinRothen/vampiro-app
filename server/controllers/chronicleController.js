// server/controllers/chronicleController.js
const pool = require('../config/db');
const { handleDbError } = require('../utils/errorHandler');

// --- LECTURA ---

const getAll = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM chronicles ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        handleDbError(res, err, 'Error al obtener el listado de crónicas');
    }
};

const getById = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        // Validación básica
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de crónica inválido' });
        }

        // 1. Obtener Info Crónica
        const chronicleResult = await client.query('SELECT * FROM chronicles WHERE id = $1', [id]);
        
        if (chronicleResult.rows.length === 0) {
            return res.status(404).json({ error: 'Crónica no encontrada' });
        }

        // 2. Obtener Personajes (Join)
        const charactersResult = await client.query(`
            SELECT c.id, c.name, c.image_url, c.clan 
            FROM characters c 
            INNER JOIN chronicle_characters cc ON c.id = cc.character_id 
            WHERE cc.chronicle_id = $1
            ORDER BY c.name ASC
        `, [id]);
        
        // 3. Obtener Secciones
        // Nota: Seleccionamos explícitamente las columnas de dimensiones e imagen
        const sectionsResult = await client.query(`
            SELECT id, chronicle_id, title, content, image_url, 
                   image_width, image_height, position, created_at
            FROM chronicle_sections 
            WHERE chronicle_id = $1 
            ORDER BY position ASC, id ASC
        `, [id]);

        return res.json({
            info: chronicleResult.rows[0],
            characters: charactersResult.rows,
            sections: sectionsResult.rows
        });

    } catch (err) {
        handleDbError(res, err, 'Error obteniendo detalles de la crónica');
    } finally {
        client.release();
    }
};

// --- ESCRITURA (ADMIN) ---

const create = async (req, res) => {
    try {
        const { title, cover_image } = req.body;
        
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
        handleDbError(res, err, 'Error al crear la crónica');
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, cover_image } = req.body;
        
        if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        if (!title || title.trim() === '') return res.status(400).json({ error: 'El título es obligatorio' });

        const result = await pool.query(
            'UPDATE chronicles SET title = $1, cover_image = $2 WHERE id = $3 RETURNING *',
            [title.trim(), cover_image || null, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Crónica no encontrada para actualizar' });
        }

        return res.json({
            success: true,
            chronicle: result.rows[0]
        });
    } catch (err) {
        handleDbError(res, err, 'Error al actualizar la crónica');
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        const result = await pool.query(
            'DELETE FROM chronicles WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Crónica no encontrada' });
        }

        return res.json({ success: true, message: 'Crónica eliminada correctamente' });
    } catch (err) {
        handleDbError(res, err, 'Error al eliminar la crónica');
    }
};

// --- GESTIÓN DE PERSONAJES (ROSTER) ---

const addCharacter = async (req, res) => {
    try {
        const { id } = req.params;
        const { character_id } = req.body;
        
        if (!id || isNaN(id) || !character_id || isNaN(character_id)) {
            return res.status(400).json({ error: 'IDs de crónica o personaje inválidos' });
        }

        // ON CONFLICT DO NOTHING evita errores si le dan click dos veces al botón
        await pool.query(
            'INSERT INTO chronicle_characters (chronicle_id, character_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, character_id]
        );
        
        return res.json({ success: true, message: 'Personaje agregado a la crónica' });
    } catch (err) {
        handleDbError(res, err, 'Error al vincular personaje');
    }
};

const removeCharacter = async (req, res) => {
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
            return res.status(404).json({ error: 'El personaje no estaba en esta crónica' });
        }

        return res.json({ success: true, message: 'Personaje removido de la crónica' });
    } catch (err) {
        handleDbError(res, err, 'Error al desvincular personaje');
    }
};

module.exports = {
    getAll,
    getById,
    create,        // <--- ¡Asegúrate que esto esté aquí!
    update,
    remove,
    addCharacter,
    removeCharacter
};
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
        
        // Obtener secciones CON dimensiones de imagen y posición (SIN updated_at)
        const sectionsResult = await client.query(
            `SELECT id, chronicle_id, title, content, image_url, 
                    image_width, image_height, position, created_at
             FROM chronicle_sections 
             WHERE chronicle_id = $1 
             ORDER BY position ASC, id ASC`,
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

// ====== SECCIONES (CAPÍTULOS) - CON REORDENAMIENTO ======

// POST crear nueva sección CON posición automática (Solo Admin)
router.post('/:id/sections', isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { title, content, image_url, image_width, image_height } = req.body;
        
        // Validaciones
        if (!id || isNaN(id)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'ID de crónica inválido' });
        }
        
        if (!title || title.trim() === '') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El título de la sección es obligatorio' });
        }

        // Verificar que la crónica existe
        const chronicleCheck = await client.query(
            'SELECT id FROM chronicles WHERE id = $1',
            [id]
        );
        
        if (chronicleCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Crónica no encontrada' });
        }

        // Obtener la última posición
        const positionResult = await client.query(
            'SELECT COALESCE(MAX(position), 0) as max_position FROM chronicle_sections WHERE chronicle_id = $1',
            [id]
        );
        const nextPosition = positionResult.rows[0].max_position + 1;

        const result = await client.query(
            `INSERT INTO chronicle_sections 
             (chronicle_id, title, content, image_url, image_width, image_height, position) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                id, 
                title.trim(), 
                content || '', 
                image_url || null,
                image_width || '100%',
                image_height || 'auto',
                nextPosition
            ]
        );
        
        await client.query('COMMIT');
        
        return res.status(201).json({
            success: true,
            section: result.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        return handleDbError(res, err, 'Error al crear sección');
    } finally {
        client.release();
    }
});

// PUT actualizar sección CON dimensiones (Solo Admin)
router.put('/sections/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, image_url, image_width, image_height } = req.body;
        
        // Validaciones
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de sección inválido' });
        }
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'El título de la sección es obligatorio' });
        }

        const result = await pool.query(
            `UPDATE chronicle_sections 
             SET title = $1, content = $2, image_url = $3, 
                 image_width = $4, image_height = $5 
             WHERE id = $6 RETURNING *`,
            [
                title.trim(), 
                content || '', 
                image_url || null,
                image_width || '100%',
                image_height || 'auto',
                id
            ]
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

// PUT reordenar secciones (Solo Admin)
router.put('/:id/sections/reorder', isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { sections } = req.body; // Array de { id, position }
        
        if (!id || isNaN(id)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'ID de crónica inválido' });
        }
        
        if (!Array.isArray(sections) || sections.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Se requiere un array de secciones' });
        }

        // Actualizar posición de cada sección
        for (const section of sections) {
            await client.query(
                'UPDATE chronicle_sections SET position = $1 WHERE id = $2 AND chronicle_id = $3',
                [section.position, section.id, id]
            );
        }
        
        await client.query('COMMIT');
        
        return res.json({
            success: true,
            message: 'Secciones reordenadas exitosamente'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        return handleDbError(res, err, 'Error al reordenar secciones');
    } finally {
        client.release();
    }
});

// PUT mover sección arriba (Solo Admin)
router.put('/sections/:id/move-up', isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'ID de sección inválido' });
        }

        // Obtener la sección actual
        const currentSection = await client.query(
            'SELECT * FROM chronicle_sections WHERE id = $1',
            [id]
        );
        
        if (currentSection.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sección no encontrada' });
        }

        const current = currentSection.rows[0];
        
        // Obtener la sección anterior
        const previousSection = await client.query(
            `SELECT * FROM chronicle_sections 
             WHERE chronicle_id = $1 AND position < $2 
             ORDER BY position DESC LIMIT 1`,
            [current.chronicle_id, current.position]
        );
        
        if (previousSection.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'La sección ya está en la primera posición' });
        }

        const previous = previousSection.rows[0];
        
        // Intercambiar posiciones
        await client.query(
            'UPDATE chronicle_sections SET position = $1 WHERE id = $2',
            [previous.position, current.id]
        );
        
        await client.query(
            'UPDATE chronicle_sections SET position = $1 WHERE id = $2',
            [current.position, previous.id]
        );
        
        await client.query('COMMIT');
        
        return res.json({
            success: true,
            message: 'Sección movida hacia arriba'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        return handleDbError(res, err, 'Error al mover sección');
    } finally {
        client.release();
    }
});

// PUT mover sección abajo (Solo Admin)
router.put('/sections/:id/move-down', isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'ID de sección inválido' });
        }

        // Obtener la sección actual
        const currentSection = await client.query(
            'SELECT * FROM chronicle_sections WHERE id = $1',
            [id]
        );
        
        if (currentSection.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sección no encontrada' });
        }

        const current = currentSection.rows[0];
        
        // Obtener la sección siguiente
        const nextSection = await client.query(
            `SELECT * FROM chronicle_sections 
             WHERE chronicle_id = $1 AND position > $2 
             ORDER BY position ASC LIMIT 1`,
            [current.chronicle_id, current.position]
        );
        
        if (nextSection.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'La sección ya está en la última posición' });
        }

        const next = nextSection.rows[0];
        
        // Intercambiar posiciones
        await client.query(
            'UPDATE chronicle_sections SET position = $1 WHERE id = $2',
            [next.position, current.id]
        );
        
        await client.query(
            'UPDATE chronicle_sections SET position = $1 WHERE id = $2',
            [current.position, next.id]
        );
        
        await client.query('COMMIT');
        
        return res.json({
            success: true,
            message: 'Sección movida hacia abajo'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        return handleDbError(res, err, 'Error al mover sección');
    } finally {
        client.release();
    }
});

// DELETE eliminar sección (Solo Admin)
router.delete('/sections/:id', isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'ID de sección inválido' });
        }

        // Obtener información de la sección antes de eliminarla
        const sectionInfo = await client.query(
            'SELECT chronicle_id, position FROM chronicle_sections WHERE id = $1',
            [id]
        );
        
        if (sectionInfo.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sección no encontrada' });
        }

        const { chronicle_id, position } = sectionInfo.rows[0];

        // Eliminar la sección
        await client.query(
            'DELETE FROM chronicle_sections WHERE id = $1',
            [id]
        );

        // Reajustar las posiciones de las secciones posteriores
        await client.query(
            'UPDATE chronicle_sections SET position = position - 1 WHERE chronicle_id = $1 AND position > $2',
            [chronicle_id, position]
        );
        
        await client.query('COMMIT');

        return res.json({ success: true, message: 'Sección eliminada' });
    } catch (err) {
        await client.query('ROLLBACK');
        return handleDbError(res, err, 'Error al eliminar sección');
    } finally {
        client.release();
    }
});

// ====== GLOSARIO (WIKI) ======

router.get('/:id/glossary', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const result = await pool.query(
            'SELECT term, definition FROM glossary_terms WHERE chronicle_id = $1 ORDER BY term ASC',
            [id]
        );
        
        const glossaryObj = {};
        result.rows.forEach(row => {
            glossaryObj[row.term] = row.definition;
        });
        
        res.json(glossaryObj);
    } catch (err) {
        handleDbError(res, err, 'Error obteniendo glosario');
    }
});


// 🛠️ RUTA DE MIGRACIÓN (Ejecutar una vez para actualizar la DB)
router.get('/update-db-schema-full', async (req, res) => {
    try {
        // 1. Agregar columnas a chronicle_sections si no existen
        await pool.query("ALTER TABLE chronicle_sections ADD COLUMN IF NOT EXISTS image_width VARCHAR(20) DEFAULT '100%'");
        await pool.query("ALTER TABLE chronicle_sections ADD COLUMN IF NOT EXISTS image_height VARCHAR(20) DEFAULT 'auto'");
        await pool.query("ALTER TABLE chronicle_sections ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0");
        
        // 2. Crear tabla de glosario si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS glossary_terms (
                id SERIAL PRIMARY KEY,
                chronicle_id INTEGER REFERENCES chronicles(id) ON DELETE CASCADE,
                term VARCHAR(100) NOT NULL,
                definition TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(chronicle_id, term)
            );
        `);

        res.send("<h1>✅ Base de datos actualizada (Schema V2 + Glosario)</h1>");
    } catch (err) {
        res.status(500).send("Error en migración: " + err.message);
    }
});

// ====== GLOSARIO (WIKI) - VERSIÓN CORREGIDA PARA SOPORTE GLOBAL ======

// GET: Obtener términos locales + globales
router.get('/:id/glossary', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Buscamos términos de ESTA crónica (chronicle_id = id)
        // 2. O términos globales (chronicle_id IS NULL)
        const result = await pool.query(`
            SELECT term, definition, chronicle_id 
            FROM glossary_terms 
            WHERE chronicle_id = $1 OR chronicle_id IS NULL
            ORDER BY term ASC
        `, [id]);
        
        const glossaryObj = {};
        result.rows.forEach(row => {
            // Si hay duplicados (ej: local sobrescribe global), el último procesado gana.
            // PostgreSQL no garantiza orden entre ORs sin ORDER BY específico, pero para un objeto simple esto funciona.
            glossaryObj[row.term] = row.definition;
        });
        
        res.json(glossaryObj);
    } catch (err) {
        handleDbError(res, err, 'Error obteniendo glosario');
    }
});

// POST: Crear o Actualizar término (Maneja Globales y Locales correctamente)
router.post('/:id/glossary', isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { term, definition, isGlobal } = req.body; // <--- Recuperamos isGlobal

        if (!term || !definition) {
            return res.status(400).json({ error: "Falta término o definición" });
        }

        // Definir si el destino es la crónica actual o NULL (Global)
        const targetChronicleId = isGlobal ? null : id;

        // Verificamos manualmente si existe para hacer UPDATE o INSERT.
        // Esto es más robusto que ON CONFLICT cuando trabajamos con índices condicionales o NULLs.
        const checkQuery = `
            SELECT id FROM glossary_terms 
            WHERE term = $1 
            AND (chronicle_id = $2 OR (chronicle_id IS NULL AND $2 IS NULL))
        `;
        
        const checkRes = await client.query(checkQuery, [term.trim(), targetChronicleId]);

        if (checkRes.rows.length > 0) {
            // ACTUALIZAR existente
            await client.query(
                `UPDATE glossary_terms SET definition = $1 WHERE id = $2`,
                [definition, checkRes.rows[0].id]
            );
        } else {
            // INSERTAR nuevo
            await client.query(
                `INSERT INTO glossary_terms (chronicle_id, term, definition) VALUES ($1, $2, $3)`,
                [targetChronicleId, term.trim(), definition]
            );
        }

        res.json({ success: true });
    } catch (err) {
        handleDbError(res, err, 'Error guardando término');
    } finally {
        client.release();
    }
});


module.exports = router;
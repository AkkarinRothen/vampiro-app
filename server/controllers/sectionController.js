const pool = require('../config/db');
const { handleDbError } = require('../utils/errorHandler');

/**
 * Crea una nueva sección al final de la lista.
 * Usa transacción para asegurar que la posición calculada sea correcta.
 */
const createSection = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params; // ID de la Crónica
        const { title, content, image_url, image_width, image_height } = req.body;

        // 1. Validaciones
        if (!id || isNaN(id)) {
            throw new Error('ID de crónica inválido');
        }
        if (!title || title.trim() === '') {
            throw new Error('El título de la sección es obligatorio');
        }

        // 2. Verificar existencia de la crónica
        const chronicleCheck = await client.query('SELECT id FROM chronicles WHERE id = $1', [id]);
        if (chronicleCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Crónica no encontrada' });
        }

        // 3. Calcular siguiente posición
        const positionResult = await client.query(
            'SELECT COALESCE(MAX(position), 0) as max_position FROM chronicle_sections WHERE chronicle_id = $1',
            [id]
        );
        const nextPosition = positionResult.rows[0].max_position + 1;

        // 4. Insertar
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
};

/**
 * Actualiza el contenido y apariencia de una sección.
 * No afecta el orden, por lo que no requiere transacción compleja.
 */
const updateSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, image_url, image_width, image_height } = req.body;
        
        if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        if (!title?.trim()) return res.status(400).json({ error: 'Título obligatorio' });

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
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Sección no encontrada' });

        return res.json({ success: true, section: result.rows[0] });

    } catch (err) {
        return handleDbError(res, err, 'Error al actualizar sección');
    }
};

/**
 * Elimina una sección y reajusta (shift) las posiciones de las siguientes.
 */
const deleteSection = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        if (!id || isNaN(id)) throw new Error('ID inválido');

        // 1. Obtener datos antes de borrar para saber qué reordenar
        const sectionInfo = await client.query(
            'SELECT chronicle_id, position FROM chronicle_sections WHERE id = $1', 
            [id]
        );
        
        if (sectionInfo.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sección no encontrada' });
        }

        const { chronicle_id, position } = sectionInfo.rows[0];

        // 2. Eliminar
        await client.query('DELETE FROM chronicle_sections WHERE id = $1', [id]);

        // 3. Reajustar posiciones (restar 1 a todas las que estén después)
        await client.query(
            'UPDATE chronicle_sections SET position = position - 1 WHERE chronicle_id = $1 AND position > $2',
            [chronicle_id, position]
        );
        
        await client.query('COMMIT');
        return res.json({ success: true, message: 'Sección eliminada y orden reajustado' });

    } catch (err) {
        await client.query('ROLLBACK');
        return handleDbError(res, err, 'Error al eliminar sección');
    } finally {
        client.release();
    }
};

/**
 * Reordena masivamente las secciones (Drag & Drop).
 * Recibe un array de objetos { id, position }.
 */
const reorderSections = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params; // ID de la Crónica
        const { sections } = req.body; // Array [{id, position}, ...]
        
        if (!Array.isArray(sections) || sections.length === 0) {
            throw new Error('Se requiere un array de secciones');
        }

        // Actualizar cada sección dentro de la transacción
        for (const section of sections) {
            await client.query(
                'UPDATE chronicle_sections SET position = $1 WHERE id = $2 AND chronicle_id = $3',
                [section.position, section.id, id]
            );
        }
        
        await client.query('COMMIT');
        return res.json({ success: true, message: 'Orden actualizado' });

    } catch (err) {
        await client.query('ROLLBACK');
        return handleDbError(res, err, 'Error al reordenar');
    } finally {
        client.release();
    }
};

/**
 * Mueve una sección una posición hacia ARRIBA (intercambia posición con la anterior).
 */
const moveUp = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params; // ID Sección

        // 1. Obtener sección actual
        const currentRes = await client.query('SELECT * FROM chronicle_sections WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sección no encontrada' });
        }
        const current = currentRes.rows[0];

        // 2. Buscar la sección inmediatamente anterior (misma crónica, posición menor, la más cercana)
        const prevRes = await client.query(
            `SELECT * FROM chronicle_sections 
             WHERE chronicle_id = $1 AND position < $2 
             ORDER BY position DESC LIMIT 1`,
            [current.chronicle_id, current.position]
        );

        if (prevRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Ya es la primera sección' });
        }
        const previous = prevRes.rows[0];

        // 3. Intercambiar posiciones
        // Ponemos temporalmente la anterior en la posición de la actual
        await client.query('UPDATE chronicle_sections SET position = $1 WHERE id = $2', [current.position, previous.id]);
        // Ponemos la actual en la posición de la anterior
        await client.query('UPDATE chronicle_sections SET position = $1 WHERE id = $2', [previous.position, current.id]);
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Sección movida arriba' });

    } catch (err) {
        await client.query('ROLLBACK');
        handleDbError(res, err, 'Error al mover sección');
    } finally {
        client.release();
    }
};

/**
 * Mueve una sección una posición hacia ABAJO (intercambia posición con la siguiente).
 */
const moveDown = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        // 1. Obtener sección actual
        const currentRes = await client.query('SELECT * FROM chronicle_sections WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sección no encontrada' });
        }
        const current = currentRes.rows[0];

        // 2. Buscar la sección inmediatamente siguiente
        const nextRes = await client.query(
            `SELECT * FROM chronicle_sections 
             WHERE chronicle_id = $1 AND position > $2 
             ORDER BY position ASC LIMIT 1`,
            [current.chronicle_id, current.position]
        );

        if (nextRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Ya es la última sección' });
        }
        const next = nextRes.rows[0];

        // 3. Intercambiar posiciones
        await client.query('UPDATE chronicle_sections SET position = $1 WHERE id = $2', [current.position, next.id]);
        await client.query('UPDATE chronicle_sections SET position = $1 WHERE id = $2', [next.position, current.id]);
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Sección movida abajo' });

    } catch (err) {
        await client.query('ROLLBACK');
        handleDbError(res, err, 'Error al mover sección');
    } finally {
        client.release();
    }
};

module.exports = {
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    moveUp,
    moveDown
};
// server/controllers/glossaryController.js
const pool = require('../config/db');
const { handleDbError } = require('../utils/errorHandler');

/**
 * Obtiene el glosario como una LISTA de objetos con ID.
 * Estructura de retorno: [{ id: 1, term: "Camarilla", definition: "...", chronicle_id: null }, ...]
 * Lógica: Si existe un término Global y uno Local con el mismo nombre, el Local tiene prioridad en la lista.
 */
const getGlossary = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validación básica del ID de la crónica
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de crónica inválido' });
        }

        // 1. Buscamos términos de ESTA crónica (chronicle_id = id)
        // 2. O términos globales (chronicle_id IS NULL)
        const result = await pool.query(`
            SELECT id, term, definition, chronicle_id 
            FROM glossary_terms 
            WHERE chronicle_id = $1 OR chronicle_id IS NULL
            ORDER BY term ASC
        `, [id]);
        
        // Usamos un Map para manejar la prioridad (Local > Global)
        const glossaryMap = new Map();

        result.rows.forEach(row => {
            const isLocal = row.chronicle_id == id; // ¿Es específico de esta crónica?
            
            // Si el término no está en el mapa, lo agregamos.
            if (!glossaryMap.has(row.term)) {
                glossaryMap.set(row.term, row);
            } else {
                // Si ya existe, verificamos si debemos sobrescribirlo.
                const existing = glossaryMap.get(row.term);
                
                // Si el que ya teníamos era Global y el nuevo es Local, el Local gana (sobrescribe).
                if (existing.chronicle_id === null && isLocal) {
                    glossaryMap.set(row.term, row);
                }
            }
        });
        
        // Convertimos el mapa a un Array y lo ordenamos alfabéticamente
        const finalArray = Array.from(glossaryMap.values()).sort((a, b) => 
            a.term.localeCompare(b.term, 'es', { sensitivity: 'base' })
        );
        
        res.json(finalArray);

    } catch (err) {
        handleDbError(res, err, 'Error obteniendo el glosario');
    }
};

/**
 * Crea o Actualiza un término.
 * Maneja correctamente si es un término Global (para todas las crónicas) o Local.
 */
const upsertTerm = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { term, definition, isGlobal } = req.body;

        if (!term || !definition) {
            return res.status(400).json({ error: "Falta término o definición" });
        }

        // Definir si el destino es la crónica actual (id) o NULL (Global)
        const targetChronicleId = isGlobal ? null : id;
        const normalizedTerm = term.trim();

        // Verificamos manualmente si existe para decidir entre UPDATE o INSERT.
        // Buscamos coincidencia exacta por Nombre + (Crónica ID o Null)
        const checkQuery = `
            SELECT id FROM glossary_terms 
            WHERE term = $1 
            AND (chronicle_id = $2 OR (chronicle_id IS NULL AND $2 IS NULL))
        `;
        
        const checkRes = await client.query(checkQuery, [normalizedTerm, targetChronicleId]);

        if (checkRes.rows.length > 0) {
            // UPDATE: El término ya existe en este contexto, actualizamos su definición
            await client.query(
                `UPDATE glossary_terms SET definition = $1 WHERE id = $2`,
                [definition, checkRes.rows[0].id]
            );
        } else {
            // INSERT: No existe, lo creamos nuevo
            await client.query(
                `INSERT INTO glossary_terms (chronicle_id, term, definition) VALUES ($1, $2, $3)`,
                [targetChronicleId, normalizedTerm, definition]
            );
        }

        res.json({ success: true, message: "Nota guardada correctamente" });
    } catch (err) {
        handleDbError(res, err, 'Error guardando nota del glosario');
    } finally {
        client.release();
    }
};

/**
 * Elimina un término específico por su ID.
 * Recibe el ID del término en la URL (:termId).
 */
const deleteTerm = async (req, res) => {
    try {
        const { termId } = req.params; 
        
        if (!termId || isNaN(termId)) {
            return res.status(400).json({ error: 'ID de término inválido' });
        }

        const result = await pool.query(
            'DELETE FROM glossary_terms WHERE id = $1 RETURNING id',
            [termId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'La nota no existe o ya fue eliminada' });
        }

        res.json({ success: true, message: 'Nota eliminada correctamente' });
    } catch (err) {
        handleDbError(res, err, 'Error eliminando la nota');
    }
};

module.exports = {
    getGlossary,
    upsertTerm,
    deleteTerm
};
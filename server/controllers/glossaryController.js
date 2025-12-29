// server/controllers/glossaryController.js
const pool = require('../config/db');
const { handleDbError } = require('../utils/errorHandler');

/**
 * Obtiene el glosario combinando términos globales y locales.
 */
const getGlossary = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        // 1. Buscamos términos de ESTA crónica (chronicle_id = id)
        // 2. O términos globales (chronicle_id IS NULL)
        const result = await pool.query(`
            SELECT id, term, definition, chronicle_id 
            FROM glossary_terms 
            WHERE chronicle_id = $1 OR chronicle_id IS NULL
            ORDER BY term ASC
        `, [id]);
        
        const glossaryObj = {};
        
        // Procesamos los resultados. 
        // Si existe un término global "Camarilla" y uno local "Camarilla", 
        // el local debería tener prioridad en la visualización.
        // Como SQL no garantiza el orden perfecto de "Global vs Local" sin lógica compleja,
        // lo manejaremos en JS:
        
        // Primero llenamos con globales
        result.rows.filter(r => r.chronicle_id === null).forEach(row => {
            glossaryObj[row.term] = row.definition;
        });

        // Luego sobrescribimos con locales (si existen)
        result.rows.filter(r => r.chronicle_id !== null).forEach(row => {
            glossaryObj[row.term] = row.definition;
        });
        
        res.json(glossaryObj);
    } catch (err) {
        handleDbError(res, err, 'Error obteniendo el glosario');
    }
};

/**
 * Crea o Actualiza un término.
 * Maneja correctamente la lógica de Globales vs Locales sin depender de ON CONFLICT
 * para evitar errores con índices UNIQUE que contienen NULLs.
 */
const upsertTerm = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { term, definition, isGlobal } = req.body;

        if (!term || !definition) {
            return res.status(400).json({ error: "Falta término o definición" });
        }

        // Definir si el destino es la crónica actual o NULL (Global)
        // NOTA: 'id' viene de la URL, pero si es global lo ignoramos para la DB
        const targetChronicleId = isGlobal ? null : id;
        const normalizedTerm = term.trim();

        // Verificamos manualmente si existe
        // "Busca un ID donde el término sea X Y (la cronica sea Y ó ambas sean NULL)"
        const checkQuery = `
            SELECT id FROM glossary_terms 
            WHERE term = $1 
            AND (chronicle_id = $2 OR (chronicle_id IS NULL AND $2 IS NULL))
        `;
        
        const checkRes = await client.query(checkQuery, [normalizedTerm, targetChronicleId]);

        if (checkRes.rows.length > 0) {
            // UPDATE: Ya existe, actualizamos su definición
            await client.query(
                `UPDATE glossary_terms SET definition = $1 WHERE id = $2`,
                [definition, checkRes.rows[0].id]
            );
        } else {
            // INSERT: No existe, lo creamos
            await client.query(
                `INSERT INTO glossary_terms (chronicle_id, term, definition) VALUES ($1, $2, $3)`,
                [targetChronicleId, normalizedTerm, definition]
            );
        }

        res.json({ success: true, message: "Término guardado correctamente" });
    } catch (err) {
        handleDbError(res, err, 'Error guardando término del glosario');
    } finally {
        client.release();
    }
};

module.exports = { getGlossary, upsertTerm };
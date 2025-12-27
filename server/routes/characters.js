const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const cloudinary = require('../config/cloudinary');

// ==========================================
// MIDDLEWARES
// ==========================================

// 1. Verificar si está logueado
const isAuth = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: "No logueado" });
};

// 2. Verificar si es Admin (NECESARIO PARA LA BÓVEDA)
const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') return next();
    res.status(403).json({ error: "Solo Admin" });
};

// ==========================================
// RUTAS PRINCIPALES
// ==========================================

// GET: Listar Personajes (Con lógica de Bóveda)
router.get('/', async (req, res) => {
    try {
        const isUserAdmin = req.isAuthenticated() && req.user.role === 'admin';
        
        // 1. PCs: Siempre visibles (son los jugadores)
        const pcs = await pool.query("SELECT * FROM characters WHERE type = 'PC' AND is_deleted = false ORDER BY stars DESC, name ASC");
        
        // 2. NPCs: Filtramos según quién pregunta
        let npcQuery = "SELECT * FROM characters WHERE type = 'NPC' AND is_deleted = false";
        
        // Si NO es admin, ocultamos los que tienen is_hidden = true
        if (!isUserAdmin) {
            npcQuery += " AND is_hidden = false";
        }
        
        npcQuery += " ORDER BY name ASC";
        
        const npcs = await pool.query(npcQuery);
        
        res.json({ pcs: pcs.rows, npcs: npcs.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST: Crear Personaje (Soporte Mortales, Ocultos y Cloudinary)
router.post('/', isAuth, async (req, res) => {
    let { 
        name, clan, generation, type, image_url, 
        disciplines, predator_type, 
        is_hidden, creature_type 
    } = req.body;
    
    const created_by = req.user.username;

    try {
        // Subida de imagen a Cloudinary
        if (image_url && image_url.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(image_url, { folder: 'vtm_portal_personajes' });
            image_url = uploadRes.secure_url;
        }

        const disciplinesString = JSON.stringify(disciplines || []);
        
        // Si es humano/ghoul, forzamos generación NULL
        const finalGen = (creature_type === 'human' || creature_type === 'ghoul') ? null : generation;

        const result = await pool.query(
            `INSERT INTO characters 
            (name, clan, generation, type, image_url, created_by, disciplines, predator_type, stars, is_hidden, creature_type) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10) RETURNING *`,
            [name, clan, finalGen, type, image_url, created_by, disciplinesString, predator_type, is_hidden || false, creature_type || 'vampire']
        );
        res.json(result.rows[0]);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Error al crear personaje" }); 
    }
});

// PUT: Editar Personaje
router.put('/:id', isAuth, async (req, res) => {
    const { id } = req.params;
    // Agregamos is_hidden y creature_type aquí también por si quieres editarlo luego
    const { name, clan, generation, type, image_url, disciplines, predator_type, is_hidden, creature_type } = req.body;
    
    // Verificación de propiedad
    const check = await pool.query('SELECT created_by FROM characters WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "No encontrado" });
    if (req.user.role !== 'admin' && check.rows[0].created_by !== req.user.username) {
        return res.status(403).json({ error: "No es tu personaje" });
    }

    try {
        const disciplinesString = JSON.stringify(disciplines || []);
        // Nota: Actualizamos también los campos ocultos si se envían
        const result = await pool.query(
            `UPDATE characters SET name=$1, clan=$2, generation=$3, type=$4, image_url=$5, disciplines=$6, predator_type=$7, is_hidden=$9, creature_type=$10 
             WHERE id=$8 RETURNING *`,
            [name, clan, generation, type, image_url, disciplinesString, predator_type, id, is_hidden, creature_type]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE: Borrado suave
router.delete('/:id', isAuth, async (req, res) => {
    try {
        const check = await pool.query('SELECT created_by FROM characters WHERE id = $1', [req.params.id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "No encontrado" });

        if (req.user.role !== 'admin' && check.rows[0].created_by !== req.user.username) {
            return res.status(403).json({ error: "No autorizado" });
        }

        await pool.query('UPDATE characters SET is_deleted = true WHERE id = $1', [req.params.id]);
        res.json({ message: "Eliminado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// RUTAS DE ADMINISTRADOR
// ==========================================

// PUT: Estrellas (Rango)
router.put('/:id/rate', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('UPDATE characters SET stars = $1 WHERE id = $2 RETURNING *', [req.body.stars, req.params.id]);
        res.json({ success: true, character: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET: Cementerio
router.get('/graveyard', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM characters WHERE is_deleted = true ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT: Restaurar
router.put('/restore/:id', isAdmin, async (req, res) => {
    try {
        await pool.query('UPDATE characters SET is_deleted = false WHERE id = $1', [req.params.id]);
        res.json({ message: "Restaurado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
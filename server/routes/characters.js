const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const cloudinary = require('../config/cloudinary');
const { isAuth, isAdmin, checkPermission } = require('../middlewares/auth');

// ==========================================
// RUTAS PRINCIPALES
// ==========================================

// GET: Listar Personajes (público, todos pueden ver)
router.get('/', async (req, res) => {
    try {
        const isUserAdmin = req.isAuthenticated() && req.user.role === 'admin';
        
        const pcs = await pool.query("SELECT * FROM characters WHERE type = 'PC' AND is_deleted = false ORDER BY stars DESC, name ASC");
        
        let npcQuery = "SELECT * FROM characters WHERE type = 'NPC' AND is_deleted = false";
        if (!isUserAdmin) {
            npcQuery += " AND is_hidden = false";
        }
        npcQuery += " ORDER BY name ASC";
        
        const npcs = await pool.query(npcQuery);
        
        res.json({ pcs: pcs.rows, npcs: npcs.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET: Obtener personaje individual (público)
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM characters WHERE id = $1 AND is_deleted = false', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Personaje no encontrado" });
        }
        
        const character = result.rows[0];
        
        const isUserAdmin = req.isAuthenticated() && req.user.role === 'admin';
        if (character.is_hidden && !isUserAdmin) {
            return res.status(403).json({ error: "Acceso denegado" });
        }
        
        res.json(character);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Crear Personaje - REQUIERE PERMISO
router.post('/', isAuth, checkPermission('create_characters'), async (req, res) => {
    let { 
        name, clan, generation, type, image_url, 
        predator_type, is_hidden, creature_type,
        player_name,
        sire, age, apparent_age, date_of_birth, date_of_embrace,
        ambition, desire, chronicle_tenets, touchstone, convictions,
        humanity, health, willpower, blood_potency,
        attributes, skills, disciplines, advantages,
        resonance, hunger, appearance, personality, background, notes,
        ban_attributes, total_experience, spent_experience
    } = req.body;
    
    const created_by = req.user.username;

    try {
        // Subida de imagen a Cloudinary
        if (image_url && image_url.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(image_url, { folder: 'vtm_portal_personajes' });
            image_url = uploadRes.secure_url;
        }

        const disciplinesString = JSON.stringify(disciplines || []);
        const attributesString = JSON.stringify(attributes || {});
        const skillsString = JSON.stringify(skills || {});
        const advantagesString = JSON.stringify(advantages || []);
        const convictionsString = JSON.stringify(convictions || []);
        
        const finalGen = (creature_type === 'human' || creature_type === 'ghoul') ? null : generation;

        const result = await pool.query(
            `INSERT INTO characters 
            (name, clan, generation, type, image_url, created_by, predator_type, 
             stars, is_hidden, creature_type, player_name,
             sire, age, apparent_age, date_of_birth, date_of_embrace,
             ambition, desire, chronicle_tenets, touchstone, convictions,
             humanity, health, willpower, blood_potency,
             attributes, skills, disciplines, advantages, 
             resonance, hunger, appearance, personality, background, notes,
             ban_attributes, total_experience, spent_experience) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, $11, $12, $13, $14, $15,
                    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
                    $29, $30, $31, $32, $33, $34, $35, $36, $37) 
            RETURNING *`,
            [
                name, clan, finalGen, type, image_url, created_by, predator_type,
                is_hidden || false, creature_type || 'vampire', player_name,
                sire, age, apparent_age, date_of_birth, date_of_embrace,
                ambition, desire, chronicle_tenets, touchstone, convictionsString,
                humanity || 7, health || 0, willpower || 0, blood_potency || 0,
                attributesString, skillsString, disciplinesString, advantagesString,
                resonance, hunger || 1, appearance, personality, background, notes,
                ban_attributes, total_experience || 0, spent_experience || 0
            ]
        );
        res.json(result.rows[0]);
    } catch (err) { 
        console.error('Error creando personaje:', err);
        res.status(500).json({ error: "Error al crear personaje", details: err.message }); 
    }
});

// PUT: Editar Personaje - REQUIERE PERMISO
router.put('/:id', isAuth, checkPermission('edit_characters'), async (req, res) => {
    const { id } = req.params;
    let { 
        name, clan, generation, type, image_url, predator_type, 
        is_hidden, creature_type, player_name,
        sire, age, apparent_age, date_of_birth, date_of_embrace,
        ambition, desire, chronicle_tenets, touchstone, convictions,
        humanity, health, willpower, blood_potency,
        attributes, skills, disciplines, advantages,
        resonance, hunger, appearance, personality, background, notes,
        ban_attributes, total_experience, spent_experience
    } = req.body;
    
    const check = await pool.query('SELECT created_by FROM characters WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "No encontrado" });
    
    // Solo admin o el creador pueden editar
    if (req.user.role !== 'admin' && check.rows[0].created_by !== req.user.username) {
        return res.status(403).json({ error: "No es tu personaje" });
    }

    try {
        const disciplinesString = JSON.stringify(disciplines || []);
        const attributesString = JSON.stringify(attributes || {});
        const skillsString = JSON.stringify(skills || {});
        const advantagesString = JSON.stringify(advantages || []);
        const convictionsString = JSON.stringify(convictions || []);
        
        const toIntOrNull = (val) => {
            if (val === '' || val === null || val === undefined) return null;
            const parsed = parseInt(val);
            return isNaN(parsed) ? null : parsed;
        };
        
        const result = await pool.query(
            `UPDATE characters SET 
                name=$1, clan=$2, generation=$3, type=$4, image_url=$5, predator_type=$6,
                is_hidden=$7, creature_type=$8, player_name=$9,
                sire=$10, age=$11, apparent_age=$12, date_of_birth=$13, date_of_embrace=$14,
                ambition=$15, desire=$16, chronicle_tenets=$17, touchstone=$18, 
                convictions=$19, humanity=$20, health=$21, willpower=$22, blood_potency=$23,
                attributes=$24, skills=$25, disciplines=$26, advantages=$27, 
                resonance=$28, hunger=$29,
                appearance=$30, personality=$31, background=$32, notes=$33,
                ban_attributes=$34, total_experience=$35, spent_experience=$36
             WHERE id=$37 RETURNING *`,
            [
                name || null, clan || null, toIntOrNull(generation), 
                type || 'NPC', image_url || null, predator_type || null,
                is_hidden || false, creature_type || 'vampire', player_name || null,
                sire || null, toIntOrNull(age), toIntOrNull(apparent_age), 
                date_of_birth || null, date_of_embrace || null,
                ambition || null, desire || null, chronicle_tenets || null, 
                touchstone || null, convictionsString, 
                toIntOrNull(humanity) || 7, toIntOrNull(health) || 0, 
                toIntOrNull(willpower) || 0, toIntOrNull(blood_potency) || 0,
                attributesString, skillsString, disciplinesString, advantagesString,
                resonance || null, toIntOrNull(hunger) || 1,
                appearance || null, personality || null, background || null, 
                notes || null, ban_attributes || null, 
                toIntOrNull(total_experience) || 0, toIntOrNull(spent_experience) || 0,
                id
            ]
        );
        res.json(result.rows[0]);
    } catch (err) { 
        console.error('Error actualizando:', err);
        res.status(500).json({ error: err.message }); 
    }
});

// DELETE: Borrado suave - REQUIERE PERMISO
router.delete('/:id', isAuth, checkPermission('delete_characters'), async (req, res) => {
    try {
        const check = await pool.query('SELECT created_by FROM characters WHERE id = $1', [req.params.id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "No encontrado" });

        // Solo admin o el creador pueden eliminar
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

router.put('/:id/rate', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('UPDATE characters SET stars = $1 WHERE id = $2 RETURNING *', [req.body.stars, req.params.id]);
        res.json({ success: true, character: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/graveyard', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM characters WHERE is_deleted = true ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/restore/:id', isAdmin, async (req, res) => {
    try {
        await pool.query('UPDATE characters SET is_deleted = false WHERE id = $1', [req.params.id]);
        res.json({ message: "Restaurado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
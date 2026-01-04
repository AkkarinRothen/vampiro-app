const express = require('express');
const router = express.Router();

// [SEGURIDAD] Importamos el middleware de permisos dinámicos
// checkPermission valida contra la base de datos (tabla role_permissions)
const { checkPermission } = require('../middlewares/auth');

// Importar Controladores
const chronicleCtrl = require('../controllers/chronicleController');
const sectionCtrl = require('../controllers/sectionController');
const glossaryCtrl = require('../controllers/glossaryController');

// ==========================================
// 1. CRÓNICAS: GESTIÓN PRINCIPAL (CRUD)
// ==========================================

// Leer (Público o restringido según prefieras)
router.get('/', chronicleCtrl.getAll);
router.get('/:id', chronicleCtrl.getById);

// Crear y Editar: Requiere permiso 'edit_chronicles'
// Permite a Narradores y Admins crear historias
router.post('/', checkPermission('edit_chronicles'), chronicleCtrl.create);
router.put('/:id', checkPermission('edit_chronicles'), chronicleCtrl.update);

// Eliminar: Requiere permiso ESPECÍFICO 'delete_chronicles'
// Esto es más seguro que usar isAdmin, ya que puedes revocarlo temporalmente
router.delete('/:id', checkPermission('delete_chronicles'), chronicleCtrl.remove);

// ==========================================
// 2. GESTIÓN DE JUGADORES (ROSTER)
// ==========================================
// Vincular personajes a la crónica (PC/NPC)
router.post('/:id/join', checkPermission('edit_chronicles'), chronicleCtrl.addCharacter);

// Expulsar personajes de la crónica
router.delete('/:id/roster/:charId', checkPermission('edit_chronicles'), chronicleCtrl.removeCharacter);

// ==========================================
// 3. GESTIÓN DE CAPÍTULOS (SECCIONES)
// ==========================================
// Crear, Editar y Borrar secciones (texto, imágenes) de la historia
router.post('/:id/sections', checkPermission('edit_chronicles'), sectionCtrl.createSection);
router.put('/sections/:id', checkPermission('edit_chronicles'), sectionCtrl.updateSection);
router.delete('/sections/:id', checkPermission('edit_chronicles'), sectionCtrl.deleteSection);

// Reordenamiento de capítulos (Drag & Drop)
router.put('/:id/sections/reorder', checkPermission('edit_chronicles'), sectionCtrl.reorderSections);
router.put('/sections/:id/move-up', checkPermission('edit_chronicles'), sectionCtrl.moveUp);
router.put('/sections/:id/move-down', checkPermission('edit_chronicles'), sectionCtrl.moveDown);

// ==========================================
// 4. GLOSARIO Y LORE VINCULADO
// ==========================================
// Leer el glosario es público para los jugadores de la crónica
router.get('/:id/glossary', glossaryCtrl.getGlossary);

// Gestión de términos: Usamos 'manage_lore' para mayor granularidad.
// Así un 'Ayudante de Lore' podría editar el glosario sin poder tocar la crónica principal.
router.post('/:id/glossary', checkPermission('manage_lore'), glossaryCtrl.upsertTerm);
router.delete('/:id/glossary/:termId', checkPermission('manage_lore'), glossaryCtrl.deleteTerm);

// ==========================================
// 5. RUTAS DE MANTENIMIENTO
// ==========================================
router.get('/update-db-schema-full', async (req, res) => {
    // Bloqueado por defecto en producción
    res.status(501).json({ 
        message: "Ruta de migración manual deshabilitada por seguridad. Use los scripts del servidor." 
    });
});

module.exports = router;
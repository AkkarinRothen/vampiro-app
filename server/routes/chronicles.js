const express = require('express');
const router = express.Router();

// Importar Middlewares
// Asegúrate de que este archivo existe en server/middlewares/auth.js
const { isAdmin } = require('../middlewares/auth');

// Importar Controladores
const chronicleCtrl = require('../controllers/chronicleController');
const sectionCtrl = require('../controllers/sectionController');
const glossaryCtrl = require('../controllers/glossaryController');

// ==========================================
// RUTAS DE CRÓNICAS (CRUD BÁSICO)
// ==========================================
router.get('/', chronicleCtrl.getAll);
router.get('/:id', chronicleCtrl.getById);
router.post('/', isAdmin, chronicleCtrl.create);
router.put('/:id', isAdmin, chronicleCtrl.update);
router.delete('/:id', isAdmin, chronicleCtrl.remove);

// ==========================================
// GESTIÓN DE PERSONAJES (VINCULACIÓN)
// ==========================================
router.post('/:id/join', isAdmin, chronicleCtrl.addCharacter);
router.delete('/:id/roster/:charId', isAdmin, chronicleCtrl.removeCharacter);

// ==========================================
// SECCIONES / CAPÍTULOS
// ==========================================
// Crear y Editar
router.post('/:id/sections', isAdmin, sectionCtrl.createSection);
router.put('/sections/:id', isAdmin, sectionCtrl.updateSection);
router.delete('/sections/:id', isAdmin, sectionCtrl.deleteSection);

// Reordenamiento
router.put('/:id/sections/reorder', isAdmin, sectionCtrl.reorderSections); // Drag & Drop masivo
router.put('/sections/:id/move-up', isAdmin, sectionCtrl.moveUp);          // Mover uno arriba
router.put('/sections/:id/move-down', isAdmin, sectionCtrl.moveDown);      // Mover uno abajo

// ==========================================
// GLOSARIO / WIKI
// ==========================================
router.get('/:id/glossary', glossaryCtrl.getGlossary);
router.post('/:id/glossary', isAdmin, glossaryCtrl.upsertTerm);
router.delete('/:id/glossary/:termId', isAdmin, glossaryCtrl.deleteTerm);

// ==========================================
// MANTENIMIENTO
// ==========================================
router.get('/update-db-schema-full', async (req, res) => {
    res.status(501).json({ message: "Por favor utiliza el script de migración del servidor." });
});

module.exports = router;
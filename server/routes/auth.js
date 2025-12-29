const express = require('express');
const router = express.Router();
const passport = require('passport');
const authCtrl = require('../controllers/authController');

// Rutas API Principales
router.post('/api/login', authCtrl.login);
router.post('/api/register', authCtrl.register);
router.post('/api/logout', authCtrl.logout);
router.get('/api/current_user', authCtrl.getCurrentUser);
router.get('/api/auth/health', authCtrl.healthCheck);

// Google Auth
router.get('/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
}));

router.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/',
        failureMessage: true 
    }),
    (req, res) => res.redirect('/')
);

// Ruta alternativa GET para logout (compatibilidad)
router.get('/api/logout', (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    });
});

// Ruta de Emergencia
router.get('/emergency-create-admin', authCtrl.createEmergencyAdmin);

module.exports = router;
// server/middlewares/auth.js

/**
 * Verifica si el usuario está logueado.
 */
const isAuth = (req, res, next) => {
    // req.isAuthenticated es inyectado por Passport
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ error: "No autorizado. Por favor inicia sesión." });
};

/**
 * Verifica si el usuario es Administrador.
 */
const isAdmin = (req, res, next) => {
    // Primero verificamos login
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: "Sesión expirada o no iniciada." });
    }

    // Luego verificamos rol
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    return res.status(403).json({ error: "Acceso denegado. Solo administradores." });
};

module.exports = { isAuth, isAdmin };
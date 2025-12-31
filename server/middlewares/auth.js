// server/middlewares/auth.js
const pool = require('../config/db'); // Importamos la conexión a la BD

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

/**
 * Middleware para verificar permisos específicos dinámicamente.
 * Uso: router.post('/crear', checkPermission('create_characters'), controller)
 */
const checkPermission = (permName) => {
    return async (req, res, next) => {
        // 1. Verificar si está logueado (similar a isAuth)
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ error: "No logueado" });
        }
        
        // 2. Los admins siempre tienen acceso (superusuario)
        if (req.user.role === 'admin') {
            return next();
        }

        // 3. Consultar la base de datos para otros roles
        try {
            const result = await pool.query(
                "SELECT is_allowed FROM role_permissions WHERE role = $1 AND permission = $2",
                [req.user.role, permName]
            );

            // Si existe la fila y is_allowed es true -> Pasa
            if (result.rows.length > 0 && result.rows[0].is_allowed) {
                return next();
            } else {
                return res.status(403).json({ error: "No tienes permiso para realizar esta acción." });
            }
        } catch (err) {
            console.error("Error verificando permisos:", err);
            return res.status(500).json({ error: "Error interno verificando permisos" });
        }
    };
};

module.exports = { isAuth, isAdmin, checkPermission };
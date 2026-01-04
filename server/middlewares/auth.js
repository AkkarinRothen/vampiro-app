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
/**
 * Middleware dinámico que permite verificar múltiples permisos
 * Uso: router.post('/crear', checkAnyPermission(['create_characters', 'manage_lore']), controller)
 */
const checkAnyPermission = (permNames = []) => {
    return async (req, res, next) => {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ error: "No logueado" });
        }
        
        // Los admins siempre tienen acceso
        if (req.user.role === 'admin') {
            return next();
        }

        // Si no hay permisos que verificar, denegar por defecto
        if (!Array.isArray(permNames) || permNames.length === 0) {
            return res.status(403).json({ error: "Acceso denegado" });
        }

        try {
            // Verificar si tiene al menos uno de los permisos
            const result = await pool.query(
                `SELECT permission, is_allowed 
                 FROM role_permissions 
                 WHERE role = $1 AND permission = ANY($2::text[])`,
                [req.user.role, permNames]
            );

            const hasPermission = result.rows.some(row => row.is_allowed);

            if (hasPermission) {
                return next();
            } else {
                return res.status(403).json({ 
                    error: "No tienes permiso para realizar esta acción.",
                    required: permNames
                });
            }
        } catch (err) {
            console.error("Error verificando permisos:", err);
            return res.status(500).json({ error: "Error interno verificando permisos" });
        }
    };
};

/**
 * Middleware que requiere TODOS los permisos especificados
 * Uso: router.post('/accion-critica', checkAllPermissions(['edit_chronicles', 'delete_chronicles']), controller)
 */
const checkAllPermissions = (permNames = []) => {
    return async (req, res, next) => {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ error: "No logueado" });
        }
        
        if (req.user.role === 'admin') {
            return next();
        }

        if (!Array.isArray(permNames) || permNames.length === 0) {
            return res.status(403).json({ error: "Acceso denegado" });
        }

        try {
            const result = await pool.query(
                `SELECT permission, is_allowed 
                 FROM role_permissions 
                 WHERE role = $1 AND permission = ANY($2::text[])`,
                [req.user.role, permNames]
            );

            // Verificar que tiene TODOS los permisos y todos están en true
            const hasAllPermissions = permNames.every(perm => 
                result.rows.some(row => row.permission === perm && row.is_allowed)
            );

            if (hasAllPermissions) {
                return next();
            } else {
                return res.status(403).json({ 
                    error: "No tienes todos los permisos requeridos.",
                    required: permNames
                });
            }
        } catch (err) {
            console.error("Error verificando permisos:", err);
            return res.status(500).json({ error: "Error interno verificando permisos" });
        }
    };
};

module.exports = { 
    isAuth, 
    isAdmin, 
    checkPermission,
    checkAnyPermission,
    checkAllPermissions
};
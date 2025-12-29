const bcrypt = require('bcrypt');
const passport = require('passport');
const pool = require('../config/db');

// ==========================================
// VALIDACIONES
// ==========================================
const validateLoginInput = (username, password) => {
    const errors = [];
    if (!username || username.trim().length === 0) {
        errors.push("El nombre de usuario es requerido");
    }
    if (!password || password.length === 0) {
        errors.push("La contraseña es requerida");
    }
    return errors;
};

const validateRegistrationInput = (username, password) => {
    const errors = [];
    
    if (!username || username.trim().length === 0) {
        errors.push("El nombre de usuario es requerido");
    } else if (username.trim().length < 3) {
        errors.push("El usuario debe tener al menos 3 caracteres");
    } else if (username.trim().length > 50) {
        errors.push("El usuario no puede exceder 50 caracteres");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
        errors.push("El usuario solo puede contener letras, números, guiones y guiones bajos");
    }
    
    if (!password || password.length === 0) {
        errors.push("La contraseña es requerida");
    } else if (password.length < 6) {
        errors.push("La contraseña debe tener al menos 6 caracteres");
    } else if (password.length > 100) {
        errors.push("La contraseña no puede exceder 100 caracteres");
    }
    
    return errors;
};

// ==========================================
// RATE LIMITING
// ==========================================
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos
const ONE_HOUR = 60 * 60 * 1000;     // <--- MOVIDO AQUÍ (Ámbito Global)

const checkRateLimit = (identifier) => {
    const now = Date.now();
    const attempts = loginAttempts.get(identifier);
    
    if (!attempts) {
        loginAttempts.set(identifier, { count: 1, firstAttempt: now, lockedUntil: null });
        return { allowed: true };
    }
    
    // Si está bloqueado, verificar si ya pasó el tiempo
    if (attempts.lockedUntil && now < attempts.lockedUntil) {
        const remainingTime = Math.ceil((attempts.lockedUntil - now) / 1000 / 60);
        return { 
            allowed: false, 
            message: `Demasiados intentos fallidos. Intenta de nuevo en ${remainingTime} minutos.` 
        };
    }
    
    // Resetear si pasó el tiempo de bloqueo
    if (attempts.lockedUntil && now >= attempts.lockedUntil) {
        loginAttempts.set(identifier, { count: 1, firstAttempt: now, lockedUntil: null });
        return { allowed: true };
    }
    
    // Incrementar contador
    attempts.count++;
    
    if (attempts.count > MAX_ATTEMPTS) {
        attempts.lockedUntil = now + LOCKOUT_TIME;
        return { 
            allowed: false, 
            message: `Demasiados intentos fallidos. Cuenta bloqueada por ${LOCKOUT_TIME / 60000} minutos.` 
        };
    }
    
    loginAttempts.set(identifier, attempts);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - attempts.count };
};

const resetRateLimit = (identifier) => {
    loginAttempts.delete(identifier);
};

// Limpieza automática
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of loginAttempts.entries()) {
        if (now - value.firstAttempt > ONE_HOUR && (!value.lockedUntil || now > value.lockedUntil)) {
            loginAttempts.delete(key);
        }
    }
}, ONE_HOUR); // Ahora sí funciona porque ONE_HOUR está definida arriba

// ==========================================
// CONTROLADORES
// ==========================================

const login = async (req, res, next) => {
    const { username, password } = req.body;
    
    const validationErrors = validateLoginInput(username, password);
    if (validationErrors.length > 0) {
        return res.status(400).json({ success: false, message: validationErrors.join(', ') });
    }

    const cleanUsername = username.trim().toLowerCase();
    
    const rateCheck = checkRateLimit(cleanUsername);
    if (!rateCheck.allowed) {
        return res.status(429).json({ success: false, message: rateCheck.message });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE LOWER(username) = $1', [cleanUsername]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
            return res.status(401).json({ 
                success: false, 
                message: "Credenciales incorrectas",
                remainingAttempts: rateCheck.remainingAttempts
            });
        }

        resetRateLimit(cleanUsername);
        
        req.login(user, (err) => {
            if (err) {
                console.error("Error al crear sesión:", err);
                return res.status(500).json({ success: false, message: "Error al iniciar sesión" });
            }
            res.json({ success: true, role: user.role, username: user.username, id: user.id });
        });

    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

const register = async (req, res) => {
    const { username, password } = req.body;
    
    const validationErrors = validateRegistrationInput(username, password);
    if (validationErrors.length > 0) {
        return res.status(400).json({ success: false, message: validationErrors.join(', ') });
    }

    const cleanUsername = username.trim();

    try {
        const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [cleanUsername]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: "El nombre de usuario ya está en uso" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO users (username, password, role) VALUES ($1, $2, 'player') RETURNING id, username, role", 
            [cleanUsername, hashedPassword]
        );

        const newUser = result.rows[0];
        res.status(201).json({ 
            success: true, 
            message: "Usuario creado exitosamente",
            user: { id: newUser.id, username: newUser.username, role: newUser.role }
        });

    } catch (err) {
        console.error("Error en registro:", err);
        if (err.code === '23505') {
            return res.status(409).json({ success: false, message: "El usuario ya existe" });
        }
        res.status(500).json({ success: false, message: "Error al crear usuario" });
    }
};

const logout = (req, res, next) => {
    if (!req.isAuthenticated()) return res.json({ success: true, message: "Ya cerrada la sesión" });

    req.logout((err) => {
        if (err) {
            console.error("Error al cerrar sesión:", err);
            return next(err);
        }
        req.session.destroy((err) => {
            if (err) {
                console.error("Error al destruir sesión:", err);
                return res.status(500).json({ success: false, message: "Error al cerrar sesión" });
            }
            res.clearCookie('connect.sid');
            res.json({ success: true, message: "Sesión cerrada correctamente" });
        });
    });
};

const getCurrentUser = (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ 
            success: true, 
            user: { id: req.user.id, username: req.user.username, role: req.user.role }
        });
    } else {
        res.json({ success: false });
    }
};

const healthCheck = (req, res) => {
    res.json({ 
        status: 'ok', 
        authenticated: req.isAuthenticated(),
        timestamp: new Date().toISOString()
    });
};

const createEmergencyAdmin = async (req, res) => {
    try {
        const hash = await bcrypt.hash('Vampiro2025', 10);
        await pool.query("DELETE FROM users WHERE username = 'narrador'");
        await pool.query("INSERT INTO users (username, password, role) VALUES ('narrador', $1, 'admin')", [hash]);
        res.send("<h1>✅ Admin Creado</h1><p>Usuario: <b>narrador</b><br>Pass: <b>Vampiro2025</b></p>");
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
};

module.exports = { login, register, logout, getCurrentUser, healthCheck, createEmergencyAdmin };
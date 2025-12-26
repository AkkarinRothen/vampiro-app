require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const port = process.env.PORT || 3000;

// --- 1. CONFIGURACIÓN MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de Sesión (Cookies)
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto_temporal',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Pon 'true' si usas HTTPS en prod, pero 'false' evita errores en dev
}));

app.use(passport.initialize());
app.use(passport.session());

// --- 2. BASE DE DATOS ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- 3. CONFIGURACIÓN PASSPORT (GOOGLE) ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
        // A. Buscar si existe por Google ID
        const res = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
        
        if (res.rows.length > 0) {
            return cb(null, res.rows[0]); // Usuario encontrado
        } else {
            // B. No existe, crear usuario nuevo
            const newUsername = profile.displayName;
            const newUser = await pool.query(
                "INSERT INTO users (username, password, role, google_id) VALUES ($1, $2, 'player', $3) RETURNING *",
                [newUsername, 'google-login', profile.id]
            );
            return cb(null, newUser.rows[0]);
        }
    } catch (err) {
        return cb(err, null);
    }
  }
));

// Serialización (Guardar usuario en sesión)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, res.rows[0]);
    } catch (err) { done(err, null); }
});

// --- 4. RUTAS DE AUTENTICACIÓN ---

// Login Normal
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Login manual: guardamos en sesión manualmente
            req.login(user, (err) => {
                if (err) return res.status(500).json({ message: "Error de sesión" });
                res.json({ success: true, role: user.role, username: user.username });
            });
        } else {
            res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Registro Normal
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Faltan datos" });

    try {
        await pool.query("INSERT INTO users (username, password, role) VALUES ($1, $2, 'player')", [username, password]);
        res.json({ success: true, message: "Usuario creado. Ahora inicia sesión." });
    } catch (err) {
        if (err.code === '23505') res.status(400).json({ message: "El usuario ya existe" });
        else res.status(500).json({ message: "Error: " + err.message });
    }
});

// Rutas de Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => res.redirect('/')
);

// Verificar quién soy
app.get('/api/current_user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ success: true, username: req.user.username, role: req.user.role });
    } else {
        res.json({ success: false });
    }
});

// Logout
app.get('/api/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

// --- 5. RUTAS DE LA APP (CRUD) ---

// Obtener personajes (Solo activos)
app.get('/api/characters', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM characters WHERE is_deleted = false ORDER BY id DESC');
        const pcs = result.rows.filter(c => c.type === 'PC');
        const npcs = result.rows.filter(c => c.type === 'NPC');
        res.json({ pcs, npcs });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Guardar personaje
app.post('/api/characters', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "No estás logueado" });
    
    const { name, clan, generation, type, image_url } = req.body;
    const created_by = req.user.username; // Usamos el usuario de la sesión real

    try {
        const query = 'INSERT INTO characters (name, clan, generation, type, image_url, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const values = [name, clan, generation, type, image_url, created_by];
        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Borrar personaje (Soft Delete)
app.delete('/api/characters/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "No estás logueado" });

    const { id } = req.params;
    const { username, role } = req.user;

    try {
        const charResult = await pool.query('SELECT * FROM characters WHERE id = $1', [id]);
        if (charResult.rows.length === 0) return res.status(404).json({ error: "No encontrado" });
        
        const character = charResult.rows[0];

        // Validar permisos: Solo admin o el dueño pueden borrar
        if (role !== 'admin' && character.created_by !== username) {
            return res.status(403).json({ error: "No puedes borrar personajes ajenos" });
        }

        await pool.query('UPDATE characters SET is_deleted = true WHERE id = $1', [id]);
        res.json({ message: "Personaje eliminado (soft delete)" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cementerio (Solo Admin)
app.get('/api/graveyard', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Acceso denegado" });
    try {
        const result = await pool.query('SELECT * FROM characters WHERE is_deleted = true ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Restaurar (Solo Admin)
app.put('/api/restore/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Acceso denegado" });
    try {
        await pool.query('UPDATE characters SET is_deleted = false WHERE id = $1', [req.params.id]);
        res.json({ message: "Restaurado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
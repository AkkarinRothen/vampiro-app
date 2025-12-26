require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path'); // <--- CAMBIO 1: Importar Path

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 1. CONFIGURACIÓN MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// <--- CAMBIO 2: Servir los archivos estáticos de React (Build de Vite)
// En lugar de 'public', apuntamos a la carpeta 'dist' dentro de 'client'
app.use(express.static(path.join(__dirname, '../client/dist')));

// Configuración de Sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto_vampirico',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Pon 'true' si usas HTTPS en producción
}));

app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 2. BASE DE DATOS
// ==========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ==========================================
// 3. PASSPORT (Google Auth)
// ==========================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
      },
      async function(accessToken, refreshToken, profile, cb) {
        try {
            const res = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
            if (res.rows.length > 0) {
                return cb(null, res.rows[0]);
            } else {
                const newUser = await pool.query(
                    "INSERT INTO users (username, password, role, google_id) VALUES ($1, $2, 'player', $3) RETURNING *",
                    [profile.displayName, 'google-login', profile.id]
                );
                return cb(null, newUser.rows[0]);
            }
        } catch (err) { return cb(err, null); }
      }
    ));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, res.rows[0]);
    } catch (err) { done(err, null); }
});

// ==========================================
// 4. RUTAS DE AUTENTICACIÓN
// ==========================================

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            req.login(user, (err) => {
                if (err) return res.status(500).json({ message: "Error de sesión" });
                res.json({ success: true, role: user.role, username: user.username });
            });
        } else {
            res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

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

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));
app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => res.redirect('/')
);

app.get('/api/current_user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ success: true, username: req.user.username, role: req.user.role });
    } else {
        res.json({ success: false });
    }
});

app.get('/api/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

// ==========================================
// 5. API: PERSONAJES (V5)
// ==========================================

app.get('/api/characters', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM characters WHERE is_deleted = false ORDER BY id DESC');
        const pcs = result.rows.filter(c => c.type === 'PC');
        const npcs = result.rows.filter(c => c.type === 'NPC');
        res.json({ pcs, npcs });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/characters', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "No estás logueado" });
    const { name, clan, generation, type, image_url, disciplines, predator_type } = req.body;
    const created_by = req.user.username;

    try {
        const disciplinesString = JSON.stringify(disciplines || []);
        const query = `
            INSERT INTO characters (name, clan, generation, type, image_url, created_by, disciplines, predator_type) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
        const values = [name, clan, generation, type, image_url, created_by, disciplinesString, predator_type];
        
        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/characters/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "No estás logueado" });
    const { id } = req.params;
    const { username, role } = req.user;

    try {
        const charResult = await pool.query('SELECT * FROM characters WHERE id = $1', [id]);
        if (charResult.rows.length === 0) return res.status(404).json({ error: "No encontrado" });
        const character = charResult.rows[0];

        if (role !== 'admin' && character.created_by !== username) {
            return res.status(403).json({ error: "No puedes borrar personajes ajenos" });
        }
        await pool.query('UPDATE characters SET is_deleted = true WHERE id = $1', [id]);
        res.json({ message: "Personaje eliminado (soft delete)" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/graveyard', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Acceso denegado" });
    try {
        const result = await pool.query('SELECT * FROM characters WHERE is_deleted = true ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/restore/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Acceso denegado" });
    try {
        await pool.query('UPDATE characters SET is_deleted = false WHERE id = $1', [req.params.id]);
        res.json({ message: "Restaurado" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 6. API: CRÓNICAS (SAGAS)
// ==========================================

app.get('/api/chronicles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM chronicles ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chronicles', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Solo Admin" });
    const { title, cover_image } = req.body;
    try {
        await pool.query('INSERT INTO chronicles (title, cover_image) VALUES ($1, $2)', [title, cover_image]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/chronicles/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Solo Admin" });
    const { title, cover_image } = req.body;
    try {
        await pool.query('UPDATE chronicles SET title=$1, cover_image=$2 WHERE id=$3', [title, cover_image, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/chronicles/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Solo Admin" });
    try {
        await pool.query('DELETE FROM chronicle_sections WHERE chronicle_id = $1', [req.params.id]);
        await pool.query('DELETE FROM chronicle_characters WHERE chronicle_id = $1', [req.params.id]);
        await pool.query('DELETE FROM chronicles WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/chronicles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const chronicle = await pool.query('SELECT * FROM chronicles WHERE id = $1', [id]);
        const chars = await pool.query(`
            SELECT c.id, c.name, c.image_url, c.clan 
            FROM characters c 
            JOIN chronicle_characters cc ON c.id = cc.character_id 
            WHERE cc.chronicle_id = $1`, [id]);
        const sections = await pool.query('SELECT * FROM chronicle_sections WHERE chronicle_id = $1 ORDER BY id ASC', [id]);

        res.json({
            info: chronicle.rows[0],
            characters: chars.rows,
            sections: sections.rows
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chronicles/:id/join', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Solo Admin" });
    const { id } = req.params;
    const { character_id } = req.body;
    try {
        await pool.query('INSERT INTO chronicle_characters (chronicle_id, character_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, character_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/chronicles/:id/roster/:charId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Solo Admin" });
    try {
        await pool.query('DELETE FROM chronicle_characters WHERE chronicle_id=$1 AND character_id=$2', [req.params.id, req.params.charId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chronicles/:id/sections', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Solo Admin" });
    const { id } = req.params;
    const { title, content, image_url } = req.body;
    try {
        await pool.query('INSERT INTO chronicle_sections (chronicle_id, title, content, image_url) VALUES ($1, $2, $3, $4)', [id, title, content, image_url]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/chronicles/sections/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Solo Admin" });
    const { title, content, image_url } = req.body;
    try {
        await pool.query('UPDATE chronicle_sections SET title=$1, content=$2, image_url=$3 WHERE id=$4', [title, content, image_url, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/chronicles/sections/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Solo Admin" });
    try {
        await pool.query('DELETE FROM chronicle_sections WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 7. API: LORE (ARCHIVOS)
// ==========================================

app.get('/api/lore', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM lore ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/lore', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Denegado" });
    const { title, content, category } = req.body;
    try {
        await pool.query('INSERT INTO lore (title, content, category) VALUES ($1, $2, $3)', [title, content, category]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/lore/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Denegado" });
    const { title, category, content } = req.body;
    try {
        await pool.query('UPDATE lore SET title=$1, category=$2, content=$3 WHERE id=$4', [title, category, content, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/lore/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Denegado" });
    try {
        await pool.query('DELETE FROM lore WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 8. RUTAS DE CONFIGURACIÓN Y MANTENIMIENTO
// ==========================================

app.get('/setup-chronicles', async (req, res) => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS chronicles (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, cover_image TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS chronicle_characters (chronicle_id INTEGER, character_id INTEGER, PRIMARY KEY (chronicle_id, character_id))`);
        await pool.query(`CREATE TABLE IF NOT EXISTS chronicle_sections (id SERIAL PRIMARY KEY, chronicle_id INTEGER, title VARCHAR(255), content TEXT, image_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query("INSERT INTO chronicles (title, cover_image) VALUES ('La Caída de Londres', 'https://via.placeholder.com/300') ON CONFLICT DO NOTHING");
        res.send("¡Tablas de Crónicas forjadas!");
    } catch (err) { res.send("Error: " + err.message); }
});

app.get('/fix-lore-table', async (req, res) => {
    try {
        await pool.query('DROP TABLE IF EXISTS lore');
        await pool.query(`CREATE TABLE lore (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            category VARCHAR(50) DEFAULT 'General',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        res.send("✅ Tabla Lore reparada correctamente.");
    } catch (e) { res.send("Error: " + e.message); }
});


// 9. CATCH-ALL ROUTE (SOLUCIÓN FIX)
// ==========================================
// Usamos /(.*)/ en lugar de '*' para evitar el error de "Missing parameter name"
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Arrancar Servidor
app.listen(port, () => {
    console.log(`🦇 Servidor VTM escuchando en http://localhost:${port}`);
});
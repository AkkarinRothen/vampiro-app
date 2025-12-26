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
// Aumentamos el límite a 10MB para que entren las fotos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
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


// Guardar personaje (ACTUALIZADO V5)
app.post('/api/characters', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "No estás logueado" });
    
    // Recibimos disciplines y predator_type
    const { name, clan, generation, type, image_url, disciplines, predator_type } = req.body;
    const created_by = req.user.username;

    try {
        // Convertimos el array de disciplinas a texto JSON para guardarlo
        const disciplinesString = JSON.stringify(disciplines || []);

        const query = `
            INSERT INTO characters (name, clan, generation, type, image_url, created_by, disciplines, predator_type) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
        
        const values = [name, clan, generation, type, image_url, created_by, disciplinesString, predator_type];
        
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

// RUTA TEMPORAL: Crear tablas de Crónicas
app.get('/setup-chronicles', async (req, res) => {
    try {
        // 1. La Tabla de la Crónica en sí (Título y Portada)
        await pool.query(`CREATE TABLE IF NOT EXISTS chronicles (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            cover_image TEXT
        )`);

        // 2. Tabla intermedia para saber qué personajes participaron
        await pool.query(`CREATE TABLE IF NOT EXISTS chronicle_characters (
            chronicle_id INTEGER,
            character_id INTEGER,
            PRIMARY KEY (chronicle_id, character_id)
        )`);

        // 3. Los "Bloques de Historia" (Texto + Imagen)
        await pool.query(`CREATE TABLE IF NOT EXISTS chronicle_sections (
            id SERIAL PRIMARY KEY,
            chronicle_id INTEGER,
            title VARCHAR(255),
            content TEXT,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Crear una crónica de ejemplo por defecto
        await pool.query("INSERT INTO chronicles (title, cover_image) VALUES ('La Caída de Londres', 'https://i.pinimg.com/736x/21/04/63/210463ecb7ea2687a2202b28c2536b04.jpg') ON CONFLICT DO NOTHING");

        res.send("¡Tablas de Crónicas forjadas en sangre!");
    } catch (err) {
        res.send("Error: " + err.message);
    }
});

// --- API DE CRÓNICAS ---

// 1. Obtener todas las crónicas (Para la pantalla de inicio)
app.get('/api/chronicles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM chronicles ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Obtener DETALLE de una crónica (Personajes + Secciones)
app.get('/api/chronicles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const chronicle = await pool.query('SELECT * FROM chronicles WHERE id = $1', [id]);
        
        // Obtener personajes vinculados
        const chars = await pool.query(`
            SELECT c.id, c.name, c.image_url, c.clan 
            FROM characters c 
            JOIN chronicle_characters cc ON c.id = cc.character_id 
            WHERE cc.chronicle_id = $1`, [id]);
            
        // Obtener secciones de historia
        const sections = await pool.query('SELECT * FROM chronicle_sections WHERE chronicle_id = $1 ORDER BY id ASC', [id]);

        res.json({
            info: chronicle.rows[0],
            characters: chars.rows,
            sections: sections.rows
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Agregar una Sección de Historia
app.post('/api/chronicles/:id/sections', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Solo el Narrador escribe la historia." });
    
    const { id } = req.params;
    const { title, content, image_url } = req.body;
    
    try {
        await pool.query(
            'INSERT INTO chronicle_sections (chronicle_id, title, content, image_url) VALUES ($1, $2, $3, $4)',
            [id, title, content, image_url]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Vincular personaje a la crónica
app.post('/api/chronicles/:id/join', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Denegado." });
    
    const { id } = req.params;
    const { character_id } = req.body;
    
    try {
        await pool.query('INSERT INTO chronicle_characters (chronicle_id, character_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, character_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// 5. Borrar una sección de historia
app.delete('/api/chronicles/sections/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Denegado" });
    try {
        await pool.query('DELETE FROM chronicle_sections WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. Editar una sección existente
app.put('/api/chronicles/sections/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Denegado" });
    const { title, content, image_url } = req.body;
    try {
        await pool.query(
            'UPDATE chronicle_sections SET title=$1, content=$2, image_url=$3 WHERE id=$4',
            [title, content, image_url, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. Remover personaje de la crónica (Desvincular)
app.delete('/api/chronicles/:id/roster/:charId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).json({ error: "Denegado" });
    try {
        await pool.query(
            'DELETE FROM chronicle_characters WHERE chronicle_id=$1 AND character_id=$2',
            [req.params.id, req.params.charId]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// RUTA TEMPORAL: Actualizar tabla para V5 Completo
app.get('/update-db-v5', async (req, res) => {
    try {
        await pool.query('ALTER TABLE characters ADD COLUMN disciplines TEXT');
        await pool.query('ALTER TABLE characters ADD COLUMN predator_type VARCHAR(100)');
        res.send("¡Sangre espesada! Base de datos actualizada para V5.");
    } catch (err) {
        res.send("Error (o ya actualizado): " + err.message);
    }
});
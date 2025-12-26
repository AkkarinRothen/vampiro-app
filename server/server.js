require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ==========================================
// 1. CONFIGURACIÓN BASE Y PROXY
// ==========================================

if (isProduction) {
    app.set('trust proxy', 1);
}

app.use(cors({
    origin: isProduction ? process.env.FRONTEND_URL || 'https://tu-dominio.com' : 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Servir archivos estáticos de React
app.use(express.static(path.join(__dirname, '../client/dist')));

// ==========================================
// 2. CONEXIÓN BASE DE DATOS (NEON)
// ==========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Verificar conexión al iniciar
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.stack);
    } else {
        console.log('✅ Conectado a Neon PostgreSQL');
        release();
    }
});

// ==========================================
// 3. SESIONES (PERSISTENTES EN DB)
// ==========================================
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'secreto_vampirico',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        sameSite: isProduction ? 'none' : 'lax'
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 4. PASSPORT (Google Auth)
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
                // Verificar si el email ya existe para vincular cuentas
                const emailCheck = await pool.query('SELECT * FROM users WHERE username = $1', [profile.emails?.[0]?.value]);
                
                if (emailCheck.rows.length > 0) {
                    // Vincular cuenta existente con Google ID
                    const updated = await pool.query(
                        'UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *',
                        [profile.id, emailCheck.rows[0].id]
                    );
                    return cb(null, updated.rows[0]);
                } else {
                    // Crear nuevo usuario
                    const newUser = await pool.query(
                        "INSERT INTO users (username, password, role, google_id) VALUES ($1, $2, 'player', $3) RETURNING *",
                        [profile.displayName || profile.emails?.[0]?.value, 'google-login', profile.id]
                    );
                    return cb(null, newUser.rows[0]);
                }
            }
        } catch (err) { return cb(err, null); }
    }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, res.rows[0]);
    } catch (err) { done(err, null); }
});

// Rutas de Google Auth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/');
    }
);

// ==========================================
// 5. API: AUTENTICACIÓN LOCAL
// ==========================================

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    // Validación de entrada
    if (!username || !password) {
        return res.status(400).json({ message: "Faltan datos" });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ message: "El usuario debe tener al menos 3 caracteres" });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await pool.query(
            "INSERT INTO users (username, password, role) VALUES ($1, $2, 'player')", 
            [username.trim(), hashedPassword]
        );
        
        res.json({ success: true, message: "Usuario creado con éxito." });
    } catch (err) {
        if (err.code === '23505') {
            res.status(400).json({ message: "El usuario ya existe" });
        } else {
            console.error('Error en registro:', err);
            res.status(500).json({ message: "Error al crear usuario" });
        }
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Faltan datos" });
    }
    
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
                req.login(user, (err) => {
                    if (err) {
                        console.error('Error en sesión:', err);
                        return res.status(500).json({ message: "Error de sesión" });
                    }
                    res.json({ 
                        success: true, 
                        role: user.role, 
                        username: user.username 
                    });
                });
            } else {
                res.status(401).json({ success: false, message: "Contraseña incorrecta" });
            }
        } else {
            res.status(401).json({ success: false, message: "El usuario no existe" });
        }
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

app.get('/api/current_user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ 
            success: true, 
            username: req.user.username, 
            role: req.user.role,
            id: req.user.id
        });
    } else {
        res.json({ success: false });
    }
});

app.get('/api/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy((err) => {
            if (err) console.error('Error destruyendo sesión:', err);
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    });
});

// ==========================================
// 6. API: PERSONAJES
// ==========================================

app.get('/api/characters', async (req, res) => {
    try {
        const pcs = await pool.query(
            "SELECT * FROM characters WHERE type = 'PC' AND is_deleted = false ORDER BY stars DESC, name ASC"
        );
        const npcs = await pool.query(
            "SELECT * FROM characters WHERE type = 'NPC' AND is_deleted = false ORDER BY name ASC"
        );
        
        res.json({
            pcs: pcs.rows,
            npcs: npcs.rows
        });
    } catch (err) {
        console.error('Error obteniendo personajes:', err);
        res.status(500).json({ error: "Error al obtener personajes" });
    }
});

app.post('/api/characters', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "No estás logueado" });
    }
    
    const { name, clan, generation, type, image_url, disciplines, predator_type } = req.body;
    
    // Validación
    if (!name || !clan || !type) {
        return res.status(400).json({ error: "Faltan datos obligatorios" });
    }
    
    const created_by = req.user.username;

    try {
        const disciplinesString = JSON.stringify(disciplines || []);
        const query = `
            INSERT INTO characters (name, clan, generation, type, image_url, created_by, disciplines, predator_type, stars) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0) 
            RETURNING *`;
        const values = [name, clan, generation, type, image_url, created_by, disciplinesString, predator_type];
        
        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creando personaje:', err);
        res.status(500).json({ error: "Error al crear personaje" });
    }
});

app.put('/api/characters/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "No estás logueado" });
    }
    
    const { id } = req.params;
    const { name, clan, generation, type, image_url, disciplines, predator_type } = req.body;
    const { username, role } = req.user;

    try {
        // Verificar permisos
        const charResult = await pool.query('SELECT * FROM characters WHERE id = $1', [id]);
        if (charResult.rows.length === 0) {
            return res.status(404).json({ error: "Personaje no encontrado" });
        }
        
        const character = charResult.rows[0];
        if (role !== 'admin' && character.created_by !== username) {
            return res.status(403).json({ error: "No puedes editar personajes ajenos" });
        }

        const disciplinesString = JSON.stringify(disciplines || []);
        const query = `
            UPDATE characters 
            SET name=$1, clan=$2, generation=$3, type=$4, image_url=$5, disciplines=$6, predator_type=$7 
            WHERE id=$8 
            RETURNING *`;
        const values = [name, clan, generation, type, image_url, disciplinesString, predator_type, id];
        
        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error actualizando personaje:', err);
        res.status(500).json({ error: "Error al actualizar personaje" });
    }
});

app.delete('/api/characters/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "No estás logueado" });
    }
    
    const { id } = req.params;
    const { username, role } = req.user;

    try {
        const charResult = await pool.query('SELECT * FROM characters WHERE id = $1', [id]);
        if (charResult.rows.length === 0) {
            return res.status(404).json({ error: "Personaje no encontrado" });
        }
        
        const character = charResult.rows[0];
        if (role !== 'admin' && character.created_by !== username) {
            return res.status(403).json({ error: "No puedes borrar personajes ajenos" });
        }
        
        await pool.query('UPDATE characters SET is_deleted = true WHERE id = $1', [id]);
        res.json({ message: "Personaje eliminado" });
    } catch (err) {
        console.error('Error eliminando personaje:', err);
        res.status(500).json({ error: "Error al eliminar personaje" });
    }
});

app.put('/api/characters/:id/rate', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Solo el admin puede calificar" });
    }
    
    const { id } = req.params;
    const { stars } = req.body;
    
    if (stars < 0 || stars > 5) {
        return res.status(400).json({ error: "Las estrellas deben estar entre 0 y 5" });
    }
    
    try {
        const result = await pool.query(
            'UPDATE characters SET stars = $1 WHERE id = $2 RETURNING *',
            [stars, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Personaje no encontrado" });
        }
        
        res.json({ success: true, character: result.rows[0] });
    } catch (err) {
        console.error('Error calificando personaje:', err);
        res.status(500).json({ error: "Error al guardar calificación" });
    }
});

app.get('/api/graveyard', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado" });
    }
    
    try {
        const result = await pool.query(
            'SELECT * FROM characters WHERE is_deleted = true ORDER BY id DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error obteniendo cementerio:', err);
        res.status(500).json({ error: "Error al obtener personajes eliminados" });
    }
});

app.put('/api/restore/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado" });
    }
    
    try {
        const result = await pool.query(
            'UPDATE characters SET is_deleted = false WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Personaje no encontrado" });
        }
        
        res.json({ message: "Personaje restaurado", character: result.rows[0] });
    } catch (err) {
        console.error('Error restaurando personaje:', err);
        res.status(500).json({ error: "Error al restaurar personaje" });
    }
});

// ==========================================
// 7. API: CRÓNICAS (SAGAS)
// ==========================================

app.get('/api/chronicles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM chronicles ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error obteniendo crónicas:', err);
        res.status(500).json({ error: "Error al obtener crónicas" });
    }
});

app.post('/api/chronicles', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Solo Admin" });
    }
    
    const { title, cover_image } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: "El título es obligatorio" });
    }
    
    try {
        const result = await pool.query(
            'INSERT INTO chronicles (title, cover_image) VALUES ($1, $2) RETURNING *',
            [title, cover_image]
        );
        res.json({ success: true, chronicle: result.rows[0] });
    } catch (err) {
        console.error('Error creando crónica:', err);
        res.status(500).json({ error: "Error al crear crónica" });
    }
});

app.get('/api/chronicles/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const chronicle = await pool.query('SELECT * FROM chronicles WHERE id = $1', [id]);
        
        if (chronicle.rows.length === 0) {
            return res.status(404).json({ error: "Crónica no encontrada" });
        }
        
        const chars = await pool.query(`
            SELECT c.id, c.name, c.image_url, c.clan 
            FROM characters c 
            JOIN chronicle_characters cc ON c.id = cc.character_id 
            WHERE cc.chronicle_id = $1
        `, [id]);
        
        const sections = await pool.query(
            'SELECT * FROM chronicle_sections WHERE chronicle_id = $1 ORDER BY id ASC',
            [id]
        );

        res.json({
            info: chronicle.rows[0],
            characters: chars.rows,
            sections: sections.rows
        });
    } catch (err) {
        console.error('Error obteniendo crónica:', err);
        res.status(500).json({ error: "Error al obtener crónica" });
    }
});

app.put('/api/chronicles/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Solo Admin" });
    }
    
    const { title, cover_image } = req.body;
    
    try {
        const result = await pool.query(
            'UPDATE chronicles SET title=$1, cover_image=$2 WHERE id=$3 RETURNING *',
            [title, cover_image, req.params.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Crónica no encontrada" });
        }
        
        res.json({ success: true, chronicle: result.rows[0] });
    } catch (err) {
        console.error('Error actualizando crónica:', err);
        res.status(500).json({ error: "Error al actualizar crónica" });
    }
});

app.delete('/api/chronicles/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Solo Admin" });
    }
    
    try {
        await pool.query('DELETE FROM chronicle_sections WHERE chronicle_id = $1', [req.params.id]);
        await pool.query('DELETE FROM chronicle_characters WHERE chronicle_id = $1', [req.params.id]);
        await pool.query('DELETE FROM chronicles WHERE id = $1', [req.params.id]);
        
        res.json({ success: true, message: "Crónica eliminada" });
    } catch (err) {
        console.error('Error eliminando crónica:', err);
        res.status(500).json({ error: "Error al eliminar crónica" });
    }
});

app.post('/api/chronicles/:id/join', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Solo Admin" });
    }
    
    const { id } = req.params;
    const { character_id } = req.body;
    
    try {
        await pool.query(
            'INSERT INTO chronicle_characters (chronicle_id, character_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, character_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error añadiendo personaje a crónica:', err);
        res.status(500).json({ error: "Error al añadir personaje" });
    }
});

app.delete('/api/chronicles/:id/roster/:charId', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Solo Admin" });
    }
    
    try {
        await pool.query(
            'DELETE FROM chronicle_characters WHERE chronicle_id=$1 AND character_id=$2',
            [req.params.id, req.params.charId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error eliminando personaje de crónica:', err);
        res.status(500).json({ error: "Error al eliminar personaje" });
    }
});

app.post('/api/chronicles/:id/sections', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Solo Admin" });
    }
    
    const { id } = req.params;
    const { title, content, image_url } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO chronicle_sections (chronicle_id, title, content, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, title, content, image_url]
        );
        res.json({ success: true, section: result.rows[0] });
    } catch (err) {
        console.error('Error creando sección:', err);
        res.status(500).json({ error: "Error al crear sección" });
    }
});

app.put('/api/chronicles/sections/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Solo Admin" });
    }
    
    const { title, content, image_url } = req.body;
    
    try {
        const result = await pool.query(
            'UPDATE chronicle_sections SET title=$1, content=$2, image_url=$3 WHERE id=$4 RETURNING *',
            [title, content, image_url, req.params.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Sección no encontrada" });
        }
        
        res.json({ success: true, section: result.rows[0] });
    } catch (err) {
        console.error('Error actualizando sección:', err);
        res.status(500).json({ error: "Error al actualizar sección" });
    }
});

app.delete('/api/chronicles/sections/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Solo Admin" });
    }
    
    try {
        const result = await pool.query(
            'DELETE FROM chronicle_sections WHERE id = $1',
            [req.params.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Sección no encontrada" });
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error eliminando sección:', err);
        res.status(500).json({ error: "Error al eliminar sección" });
    }
});

// ==========================================
// 8. API: LORE (ARCHIVOS)
// ==========================================

app.get('/api/lore', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM lore ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error obteniendo lore:', err);
        res.status(500).json({ error: "Error al obtener lore" });
    }
});

app.post('/api/lore', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Acceso denegado" });
    }
    
    const { title, content, category } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ error: "Faltan datos obligatorios" });
    }
    
    try {
        const result = await pool.query(
            'INSERT INTO lore (title, content, category) VALUES ($1, $2, $3) RETURNING *',
            [title, content, category || 'General']
        );
        res.json({ success: true, lore: result.rows[0] });
    } catch (err) {
        console.error('Error creando lore:', err);
        res.status(500).json({ error: "Error al crear lore" });
    }
});

app.put('/api/lore/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado" });
    }
    
    const { title, category, content } = req.body;
    
    try {
        const result = await pool.query(
            'UPDATE lore SET title=$1, category=$2, content=$3 WHERE id=$4 RETURNING *',
            [title, category, content, req.params.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Lore no encontrado" });
        }
        
        res.json({ success: true, lore: result.rows[0] });
    } catch (err) {
        console.error('Error actualizando lore:', err);
        res.status(500).json({ error: "Error al actualizar lore" });
    }
});

app.delete('/api/lore/:id', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado" });
    }
    
    try {
        const result = await pool.query('DELETE FROM lore WHERE id = $1', [req.params.id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Lore no encontrado" });
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error eliminando lore:', err);
        res.status(500).json({ error: "Error al eliminar lore" });
    }
});

// ==========================================
// 9. API: EXPORTAR/IMPORTAR
// ==========================================

app.get('/api/export-data', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado" });
    }
    
    try {
        const chars = await pool.query('SELECT * FROM characters');
        const sagas = await pool.query('SELECT * FROM chronicles');
        const sections = await pool.query('SELECT * FROM chronicle_sections');
        const lore = await pool.query('SELECT * FROM lore');
        
        res.json({
            characters: chars.rows,
            chronicles: sagas.rows,
            sections: sections.rows,
            lore: lore.rows,
            backup_date: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error exportando datos:', err);
        res.status(500).json({ error: "Error al exportar datos" });
    }
});

app.post('/api/import-data', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado" });
    }
    
    const { characters, chronicles, sections, lore } = req.body;
    
    try {
        // Importar con transacción para asegurar integridad
        await pool.query('BEGIN');
        
        if (characters) {
            for (const c of characters) {
                await pool.query(
                    `INSERT INTO characters (id, name, clan, generation, type, image_url, created_by, disciplines, predator_type, stars, is_deleted) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
                     ON CONFLICT (id) DO UPDATE SET 
                     name=$2, clan=$3, generation=$4, type=$5, image_url=$6, disciplines=$8, predator_type=$9, stars=$10, is_deleted=$11`,
                    [c.id, c.name, c.clan, c.generation, c.type, c.image_url, c.created_by, c.disciplines, c.predator_type, c.stars, c.is_deleted]
                );
            }
        }
        
        if (chronicles) {
            for (const s of chronicles) {
                await pool.query(
                    'INSERT INTO chronicles (id, title, cover_image) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET title=$2, cover_image=$3',
                    [s.id, s.title, s.cover_image]
                );
            }
        }
        
        if (sections) {
            for (const sec of sections) {
                await pool.query(
                    'INSERT INTO chronicle_sections (id, chronicle_id, title, content, image_url) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET title=$3, content=$4, image_url=$5',
                    [sec.id, sec.chronicle_id, sec.title, sec.content, sec.image_url]
                );
            }
        }
        
        if (lore) {
            for (const l of lore) {
                await pool.query(
                    'INSERT INTO lore (id, title, content, category) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET title=$2, content=$3, category=$4',
                    [l.id, l.title, l.content, l.category]
                );
            }
        }
        
        await pool.query('COMMIT');
        res.json({ success: true, message: "Datos importados correctamente" });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error importando datos:', err);
        res.status(500).json({ error: "Error al importar datos" });
    }
});

// ==========================================
// 10. MANTENIMIENTO MAESTRO (PROTEGIDO)
// ==========================================

app.get('/setup-master', async (req, res) => {
    const secretKey = process.env.DB_RESET_KEY;
    if (!secretKey || req.query.key !== secretKey) {
        return res.status(403).send("<h1>⛔ Acceso Denegado</h1><p>Violación de la Mascarada detectada.</p>");
    }

    try {
        // 1. Tabla de Sesiones
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL
            )
        `);
        
        try {
            await pool.query('ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE');
            await pool.query('CREATE INDEX "IDX_session_expire" ON "session" ("expire")');
        } catch (e) { 
            console.log("Índices de sesión ya existían");
        }

        // 2. Usuarios
        await pool.query('DROP TABLE IF EXISTS users CASCADE');
        await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'player',
                google_id VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Vampiro2025', 10);
        await pool.query(
            "INSERT INTO users (username, password, role) VALUES ($1, $2, 'admin')",
            ['narrador', adminPass]
        );

        // 3. Personajes
        await pool.query('DROP TABLE IF EXISTS characters CASCADE');
        await pool.query(`
            CREATE TABLE characters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                clan VARCHAR(100),
                generation INTEGER,
                type VARCHAR(10),
                image_url TEXT,
                disciplines TEXT,
                predator_type VARCHAR(100),
                stars INTEGER DEFAULT 0,
                is_deleted BOOLEAN DEFAULT false,
                created_by VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Crónicas
        await pool.query('DROP TABLE IF EXISTS chronicles CASCADE');
        await pool.query(`
            CREATE TABLE chronicles (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                cover_image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query('DROP TABLE IF EXISTS chronicle_characters CASCADE');
        await pool.query(`
            CREATE TABLE chronicle_characters (
                chronicle_id INTEGER REFERENCES chronicles(id) ON DELETE CASCADE,
                character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
                PRIMARY KEY(chronicle_id, character_id)
            )
        `);
        
        await pool.query('DROP TABLE IF EXISTS chronicle_sections CASCADE');
        await pool.query(`
            CREATE TABLE chronicle_sections (
                id SERIAL PRIMARY KEY,
                chronicle_id INTEGER REFERENCES chronicles(id) ON DELETE CASCADE,
                title VARCHAR(255),
                content TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Lore
        await pool.query('DROP TABLE IF EXISTS lore CASCADE');
        await pool.query(`
            CREATE TABLE lore (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(50) DEFAULT 'General',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        res.send(`
            <h1>🦇 ¡Dominio Restablecido!</h1>
            <p>Todas las tablas han sido creadas:</p>
            <ul>
                <li>✅ Sesiones (persistentes)</li>
                <li>✅ Usuarios (con bcrypt)</li>
                <li>✅ Personajes</li>
                <li>✅ Crónicas</li>
                <li>✅ Lore</li>
            </ul>
            <p><strong>Admin:</strong> narrador</p>
            <p><em>Recuerda eliminar esta ruta en producción</em></p>
        `);
    } catch (err) {
        console.error('Error en setup-master:', err);
        res.status(500).send("Error en el Ritual: " + err.message);
    }
});

// Rutas adicionales de setup (solo para desarrollo)
if (!isProduction) {
    app.get('/add-stars-column', async (req, res) => {
        try {
            await pool.query('ALTER TABLE characters ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0');
            res.send("✅ Columna 'stars' agregada/verificada");
        } catch (err) {
            res.send("Aviso: " + err.message);
        }
    });
}

// ==========================================
// 11. CATCH-ALL (PARA REACT ROUTER)
// ==========================================
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// ==========================================
// 12. MANEJO DE ERRORES GLOBAL
// ==========================================
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ 
        error: isProduction ? "Error interno del servidor" : err.message 
    });
});

// ==========================================
// 13. ARRANQUE
// ==========================================
app.listen(port, async () => {
    console.log(`🦇 Servidor VTM escuchando en el puerto ${port}`);
    console.log(`📍 Modo: ${isProduction ? 'Producción' : 'Desarrollo'}`);
    
    // Verificar columna stars al iniciar
    try {
        await pool.query('ALTER TABLE characters ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0');
        console.log("✅ Columna 'stars' verificada");
    } catch (err) {
        console.error("⚠️ Error verificando columna stars:", err.message);
    }
});
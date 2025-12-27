require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const cors = require('cors');
const path = require('path');

// Importar configuraciones
const pool = require('./config/db');
require('./config/passport')(passport);

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// 1. Configuración Básica
if (isProduction) app.set('trust proxy', 1);

app.use(cors({
    origin: isProduction ? process.env.FRONTEND_URL : 'http://localhost:5173',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 2. Sesiones
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

// 3. Inicializar Auth
app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 🔍 MIDDLEWARE DE DEBUG (TEMPORAL)
// ==========================================
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📍 Petición:', req.method, req.path);
        console.log('🔐 Autenticado:', req.isAuthenticated());
        
        if (req.isAuthenticated()) {
            console.log('👤 Usuario:', {
                id: req.user.id,
                username: req.user.username,
                role: req.user.role
            });
        }
        
        console.log('🍪 Session ID:', req.sessionID);
        console.log('🍪 Cookies:', req.headers.cookie ? 'Presentes' : 'Ausentes');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    next();
});

// 4. RUTAS MODULARES
app.use('/', require('./routes/auth'));           // Login, Register, Google
app.use('/api/characters', require('./routes/characters'));
app.use('/api/chronicles', require('./routes/chronicles'));
app.use('/api/lore', require('./routes/lore'));
app.use('/', require('./routes/admin'));          // Setup y Admin

// 5. Archivos Estáticos (React)
app.use(express.static(path.join(__dirname, '../client/dist')));

// 6. Catch-All (Siempre al final)
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// 7. Arranque
app.listen(port, () => {
    console.log(`🦇 Servidor VTM escuchando en puerto ${port}`);
    console.log(`🔐 Modo: ${isProduction ? 'Producción' : 'Desarrollo'}`);
    console.log(`🌐 Frontend URL: ${isProduction ? process.env.FRONTEND_URL : 'http://localhost:5173'}`);
    console.log(`📝 Session Secret: ${process.env.SESSION_SECRET ? '✓ Configurado' : '⚠️ Usando default'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
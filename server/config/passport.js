const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const pool = require('./db');

module.exports = function(passport) {
    // ==========================================
    // SERIALIZACIÓN (Guardar ID en sesión)
    // ==========================================
    passport.serializeUser((user, done) => {
        console.log('🔐 Serializando usuario:', user.id, user.username);
        done(null, user.id);
    });

    // ==========================================
    // DESERIALIZACIÓN (Recuperar usuario completo)
    // ==========================================
    passport.deserializeUser(async (id, done) => {
        try {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                console.log('🔓 Deserializando usuario:', user.id, user.username, user.role);
                done(null, user);
            } else {
                console.log('❌ Usuario no encontrado en deserialización:', id);
                done(null, false);
            }
        } catch (err) {
            console.error('❌ Error en deserialización:', err);
            done(err, null);
        }
    });

    // ==========================================
    // ESTRATEGIA LOCAL (Usuario/Contraseña)
    // ==========================================
    passport.use(new LocalStrategy(
        { usernameField: 'username', passwordField: 'password' },
        async (username, password, done) => {
            try {
                console.log('🔍 Intentando login con usuario:', username);
                
                const result = await pool.query(
                    'SELECT * FROM users WHERE LOWER(username) = LOWER($1)', 
                    [username.trim()]
                );

                if (result.rows.length === 0) {
                    console.log('❌ Usuario no encontrado:', username);
                    return done(null, false, { message: 'Usuario no encontrado' });
                }

                const user = result.rows[0];
                console.log('✓ Usuario encontrado:', user.username, 'Verificando contraseña...');
                
                const isMatch = await bcrypt.compare(password, user.password);

                if (!isMatch) {
                    console.log('❌ Contraseña incorrecta');
                    return done(null, false, { message: 'Contraseña incorrecta' });
                }

                console.log('✅ Login exitoso:', user.username, 'Rol:', user.role);
                return done(null, user);
            } catch (err) {
                console.error('❌ Error en LocalStrategy:', err);
                return done(err);
            }
        }
    ));

    // ==========================================
    // ESTRATEGIA GOOGLE (OAuth)
    // ==========================================
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback"
        },
        async function(accessToken, refreshToken, profile, cb) {
            try {
                // 1. ¿Existe el usuario por Google ID?
                const res = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
                if (res.rows.length > 0) {
                    return cb(null, res.rows[0]);
                }
                
                // 2. ¿Existe el email? (Para vincular cuentas)
                const email = profile.emails?.[0]?.value;
                if (email) {
                    const emailCheck = await pool.query('SELECT * FROM users WHERE username = $1', [email]);
                    
                    if (emailCheck.rows.length > 0) {
                        // Vincular cuenta existente
                        const updated = await pool.query(
                            'UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *',
                            [profile.id, emailCheck.rows[0].id]
                        );
                        return cb(null, updated.rows[0]);
                    }
                }
                
                // 3. Crear usuario nuevo
                const username = email ? email.split('@')[0] : profile.displayName;
                const newUser = await pool.query(
                    "INSERT INTO users (username, password, role, google_id) VALUES ($1, $2, 'player', $3) RETURNING *",
                    [username, 'google-login', profile.id]
                );
                return cb(null, newUser.rows[0]);
                
            } catch (err) { 
                console.error('Error en Google OAuth:', err);
                return cb(err, null); 
            }
        }));
        
        console.log('✅ Google OAuth configurado');
    } else {
        console.log('⚠️ Google OAuth no configurado (faltan variables de entorno)');
    }
};
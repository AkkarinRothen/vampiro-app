const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');

// ==========================================
// MIDDLEWARE DE PROTECCIÓN
// ==========================================

/**
 * Middleware: Verifica que el usuario esté autenticado y tenga rol de admin
 */
const isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "No autenticado" });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado: Solo el Narrador puede acceder" });
    }
    next();
};

/**
 * Middleware: Valida la clave secreta para operaciones críticas
 */
const validateSecretKey = (req, res, next) => {
    const secretKey = process.env.DB_RESET_KEY;
    if (!secretKey || req.query.key !== secretKey) {
        return res.status(403).send(`
            <div style="font-family: serif; background: #1a0505; color: #e5e5e5; padding: 2rem; text-align: center;">
                <h1 style="color: #ff3333;">⛔ Acceso Denegado</h1>
                <p>Violación de la Mascarada detectada.</p>
                <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 1rem;">Requiere clave secreta válida</p>
            </div>
        `);
    }
    next();
};

// ==========================================
// 1. EXPORTAR DATOS (BACKUP)
// ==========================================

/**
 * GET /api/export-data
 * Exporta todos los datos de la base de datos en formato JSON
 * @requires isAdmin
 */
router.get('/api/export-data', isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const [chars, sagas, sections, lore, roster] = await Promise.all([
            client.query('SELECT * FROM characters ORDER BY id'),
            client.query('SELECT * FROM chronicles ORDER BY id'),
            client.query('SELECT * FROM chronicle_sections ORDER BY id'),
            client.query('SELECT * FROM lore ORDER BY id'),
            client.query('SELECT * FROM chronicle_characters ORDER BY chronicle_id, character_id')
        ]);

        res.json({
            characters: chars.rows,
            chronicles: sagas.rows,
            sections: sections.rows,
            lore: lore.rows,
            chronicle_characters: roster.rows,
            backup_date: new Date().toISOString(),
            version: '1.0'
        });
    } catch (err) {
        console.error("Error al exportar datos:", err);
        res.status(500).json({ 
            error: "Error al exportar datos", 
            details: err.message 
        });
    } finally {
        client.release();
    }
});

// ==========================================
// 2. IMPORTAR DATOS (RESTAURAR)
// ==========================================

/**
 * POST /api/import-data
 * Importa datos desde un backup JSON
 * @requires isAdmin
 */
router.post('/api/import-data', isAdmin, async (req, res) => {
    const { characters, chronicles, sections, lore, chronicle_characters } = req.body;
    
    if (!characters && !chronicles && !sections && !lore && !chronicle_characters) {
        return res.status(400).json({ error: "No hay datos para importar" });
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        let stats = { 
            characters: 0, 
            chronicles: 0, 
            sections: 0, 
            lore: 0, 
            links: 0 
        };

        // A. Importar Personajes
        if (Array.isArray(characters) && characters.length > 0) {
            const query = `
                INSERT INTO characters 
                (id, name, clan, generation, type, image_url, created_by, disciplines, 
                 predator_type, stars, is_deleted, is_hidden, creature_type) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
                ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name,
                    clan = EXCLUDED.clan,
                    generation = EXCLUDED.generation,
                    type = EXCLUDED.type,
                    image_url = EXCLUDED.image_url,
                    disciplines = EXCLUDED.disciplines,
                    predator_type = EXCLUDED.predator_type,
                    stars = EXCLUDED.stars,
                    is_deleted = EXCLUDED.is_deleted,
                    is_hidden = EXCLUDED.is_hidden,
                    creature_type = EXCLUDED.creature_type
            `;
            
            for (const c of characters) {
                await client.query(query, [
                    c.id, c.name, c.clan, c.generation, c.type, c.image_url, 
                    c.created_by, c.disciplines, c.predator_type, 
                    c.stars || 0, c.is_deleted || false, 
                    c.is_hidden || false, c.creature_type || 'vampire'
                ]);
                stats.characters++;
            }
        }

        // B. Importar Crónicas
        if (Array.isArray(chronicles) && chronicles.length > 0) {
            const query = `
                INSERT INTO chronicles (id, title, cover_image) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (id) DO UPDATE SET 
                    title = EXCLUDED.title,
                    cover_image = EXCLUDED.cover_image
            `;
            
            for (const s of chronicles) {
                await client.query(query, [s.id, s.title, s.cover_image]);
                stats.chronicles++;
            }
        }

        // C. Importar Secciones
        if (Array.isArray(sections) && sections.length > 0) {
            const query = `
                INSERT INTO chronicle_sections (id, chronicle_id, title, content, image_url, section_order) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                ON CONFLICT (id) DO UPDATE SET 
                    title = EXCLUDED.title,
                    content = EXCLUDED.content,
                    image_url = EXCLUDED.image_url,
                    section_order = EXCLUDED.section_order
            `;
            
            for (const sec of sections) {
                await client.query(query, [
                    sec.id, sec.chronicle_id, sec.title, sec.content, 
                    sec.image_url, sec.section_order || 0
                ]);
                stats.sections++;
            }
        }

        // D. Importar Lore
        if (Array.isArray(lore) && lore.length > 0) {
            const query = `
                INSERT INTO lore (id, title, content, category) 
                VALUES ($1, $2, $3, $4) 
                ON CONFLICT (id) DO UPDATE SET 
                    title = EXCLUDED.title,
                    content = EXCLUDED.content,
                    category = EXCLUDED.category
            `;
            
            for (const l of lore) {
                await client.query(query, [l.id, l.title, l.content, l.category]);
                stats.lore++;
            }
        }

        // E. Importar Vínculos
        if (Array.isArray(chronicle_characters) && chronicle_characters.length > 0) {
            const query = `
                INSERT INTO chronicle_characters (chronicle_id, character_id) 
                VALUES ($1, $2) 
                ON CONFLICT DO NOTHING
            `;
            
            for (const link of chronicle_characters) {
                await client.query(query, [link.chronicle_id, link.character_id]);
                stats.links++;
            }
        }

        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: "Datos restaurados correctamente",
            stats
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error importando datos:", err);
        res.status(500).json({ 
            error: "Error en la importación", 
            details: err.message 
        });
    } finally {
        client.release();
    }
});

// ==========================================
// 3. GESTIÓN DE PERMISOS
// ==========================================

/**
 * GET /api/permissions
 * Obtiene todos los permisos configurados
 * @requires isAdmin
 */
router.get('/api/permissions', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM role_permissions ORDER BY role, permission');
        res.json(result.rows);
    } catch (err) {
        // Si la tabla no existe, devolver array vacío para no romper el frontend
        if (err.code === '42P01') {
            return res.json([]);
        }
        console.error("Error obteniendo permisos:", err);
        res.status(500).json({ 
            error: "Error obteniendo permisos", 
            details: err.message 
        });
    }
});

/**
 * POST /api/permissions
 * Actualiza o crea un permiso específico
 * @requires isAdmin
 */
router.post('/api/permissions', isAdmin, async (req, res) => {
    const { role, permission, is_allowed } = req.body;
    
    if (!role || !permission || typeof is_allowed !== 'boolean') {
        return res.status(400).json({ 
            error: "Parámetros inválidos", 
            required: { role: "string", permission: "string", is_allowed: "boolean" }
        });
    }
    
    try {
        await pool.query(
            `INSERT INTO role_permissions (role, permission, is_allowed) 
             VALUES ($1, $2, $3)
             ON CONFLICT (role, permission) 
             DO UPDATE SET is_allowed = $3`,
            [role, permission, is_allowed]
        );
        res.json({ 
            success: true,
            message: `Permiso actualizado: ${role}.${permission} = ${is_allowed}`
        });
    } catch (err) {
        console.error("Error guardando permiso:", err);
        res.status(500).json({ 
            error: "Error guardando permiso", 
            details: err.message 
        });
    }
});

/**
 * POST /api/permissions/init
 * Inicializa la tabla de permisos con valores por defecto
 * @requires isAdmin
 */
router.post('/api/permissions/init', isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Crear tabla si no existe
        await client.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role VARCHAR(50) NOT NULL,
                permission VARCHAR(100) NOT NULL,
                is_allowed BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (role, permission)
            );
        `);
        
        // Crear índice para búsquedas rápidas
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_role_permissions_role 
            ON role_permissions(role);
        `);
        
        // Valores por defecto
        const defaults = [
            { role: 'admin', permission: 'manage_users', allowed: true },
            { role: 'admin', permission: 'edit_chronicles', allowed: true },
            { role: 'admin', permission: 'delete_characters', allowed: true },
            { role: 'admin', permission: 'manage_lore', allowed: true },
            { role: 'admin', permission: 'export_data', allowed: true },
            { role: 'player', permission: 'edit_chronicles', allowed: false },
            { role: 'player', permission: 'delete_characters', allowed: false },
            { role: 'player', permission: 'view_chronicles', allowed: true },
            { role: 'player', permission: 'view_characters', allowed: true }
        ];
        
        for (const d of defaults) {
            await client.query(
                `INSERT INTO role_permissions (role, permission, is_allowed) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (role, permission) DO NOTHING`,
                [d.role, d.permission, d.allowed]
            );
        }
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: "Sistema de permisos inicializado correctamente",
            defaults_created: defaults.length
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error inicializando permisos:", err);
        res.status(500).json({ 
            error: "Error inicializando permisos", 
            details: err.message 
        });
    } finally {
        client.release();
    }
});

// ==========================================
// 4. SETUP MASTER (INICIALIZACIÓN COMPLETA)
// ==========================================

/**
 * GET /setup-master
 * Inicializa todas las tablas de la base de datos
 * @requires validateSecretKey
 */
router.get('/setup-master', validateSecretKey, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // 1. Tabla de SESIONES
        await client.query(`
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL
            )
        `);
        
        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey') THEN
                    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
                END IF;
            END $$;
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
        `);

        // 2. Tabla de USUARIOS
        await client.query('DROP TABLE IF EXISTS users CASCADE');
        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('admin', 'player')),
                google_id VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query('CREATE INDEX idx_users_username ON users(username)');
        await client.query('CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL');

        // Admin por defecto
        const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Vampiro2025', 10);
        await client.query(
            "INSERT INTO users (username, password, role) VALUES ($1, $2, 'admin')",
            ['narrador', adminPass]
        );

        // 3. Tabla de PERSONAJES
        await client.query('DROP TABLE IF EXISTS characters CASCADE');
        await client.query(`
            CREATE TABLE characters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                clan VARCHAR(100),
                generation INTEGER CHECK (generation > 0 AND generation <= 15),
                type VARCHAR(10) CHECK (type IN ('PC', 'NPC')),
                image_url TEXT,
                disciplines TEXT,
                predator_type VARCHAR(100),
                stars INTEGER DEFAULT 0 CHECK (stars >= 0),
                is_deleted BOOLEAN DEFAULT false,
                is_hidden BOOLEAN DEFAULT false,
                creature_type VARCHAR(50) DEFAULT 'vampire',
                created_by VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query('CREATE INDEX idx_characters_name ON characters(name)');
        await client.query('CREATE INDEX idx_characters_clan ON characters(clan)');
        await client.query('CREATE INDEX idx_characters_type ON characters(type)');
        await client.query('CREATE INDEX idx_characters_hidden ON characters(is_hidden) WHERE is_hidden = true');

        // 4. Tabla de CRÓNICAS
        await client.query('DROP TABLE IF EXISTS chronicles CASCADE');
        await client.query(`
            CREATE TABLE chronicles (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                cover_image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Tabla de VÍNCULOS
        await client.query('DROP TABLE IF EXISTS chronicle_characters CASCADE');
        await client.query(`
            CREATE TABLE chronicle_characters (
                chronicle_id INTEGER REFERENCES chronicles(id) ON DELETE CASCADE,
                character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY(chronicle_id, character_id)
            )
        `);

        await client.query('CREATE INDEX idx_chronicle_chars_chronicle ON chronicle_characters(chronicle_id)');
        await client.query('CREATE INDEX idx_chronicle_chars_character ON chronicle_characters(character_id)');

        // 6. Tabla de SECCIONES
        await client.query('DROP TABLE IF EXISTS chronicle_sections CASCADE');
        await client.query(`
            CREATE TABLE chronicle_sections (
                id SERIAL PRIMARY KEY,
                chronicle_id INTEGER REFERENCES chronicles(id) ON DELETE CASCADE,
                title VARCHAR(255),
                content TEXT,
                image_url TEXT,
                section_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query('CREATE INDEX idx_sections_chronicle ON chronicle_sections(chronicle_id)');
        await client.query('CREATE INDEX idx_sections_order ON chronicle_sections(chronicle_id, section_order)');

        // 7. Tabla de LORE
        await client.query('DROP TABLE IF EXISTS lore CASCADE');
        await client.query(`
            CREATE TABLE lore (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(50) DEFAULT 'General',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query('CREATE INDEX idx_lore_category ON lore(category)');
        await client.query('CREATE INDEX idx_lore_title ON lore(title)');

        // 8. Tabla de PERMISOS
        await client.query('DROP TABLE IF EXISTS role_permissions CASCADE');
        await client.query(`
            CREATE TABLE role_permissions (
                role VARCHAR(50) NOT NULL,
                permission VARCHAR(100) NOT NULL,
                is_allowed BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (role, permission)
            )
        `);

        await client.query('CREATE INDEX idx_role_permissions_role ON role_permissions(role)');

        // Permisos por defecto
        const defaultPermissions = [
            ['admin', 'manage_users', true],
            ['admin', 'edit_chronicles', true],
            ['admin', 'delete_characters', true],
            ['admin', 'manage_lore', true],
            ['player', 'edit_chronicles', false],
            ['player', 'view_chronicles', true]
        ];

        for (const [role, permission, allowed] of defaultPermissions) {
            await client.query(
                'INSERT INTO role_permissions (role, permission, is_allowed) VALUES ($1, $2, $3)',
                [role, permission, allowed]
            );
        }

        await client.query('COMMIT');

        res.send(`
            <div style="font-family: 'Georgia', serif; background: linear-gradient(135deg, #1a0505 0%, #0a0202 100%); color: #e5e5e5; padding: 3rem; text-align: center; min-height: 100vh;">
                <h1 style="color: #ff3333; font-size: 3rem; margin-bottom: 1rem; text-shadow: 0 0 20px rgba(255,51,51,0.5);">🦇 Dominio Restablecido</h1>
                <p style="font-size: 1.2rem; margin-bottom: 2rem;">La sangre de Neón fluye nuevamente por las venas del sistema.</p>
                <div style="background: rgba(0,0,0,0.5); border: 2px solid #ff3333; border-radius: 10px; padding: 2rem; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ff6666; margin-bottom: 1rem;">✅ Estructuras Creadas</h2>
                    <ul style="list-style: none; padding: 0; text-align: left; line-height: 2;">
                        <li>✅ Sistema de Sesiones</li>
                        <li>✅ Usuarios (Admin: <strong>narrador</strong>)</li>
                        <li>✅ Personajes (Bóveda + V5 Stats)</li>
                        <li>✅ Crónicas y Secciones</li>
                        <li>✅ Vínculos Personaje-Crónica</li>
                        <li>✅ Archivos de Lore</li>
                        <li>✅ Sistema de Permisos</li>
                        <li>✅ Índices de Optimización</li>
                    </ul>
                </div>
                <p style="margin-top: 2rem; font-size: 0.9rem; opacity: 0.7;">El Príncipe aprueba este dominio.</p>
            </div>
        `);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error en Setup Master:", err);
        res.status(500).send(`
            <div style="font-family: serif; background: #1a0505; color: #ff6666; padding: 2rem; text-align: center;">
                <h1>💀 Error Crítico en el Ritual</h1>
                <pre style="background: black; padding: 1rem; border-radius: 5px; text-align: left; overflow-x: auto;">${err.message}</pre>
            </div>
        `);
    } finally {
        client.release();
    }
});

// ==========================================
// 5. PARCHE DE ESTRUCTURA DE BD
// ==========================================

/**
 * GET /fix-db-structure
 * Añade columnas faltantes y repara la estructura
 * @requires validateSecretKey
 */
router.get('/fix-db-structure', validateSecretKey, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Añadir columnas faltantes en characters
        await client.query("ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false");
        await client.query("ALTER TABLE characters ADD COLUMN IF NOT EXISTS creature_type VARCHAR(50) DEFAULT 'vampire'");
        
        // Añadir columna faltante en chronicle_sections
        await client.query("ALTER TABLE chronicle_sections ADD COLUMN IF NOT EXISTS section_order INTEGER DEFAULT 0");
        
        // Crear índices de optimización
        await client.query("CREATE INDEX IF NOT EXISTS idx_characters_hidden ON characters(is_hidden) WHERE is_hidden = true");
        await client.query("CREATE INDEX IF NOT EXISTS idx_sections_order ON chronicle_sections(chronicle_id, section_order)");
        
        // Crear tabla de permisos si no existe
        await client.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role VARCHAR(50) NOT NULL,
                permission VARCHAR(100) NOT NULL,
                is_allowed BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (role, permission)
            )
        `);
        
        await client.query('CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role)');
        
        await client.query('COMMIT');

        res.send(`
            <div style="font-family: serif; background: #0a3d0a; color: #90ee90; padding: 2rem; text-align: center;">
                <h1>✅ Estructura Reparada</h1>
                <p style="margin-bottom: 1.5rem;">Columnas y optimizaciones verificadas:</p>
                <ul style="list-style: none; padding: 0; line-height: 2;">
                    <li>✓ is_hidden (Bóveda)</li>
                    <li>✓ creature_type (Tipo de criatura)</li>
                    <li>✓ section_order (Orden de secciones)</li>
                    <li>✓ role_permissions (Sistema de permisos)</li>
                    <li>✓ Índices optimizados</li>
                </ul>
                <p style="margin-top: 1.5rem; font-size: 0.9rem; opacity: 0.8;">Base de datos lista para uso.</p>
            </div>
        `);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error al reparar estructura:", err);
        res.status(500).send(`
            <div style="font-family: serif; background: #3d0a0a; color: #ff6666; padding: 2rem; text-align: center;">
                <h1>❌ Error al Reparar</h1>
                <pre style="background: black; padding: 1rem; border-radius: 5px; overflow-x: auto;">${err.message}</pre>
            </div>
        `);
    } finally {
        client.release();
    }
});
/**
 * GET /api/users
 * Lista todos los usuarios del sistema
 * @requires isAdmin
 */
router.get('/api/users', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, 
                username, 
                role, 
                created_at,
                google_id IS NOT NULL as has_google_auth
            FROM users 
            ORDER BY 
                CASE role 
                    WHEN 'admin' THEN 1 
                    ELSE 2 
                END,
                username
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error("Error obteniendo usuarios:", err);
        res.status(500).json({ 
            error: "Error obteniendo usuarios", 
            details: err.message 
        });
    }
});

/**
 * PUT /api/users/:id/role
 * Cambia el rol de un usuario
 * @requires isAdmin
 */
router.put('/api/users/:id/role', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    
    // Validación
    if (!['admin', 'player'].includes(role)) {
        return res.status(400).json({ 
            error: "Rol inválido. Debe ser 'admin' o 'player'" 
        });
    }
    
    // Prevenir que el admin se quite sus propios permisos
    if (parseInt(id) === req.user.id && role !== 'admin') {
        return res.status(400).json({ 
            error: "No puedes cambiar tu propio rol de administrador" 
        });
    }
    
    try {
        const result = await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role',
            [role, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        
        res.json({ 
            success: true,
            message: `Rol actualizado correctamente`,
            user: result.rows[0]
        });
    } catch (err) {
        console.error("Error actualizando rol:", err);
        res.status(500).json({ 
            error: "Error actualizando rol", 
            details: err.message 
        });
    }
});

/**
 * DELETE /api/users/:id
 * Elimina un usuario del sistema
 * @requires isAdmin
 */
router.delete('/api/users/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    
    // Prevenir que el admin se elimine a sí mismo
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ 
            error: "No puedes eliminar tu propia cuenta" 
        });
    }
    
    try {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING username',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        
        res.json({ 
            success: true,
            message: `Usuario "${result.rows[0].username}" eliminado correctamente`
        });
    } catch (err) {
        console.error("Error eliminando usuario:", err);
        res.status(500).json({ 
            error: "Error eliminando usuario", 
            details: err.message 
        });
    }
});

/**
 * GET /api/users/:id/permissions
 * Obtiene todos los permisos efectivos de un usuario (heredados del rol)
 * @requires isAdmin
 */
router.get('/api/users/:id/permissions', isAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Obtener el rol del usuario
        const userResult = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        
        const userRole = userResult.rows[0].role;
        
        // Obtener permisos del rol
        const permissionsResult = await pool.query(
            'SELECT permission, is_allowed FROM role_permissions WHERE role = $1',
            [userRole]
        );
        
        res.json({
            role: userRole,
            permissions: permissionsResult.rows
        });
    } catch (err) {
        console.error("Error obteniendo permisos de usuario:", err);
        res.status(500).json({ 
            error: "Error obteniendo permisos", 
            details: err.message 
        });
    }
});

/**
 * POST /api/users/create
 * Crea un nuevo usuario (solo admin)
 * @requires isAdmin
 */
router.post('/api/users/create', isAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    
    // Validaciones
    if (!username || !password) {
        return res.status(400).json({ 
            error: "Usuario y contraseña son requeridos" 
        });
    }
    
    if (!['admin', 'player'].includes(role)) {
        return res.status(400).json({ 
            error: "Rol inválido" 
        });
    }
    
    if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ 
            error: "El usuario debe tener entre 3 y 50 caracteres" 
        });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ 
            error: "La contraseña debe tener al menos 6 caracteres" 
        });
    }
    
    try {
        // Verificar si el usuario ya existe
        const existing = await pool.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
        );
        
        if (existing.rows.length > 0) {
            return res.status(409).json({ 
                error: "El usuario ya existe" 
            });
        }
        
        // Crear el usuario
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
            [username, hashedPassword, role]
        );
        
        res.status(201).json({
            success: true,
            message: "Usuario creado correctamente",
            user: result.rows[0]
        });
    } catch (err) {
        console.error("Error creando usuario:", err);
        res.status(500).json({ 
            error: "Error creando usuario", 
            details: err.message 
        });
    }
});

/**
 * POST /api/permissions/init
 * Inicializa la tabla de permisos con valores por defecto COMPLETOS
 * @requires isAdmin
 */
router.post('/api/permissions/init', isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 1. Crear tabla si no existe
        await client.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role VARCHAR(50) NOT NULL,
                permission VARCHAR(100) NOT NULL,
                is_allowed BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (role, permission)
            );
        `);
        
        // 2. Crear índice para búsquedas rápidas
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_role_permissions_role 
            ON role_permissions(role);
        `);
        
        // 3. PERMISOS COMPLETOS - Configuración por defecto
        const permissions = [
            // === ADMIN: TIENE TODO ===
            // Gestión de usuarios
            { role: 'admin', permission: 'manage_users', allowed: true },
            
            // Crónicas
            { role: 'admin', permission: 'view_chronicles', allowed: true },
            { role: 'admin', permission: 'edit_chronicles', allowed: true },
            { role: 'admin', permission: 'delete_chronicles', allowed: true },
            
            // Personajes
            { role: 'admin', permission: 'view_characters', allowed: true },
            { role: 'admin', permission: 'create_characters', allowed: true },
            { role: 'admin', permission: 'edit_characters', allowed: true },
            { role: 'admin', permission: 'delete_characters', allowed: true },
            { role: 'admin', permission: 'view_hidden', allowed: true },
            
            // Lore
            { role: 'admin', permission: 'view_lore', allowed: true },
            { role: 'admin', permission: 'manage_lore', allowed: true },
            { role: 'admin', permission: 'delete_lore', allowed: true },
            
            // Sistema
            { role: 'admin', permission: 'upload_files', allowed: true },
            { role: 'admin', permission: 'export_data', allowed: true },
            { role: 'admin', permission: 'import_data', allowed: true },
            { role: 'admin', permission: 'manage_permissions', allowed: true },
            
            // === PLAYER: PERMISOS BÁSICOS ===
            // Gestión de usuarios
            { role: 'player', permission: 'manage_users', allowed: false },
            
            // Crónicas
            { role: 'player', permission: 'view_chronicles', allowed: true },
            { role: 'player', permission: 'edit_chronicles', allowed: false },
            { role: 'player', permission: 'delete_chronicles', allowed: false },
            
            // Personajes
            { role: 'player', permission: 'view_characters', allowed: true },
            { role: 'player', permission: 'create_characters', allowed: true },
            { role: 'player', permission: 'edit_characters', allowed: false }, // Solo sus propios personajes
            { role: 'player', permission: 'delete_characters', allowed: false },
            { role: 'player', permission: 'view_hidden', allowed: false },
            
            // Lore
            { role: 'player', permission: 'view_lore', allowed: true },
            { role: 'player', permission: 'manage_lore', allowed: false },
            { role: 'player', permission: 'delete_lore', allowed: false },
            
            // Sistema
            { role: 'player', permission: 'upload_files', allowed: false },
            { role: 'player', permission: 'export_data', allowed: false },
            { role: 'player', permission: 'import_data', allowed: false },
            { role: 'player', permission: 'manage_permissions', allowed: false },
        ];
        
        // 4. Insertar todos los permisos
        let insertedCount = 0;
        for (const p of permissions) {
            const result = await client.query(
                `INSERT INTO role_permissions (role, permission, is_allowed) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (role, permission) DO NOTHING
                 RETURNING *`,
                [p.role, p.permission, p.allowed]
            );
            if (result.rows.length > 0) insertedCount++;
        }
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: "Sistema de permisos inicializado correctamente",
            total_permissions: permissions.length,
            newly_created: insertedCount,
            roles_configured: ['admin', 'player']
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error inicializando permisos:", err);
        res.status(500).json({ 
            error: "Error inicializando permisos", 
            details: err.message 
        });
    } finally {
        client.release();
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');

// ==========================================
// MIDDLEWARE DE PROTECCIÓN
// ==========================================
const isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "No autenticado" });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado: Solo el Narrador puede acceder" });
    }
    next();
};

// Validación de clave secreta
const validateSecretKey = (req, res, next) => {
    const secretKey = process.env.DB_RESET_KEY;
    if (!secretKey || req.query.key !== secretKey) {
        return res.status(403).send(`
            <div style="font-family: serif; background: #1a0505; color: #e5e5e5; padding: 2rem; text-align: center;">
                <h1 style="color: #ff3333;">⛔ Acceso Denegado</h1>
                <p>Violación de la Mascarada detectada.</p>
            </div>
        `);
    }
    next();
};

// ==========================================
// 1. EXPORTAR DATOS (BACKUP)
// ==========================================
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
        res.status(500).json({ error: "Error al exportar datos", details: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// 2. IMPORTAR DATOS (RESTAURAR)
// ==========================================
router.post('/api/import-data', isAdmin, async (req, res) => {
    const { characters, chronicles, sections, lore, chronicle_characters } = req.body;
    
    if (!characters && !chronicles && !sections && !lore && !chronicle_characters) {
        return res.status(400).json({ error: "No hay datos para importar" });
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        let stats = { characters: 0, chronicles: 0, sections: 0, lore: 0, links: 0 };

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
                INSERT INTO chronicle_sections (id, chronicle_id, title, content, image_url) 
                VALUES ($1, $2, $3, $4, $5) 
                ON CONFLICT (id) DO UPDATE SET 
                    title = EXCLUDED.title,
                    content = EXCLUDED.content,
                    image_url = EXCLUDED.image_url
            `;
            
            for (const sec of sections) {
                await client.query(query, [
                    sec.id, sec.chronicle_id, sec.title, sec.content, sec.image_url
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
// 3. SETUP MASTER (INICIALIZACIÓN DE BD)
// ==========================================
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

        // Crear índice para búsquedas rápidas
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

        await client.query('COMMIT');

        res.send(`
            <div style="font-family: 'Georgia', serif; background: linear-gradient(135deg, #1a0505 0%, #0a0202 100%); color: #e5e5e5; padding: 3rem; text-align: center; min-height: 100vh;">
                <h1 style="color: #ff3333; font-size: 3rem; margin-bottom: 1rem; text-shadow: 0 0 20px rgba(255,51,51,0.5);">🦇 Dominio Restablecido</h1>
                <p style="font-size: 1.2rem; margin-bottom: 2rem;">La sangre de Neón fluye nuevamente por las venas del sistema.</p>
                <div style="background: rgba(0,0,0,0.5); border: 2px solid #ff3333; border-radius: 10px; padding: 2rem; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ff6666; margin-bottom: 1rem;">Estructuras Creadas</h2>
                    <ul style="list-style: none; padding: 0; text-align: left; line-height: 2;">
                        <li>✅ Sistema de Sesiones</li>
                        <li>✅ Usuarios (Admin: <strong>narrador</strong>)</li>
                        <li>✅ Personajes (Bóveda + V5 Stats)</li>
                        <li>✅ Crónicas y Secciones</li>
                        <li>✅ Vínculos Personaje-Crónica</li>
                        <li>✅ Archivos de Lore</li>
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
                <pre style="background: black; padding: 1rem; border-radius: 5px; text-align: left;">${err.message}</pre>
            </div>
        `);
    } finally {
        client.release();
    }
});

// ==========================================
// 4. PARCHE DE ESTRUCTURA DE BD
// ==========================================
router.get('/fix-db-structure', validateSecretKey, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query("ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false");
        await client.query("ALTER TABLE characters ADD COLUMN IF NOT EXISTS creature_type VARCHAR(50) DEFAULT 'vampire'");
        await client.query("ALTER TABLE chronicle_sections ADD COLUMN IF NOT EXISTS section_order INTEGER DEFAULT 0");
        await client.query("CREATE INDEX IF NOT EXISTS idx_characters_hidden ON characters(is_hidden) WHERE is_hidden = true");

        res.send(`
            <div style="font-family: serif; background: #0a3d0a; color: #90ee90; padding: 2rem; text-align: center;">
                <h1>✅ Estructura Reparada</h1>
                <p>Columnas adicionales verificadas y creadas:</p>
                <ul style="list-style: none; padding: 0;">
                    <li>✓ is_hidden (Bóveda)</li>
                    <li>✓ creature_type (Tipo de criatura)</li>
                    <li>✓ section_order (Orden de secciones)</li>
                    <li>✓ Índices optimizados</li>
                </ul>
            </div>
        `);
    } catch (err) {
        console.error("Error al reparar estructura:", err);
        res.status(500).send(`
            <div style="font-family: serif; background: #3d0a0a; color: #ff6666; padding: 2rem;">
                <h1>❌ Error al Reparar</h1>
                <pre>${err.message}</pre>
            </div>
        `);
    } finally {
        client.release();
    }
});

module.exports = router;
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conexión a la Base de Datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Obligatorio para conectar desde fuera a Render
});

// --- RUTAS DE LA API ---

// 1. Obtener personajes
app.get('/api/characters', async (req, res) => {
    try {
        // SOLO TRAEMOS LOS QUE NO ESTÁN BORRADOS (is_deleted = false)
        const result = await pool.query('SELECT * FROM characters WHERE is_deleted = false ORDER BY id DESC');
        const pcs = result.rows.filter(c => c.type === 'PC');
        const npcs = result.rows.filter(c => c.type === 'NPC');
        res.json({ pcs, npcs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Guardar personaje (ACTUALIZADO CON IMAGEN)
app.post('/api/characters', async (req, res) => {
    // AHORA RECIBIMOS TAMBIÉN 'created_by'
    const { name, clan, generation, type, image_url, created_by } = req.body;
    try {
        const query = 'INSERT INTO characters (name, clan, generation, type, image_url, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const values = [name, clan, generation, type, image_url, created_by];
        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/characters/:id', async (req, res) => {
    const { id } = req.params;
    const { username, role } = req.body; // Necesitamos saber quién intenta borrar

    try {
        // 1. Buscamos el personaje para ver de quién es
        const charResult = await pool.query('SELECT * FROM characters WHERE id = $1', [id]);
        if (charResult.rows.length === 0) return res.status(404).json({ error: "Personaje no encontrado" });
        
        const character = charResult.rows[0];

        // 2. VERIFICACIÓN DE PERMISO
        // Si es Admin, puede borrar lo que sea.
        // Si es Jugador, SOLO puede borrar si el 'created_by' coincide con su usuario.
        if (role !== 'admin' && character.created_by !== username) {
            return res.status(403).json({ error: "No puedes borrar un personaje que no es tuyo." });
        }

        // 3. BORRADO SUAVE (UPDATE en lugar de DELETE)
        await pool.query('UPDATE characters SET is_deleted = true WHERE id = $1', [id]);
        
        res.json({ message: "Personaje enviado al cementerio (Backup guardado)" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener personajes borrados
app.get('/api/graveyard', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM characters WHERE is_deleted = true ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Restaurar personaje (Revivir)
app.put('/api/restore/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE characters SET is_deleted = false WHERE id = $1', [id]);
        res.json({ message: "¡Personaje restaurado!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 3. RUTA MÁGICA: Crear la tabla automáticamente
app.get('/setup', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS characters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                clan VARCHAR(50),
                generation INTEGER,
                type VARCHAR(10),
                notes TEXT
            );
        `);
        res.send("¡Éxito! La tabla 'characters' ha sido creada en la base de datos.");
    } catch (err) {
        console.error(err);
        res.send("Error creando la tabla: " + err.message);
    }
});
// 4. RUTA DE MUERTE FINAL: Borrar personaje
app.delete('/api/characters/:id', async (req, res) => {
    const { id } = req.params; // Captura el ID de la URL
    try {
        await pool.query('DELETE FROM characters WHERE id = $1', [id]);
        res.json({ message: "Personaje enviado al olvido" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// 5. RUTA DE EVOLUCIÓN: Agregar columna de imagen
app.get('/add-image-column', async (req, res) => {
    try {
        await pool.query('ALTER TABLE characters ADD COLUMN image_url TEXT');
        res.send("¡Evolución completa! Ahora la base de datos acepta imágenes.");
    } catch (err) {
        console.error(err);
        res.send("Error (o la columna ya existía): " + err.message);
    }
});
// 6. RUTA DE SETUP DE USUARIOS (Ejecutar una sola vez)
app.get('/setup-users', async (req, res) => {
    try {
        // 1. Crear tabla
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(50) NOT NULL,
                role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'player'))
            );
        `);
        
        // 2. Insertar usuarios por defecto (Si ya existen, dará error, no importa)
        // OJO: En la vida real las contraseñas se encriptan. Aquí van en texto plano por simplicidad.
        await pool.query("INSERT INTO users (username, password, role) VALUES ('narrador', '1234', 'admin')");
        await pool.query("INSERT INTO users (username, password, role) VALUES ('jugador', '1234', 'player')");

        res.send("¡Jerarquía establecida! Usuarios 'narrador' y 'jugador' creados.");
    } catch (err) {
        console.error(err);
        res.send("Error (o ya existían): " + err.message);
    }
});
// 7. RUTA DE LOGIN
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Buscar usuario en la DB
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Devolvemos el rol para que el Frontend sepa qué mostrar
            res.json({ success: true, role: user.role, username: user.username });
        } else {
            res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. RUTA DE EVOLUCIÓN 2: Soporte para Backup y Dueños
app.get('/add-soft-delete', async (req, res) => {
    try {
        await pool.query('ALTER TABLE characters ADD COLUMN created_by VARCHAR(50)');
        await pool.query('ALTER TABLE characters ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE');
        res.send("¡Base de datos preparada para la Nigromancia (Backups)!");
    } catch (err) {
        console.error(err);
        res.send("Error: " + err.message);
    }
});
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
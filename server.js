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
        const result = await pool.query('SELECT * FROM characters ORDER BY id DESC');
        const pcs = result.rows.filter(c => c.type === 'PC');
        const npcs = result.rows.filter(c => c.type === 'NPC');
        res.json({ pcs, npcs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Guardar personaje
app.post('/api/characters', async (req, res) => {
    const { name, clan, generation, type } = req.body;
    try {
        const query = 'INSERT INTO characters (name, clan, generation, type) VALUES ($1, $2, $3, $4) RETURNING *';
        const values = [name, clan, generation, type];
        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
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

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
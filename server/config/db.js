const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Verificación de conexión al iniciar
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error DB:', err.stack);
    } else {
        console.log('✅ Conectado a Neon PostgreSQL');
        release();
    }
});

module.exports = pool;
// server/utils/errorHandler.js

const handleDbError = (res, err, contextMessage = 'Error en la operación') => {
    // 1. Log interno detallado para el desarrollador (siempre)
    console.error(`[DB Error] ${contextMessage}:`, err);

    // 2. Determinar si es un error conocido de Postgres
    // Códigos comunes: 23505 (Unique violation), 23503 (Foreign key violation)
    let clientMessage = contextMessage;
    let statusCode = 500;

    if (err.code === '23505') {
        statusCode = 409; // Conflict
        clientMessage = 'El registro ya existe (dato duplicado).';
    } else if (err.code === '23503') {
        statusCode = 400; // Bad Request
        clientMessage = 'Operación inválida: referencia a un registro que no existe.';
    }

    // 3. Respuesta al cliente (Sanitizada)
    return res.status(statusCode).json({
        success: false,
        error: clientMessage,
        // Solo mostramos detalles técnicos si no estamos en producción
        details: process.env.NODE_ENV === 'production' ? null : err.message
    });
};

module.exports = { handleDbError };
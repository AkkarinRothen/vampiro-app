const cloudinary = require('cloudinary').v2;
// Forzamos la carga del .env aquí por si acaso
require('dotenv').config(); 

// DEBUG: Esto imprimirá en tu terminal si las claves existen o no
console.log("--- CHEQUEO CLOUDINARY ---");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "✅ OK" : "❌ FALTA");
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "✅ OK" : "❌ FALTA");
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "✅ OK" : "❌ FALTA");
console.log("--------------------------");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
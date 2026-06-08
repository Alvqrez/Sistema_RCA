// src/db.js — Pool de conexiones
// M-3: eliminados fallbacks inseguros a "root" / "".
//      Si las variables de entorno no están definidas el proceso falla al arrancar.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mysql = require("mysql2");

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  console.error(
    "❌ FATAL: DB_HOST, DB_USER y DB_NAME son obligatorios en .env",
  );
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "", // contraseña vacía es válida en dev local
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
    return;
  }
  console.log("✅ Conectado a MySQL (pool) 🚀");
  connection.release();
});

module.exports = pool;

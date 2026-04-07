// src/db.js — Pool de conexiones (FIX 11: reconexión automática)
require("dotenv").config();
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "rca_sistema",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verificar conectividad al iniciar
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
    return;
  }
  console.log("✅ Conectado a MySQL (pool) 🚀");
  connection.release();
});

module.exports = pool;

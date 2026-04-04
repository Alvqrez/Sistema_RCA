require('dotenv').config();
const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",    
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME || "rca_sistema",
});

db.connect((err) => {
    if (err) {
        console.error("Error conectando a MySQL:", err);
        return;
    }
    console.log("Conectado a MySQL 🚀");
});

module.exports = db;
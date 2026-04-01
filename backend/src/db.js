const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",      
    password: "Leo2025_",       
    database: "rca_sistema",
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error("Error conectando a MySQL:", err);
        return;
    }
    console.log("Conectado a MySQL 🚀");
});

module.exports = db;
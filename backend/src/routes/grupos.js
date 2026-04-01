const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener grupos
router.get("/", (req, res) => {

    const query = "SELECT * FROM grupo";

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }

        res.json(results);
    });
});

// Crear grupo
router.post("/", (req, res) => {

    const { ClaveMateria } = req.body;

    const query = `
        INSERT INTO grupo (ClaveMateria)
        VALUES (?)
    `;

    db.query(query, [ClaveMateria], (err, result) => {
        if (err) {
            return res.status(500).json(err);
        }

        res.json({
            mensaje: "Grupo creado"
        });
    });
});

module.exports = router;
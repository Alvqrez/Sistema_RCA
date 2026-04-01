const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todos los alumnos
router.get("/", (req, res) => {
    const query = "SELECT * FROM alumno";

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(results);
    });
});

// Registrar alumno
router.post("/", (req, res) => {

    const { Nombre, NumeroControl, IdCarrera } = req.body;

    const query = `
        INSERT INTO alumno (Nombre, NumeroControl, IdCarrera)
        VALUES (?, ?, ?)
    `;

    db.query(query, [Nombre, NumeroControl, IdCarrera], (err, result) => {
        if (err) {
            return res.status(500).json(err);
        }

        res.json({
            mensaje: "Alumno registrado",
            id: result.insertId
        });
    });
});

module.exports = router;
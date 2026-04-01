const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener calificaciones
router.get("/", (req, res) => {

    const query = "SELECT * FROM calificacion_unidad";

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }

        res.json(results);
    });
});

// Registrar calificación
router.post("/", (req, res) => {

    const { Alumno_noControl, idGrupo, calificacion_unidad_final } = req.body;

    const query = `
        INSERT INTO calificacion_unidad (Alumno_noControl, idGrupo, calificacion_unidad_final)
        VALUES (?, ?, ?)
    `;

    db.query(query, [Alumno_noControl, idGrupo, calificacion_unidad_final], (err, result) => {
        if (err) {
            return res.status(500).json(err);
        }

        res.json({
            mensaje: "Calificación registrada"
        });
    });
});

module.exports = router;
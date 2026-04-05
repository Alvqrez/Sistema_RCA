// src/routes/alumnos.js
const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcrypt");
const db       = require("../db");
const { verificarToken, soloMaestro } = require("../middleware/auth");

// GET — todos los alumnos
router.get("/", verificarToken, (req, res) => {

    db.query("SELECT matricula, nombre, apellido_paterno, apellido_materno, correo_institucional, id_carrera FROM Alumno", (err, results) => {

        if (err) return res.status(500).json({ error: "Error interno del servidor" });

        res.json(results);

    });

});

// GET — un alumno por matrícula
router.get("/:matricula", verificarToken, (req, res) => {

    db.query(
        "SELECT matricula, nombre, apellido_paterno, apellido_materno, correo_institucional, id_carrera FROM Alumno WHERE matricula = ?",
        [req.params.matricula],
        (err, results) => {

            if (err) return res.status(500).json({ error: "Error interno del servidor" });

            if (results.length === 0) return res.status(404).json({ error: "Alumno no encontrado" });

            res.json(results[0]);

        }
    );

});

// POST — registrar alumno (solo maestro)
// src/routes/alumnos.js — solo el POST corregido
router.post("/", soloMaestro, async (req, res) => {

    const { nombre, apellido_paterno, apellido_materno, matricula,
            id_carrera, correo_institucional, username, password } = req.body;

    if (!nombre || !matricula || !id_carrera || !correo_institucional || !username || !password) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    try {
        const hash = await bcrypt.hash(password, 10);

        // 1. Inserta en alumno (sin usuario ni password — esos campos ya no se usan)
        const queryAlumno = `
            INSERT INTO alumno (matricula, nombre, apellido_paterno, apellido_materno, id_carrera, correo_institucional)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(queryAlumno, [matricula, nombre, apellido_paterno, apellido_materno ?? null, id_carrera, correo_institucional], (err) => {

            if (err) {
                if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "La matrícula ya existe" });
                return res.status(500).json({ error: "Error interno del servidor" });
            }

            // 2. Crea el acceso en la tabla usuario
            db.query(
                `INSERT INTO usuario (username, pwd, rol, id_referencia) VALUES (?, ?, 'alumno', ?)`,
                [username, hash, matricula],
                (err2) => {
                    if (err2) {
                        if (err2.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "El username ya existe" });
                        return res.status(500).json({ error: "Error interno del servidor" });
                    }
                    res.status(201).json({ success: true, mensaje: "Alumno registrado" });
                }
            );

        });

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor" });
    }

});

// PUT — editar alumno (solo maestro)
router.put("/:matricula", soloMaestro, (req, res) => {

    const { nombre, apellido_paterno, apellido_materno, correo_institucional, id_carrera } = req.body;

    if (!nombre || !apellido_paterno || !correo_institucional) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const query = `
        UPDATE Alumno
        SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, correo_institucional = ?, id_carrera = ?
        WHERE matricula = ?
    `;

    db.query(query, [nombre, apellido_paterno, apellido_materno ?? null, correo_institucional, id_carrera, req.params.matricula], (err, result) => {

        if (err) return res.status(500).json({ error: "Error interno del servidor" });

        if (result.affectedRows === 0) return res.status(404).json({ error: "Alumno no encontrado" });

        res.json({ success: true, mensaje: "Alumno actualizado" });

    });

});

// DELETE — eliminar alumno (solo maestro)
router.delete("/:matricula", soloMaestro, (req, res) => {

    db.query("DELETE FROM Alumno WHERE matricula = ?", [req.params.matricula], (err, result) => {

        if (err) return res.status(500).json({ error: "Error interno del servidor" });

        if (result.affectedRows === 0) return res.status(404).json({ error: "Alumno no encontrado" });

        res.json({ success: true, mensaje: "Alumno eliminado" });

    });

});

module.exports = router;
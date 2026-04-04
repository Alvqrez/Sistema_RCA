// src/routes/calificaciones.js
const express  = require("express");
const router   = express.Router();
const db       = require("../db");
const calculo  = require("../services/calculo");
const { verificarToken, soloMaestro } = require("../middleware/auth");

// GET — todas las calificaciones de unidad
router.get("/", verificarToken, (req, res) => {

    const query = `
        SELECT
            cu.matricula,
            CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
            cu.id_unidad,
            u.nombre_unidad,
            cu.id_grupo,
            cu.promedio_ponderado,
            cu.calificacion_unidad_final,
            cu.estatus_unidad
        FROM calificacion_unidad cu
        JOIN Alumno a ON cu.matricula  = a.matricula
        JOIN Unidad u ON cu.id_unidad  = u.id_unidad
    `;

    db.query(query, (err, results) => {

        if (err) return res.status(500).json({ error: "Error interno del servidor" });

        res.json(results);

    });

});

// GET — calificaciones de un alumno específico
router.get("/alumno/:matricula", verificarToken, (req, res) => {

    const query = `
        SELECT
            cu.id_unidad,
            u.nombre_unidad,
            cu.id_grupo,
            cu.promedio_ponderado,
            cu.calificacion_unidad_final,
            cu.estatus_unidad
        FROM calificacion_unidad cu
        JOIN Unidad u ON cu.id_unidad = u.id_unidad
        WHERE cu.matricula = ?
    `;

    db.query(query, [req.params.matricula], (err, results) => {

        if (err) return res.status(500).json({ error: "Error interno del servidor" });

        res.json(results);

    });

});

// POST — registrar calificación manualmente (solo maestro)
router.post("/", soloMaestro, (req, res) => {

    const { matricula, id_grupo, id_unidad, calificacion_unidad_final } = req.body;

    if (!matricula || !id_grupo || !id_unidad || calificacion_unidad_final === undefined) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    if (calificacion_unidad_final < 0 || calificacion_unidad_final > 100) {
        return res.status(400).json({ error: "La calificación debe estar entre 0 y 100" });
    }

    const estatus = calificacion_unidad_final >= 60 ? "Aprobada" : "Reprobada";

    const query = `
        INSERT INTO calificacion_unidad (matricula, id_grupo, id_unidad, calificacion_unidad_final, estatus_unidad)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            calificacion_unidad_final = VALUES(calificacion_unidad_final),
            estatus_unidad            = VALUES(estatus_unidad)
    `;

    db.query(query, [matricula, id_grupo, id_unidad, calificacion_unidad_final, estatus], (err) => {

        if (err) return res.status(500).json({ error: "Error interno del servidor" });

        res.status(201).json({ success: true, mensaje: "Calificación registrada" });

    });

});

// POST — calcular y cerrar calificación de unidad automáticamente (solo maestro)
router.post("/calcular-unidad", soloMaestro, async (req, res) => {

    const { matricula, id_unidad, id_grupo } = req.body;

    if (!matricula || !id_unidad || !id_grupo) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    try {
        const resultado = await calculo.cerrarUnidad(matricula, id_unidad, id_grupo);
        res.json({ success: true, ...resultado });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error interno del servidor" });
    }

});

// POST — calcular calificación final de la materia (solo maestro)
router.post("/calcular-final", soloMaestro, async (req, res) => {

    const { matricula, id_grupo } = req.body;

    if (!matricula || !id_grupo) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    try {
        const resultado = await calculo.calcularCalificacionFinal(matricula, id_grupo);
        res.json({ success: true, ...resultado });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error interno del servidor" });
    }

});

// GET — calificación final de un alumno en un grupo
router.get("/final/:matricula/:id_grupo", verificarToken, (req, res) => {

    const query = `
        SELECT
            cf.matricula,
            CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
            cf.id_grupo,
            cf.promedio_unidades,
            cf.calificacion_oficial,
            cf.estatus_final
        FROM calificacion_final cf
        JOIN Alumno a ON cf.matricula = a.matricula
        WHERE cf.matricula = ? AND cf.id_grupo = ?
    `;

    db.query(query, [req.params.matricula, req.params.id_grupo], (err, results) => {

        if (err) return res.status(500).json({ error: "Error interno del servidor" });

        if (results.length === 0) return res.status(404).json({ error: "Calificación final no encontrada" });

        res.json(results[0]);

    });

});

module.exports = router;
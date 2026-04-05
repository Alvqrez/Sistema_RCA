// src/routes/unidades.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const { verificarToken, soloMaestro } = require("../middleware/auth");

router.get("/", verificarToken, (req, res) => {
    db.query("SELECT * FROM unidad ORDER BY clave_materia, id_unidad", (err, results) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        res.json(results);
    });
});

router.get("/:id", verificarToken, (req, res) => {
    db.query("SELECT * FROM unidad WHERE id_unidad = ?", [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        if (results.length === 0) return res.status(404).json({ error: "Unidad no encontrada" });
        res.json(results[0]);
    });
});

// Unidades de una materia específica
router.get("/materia/:clave", verificarToken, (req, res) => {
    db.query("SELECT * FROM unidad WHERE clave_materia = ? ORDER BY id_unidad", [req.params.clave], (err, results) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        res.json(results);
    });
});

router.post("/", soloMaestro, (req, res) => {

    const { clave_materia, nombre_unidad, temario, estatus, fecha_cierre } = req.body;

    if (!clave_materia || !nombre_unidad) {
        return res.status(400).json({ error: "Clave de materia y nombre son requeridos" });
    }

    db.query(
        `INSERT INTO unidad (clave_materia, nombre_unidad, temario, estatus, fecha_cierre)
         VALUES (?, ?, ?, ?, ?)`,
        [clave_materia, nombre_unidad, temario ?? null, estatus ?? "Pendiente", fecha_cierre ?? null],
        (err, result) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(201).json({ success: true, mensaje: "Unidad registrada", id_unidad: result.insertId });
        }
    );

});

router.put("/:id", soloMaestro, (req, res) => {

    const { nombre_unidad, temario, estatus, fecha_cierre } = req.body;

    db.query(
        `UPDATE unidad SET nombre_unidad = ?, temario = ?, estatus = ?, fecha_cierre = ? WHERE id_unidad = ?`,
        [nombre_unidad, temario ?? null, estatus ?? "Pendiente", fecha_cierre ?? null, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Unidad no encontrada" });
            res.json({ success: true, mensaje: "Unidad actualizada" });
        }
    );

});

router.delete("/:id", soloMaestro, (req, res) => {
    db.query("DELETE FROM unidad WHERE id_unidad = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Unidad no encontrada" });
        res.json({ success: true, mensaje: "Unidad eliminada" });
    });
});

module.exports = router;
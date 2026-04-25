// src/routes/materia_actividades.js
// Actividades definidas por el Administrador para cada materia/unidad
// El Maestro las elige al configurar su grupo.

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const { verificarToken, soloAdmin, maestroOAdmin } = require("../middleware/auth");

// GET — actividades de una materia (todas sus unidades)
router.get("/materia/:clave", verificarToken, (req, res) => {
  db.query(
    `SELECT ma.*, ta.nombre AS nombre_tipo
       FROM materia_actividad ma
       LEFT JOIN tipo_actividad ta ON ma.id_tipo = ta.id_tipo
      WHERE ma.clave_materia = ?
      ORDER BY ma.id_unidad, ma.nombre_actividad`,
    [req.params.clave],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.json(rows);
    }
  );
});

// GET — actividades de una unidad específica
router.get("/unidad/:id_unidad", verificarToken, (req, res) => {
  db.query(
    `SELECT ma.*, ta.nombre AS nombre_tipo
       FROM materia_actividad ma
       LEFT JOIN tipo_actividad ta ON ma.id_tipo = ta.id_tipo
      WHERE ma.id_unidad = ?
      ORDER BY ma.nombre_actividad`,
    [req.params.id_unidad],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.json(rows);
    }
  );
});

// POST — crear actividad de materia (solo Admin)
router.post("/", soloAdmin, (req, res) => {
  const { clave_materia, id_unidad, nombre_actividad, id_tipo } = req.body;
  if (!clave_materia || !id_unidad || !nombre_actividad) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  db.query(
    `INSERT INTO materia_actividad (clave_materia, id_unidad, nombre_actividad, id_tipo)
     VALUES (?, ?, ?, ?)`,
    [clave_materia, id_unidad, nombre_actividad.trim(), id_tipo || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.status(201).json({ success: true, id: result.insertId });
    }
  );
});

// DELETE — eliminar actividad de materia (solo Admin)
router.delete("/:id", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM materia_actividad WHERE id_mat_act = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Actividad no encontrada" });
      res.json({ success: true });
    }
  );
});

module.exports = router;

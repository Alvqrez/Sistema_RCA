// src/routes/config_evaluacion.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, maestroOAdmin } = require("../middleware/auth");

// GET — config de una unidad en un grupo
router.get("/:id_grupo/:id_unidad", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM config_evaluacion_unidad WHERE id_grupo = ? AND id_unidad = ?",
    [req.params.id_grupo, req.params.id_unidad],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      // Si no hay config, devuelve valores por defecto
      res.json(
        rows[0] || {
          id_grupo: parseInt(req.params.id_grupo),
          id_unidad: parseInt(req.params.id_unidad),
          pct_actividades: 60,
          pct_examen: 30,
          pct_asistencia: 10,
          cal_examen: null,
          nota: null,
        },
      );
    },
  );
});

// GET — todas las configs de un grupo
router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  db.query(
    `SELECT c.*, u.nombre_unidad
         FROM config_evaluacion_unidad c
         JOIN unidad u ON c.id_unidad = u.id_unidad
         WHERE c.id_grupo = ?
         ORDER BY c.id_unidad`,
    [req.params.id_grupo],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(rows);
    },
  );
});

// POST/PUT — guardar config (upsert)
router.post("/", maestroOAdmin, (req, res) => {
  const {
    id_grupo,
    id_unidad,
    pct_actividades,
    pct_examen,
    pct_asistencia,
    nota,
  } = req.body;

  if (!id_grupo || !id_unidad) {
    return res
      .status(400)
      .json({ error: "id_grupo e id_unidad son requeridos" });
  }

  const pA = parseFloat(pct_actividades) || 60;
  const pE = parseFloat(pct_examen) || 30;
  const pAs = parseFloat(pct_asistencia) || 10;

  if (Math.abs(pA + pE + pAs - 100) > 0.01) {
    return res.status(400).json({
      error: `Los porcentajes deben sumar 100%. Actualmente suman ${(pA + pE + pAs).toFixed(1)}%`,
    });
  }

  db.query(
    `INSERT INTO config_evaluacion_unidad
            (id_grupo, id_unidad, pct_actividades, pct_examen, pct_asistencia, nota)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            pct_actividades = VALUES(pct_actividades),
            pct_examen      = VALUES(pct_examen),
            pct_asistencia  = VALUES(pct_asistencia),
            nota            = VALUES(nota)`,
    [id_grupo, id_unidad, pA, pE, pAs, nota ?? null],
    (err) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json({ success: true, mensaje: "Configuración guardada" });
    },
  );
});

module.exports = router;

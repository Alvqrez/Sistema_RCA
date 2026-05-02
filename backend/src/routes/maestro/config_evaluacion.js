const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, maestroOAdmin } = require("../../middleware/auth");

router.get("/:id_grupo/:id_unidad", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM config_evaluacion_unidad WHERE id_grupo = ? AND id_unidad = ?",
    [req.params.id_grupo, req.params.id_unidad],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
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

router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  db.query(
    `SELECT c.*, u.nombre_unidad
     FROM config_evaluacion_unidad c
     JOIN unidad u ON c.id_unidad = u.id_unidad
     WHERE c.id_grupo = ? ORDER BY c.id_unidad`,
    [req.params.id_grupo],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(rows);
    },
  );
});

router.post("/", maestroOAdmin, (req, res) => {
  const {
    id_grupo,
    id_unidad,
    pct_actividades,
    pct_examen,
    pct_asistencia,
    nota,
  } = req.body;

  if (!id_grupo || id_unidad == null)
    return res
      .status(400)
      .json({ error: "id_grupo e id_unidad son requeridos" });

  // Usar 0 como default real — no || que convierte 0 en el default original
  const pA = isNaN(parseFloat(pct_actividades))
    ? 0
    : parseFloat(pct_actividades);
  const pE = isNaN(parseFloat(pct_examen)) ? 0 : parseFloat(pct_examen);
  const pAs = isNaN(parseFloat(pct_asistencia))
    ? 0
    : parseFloat(pct_asistencia);

  // Validar la suma: si viene nota (rubros personalizados), usar la suma total de nota
  let totalSum = pA + pE + pAs;
  if (nota) {
    try {
      const fullPcts = JSON.parse(nota);
      const sumaNota = Object.values(fullPcts).reduce(
        (s, v) => s + (parseFloat(v) || 0),
        0,
      );
      if (sumaNota > 0) totalSum = sumaNota;
    } catch (_) {}
  }

  if (Math.abs(totalSum - 100) > 0.5) {
    return res.status(400).json({
      error: `Los porcentajes deben sumar 100%. Actualmente: ${totalSum.toFixed(1)}%`,
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
        return res
          .status(500)
          .json({
            error: "Error al guardar en base de datos",
            detail: err.message,
          });
      res.json({ success: true });
    },
  );
});

module.exports = router;

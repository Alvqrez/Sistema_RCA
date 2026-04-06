// src/routes/actividades.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, maestroOAdmin } = require("../middleware/auth");

router.get("/", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM actividad ORDER BY id_grupo, id_unidad, id_actividad",
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r);
    },
  );
});

router.post("/", maestroOAdmin, (req, res) => {
  const {
    id_grupo,
    id_unidad,
    nombre_actividad,
    ponderacion,
    tipo_evaluacion,
    fecha_entrega,
  } = req.body;
  if (!id_grupo || !id_unidad || !nombre_actividad || !ponderacion) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  db.query(
    `INSERT INTO actividad (id_grupo, id_unidad, nombre_actividad, ponderacion, tipo_evaluacion, fecha_entrega)
         VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id_grupo,
      id_unidad,
      nombre_actividad,
      ponderacion,
      tipo_evaluacion ?? "Sumativa",
      fecha_entrega ?? null,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.status(201).json({ success: true, id_actividad: result.insertId });
    },
  );
});

router.delete("/:id", maestroOAdmin, (req, res) => {
  db.query(
    "DELETE FROM actividad WHERE id_actividad = ?",
    [req.params.id],
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (r.affectedRows === 0)
        return res.status(404).json({ error: "No encontrada" });
      res.json({ success: true });
    },
  );
});

module.exports = router;

// src/routes/carreras.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, soloAdmin } = require("../middleware/auth");

// GET — todas las carreras (cualquier usuario logueado las necesita para formularios)
router.get("/", verificarToken, (req, res) => {
  db.query(
    "SELECT id_carrera, nombre_carrera FROM carrera ORDER BY nombre_carrera",
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// POST — crear carrera (solo admin)
router.post("/", soloAdmin, (req, res) => {
  const {
    id_carrera,
    nombre_carrera,
    siglas,
    plan_estudios,
    total_semestres,
    total_creditos,
  } = req.body;

  if (!id_carrera || !nombre_carrera) {
    return res.status(400).json({ error: "ID y nombre son requeridos" });
  }

  db.query(
    `INSERT INTO carrera (id_carrera, nombre_carrera, siglas, plan_estudios, total_semestres, total_creditos)
         VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id_carrera,
      nombre_carrera,
      siglas ?? null,
      plan_estudios ?? null,
      total_semestres ?? null,
      total_creditos ?? null,
    ],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ error: "La carrera ya existe" });
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.status(201).json({ success: true, mensaje: "Carrera registrada" });
    },
  );
});

module.exports = router;

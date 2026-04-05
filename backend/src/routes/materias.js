// src/routes/materias.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, soloAdmin } = require("../middleware/auth");

// GET — todas las materias
router.get("/", verificarToken, (req, res) => {
  db.query("SELECT * FROM Materia", (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });

    res.json(results);
  });
});

// GET — una materia por clave
router.get("/:clave", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM Materia WHERE clave_materia = ?",
    [req.params.clave],
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      if (results.length === 0)
        return res.status(404).json({ error: "Materia no encontrada" });

      res.json(results[0]);
    },
  );
});

// POST — crear materia
router.post("/", soloAdmin, (req, res) => {
  const {
    clave_materia,
    nombre_materia,
    creditos_totales,
    horas_teoricas,
    horas_practicas,
    no_unidades,
  } = req.body;

  if (!clave_materia || !nombre_materia) {
    return res.status(400).json({ error: "Clave y nombre son requeridos" });
  }

  const query = `
        INSERT INTO Materia (clave_materia, nombre_materia, creditos_totales, horas_teoricas, horas_practicas, no_unidades)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

  db.query(
    query,
    [
      clave_materia,
      nombre_materia,
      creditos_totales ?? 0,
      horas_teoricas ?? 0,
      horas_practicas ?? 0,
      no_unidades ?? 0,
    ],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res
            .status(409)
            .json({ error: "La clave de materia ya existe" });
        return res.status(500).json({ error: "Error interno del servidor" });
      }

      res.status(201).json({ success: true, mensaje: "Materia registrada" });
    },
  );
});

// PUT — editar materia
router.put("/:clave", soloAdmin, (req, res) => {
  const {
    nombre_materia,
    creditos_totales,
    horas_teoricas,
    horas_practicas,
    no_unidades,
  } = req.body;

  if (!nombre_materia) {
    return res.status(400).json({ error: "El nombre es requerido" });
  }

  const query = `
        UPDATE Materia
        SET nombre_materia = ?, creditos_totales = ?, horas_teoricas = ?, horas_practicas = ?, no_unidades = ?
        WHERE clave_materia = ?
    `;

  db.query(
    query,
    [
      nombre_materia,
      creditos_totales ?? 0,
      horas_teoricas ?? 0,
      horas_practicas ?? 0,
      no_unidades ?? 0,
      req.params.clave,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Materia no encontrada" });

      res.json({ success: true, mensaje: "Materia actualizada" });
    },
  );
});

// DELETE — eliminar materia
router.delete("/:clave", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM Materia WHERE clave_materia = ?",
    [req.params.clave],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Materia no encontrada" });

      res.json({ success: true, mensaje: "Materia eliminada" });
    },
  );
});

module.exports = router;

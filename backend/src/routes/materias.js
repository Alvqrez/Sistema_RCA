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

router.post("/csv", soloAdmin, (req, res) => {
  const { materias } = req.body;

  if (!Array.isArray(materias) || materias.length === 0)
    return res.status(400).json({ error: "No se recibieron datos" });

  const errores = [];
  let insertados = 0;
  let pendientes = materias.length;

  const finalizar = () => {
    if (--pendientes === 0)
      res.json({
        success: true,
        insertados,
        errores,
        mensaje: `${insertados} materia(s) importadas. ${errores.length} con errores.`,
      });
  };

  for (const mat of materias) {
    const { clave_materia, nombre_materia } = mat;

    if (!clave_materia || !nombre_materia) {
      errores.push({
        clave: clave_materia || "?",
        motivo: "clave_materia y nombre_materia son obligatorios",
      });
      finalizar();
      continue;
    }

    db.query(
      `INSERT INTO materia
         (clave_materia, nombre_materia, creditos_totales,
          horas_teoricas, horas_practicas, no_unidades)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nombre_materia   = VALUES(nombre_materia),
         creditos_totales = VALUES(creditos_totales),
         no_unidades      = VALUES(no_unidades)`,
      [
        clave_materia.trim(),
        nombre_materia.trim(),
        parseInt(mat.creditos_totales) || 0,
        parseInt(mat.horas_teoricas) || 0,
        parseInt(mat.horas_practicas) || 0,
        parseInt(mat.no_unidades) || 3,
      ],
      (err) => {
        if (err) errores.push({ clave: clave_materia, motivo: err.message });
        else insertados++;
        finalizar();
      },
    );
  }
});

module.exports = router;

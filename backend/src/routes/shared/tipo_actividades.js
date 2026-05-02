// src/routes/tipo_actividades.js
// Catálogo de tipos de actividad
// GET  /       → cualquier usuario autenticado (para que el maestro liste el catálogo)
// POST /       → solo administrador
// PUT  /:id    → solo administrador
// DELETE /:id  → solo administrador

const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// GET — listar todos los tipos activos (o todos si es admin)
router.get("/", verificarToken, (req, res) => {
  const soloActivos = req.usuario.rol !== "administrador";
  const sql = soloActivos
    ? "SELECT * FROM tipo_actividad WHERE activo = 1 ORDER BY nombre"
    : "SELECT * FROM tipo_actividad ORDER BY activo DESC, nombre";

  db.query(sql, (err, rows) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(rows);
  });
});

// GET /:id — detalle de un tipo
router.get("/:id", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM tipo_actividad WHERE id_tipo = ?",
    [req.params.id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!rows.length)
        return res.status(404).json({ error: "Tipo no encontrado" });
      res.json(rows[0]);
    },
  );
});

// POST — crear tipo (solo admin)
router.post("/", soloAdmin, (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre del tipo es requerido" });
  }
  db.query(
    "INSERT INTO tipo_actividad (nombre, descripcion) VALUES (?, ?)",
    [nombre.trim(), descripcion ?? null],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ error: "Ya existe un tipo con ese nombre" });
        }
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res
        .status(201)
        .json({
          success: true,
          id_tipo: result.insertId,
          mensaje: "Tipo registrado",
        });
    },
  );
});

// PUT /:id — editar tipo (solo admin)
router.put("/:id", soloAdmin, (req, res) => {
  const { nombre, descripcion, activo } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre es requerido" });
  }
  db.query(
    `UPDATE tipo_actividad
        SET nombre      = ?,
            descripcion = ?,
            activo      = ?
      WHERE id_tipo = ?`,
    [
      nombre.trim(),
      descripcion ?? null,
      activo !== undefined ? activo : 1,
      req.params.id,
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ error: "Ya existe un tipo con ese nombre" });
        }
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      if (!result.affectedRows)
        return res.status(404).json({ error: "Tipo no encontrado" });
      res.json({ success: true, mensaje: "Tipo actualizado" });
    },
  );
});

// DELETE /:id — eliminar tipo (solo admin)
// No elimina si hay actividades usando este tipo (FK protege)
router.delete("/:id", soloAdmin, (req, res) => {
  // Verificar si hay actividades usando este tipo
  db.query(
    "SELECT COUNT(*) AS total FROM actividad WHERE id_tipo_actividad = ?",
    [req.params.id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (rows[0].total > 0) {
        return res.status(409).json({
          error: `No se puede eliminar: ${rows[0].total} actividad(es) usan este tipo. Desactívalo en su lugar.`,
        });
      }
      db.query(
        "DELETE FROM tipo_actividad WHERE id_tipo = ?",
        [req.params.id],
        (err2, result) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          if (!result.affectedRows)
            return res.status(404).json({ error: "Tipo no encontrado" });
          res.json({ success: true, mensaje: "Tipo eliminado" });
        },
      );
    },
  );
});

module.exports = router;

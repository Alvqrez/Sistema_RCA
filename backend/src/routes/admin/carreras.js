// src/routes/admin/carreras.js
const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// GET — todas las carreras (admin ve todas, incluye estatus)
router.get("/", verificarToken, (req, res) => {
  // Si tiene query ?soloAceptadas, filtrar (para selects del sistema)
  const filtro =
    req.query.soloAceptadas === "1" ? "WHERE estatus = 'Aceptada'" : "";
  db.query(
    `SELECT id_carrera, nombre_carrera, siglas, plan_estudios,
            total_semestres, total_creditos, estatus, creado_por, aprobado_por, fecha_creacion
     FROM carrera ${filtro} ORDER BY nombre_carrera`,
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// GET por id
router.get("/:id", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM carrera WHERE id_carrera = ?",
    [req.params.id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!rows.length) return res.status(404).json({ error: "No encontrada" });
      res.json(rows[0]);
    },
  );
});

// POST — crear carrera en estatus Pendiente
router.post("/", soloAdmin, (req, res) => {
  const {
    id_carrera,
    nombre_carrera,
    siglas,
    plan_estudios,
    total_semestres,
    total_creditos,
  } = req.body;
  const creado_por =
    req.usuario?.id_referencia || req.usuario?.username || null;

  if (!id_carrera || !nombre_carrera)
    return res.status(400).json({ error: "ID y nombre son requeridos" });

  db.query(
    `INSERT INTO carrera (id_carrera, nombre_carrera, siglas, plan_estudios, total_semestres, total_creditos, estatus, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, 'Pendiente', ?)`,
    [
      id_carrera,
      nombre_carrera,
      siglas ?? null,
      plan_estudios ?? null,
      total_semestres ?? null,
      total_creditos ?? null,
      creado_por,
    ],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ error: "La carrera ya existe" });
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.status(201).json({
        success: true,
        mensaje: "Carrera creada y pendiente de aprobación",
      });
    },
  );
});

// PUT /:id/aprobar — otro admin aprueba la carrera
router.put("/:id/aprobar", soloAdmin, (req, res) => {
  const aprobado_por =
    req.usuario?.id_referencia || req.usuario?.username || null;
  const id = req.params.id;

  // Verificar que no sea el mismo admin que la creó
  db.query(
    "SELECT creado_por, estatus FROM carrera WHERE id_carrera = ?",
    [id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!rows.length)
        return res.status(404).json({ error: "Carrera no encontrada" });
      if (rows[0].estatus !== "Pendiente")
        return res.status(409).json({ error: "La carrera ya fue procesada" });
      if (rows[0].creado_por === aprobado_por)
        return res.status(403).json({
          error: "No puedes aprobar una carrera que tú mismo creaste",
        });

      db.query(
        "UPDATE carrera SET estatus='Aceptada', aprobado_por=? WHERE id_carrera=?",
        [aprobado_por, id],
        (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          res.json({
            success: true,
            mensaje: "Carrera aceptada correctamente",
          });
        },
      );
    },
  );
});

// PUT /:id/rechazar — admin rechaza y elimina la carrera
router.put("/:id/rechazar", soloAdmin, (req, res) => {
  const id = req.params.id;
  db.query(
    "SELECT estatus FROM carrera WHERE id_carrera = ?",
    [id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!rows.length)
        return res.status(404).json({ error: "Carrera no encontrada" });
      if (rows[0].estatus !== "Pendiente")
        return res
          .status(409)
          .json({ error: "Solo se pueden rechazar carreras pendientes" });

      db.query("DELETE FROM carrera WHERE id_carrera=?", [id], (err2) => {
        if (err2)
          return res.status(500).json({ error: "Error interno del servidor" });
        res.json({ success: true, mensaje: "Carrera rechazada y eliminada" });
      });
    },
  );
});

// PUT — editar carrera
router.put("/:id", soloAdmin, (req, res) => {
  const {
    nombre_carrera,
    siglas,
    plan_estudios,
    total_semestres,
    total_creditos,
  } = req.body;
  if (!nombre_carrera)
    return res.status(400).json({ error: "El nombre es requerido" });

  db.query(
    `UPDATE carrera
     SET nombre_carrera=?, siglas=?, plan_estudios=?, total_semestres=?, total_creditos=?
     WHERE id_carrera=?`,
    [
      nombre_carrera,
      siglas ?? null,
      plan_estudios ?? null,
      total_semestres ?? null,
      total_creditos ?? null,
      req.params.id,
    ],
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!r.affectedRows)
        return res.status(404).json({ error: "Carrera no encontrada" });
      res.json({ success: true, mensaje: "Carrera actualizada" });
    },
  );
});

// DELETE — eliminar carrera
router.delete("/:id", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM carrera WHERE id_carrera=?",
    [req.params.id],
    (err, r) => {
      if (err) {
        if (err.code === "ER_ROW_IS_REFERENCED_2")
          return res.status(409).json({
            error: "No se puede eliminar: hay alumnos o retículas vinculadas",
          });
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      if (!r.affectedRows)
        return res.status(404).json({ error: "Carrera no encontrada" });
      res.json({ success: true, mensaje: "Carrera eliminada" });
    },
  );
});

module.exports = router;

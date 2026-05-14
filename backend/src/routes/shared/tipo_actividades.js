// src/routes/shared/tipo_actividades.js
// Catálogo global de actividades evaluables (tabla tipo_actividad)
// GET  /        → cualquier usuario autenticado
// POST /        → solo administrador
// POST /csv     → solo administrador (importación masiva)
// PUT  /:id     → solo administrador
// DELETE /:id   → solo administrador

const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// GET — listar todas (admin ve todas; maestro/alumno solo las activas)
router.get("/", verificarToken, (req, res) => {
  const soloActivos = req.usuario.rol !== "administrador";
  const sql = soloActivos
    ? "SELECT id_tipo, nombre, descripcion FROM tipo_actividad WHERE activo = 1 ORDER BY nombre"
    : "SELECT id_tipo, nombre, descripcion FROM tipo_actividad ORDER BY nombre";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: "Error interno del servidor" });
    res.json(rows);
  });
});

// GET /:id — detalle
router.get("/:id", verificarToken, (req, res) => {
  db.query(
    "SELECT id_tipo, nombre, descripcion FROM tipo_actividad WHERE id_tipo = ?",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (!rows.length) return res.status(404).json({ error: "Actividad no encontrada" });
      res.json(rows[0]);
    }
  );
});

// POST — crear actividad
router.post("/", soloAdmin, (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre || !nombre.trim())
    return res.status(400).json({ error: "El nombre es requerido" });

  db.query(
    "INSERT INTO tipo_actividad (nombre, descripcion, activo) VALUES (?, ?, 1)",
    [nombre.trim(), descripcion?.trim() || null],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ error: "Ya existe una actividad con ese nombre" });
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.status(201).json({ success: true, id_tipo: result.insertId, mensaje: "Actividad registrada" });
    }
  );
});

// POST /csv — importación masiva
// Body: { actividades: [ { nombre, descripcion? }, ... ] }
// Inserta nuevas; si el nombre ya existe lo actualiza con la descripción del CSV.
router.post("/csv", soloAdmin, (req, res) => {
  const { actividades } = req.body;
  if (!Array.isArray(actividades) || !actividades.length)
    return res.status(400).json({ error: "No se recibieron datos" });

  const errores = [];
  let insertadas = 0;
  let actualizadas = 0;
  let pendientes = actividades.length;

  const finalizar = () => {
    if (--pendientes === 0)
      res.json({
        success: true,
        insertadas,
        actualizadas,
        errores,
        mensaje: `${insertadas} insertada(s), ${actualizadas} actualizada(s). ${errores.length} error(es).`,
      });
  };

  for (const act of actividades) {
    const nombre = (act.nombre || "").trim();
    const descripcion = (act.descripcion || "").trim() || null;

    if (!nombre) {
      errores.push({ nombre: "?", motivo: "Nombre vacío" });
      finalizar();
      continue;
    }

    db.query(
      `INSERT INTO tipo_actividad (nombre, descripcion, activo) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)`,
      [nombre, descripcion],
      (err, result) => {
        if (err) {
          errores.push({ nombre, motivo: err.message });
        } else if (result.affectedRows === 1) {
          insertadas++;
        } else if (result.affectedRows === 2) {
          // ON DUPLICATE KEY UPDATE cuenta como 2 filas afectadas
          actualizadas++;
        }
        finalizar();
      }
    );
  }
});

// PUT /:id — editar (activo siempre se mantiene en 1, no se expone en UI)
router.put("/:id", soloAdmin, (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre || !nombre.trim())
    return res.status(400).json({ error: "El nombre es requerido" });

  db.query(
    "UPDATE tipo_actividad SET nombre = ?, descripcion = ? WHERE id_tipo = ?",
    [nombre.trim(), descripcion?.trim() || null, req.params.id],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ error: "Ya existe una actividad con ese nombre" });
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      if (!result.affectedRows)
        return res.status(404).json({ error: "Actividad no encontrada" });
      res.json({ success: true, mensaje: "Actividad actualizada" });
    }
  );
});

// DELETE /:id — eliminar si no está en uso
router.delete("/:id", soloAdmin, (req, res) => {
  db.query(
    "SELECT COUNT(*) AS total FROM actividad WHERE id_tipo_actividad = ?",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (rows[0].total > 0)
        return res.status(409).json({
          error: `No se puede eliminar: ${rows[0].total} actividad(es) de grupos la usan.`,
        });

      db.query(
        "DELETE FROM tipo_actividad WHERE id_tipo = ?",
        [req.params.id],
        (err2, result) => {
          if (err2) return res.status(500).json({ error: "Error interno del servidor" });
          if (!result.affectedRows)
            return res.status(404).json({ error: "Actividad no encontrada" });
          res.json({ success: true, mensaje: "Actividad eliminada" });
        }
      );
    }
  );
});

module.exports = router;

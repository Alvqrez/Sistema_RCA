// src/routes/shared/notificaciones.js
// CRUD de notificaciones del sistema RCA
// GET  /api/notificaciones          — lista filtrada por rol del token
// POST /api/notificaciones          — crear aviso (solo admin)
// PUT  /api/notificaciones/:id      — editar aviso (solo admin)
// DELETE /api/notificaciones/:id    — desactivar aviso (solo admin)

const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// ── GET — notificaciones activas para el rol del usuario autenticado ──────────
router.get("/", verificarToken, (req, res) => {
  const rol = req.usuario.rol; // 'administrador' | 'maestro' | 'alumno'

  const sql = `
    SELECT id_notificacion, titulo, mensaje, tipo, icono, rol_destino,
           url_accion, fecha_inicio, fecha_fin, fecha_creacion
    FROM notificacion
    WHERE activa = 1
      AND (rol_destino = 'todos' OR rol_destino = ?)
      AND (fecha_inicio IS NULL OR fecha_inicio <= CURDATE())
      AND (fecha_fin   IS NULL OR fecha_fin   >= CURDATE())
    ORDER BY fecha_creacion DESC
  `;

  db.query(sql, [rol], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error interno del servidor" });
    res.json(rows || []);
  });
});

// ── POST — crear notificación (solo admin) ────────────────────────────────────
router.post("/", soloAdmin, (req, res) => {
  const {
    titulo, mensaje, tipo = "info", icono = "lucide:bell",
    rol_destino = "todos", url_accion = null,
    fecha_inicio = null, fecha_fin = null,
  } = req.body;

  if (!titulo || !mensaje)
    return res.status(400).json({ error: "Título y mensaje son requeridos" });

  const tipos_validos = ["info", "warning", "danger", "success"];
  if (!tipos_validos.includes(tipo))
    return res.status(400).json({ error: "Tipo inválido" });

  const roles_validos = ["todos", "administrador", "maestro", "alumno"];
  if (!roles_validos.includes(rol_destino))
    return res.status(400).json({ error: "rol_destino inválido" });

  const creado_por = req.usuario.id_referencia;

  db.query(
    `INSERT INTO notificacion
       (titulo, mensaje, tipo, icono, rol_destino, url_accion, fecha_inicio, fecha_fin, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [titulo, mensaje, tipo, icono, rol_destino, url_accion, fecha_inicio || null, fecha_fin || null, creado_por],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.status(201).json({
        success: true,
        mensaje: "Notificación creada",
        id_notificacion: result.insertId,
      });
    },
  );
});

// ── PUT — editar notificación (solo admin) ────────────────────────────────────
router.put("/:id", soloAdmin, (req, res) => {
  const {
    titulo, mensaje, tipo, icono, rol_destino,
    url_accion, fecha_inicio, fecha_fin, activa,
  } = req.body;

  if (!titulo || !mensaje)
    return res.status(400).json({ error: "Título y mensaje son requeridos" });

  db.query(
    `UPDATE notificacion
     SET titulo=?, mensaje=?, tipo=?, icono=?, rol_destino=?,
         url_accion=?, fecha_inicio=?, fecha_fin=?, activa=?
     WHERE id_notificacion=?`,
    [
      titulo, mensaje,
      tipo || "info",
      icono || "lucide:bell",
      rol_destino || "todos",
      url_accion || null,
      fecha_inicio || null,
      fecha_fin || null,
      activa !== undefined ? (activa ? 1 : 0) : 1,
      req.params.id,
    ],
    (err, r) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (!r.affectedRows) return res.status(404).json({ error: "Notificación no encontrada" });
      res.json({ success: true, mensaje: "Notificación actualizada" });
    },
  );
});

// ── DELETE — desactivar notificación (solo admin) ─────────────────────────────
router.delete("/:id", soloAdmin, (req, res) => {
  db.query(
    "UPDATE notificacion SET activa = 0 WHERE id_notificacion = ?",
    [req.params.id],
    (err, r) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (!r.affectedRows) return res.status(404).json({ error: "Notificación no encontrada" });
      res.json({ success: true, mensaje: "Notificación desactivada" });
    },
  );
});

// ── GET /admin — todas las notificaciones (activas e inactivas) para gestión ──
router.get("/admin/todas", soloAdmin, (req, res) => {
  db.query(
    `SELECT * FROM notificacion ORDER BY activa DESC, fecha_creacion DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.json(rows || []);
    },
  );
});

module.exports = router;

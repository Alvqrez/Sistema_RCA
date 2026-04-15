// src/routes/bonus.js — módulo completo de bonus
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, maestroOAdmin } = require("../middleware/auth");

const MAX_CALIFICACION = 100;

// ─── BONUS UNIDAD ──────────────────────────────────────────────────────────

// GET — todos los bonus de unidad de un grupo (para el maestro)
// IMPORTANTE: esta ruta va ANTES de la dinámica /:matricula/:id_grupo
router.get("/unidad/grupo/:id_grupo", maestroOAdmin, (req, res) => {
  const sql = `
    SELECT bu.*,
           CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
           u.nombre_unidad
    FROM bonusunidad bu
    JOIN alumno a ON bu.matricula = a.matricula
    JOIN unidad u ON bu.id_unidad = u.id_unidad
    WHERE bu.id_grupo = ?
    ORDER BY bu.id_unidad, a.apellido_paterno
  `;
  db.query(sql, [req.params.id_grupo], (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// GET — bonus de unidad de un alumno específico (ruta dinámica — va DESPUÉS de /grupo/)
router.get("/unidad/:matricula/:id_grupo", verificarToken, (req, res) => {
  const sql = `
    SELECT bu.*, u.nombre_unidad,
           CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro
    FROM bonusunidad bu
    JOIN unidad u ON bu.id_unidad = u.id_unidad
    JOIN maestro mae ON bu.numero_empleado = mae.numero_empleado
    WHERE bu.matricula = ? AND bu.id_grupo = ?
    ORDER BY bu.id_unidad
  `;
  db.query(sql, [req.params.matricula, req.params.id_grupo], (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// POST — asignar bonus de unidad (FIX 5)
router.post("/unidad", maestroOAdmin, (req, res) => {
  const { matricula, id_unidad, id_grupo, puntos_otorgados, justificacion } =
    req.body;
  const numero_empleado = req.usuario.id_referencia;

  if (
    !matricula ||
    !id_unidad ||
    !id_grupo ||
    puntos_otorgados === undefined ||
    !justificacion
  ) {
    return res
      .status(400)
      .json({ error: "Faltan campos requeridos (incluida la justificación)" });
  }

  const puntos = parseFloat(puntos_otorgados);
  if (isNaN(puntos) || puntos <= 0) {
    return res
      .status(400)
      .json({ error: "Los puntos deben ser un valor positivo" });
  }

  // Verificar que el alumno esté inscrito en el grupo
  db.query(
    "SELECT 1 FROM inscripcion WHERE matricula = ? AND id_grupo = ? AND estatus = 'Cursando'",
    [matricula, id_grupo],
    (err, inscrito) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!inscrito.length) {
        return res
          .status(400)
          .json({ error: "El alumno no está inscrito en este grupo" });
      }

      // Verificar que el bonus no lleve la calificación por encima de 100
      db.query(
        `SELECT COALESCE(calificacion_unidad_final, promedio_ponderado, 0) AS cal
         FROM calificacion_unidad
         WHERE matricula = ? AND id_unidad = ? AND id_grupo = ?`,
        [matricula, id_unidad, id_grupo],
        (err2, calRows) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });

          const calActual = parseFloat(calRows[0]?.cal ?? 0);
          const calConBonus = calActual + puntos;

          // Advertir si supera 100 pero aplicar tope (sección 1.5 caso 3)
          const puntosEfectivos =
            calConBonus > MAX_CALIFICACION
              ? Math.max(0, MAX_CALIFICACION - calActual)
              : puntos;

          db.query(
            `INSERT INTO bonusunidad (matricula, id_unidad, id_grupo, numero_empleado, puntos_otorgados, justificacion, fecha_asignacion)
             VALUES (?, ?, ?, ?, ?, ?, CURDATE())
             ON DUPLICATE KEY UPDATE
               puntos_otorgados  = VALUES(puntos_otorgados),
               justificacion     = VALUES(justificacion),
               numero_empleado   = VALUES(numero_empleado),
               fecha_modificacion = CURDATE(),
               estatus           = 'Activo'`,
            [
              matricula,
              id_unidad,
              id_grupo,
              numero_empleado,
              puntosEfectivos,
              justificacion,
            ],
            (err3) => {
              if (err3)
                return res
                  .status(500)
                  .json({ error: "Error interno del servidor" });
              res.status(201).json({
                success: true,
                mensaje: "Bonus de unidad asignado",
                puntos_aplicados: puntosEfectivos,
                advertencia:
                  calConBonus > MAX_CALIFICACION
                    ? `El bonus fue ajustado a ${puntosEfectivos} pts para no superar el máximo de 100.`
                    : null,
              });
            },
          );
        },
      );
    },
  );
});

// DELETE — cancelar bonus de unidad
router.delete(
  "/unidad/:matricula/:id_unidad/:id_grupo",
  maestroOAdmin,
  (req, res) => {
    db.query(
      "UPDATE bonusunidad SET estatus = 'Cancelado' WHERE matricula = ? AND id_unidad = ? AND id_grupo = ?",
      [req.params.matricula, req.params.id_unidad, req.params.id_grupo],
      (err, r) => {
        if (err)
          return res.status(500).json({ error: "Error interno del servidor" });
        if (r.affectedRows === 0)
          return res.status(404).json({ error: "Bonus no encontrado" });
        res.json({ success: true, mensaje: "Bonus cancelado" });
      },
    );
  },
);

// ─── BONUS FINAL ───────────────────────────────────────────────────────────

// GET — todos los bonus finales de un grupo (ruta específica — va ANTES de la dinámica)
router.get("/final/grupo/:id_grupo", maestroOAdmin, (req, res) => {
  const sql = `
    SELECT bf.*,
           CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno
    FROM bonusfinal bf
    JOIN alumno a ON bf.matricula = a.matricula
    WHERE bf.id_grupo = ?
    ORDER BY a.apellido_paterno
  `;
  db.query(sql, [req.params.id_grupo], (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// GET — bonus final de un alumno en un grupo (ruta dinámica — va DESPUÉS de /grupo/)
router.get("/final/:matricula/:id_grupo", verificarToken, (req, res) => {
  const sql = `
    SELECT bf.*,
           CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro
    FROM bonusfinal bf
    JOIN maestro mae ON bf.numero_empleado = mae.numero_empleado
    WHERE bf.matricula = ? AND bf.id_grupo = ?
  `;
  db.query(sql, [req.params.matricula, req.params.id_grupo], (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r[0] || null);
  });
});

// POST — asignar bonus final (FIX 5)
router.post("/final", maestroOAdmin, (req, res) => {
  const { matricula, id_grupo, puntos_otorgados, justificacion } = req.body;
  const numero_empleado = req.usuario.id_referencia;

  if (
    !matricula ||
    !id_grupo ||
    puntos_otorgados === undefined ||
    !justificacion
  ) {
    return res
      .status(400)
      .json({ error: "Faltan campos requeridos (incluida la justificación)" });
  }

  const puntos = parseFloat(puntos_otorgados);
  if (isNaN(puntos) || puntos <= 0) {
    return res
      .status(400)
      .json({ error: "Los puntos deben ser un valor positivo" });
  }

  // Requiere que exista una calificacion_final para poder referenciarla
  db.query(
    "SELECT promedio_unidades, calificacion_oficial FROM calificacion_final WHERE matricula = ? AND id_grupo = ?",
    [matricula, id_grupo],
    (err, calRows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!calRows.length) {
        return res.status(400).json({
          error:
            "No existe calificación final calculada para este alumno. Calcúlala primero.",
        });
      }

      const calBase = parseFloat(
        calRows[0].calificacion_oficial ?? calRows[0].promedio_unidades ?? 0,
      );
      const calConBonus = calBase + puntos;
      const puntosEfectivos =
        calConBonus > MAX_CALIFICACION
          ? Math.max(0, MAX_CALIFICACION - calBase)
          : puntos;

      db.query(
        `INSERT INTO bonusfinal (matricula, id_grupo, numero_empleado, puntos_otorgados, justificacion, fecha_asignacion)
         VALUES (?, ?, ?, ?, ?, CURDATE())
         ON DUPLICATE KEY UPDATE
           puntos_otorgados   = VALUES(puntos_otorgados),
           justificacion      = VALUES(justificacion),
           numero_empleado    = VALUES(numero_empleado),
           fecha_modificacion = CURDATE(),
           estatus            = 'Activo'`,
        [matricula, id_grupo, numero_empleado, puntosEfectivos, justificacion],
        (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });

          // Actualizar calificacion_oficial en calificacion_final
          const nuevaCal = Math.min(
            MAX_CALIFICACION,
            calBase + puntosEfectivos,
          );
          db.query(
            "UPDATE calificacion_final SET calificacion_oficial = ?, estatus_final = ? WHERE matricula = ? AND id_grupo = ?",
            [
              nuevaCal,
              nuevaCal >= 70 ? "Aprobado" : "Reprobado",
              matricula,
              id_grupo,
            ],
          );

          res.status(201).json({
            success: true,
            mensaje: "Bonus final asignado",
            puntos_aplicados: puntosEfectivos,
            calificacion_resultante: nuevaCal,
            advertencia:
              calConBonus > MAX_CALIFICACION
                ? `Bonus ajustado a ${puntosEfectivos} pts para no superar 100.`
                : null,
          });
        },
      );
    },
  );
});

module.exports = router;

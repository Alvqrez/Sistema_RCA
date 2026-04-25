// src/routes/modificacion_final.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { maestroOAdmin } = require("../middleware/auth");

// GET — todas las modificaciones de un grupo (ruta específica — va ANTES de la dinámica)
router.get("/grupo/:id_grupo", maestroOAdmin, (req, res) => {
  const sql = `
    SELECT mf.*,
           CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro
    FROM modificacionfinal mf
    JOIN maestro mae ON mf.rfc = mae.rfc
    WHERE mf.id_grupo = ?
    ORDER BY mf.matricula
  `;
  db.query(sql, [req.params.id_grupo], (err, r) => {
    if (err) return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// GET — modificación de un alumno en un grupo (ruta dinámica — va DESPUÉS de /grupo/)
router.get("/:matricula/:id_grupo", maestroOAdmin, (req, res) => {
  const sql = `
    SELECT mf.*,
           CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro
    FROM modificacionfinal mf
    JOIN maestro mae ON mf.rfc = mae.rfc
    WHERE mf.matricula = ? AND mf.id_grupo = ?
  `;
  db.query(sql, [req.params.matricula, req.params.id_grupo], (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r[0] || null);
  });
});

// POST — aplicar modificación final manual (RN6)
router.post("/", maestroOAdmin, (req, res) => {
  const { matricula, id_grupo, calif_modificada, justificacion } = req.body;
  const rfc = req.usuario.id_referencia;

  if (
    !matricula ||
    !id_grupo ||
    calif_modificada === undefined ||
    !justificacion
  ) {
    return res
      .status(400)
      .json({ error: "Faltan campos requeridos (incluida la justificación)" });
  }

  const nueva = parseFloat(calif_modificada);
  if (isNaN(nueva) || nueva < 0 || nueva > 100) {
    return res
      .status(400)
      .json({ error: "La calificación debe estar entre 0 y 100" });
  }

  // Requiere calificacion_final existente
  db.query(
    "SELECT calificacion_oficial, promedio_unidades FROM calificacion_final WHERE matricula = ? AND id_grupo = ?",
    [matricula, id_grupo],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!rows.length) {
        return res
          .status(400)
          .json({
            error: "No hay calificación final calculada para este alumno.",
          });
      }

      const original = parseFloat(
        rows[0].calificacion_oficial ?? rows[0].promedio_unidades ?? 0,
      );

      // Upsert de modificacion_final (PK compuesta — solo una por alumno-grupo)
      db.query(
        `INSERT INTO modificacionfinal
           (matricula, id_grupo, rfc, calif_original, calif_modificada, justificacion, fecha_modificacion, estatus)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 'Aplicado')
         ON DUPLICATE KEY UPDATE
           calif_original    = VALUES(calif_original),
           calif_modificada  = VALUES(calif_modificada),
           justificacion     = VALUES(justificacion),
           rfc   = VALUES(rfc),
           fecha_modificacion = NOW(),
           estatus            = 'Aplicado'`,
        [matricula, id_grupo, rfc, original, nueva, justificacion],
        (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });

          // Reflejar la modificación en calificacion_final
          db.query(
            "UPDATE calificacion_final SET calificacion_oficial = ?, estatus_final = ? WHERE matricula = ? AND id_grupo = ?",
            [
              nueva,
              nueva >= 70 ? "Aprobado" : "Reprobado",
              matricula,
              id_grupo,
            ],
          );

          res
            .status(201)
            .json({
              success: true,
              mensaje: "Modificación final aplicada",
              calif_original: original,
              calif_modificada: nueva,
            });
        },
      );
    },
  );
});



// DELETE — revertir modificación final
router.delete("/:matricula/:id_grupo", maestroOAdmin, (req, res) => {
  const { matricula, id_grupo } = req.params;
  db.query(
    "DELETE FROM modificacionfinal WHERE matricula = ? AND id_grupo = ?",
    [matricula, id_grupo],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Modificación no encontrada" });
      res.json({ success: true, mensaje: "Modificación revertida" });
    }
  );
});

module.exports = router;

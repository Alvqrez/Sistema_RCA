// src/routes/modificacion_final.js
// M-4 FIX: POST y DELETE ahora verifican que el maestro autenticado sea
//           el responsable del grupo antes de aplicar o revertir una
//           modificación final. Los administradores pueden operar libremente.
const express = require("express");
const router  = express.Router();
const db      = require("../../db");
const { maestroOAdmin, verificarPropietarioGrupo } = require("../../middleware/auth");

// GET — todas las modificaciones de un grupo
router.get("/grupo/:id_grupo", maestroOAdmin, (req, res) => {
  const sql = `
    SELECT mf.*,
           CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro
    FROM modificacionfinal mf
    JOIN maestro mae ON mf.rfc = mae.rfc
    WHERE mf.id_grupo = ?
    ORDER BY mf.no_control
  `;
  db.query(sql, [req.params.id_grupo], (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// GET — modificación de un alumno en un grupo
router.get("/:no_control/:id_grupo", maestroOAdmin, (req, res) => {
  const sql = `
    SELECT mf.*,
           CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro
    FROM modificacionfinal mf
    JOIN maestro mae ON mf.rfc = mae.rfc
    WHERE mf.no_control = ? AND mf.id_grupo = ?
  `;
  db.query(sql, [req.params.no_control, req.params.id_grupo], (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r[0] || null);
  });
});

// POST — aplicar modificación final manual
// M-4: verifica propietario del grupo antes de continuar.
router.post("/", maestroOAdmin, (req, res) => {
  const { no_control, id_grupo, calif_modificada, justificacion } = req.body;
  const rfc = req.usuario.id_referencia;

  if (
    !no_control ||
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

  // M-4: verificar propietario del grupo
  verificarPropietarioGrupo(id_grupo, req, res, () => {
    db.query(
      "SELECT calificacion_oficial, promedio_unidades FROM calificacion_final WHERE no_control = ? AND id_grupo = ?",
      [no_control, id_grupo],
      (err, rows) => {
        if (err)
          return res.status(500).json({ error: "Error interno del servidor" });
        if (!rows.length) {
          return res.status(400).json({
            error: "No hay calificación final calculada para este alumno.",
          });
        }

        const original = parseFloat(
          rows[0].calificacion_oficial ?? rows[0].promedio_unidades ?? 0
        );

        db.query(
          `INSERT INTO modificacionfinal
             (no_control, id_grupo, rfc, calif_original, calif_modificada, justificacion, fecha_modificacion, estatus)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), 'Aplicado')
           ON DUPLICATE KEY UPDATE
             calif_original     = VALUES(calif_original),
             calif_modificada   = VALUES(calif_modificada),
             justificacion      = VALUES(justificacion),
             rfc                = VALUES(rfc),
             fecha_modificacion = NOW(),
             estatus            = 'Aplicado'`,
          [no_control, id_grupo, rfc, original, nueva, justificacion],
          (err2) => {
            if (err2)
              return res
                .status(500)
                .json({ error: "Error interno del servidor" });

            db.query(
              "UPDATE calificacion_final SET calificacion_oficial = ?, estatus_final = ? WHERE no_control = ? AND id_grupo = ?",
              [
                nueva,
                nueva >= 70 ? "Aprobado" : "Reprobado",
                no_control,
                id_grupo,
              ]
            );

            res.status(201).json({
              success:          true,
              mensaje:          "Modificación final aplicada",
              calif_original:   original,
              calif_modificada: nueva,
            });
          }
        );
      }
    );
  });
});

// DELETE — revertir modificación final
router.delete("/:no_control/:id_grupo", maestroOAdmin, async (req, res) => {
  const { no_control, id_grupo } = req.params;
  const calculo = require("../../services/calculo");

  // Guard: maestro solo puede revertir modificaciones de sus propios grupos
  verificarPropietarioGrupo(id_grupo, req, res, () => {
  db.query(
    "DELETE FROM modificacionfinal WHERE no_control = ? AND id_grupo = ?",
    [no_control, id_grupo],
    async (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Modificación no encontrada" });

      try {
        await calculo.calcularCalificacionFinal(no_control, id_grupo);
      } catch (_) {
        /* no bloquear si falla el recálculo */
      }

      res.json({
        success: true,
        mensaje: "Modificación revertida y calificación restaurada",
      });
    }
  );
  }); // fin verificarPropietarioGrupo
});

module.exports = router;

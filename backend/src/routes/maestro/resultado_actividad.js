// backend/src/routes/resultado_actividad.js
// C-2 FIX: el POST ahora verifica que el maestro autenticado sea el responsable
//          del grupo al que pertenece la actividad. Un administrador puede operar
//          en cualquier grupo.
const express = require("express");
const router  = express.Router();
const db      = require("../../db");
const { verificarToken, maestroOAdmin } = require("../../middleware/auth");

// ── Helper: verificar que el maestro autenticado imparte el grupo ──────────
// Retorna un error 403 si el rol es 'maestro' y el RFC no coincide.
// Para administradores no hay restricción.
function verificarPropietarioGrupo(rfc_grupo, req, res) {
  if (req.usuario.rol === "maestro" && req.usuario.id_referencia !== rfc_grupo) {
    res.status(403).json({
      error:
        "No tienes permiso para registrar calificaciones en un grupo que no impartes.",
    });
    return false;
  }
  return true;
}

// GET — resultados de una actividad con alumnos inscritos en el grupo
router.get("/actividad/:id_actividad", verificarToken, (req, res) => {
  const sql = `
    SELECT
      a.no_control,
      CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
      ra.calificacion_obtenida,
      ra.estatus,
      ra.fecha_registro,
      ra.rfc
    FROM actividad act
    JOIN inscripcion i ON i.id_grupo = act.id_grupo AND i.estatus = 'Cursando'
    JOIN alumno a ON i.no_control = a.no_control
    LEFT JOIN resultado_actividad ra
      ON ra.no_control = a.no_control AND ra.id_actividad = act.id_actividad
    WHERE act.id_actividad = ?
    ORDER BY a.apellido_paterno, a.nombre
  `;
  db.query(sql, [req.params.id_actividad], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
    res.json(results);
  });
});

// GET — promedio ponderado de un alumno en una unidad/grupo
router.get(
  "/promedio/:no_control/:id_grupo/:id_unidad",
  verificarToken,
  (req, res) => {
    const { no_control, id_grupo, id_unidad } = req.params;
    const { rol, id_referencia } = req.usuario;
    if (rol === "alumno" && id_referencia !== no_control) {
      return res.status(403).json({ error: "No puedes consultar datos de otro alumno." });
    }
    const sql = `
    SELECT
      COALESCE(
        SUM(
          CASE WHEN ra.estatus = 'NP' THEN 0 ELSE COALESCE(ra.calificacion_obtenida, 0) END
          * (a.ponderacion / 100)
        ) / NULLIF(SUM(a.ponderacion) / 100, 0),
        0
      ) AS promedio
    FROM actividad a
    LEFT JOIN resultado_actividad ra
      ON ra.id_actividad = a.id_actividad AND ra.no_control = ?
    WHERE a.id_grupo = ? AND a.id_unidad = ?
  `;
    db.query(sql, [no_control, id_grupo, id_unidad], (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json({
        promedio: Math.round((results[0]?.promedio || 0) * 100) / 100,
      });
    });
  }
);

// POST — registrar / actualizar resultado individual
// C-2: verifica que el maestro sea propietario del grupo antes de insertar.
router.post("/", maestroOAdmin, (req, res) => {
  const { no_control, id_actividad, calificacion_obtenida, estatus } =
    req.body;
  const rfc = req.usuario.id_referencia;

  if (!no_control || !id_actividad) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  // C-2: obtener grupo y su RFC propietario junto con el flag bloqueado
  db.query(
    `SELECT a.bloqueado, g.rfc AS rfc_grupo
     FROM actividad a
     JOIN grupo g ON a.id_grupo = g.id_grupo
     WHERE a.id_actividad = ?`,
    [id_actividad],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (rows.length === 0)
        return res.status(404).json({ error: "Actividad no encontrada" });

      // C-2: rechazar si el maestro no es el responsable del grupo
      if (!verificarPropietarioGrupo(rows[0].rfc_grupo, req, res)) return;

      const cal =
        calificacion_obtenida === undefined || calificacion_obtenida === null
          ? null
          : parseFloat(calificacion_obtenida);

      if (cal !== null && (isNaN(cal) || cal < 0 || cal > 100)) {
        return res
          .status(400)
          .json({ error: "La calificación debe estar entre 0 y 100" });
      }
      const est = estatus || (cal === null ? "NP" : "Validada");

      const sql = `
      INSERT INTO resultado_actividad (no_control, id_actividad, calificacion_obtenida, estatus, rfc)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        calificacion_anterior = calificacion_obtenida,
        calificacion_obtenida = VALUES(calificacion_obtenida),
        estatus               = VALUES(estatus),
        rfc                   = VALUES(rfc),
        fecha_registro        = NOW()
    `;
      db.query(sql, [no_control, id_actividad, cal, est, rfc], (err2) => {
        if (err2)
          return res.status(500).json({ error: "Error interno del servidor" });

        if (!rows[0].bloqueado) {
          db.query(
            "UPDATE actividad SET bloqueado = 1 WHERE id_actividad = ?",
            [id_actividad]
          );
        }

        res.json({ success: true });
      });
    }
  );
});

// POST — guardar múltiples resultados en una sola llamada (bulk)
// C-2: misma verificación de propietario de grupo.
router.post("/bulk", maestroOAdmin, (req, res) => {
  const { id_actividad, resultados } = req.body;
  const rfc = req.usuario.id_referencia;

  if (!id_actividad || !Array.isArray(resultados) || resultados.length === 0) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  // C-2: obtener grupo y RFC propietario
  db.query(
    `SELECT a.bloqueado, g.rfc AS rfc_grupo
     FROM actividad a
     JOIN grupo g ON a.id_grupo = g.id_grupo
     WHERE a.id_actividad = ?`,
    [id_actividad],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (rows.length === 0)
        return res.status(404).json({ error: "Actividad no encontrada" });

      // C-2: rechazar si el maestro no es el responsable del grupo
      if (!verificarPropietarioGrupo(rows[0].rfc_grupo, req, res)) return;

      const values = resultados.map((r) => {
        const cal =
          r.calificacion_obtenida === undefined ||
          r.calificacion_obtenida === null
            ? null
            : parseFloat(r.calificacion_obtenida);
        const calSegura =
          cal === null ? null : Math.min(100, Math.max(0, cal));
        return [
          r.no_control,
          id_actividad,
          calSegura,
          r.estatus || (calSegura === null ? "NP" : "Validada"),
          rfc,
        ];
      });

      const sql = `
      INSERT INTO resultado_actividad (no_control, id_actividad, calificacion_obtenida, estatus, rfc)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        calificacion_anterior = calificacion_obtenida,
        calificacion_obtenida = VALUES(calificacion_obtenida),
        estatus               = VALUES(estatus),
        rfc                   = VALUES(rfc),
        fecha_registro        = NOW()
    `;
      db.query(sql, [values], (err2) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ error: "Error interno del servidor" });
        }

        if (!rows[0].bloqueado) {
          db.query(
            "UPDATE actividad SET bloqueado = 1 WHERE id_actividad = ?",
            [id_actividad]
          );
        }

        res.json({ success: true, guardados: values.length });
      });
    }
  );
});

module.exports = router;

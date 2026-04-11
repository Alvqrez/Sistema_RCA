// backend/src/routes/resultado_actividad.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, maestroOAdmin } = require("../middleware/auth");

// GET — resultados de una actividad con alumnos inscritos en el grupo (FIX 2)
router.get("/actividad/:id_actividad", verificarToken, (req, res) => {
  const sql = `
    SELECT
      a.matricula,
      CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
      ra.calificacion_obtenida,
      ra.estatus,
      ra.fecha_registro,
      ra.numero_empleado
    FROM actividad act
    JOIN inscripcion i ON i.id_grupo = act.id_grupo AND i.estatus = 'Cursando'
    JOIN alumno a ON i.matricula = a.matricula
    LEFT JOIN resultado_actividad ra
      ON ra.matricula = a.matricula AND ra.id_actividad = act.id_actividad
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
  "/promedio/:matricula/:id_grupo/:id_unidad",
  verificarToken,
  (req, res) => {
    const { matricula, id_grupo, id_unidad } = req.params;
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
      ON ra.id_actividad = a.id_actividad AND ra.matricula = ?
    WHERE a.id_grupo = ? AND a.id_unidad = ?
  `;
    db.query(sql, [matricula, id_grupo, id_unidad], (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json({
        promedio: Math.round((results[0]?.promedio || 0) * 100) / 100,
      });
    });
  },
);

// POST — registrar / actualizar resultado (FIX 13: verifica bloqueado)
router.post("/", maestroOAdmin, (req, res) => {
  const { matricula, id_actividad, calificacion_obtenida, estatus } = req.body;
  const numero_empleado = req.usuario.id_referencia;

  if (!matricula || !id_actividad) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  // Verificar si la actividad existe y si ya está bloqueada
  db.query(
    "SELECT bloqueado FROM actividad WHERE id_actividad = ?",
    [id_actividad],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (rows.length === 0)
        return res.status(404).json({ error: "Actividad no encontrada" });

      const cal =
        calificacion_obtenida === undefined
          ? null
          : parseFloat(calificacion_obtenida);

      // Validar rango institucional 0–100 (sección 1.3.1)
      if (cal !== null && (isNaN(cal) || cal < 0 || cal > 100)) {
        return res.status(400).json({
          error: "La calificación debe estar entre 0 y 100",
        });
      }
      const est = estatus || (cal === null ? "NP" : "Validada");

      const sql = `
      INSERT INTO resultado_actividad (matricula, id_actividad, calificacion_obtenida, estatus, numero_empleado)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        calificacion_anterior = calificacion_obtenida,
        calificacion_obtenida = VALUES(calificacion_obtenida),
        estatus               = VALUES(estatus),
        numero_empleado       = VALUES(numero_empleado),
        fecha_registro        = NOW()
    `;
      db.query(
        sql,
        [matricula, id_actividad, cal, est, numero_empleado],
        (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });

          // FIX 13: bloquear la actividad si no estaba bloqueada ya
          if (!rows[0].bloqueado) {
            db.query(
              "UPDATE actividad SET bloqueado = 1 WHERE id_actividad = ?",
              [id_actividad],
            );
          }

          res.json({ success: true });
        },
      );
    },
  );
});

// POST — guardar múltiples resultados en una sola llamada (FIX 13)
router.post("/bulk", maestroOAdmin, (req, res) => {
  const { id_actividad, resultados } = req.body;
  const numero_empleado = req.usuario.id_referencia;

  if (!id_actividad || !Array.isArray(resultados) || resultados.length === 0) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  // Verificar si la actividad existe
  db.query(
    "SELECT bloqueado FROM actividad WHERE id_actividad = ?",
    [id_actividad],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (rows.length === 0)
        return res.status(404).json({ error: "Actividad no encontrada" });

      const values = resultados.map((r) => {
        const cal =
          r.calificacion_obtenida === undefined
            ? null
            : parseFloat(r.calificacion_obtenida);
        // Clamp al rango institucional 0–100
        const calSegura = cal === null ? null : Math.min(100, Math.max(0, cal));
        return [
          r.matricula,
          id_actividad,
          calSegura,
          r.estatus || (calSegura === null ? "NP" : "Validada"),
          numero_empleado,
        ];
      });

      const sql = `
      INSERT INTO resultado_actividad (matricula, id_actividad, calificacion_obtenida, estatus, numero_empleado)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        calificacion_anterior = calificacion_obtenida,
        calificacion_obtenida = VALUES(calificacion_obtenida),
        estatus               = VALUES(estatus),
        numero_empleado       = VALUES(numero_empleado),
        fecha_registro        = NOW()
    `;
      db.query(sql, [values], (err2) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ error: "Error interno del servidor" });
        }

        // FIX 13: bloquear la actividad
        if (!rows[0].bloqueado) {
          db.query(
            "UPDATE actividad SET bloqueado = 1 WHERE id_actividad = ?",
            [id_actividad],
          );
        }

        res.json({ success: true, guardados: values.length });
      });
    },
  );
});

module.exports = router;

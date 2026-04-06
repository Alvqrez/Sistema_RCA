// backend/src/routes/resultado_actividad.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, maestroOAdmin } = require("../middleware/auth");

// GET — todos los resultados de una actividad (para llenar la tabla en actividades.html)
router.get("/actividad/:id_actividad", verificarToken, (req, res) => {
  const sql = `
    SELECT
      a.matricula,
      CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
      ra.calificacion_obtenida,
      ra.estatus,
      ra.fecha_registro,
      ra.numero_empleado
    FROM inscripcion i
    JOIN alumno a ON i.matricula = a.matricula
    JOIN actividad act ON act.id_actividad = ?
    LEFT JOIN resultado_actividad ra
      ON ra.matricula = a.matricula AND ra.id_actividad = ?
    WHERE i.id_grupo = act.id_grupo AND i.estatus = 'Cursando'
    ORDER BY a.apellido_paterno, a.nombre
  `;
  db.query(
    sql,
    [req.params.id_actividad, req.params.id_actividad],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.json(results);
    },
  );
});

// GET — promedio de actividades de un alumno en una unidad/grupo (para auto-llenar formulario)
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

// POST — registrar / actualizar resultado de una actividad para un alumno
router.post("/", maestroOAdmin, (req, res) => {
  const { matricula, id_actividad, calificacion_obtenida, estatus } = req.body;
  const numero_empleado = req.usuario.id_referencia;

  if (!matricula || !id_actividad) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const cal =
    calificacion_obtenida === undefined
      ? null
      : parseFloat(calificacion_obtenida);
  const est = estatus || (cal === null ? "NP" : "Validada");

  const sql = `
    INSERT INTO resultado_actividad (matricula, id_actividad, calificacion_obtenida, estatus, numero_empleado)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      calificacion_anterior   = calificacion_obtenida,
      calificacion_obtenida   = VALUES(calificacion_obtenida),
      estatus                 = VALUES(estatus),
      numero_empleado         = VALUES(numero_empleado),
      fecha_registro          = NOW()
  `;
  db.query(sql, [matricula, id_actividad, cal, est, numero_empleado], (err) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json({ success: true });
  });
});

// POST — guardar múltiples resultados de una actividad en una sola llamada
router.post("/bulk", maestroOAdmin, (req, res) => {
  const { id_actividad, resultados } = req.body; // resultados = [{matricula, calificacion_obtenida, estatus}]
  const numero_empleado = req.usuario.id_referencia;

  if (!id_actividad || !Array.isArray(resultados) || resultados.length === 0) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const values = resultados.map((r) => [
    r.matricula,
    id_actividad,
    r.calificacion_obtenida === undefined
      ? null
      : parseFloat(r.calificacion_obtenida),
    r.estatus || (r.calificacion_obtenida === undefined ? "NP" : "Validada"),
    numero_empleado,
  ]);

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
  db.query(sql, [values], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
    res.json({ success: true, guardados: values.length });
  });
});

module.exports = router;

// src/routes/calificaciones.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const calculo = require("../services/calculo");
const {
  verificarToken,
  soloMaestro,
  maestroOAdmin,
} = require("../middleware/auth");

const CALIFICACION_APROBATORIA = 70; // RN: sección 1.3.1

// GET — todas las calificaciones de unidad
router.get("/", verificarToken, (req, res) => {
  const query = `
    SELECT
      cu.no_control,
      CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
      cu.id_unidad,
      u.nombre_unidad,
      cu.id_grupo,
      cu.promedio_ponderado,
      cu.calificacion_unidad_final,
      cu.estatus_unidad
    FROM calificacion_unidad cu
    JOIN alumno a  ON cu.no_control = a.no_control
    JOIN unidad u  ON cu.id_unidad = u.id_unidad
  `;
  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// GET — calificaciones de un alumno específico
router.get("/alumno/:no_control", verificarToken, (req, res) => {
  const query = `
    SELECT
      cu.id_unidad,
      u.nombre_unidad,
      cu.id_grupo,
      cu.promedio_ponderado,
      cu.calificacion_unidad_final,
      cu.estatus_unidad
    FROM calificacion_unidad cu
    JOIN unidad u ON cu.id_unidad = u.id_unidad
    WHERE cu.no_control = ?
  `;
  db.query(query, [req.params.no_control], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// GET — calificaciones de unidad de todos los alumnos de un grupo
router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  const query = `
    SELECT
      cu.no_control,
      CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
      cu.id_unidad,
      u.nombre_unidad,
      cu.id_grupo,
      cu.promedio_ponderado,
      cu.calificacion_unidad_final,
      cu.estatus_unidad
    FROM calificacion_unidad cu
    JOIN alumno a  ON cu.no_control   = a.no_control
    JOIN unidad u  ON cu.id_unidad   = u.id_unidad
    WHERE cu.id_grupo = ?
    ORDER BY a.apellido_paterno, cu.id_unidad
  `;
  db.query(query, [req.params.id_grupo], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// POST — registrar calificación de unidad manualmente y recalcular final (FIX 14)
router.post("/", maestroOAdmin, async (req, res) => {
  const { no_control, id_grupo, id_unidad, calificacion_unidad_final } =
    req.body;

  if (
    !no_control ||
    !id_grupo ||
    !id_unidad ||
    calificacion_unidad_final === undefined
  ) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  if (calificacion_unidad_final < 0 || calificacion_unidad_final > 100) {
    return res
      .status(400)
      .json({ error: "La calificación debe estar entre 0 y 100" });
  }

  // FIX 1: umbral 70
  const estatus =
    calificacion_unidad_final >= CALIFICACION_APROBATORIA
      ? "Aprobada"
      : "Reprobada";

  const query = `
    INSERT INTO calificacion_unidad (no_control, id_grupo, id_unidad, calificacion_unidad_final, estatus_unidad)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      calificacion_unidad_final = VALUES(calificacion_unidad_final),
      estatus_unidad            = VALUES(estatus_unidad)
  `;

  db.query(
    query,
    [no_control, id_grupo, id_unidad, calificacion_unidad_final, estatus],
    async (err) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      // FIX 14: recalcular calificación final automáticamente
      try {
        await calculo.calcularCalificacionFinal(no_control, id_grupo);
      } catch (_) {
        /* no bloquear si falla el recálculo */
      }

      res
        .status(201)
        .json({ success: true, mensaje: "Calificación registrada" });
    },
  );
});

// POST — calcular y cerrar calificación de unidad automáticamente
router.post("/calcular-unidad", maestroOAdmin, async (req, res) => {
  const { no_control, id_unidad, id_grupo, cal_examen, cal_asistencia } = req.body;
  if (!no_control || !id_unidad || !id_grupo) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  try {
    const overrides = {};
    if (cal_examen !== undefined && cal_examen !== null && cal_examen !== "") {
      overrides.cal_examen = parseFloat(cal_examen);
    }
    if (cal_asistencia !== undefined && cal_asistencia !== null && cal_asistencia !== "") {
      overrides.cal_asistencia = parseFloat(cal_asistencia);
    }
    const resultado = await calculo.cerrarUnidad(
      no_control,
      id_unidad,
      id_grupo,
      overrides,
    );
    res.json({ success: true, ...resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST — calcular calificación final de la materia
router.post("/calcular-final", maestroOAdmin, async (req, res) => {
  const { no_control, id_grupo } = req.body;
  if (!no_control || !id_grupo) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  try {
    const resultado = await calculo.calcularCalificacionFinal(
      no_control,
      id_grupo,
    );
    res.json({ success: true, ...resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST — calcular todo (todas las unidades + final) para un alumno en un grupo
router.post("/calcular-todo", maestroOAdmin, async (req, res) => {
  const { no_control, id_grupo } = req.body;
  if (!no_control || !id_grupo) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  try {
    const resultado = await calculo.calcularTodo(no_control, id_grupo);
    res.json({ success: true, ...resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET — calificación final de un alumno en un grupo
router.get("/final/:no_control/:id_grupo", verificarToken, (req, res) => {
  const query = `
    SELECT
      cf.no_control,
      CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
      cf.id_grupo,
      cf.promedio_unidades,
      cf.calificacion_oficial,
      cf.estatus_final
    FROM calificacion_final cf
    JOIN alumno a ON cf.no_control = a.no_control
    WHERE cf.no_control = ? AND cf.id_grupo = ?
  `;
  db.query(
    query,
    [req.params.no_control, req.params.id_grupo],
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (results.length === 0)
        return res
          .status(404)
          .json({ error: "Calificación final no encontrada" });
      res.json(results[0]);
    },
  );
});

// GET — desglose de actividades de un alumno en una unidad de un grupo
// Usado por el portal del alumno para mostrar transparencia matemática (Etapa 2, req. 3.3)
router.get(
  "/desglose/:no_control/:id_grupo/:id_unidad",
  verificarToken,
  (req, res) => {
    const { no_control, id_grupo, id_unidad } = req.params;
    const sql = `
    SELECT
      act.id_actividad,
      act.nombre_actividad,
      act.ponderacion,
      act.tipo_evaluacion,
      COALESCE(ra.calificacion_obtenida, 0)                    AS calificacion,
      ra.estatus,
      ROUND(
        COALESCE(ra.calificacion_obtenida, 0) * (act.ponderacion / 100), 2
      )                                                          AS aporte_ponderado
    FROM actividad act
    LEFT JOIN resultado_actividad ra
      ON ra.id_actividad = act.id_actividad AND ra.no_control = ?
    WHERE act.id_grupo = ? AND act.id_unidad = ?
    ORDER BY act.id_actividad ASC
  `;
    db.query(sql, [no_control, id_grupo, id_unidad], (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      const sumaPond = rows.reduce((s, r) => s + parseFloat(r.ponderacion), 0);
      const sumaAporte = rows.reduce(
        (s, r) => s + parseFloat(r.aporte_ponderado),
        0,
      );
      const promedio =
        sumaPond > 0 ? Math.round((sumaAporte / sumaPond) * 10000) / 100 : 0;
      res.json({
        actividades: rows,
        sumaPonderacion: sumaPond,
        promedioCalculado: promedio,
      });
    });
  },
);


// ── BUGS 4/5 FIX: guardar calificaciones directas (examen, asistencia) por alumno ──
// Almacena en config_evaluacion_unidad.nota como JSON {grades:{no_control:{cal_examen,cal_asistencia}}}
router.post("/guardar-directos", maestroOAdmin, (req, res) => {
  const { id_grupo, id_unidad, grades } = req.body;
  if (!id_grupo || !id_unidad || !grades || typeof grades !== "object") {
    return res.status(400).json({ error: "Faltan campos: id_grupo, id_unidad, grades" });
  }

  // Leer nota actual para no sobrescribir los pcts
  db.query(
    "SELECT nota FROM config_evaluacion_unidad WHERE id_grupo = ? AND id_unidad = ?",
    [id_grupo, id_unidad],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error interno" });

      let notaObj = {};
      if (rows[0]?.nota) {
        try { notaObj = JSON.parse(rows[0].nota); } catch (_) {}
      }
      // Fusionar grades con los existentes (por alumno)
      if (!notaObj.grades) notaObj.grades = {};
      Object.entries(grades).forEach(([mat, vals]) => {
        notaObj.grades[mat] = { ...(notaObj.grades[mat] || {}), ...vals };
      });

      db.query(
        `INSERT INTO config_evaluacion_unidad (id_grupo, id_unidad, pct_actividades, pct_examen, pct_asistencia, nota)
         VALUES (?, ?, 60, 30, 10, ?)
         ON DUPLICATE KEY UPDATE nota = VALUES(nota)`,
        [id_grupo, id_unidad, JSON.stringify(notaObj)],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Error interno al guardar" });
          res.json({ success: true });
        }
      );
    }
  );
});

// GET — obtener calificaciones directas de todos los alumnos de una unidad
router.get("/directos/:id_grupo/:id_unidad", verificarToken, (req, res) => {
  const { id_grupo, id_unidad } = req.params;
  db.query(
    "SELECT nota FROM config_evaluacion_unidad WHERE id_grupo = ? AND id_unidad = ?",
    [id_grupo, id_unidad],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error interno" });
      let grades = {};
      if (rows[0]?.nota) {
        try {
          const parsed = JSON.parse(rows[0].nota);
          grades = parsed.grades || {};
        } catch (_) {}
      }
      res.json(grades);
    }
  );
});

// GET — verificar si una unidad ya tiene calificaciones calculadas (para Bug 6)
router.get("/estado-unidad/:id_grupo/:id_unidad", verificarToken, (req, res) => {
  const { id_grupo, id_unidad } = req.params;
  db.query(
    `SELECT COUNT(*) AS total FROM calificacion_unidad
     WHERE id_grupo = ? AND id_unidad = ? AND calificacion_unidad_final IS NOT NULL`,
    [id_grupo, id_unidad],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error interno" });
      res.json({ cerrada: rows[0].total > 0, total_alumnos: rows[0].total });
    }
  );
});

module.exports = router;

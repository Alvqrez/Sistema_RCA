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
      cu.matricula,
      CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
      cu.id_unidad,
      u.nombre_unidad,
      cu.id_grupo,
      cu.promedio_ponderado,
      cu.calificacion_unidad_final,
      cu.estatus_unidad
    FROM calificacion_unidad cu
    JOIN alumno a  ON cu.matricula = a.matricula
    JOIN unidad u  ON cu.id_unidad = u.id_unidad
  `;
  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// GET — calificaciones de un alumno específico
router.get("/alumno/:matricula", verificarToken, (req, res) => {
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
    WHERE cu.matricula = ?
  `;
  db.query(query, [req.params.matricula], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// GET — calificaciones de unidad de todos los alumnos de un grupo
router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  const query = `
    SELECT
      cu.matricula,
      CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
      cu.id_unidad,
      u.nombre_unidad,
      cu.id_grupo,
      cu.promedio_ponderado,
      cu.calificacion_unidad_final,
      cu.estatus_unidad
    FROM calificacion_unidad cu
    JOIN alumno a  ON cu.matricula   = a.matricula
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
  const { matricula, id_grupo, id_unidad, calificacion_unidad_final } =
    req.body;

  if (
    !matricula ||
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
    INSERT INTO calificacion_unidad (matricula, id_grupo, id_unidad, calificacion_unidad_final, estatus_unidad)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      calificacion_unidad_final = VALUES(calificacion_unidad_final),
      estatus_unidad            = VALUES(estatus_unidad)
  `;

  db.query(
    query,
    [matricula, id_grupo, id_unidad, calificacion_unidad_final, estatus],
    async (err) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      // FIX 14: recalcular calificación final automáticamente
      try {
        await calculo.calcularCalificacionFinal(matricula, id_grupo);
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
  const { matricula, id_unidad, id_grupo } = req.body;
  if (!matricula || !id_unidad || !id_grupo) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  try {
    const resultado = await calculo.cerrarUnidad(
      matricula,
      id_unidad,
      id_grupo,
    );
    res.json({ success: true, ...resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST — calcular calificación final de la materia
router.post("/calcular-final", maestroOAdmin, async (req, res) => {
  const { matricula, id_grupo } = req.body;
  if (!matricula || !id_grupo) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  try {
    const resultado = await calculo.calcularCalificacionFinal(
      matricula,
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
  const { matricula, id_grupo } = req.body;
  if (!matricula || !id_grupo) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  try {
    const resultado = await calculo.calcularTodo(matricula, id_grupo);
    res.json({ success: true, ...resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET — calificación final de un alumno en un grupo
router.get("/final/:matricula/:id_grupo", verificarToken, (req, res) => {
  const query = `
    SELECT
      cf.matricula,
      CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
      cf.id_grupo,
      cf.promedio_unidades,
      cf.calificacion_oficial,
      cf.estatus_final
    FROM calificacion_final cf
    JOIN alumno a ON cf.matricula = a.matricula
    WHERE cf.matricula = ? AND cf.id_grupo = ?
  `;
  db.query(
    query,
    [req.params.matricula, req.params.id_grupo],
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
  "/desglose/:matricula/:id_grupo/:id_unidad",
  verificarToken,
  (req, res) => {
    const { matricula, id_grupo, id_unidad } = req.params;
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
      ON ra.id_actividad = act.id_actividad AND ra.matricula = ?
    WHERE act.id_grupo = ? AND act.id_unidad = ?
    ORDER BY act.id_actividad ASC
  `;
    db.query(sql, [matricula, id_grupo, id_unidad], (err, rows) => {
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

module.exports = router;

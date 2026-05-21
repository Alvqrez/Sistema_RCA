// src/routes/reportes.js
// C-3 FIX: GET /alumno/:no_control ahora verifica que el alumno autenticado
//          solo pueda consultar su propio expediente académico.
//          Un maestro o administrador puede consultar cualquier alumno.
const express = require("express");
const router  = express.Router();
const db      = require("../../db");
const { verificarToken } = require("../../middleware/auth");

// GET /api/reportes/grupos — lista de grupos para el filtro
router.get("/grupos", verificarToken, (req, res) => {
  const rol    = req.usuario.rol;
  const id_ref = req.usuario.id_referencia;

  let sql = `
    SELECT g.id_grupo, g.id_periodo,
           m.nombre_materia, m.clave_materia,
           CONCAT(mae.nombre,' ',mae.apellido_paterno) AS nombre_maestro,
           p.descripcion AS periodo, YEAR(p.fecha_inicio) AS anio, g.estatus
    FROM grupo g
    JOIN materia m      ON g.clave_materia   = m.clave_materia
    JOIN maestro mae    ON g.rfc             = mae.rfc
    LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
  `;
  const params = [];
  if (rol === "maestro") {
    sql += " WHERE g.rfc = ?";
    params.push(id_ref);
  }
  sql += " ORDER BY p.fecha_inicio DESC, m.nombre_materia ASC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Error interno" });
    res.json(rows);
  });
});

// GET /api/reportes/grupo/:id_grupo — reporte completo de un grupo
// Calcula dinámicamente desde resultado_actividad para reflejar estado real,
// incluyendo bonus de unidad y bonus final.
router.get("/grupo/:id_grupo", verificarToken, async (req, res) => {
  const { id_grupo } = req.params;

  function q(sql, params) {
    return new Promise((resolve, reject) =>
      db.query(sql, params, (err, r) => (err ? reject(err) : resolve(r)))
    );
  }

  try {
    // Info del grupo
    const grupoRows = await q(`
      SELECT g.id_grupo, g.estatus, m.nombre_materia, m.clave_materia, m.no_unidades,
             CONCAT(mae.nombre,' ',mae.apellido_paterno) AS nombre_maestro,
             p.descripcion AS periodo, YEAR(p.fecha_inicio) AS anio
      FROM grupo g
      JOIN materia m      ON g.clave_materia = m.clave_materia
      JOIN maestro mae    ON g.rfc           = mae.rfc
      LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
      WHERE g.id_grupo = ?`, [id_grupo]);

    if (!grupoRows.length) return res.status(404).json({ error: "Grupo no encontrado" });
    const grupo = grupoRows[0];

    // Unidades de la materia (respetando layout del grupo si existe)
    let unidades = await q(`
      SELECT u.id_unidad, u.nombre_unidad
      FROM unidad u
      JOIN grupo g ON u.clave_materia = g.clave_materia
      WHERE g.id_grupo = ?
      ORDER BY u.id_unidad ASC`, [id_grupo]);

    // Alumnos inscritos + calificación final de BD
    const alumnos = await q(`
      SELECT a.no_control,
             CONCAT(a.apellido_paterno,' ',COALESCE(a.apellido_materno,''),', ',a.nombre) AS nombre_completo,
             i.estatus AS estatus_inscripcion, i.tipo_curso,
             cf.promedio_unidades, cf.calificacion_oficial, cf.estatus_final
      FROM inscripcion i
      JOIN alumno a ON i.no_control = a.no_control
      LEFT JOIN calificacion_final cf ON cf.no_control = i.no_control AND cf.id_grupo = i.id_grupo
      WHERE i.id_grupo = ?
      ORDER BY a.apellido_paterno ASC`, [id_grupo]);

    // Actividades del grupo con su ponderación
    const actividades = await q(`
      SELECT a.id_actividad, a.id_unidad, a.ponderacion
      FROM actividad a
      WHERE a.id_grupo = ?`, [id_grupo]);

    // Resultados de actividades de todos los alumnos del grupo
    const resultados = await q(`
      SELECT ra.no_control, ra.id_actividad, ra.calificacion_obtenida, ra.estatus
      FROM resultado_actividad ra
      JOIN actividad a ON ra.id_actividad = a.id_actividad
      WHERE a.id_grupo = ?`, [id_grupo]);

    // Bonus de unidad activos
    const bonusUnidad = await q(`
      SELECT no_control, id_unidad, puntos_otorgados
      FROM bonusunidad
      WHERE id_grupo = ? AND estatus = 'Activo'`, [id_grupo]);

    // Bonus final activos
    const bonusFinal = await q(`
      SELECT no_control, puntos_otorgados
      FROM bonusfinal
      WHERE id_grupo = ? AND estatus = 'Activo'`, [id_grupo]);

    // Indexar resultados por alumno → actividad
    const resMap = {};
    resultados.forEach((r) => {
      if (!resMap[r.no_control]) resMap[r.no_control] = {};
      resMap[r.no_control][r.id_actividad] = r;
    });

    // Indexar bonus unidad por alumno → unidad
    const bonusUMap = {};
    bonusUnidad.forEach((b) => {
      if (!bonusUMap[b.no_control]) bonusUMap[b.no_control] = {};
      bonusUMap[b.no_control][b.id_unidad] = parseFloat(b.puntos_otorgados);
    });

    // Indexar bonus final por alumno
    const bonusFMap = {};
    bonusFinal.forEach((b) => { bonusFMap[b.no_control] = parseFloat(b.puntos_otorgados); });

    // Agrupar actividades por unidad
    const actsPorUnidad = {};
    actividades.forEach((a) => {
      if (!actsPorUnidad[a.id_unidad]) actsPorUnidad[a.id_unidad] = [];
      actsPorUnidad[a.id_unidad].push(a);
    });

    // Calcular calificación dinámica por alumno
    const alumnosConCalif = alumnos.map((al) => {
      const nc = al.no_control;
      const unidadesCalc = {};

      let sumaUnidades = 0;
      let countUnidades = 0;

      unidades.forEach((u) => {
        const acts = actsPorUnidad[u.id_unidad] || [];
        if (!acts.length) return;

        const sumaPond = acts.reduce((s, a) => s + parseFloat(a.ponderacion), 0);
        let totalPonderado = 0;
        let hayAlgo = false;

        acts.forEach((a) => {
          const r = resMap[nc]?.[a.id_actividad];
          if (!r) return;
          hayAlgo = true;
          const cal = r.estatus === "NP" ? 0 : parseFloat(r.calificacion_obtenida ?? 0);
          totalPonderado += cal * (parseFloat(a.ponderacion) / 100);
        });

        if (!hayAlgo) return;

        // Normalizar si ponderaciones no suman 100
        const promBase = Math.abs(sumaPond - 100) > 0.5
          ? (totalPonderado / sumaPond) * 100
          : totalPonderado;

        const bonus = bonusUMap[nc]?.[u.id_unidad] || 0;
        const calFinalUnidad = Math.min(100, Math.round((promBase + bonus) * 100) / 100);
        const estatus = calFinalUnidad >= 70 ? "Aprobada" : "Reprobada";

        unidadesCalc[u.id_unidad] = {
          calificacion: calFinalUnidad,
          calificacion_unidad_final: calFinalUnidad,
          estatus,
        };

        sumaUnidades += calFinalUnidad;
        countUnidades++;
      });

      // Promedio de unidades calculado dinámicamente
      const promDinamico = countUnidades > 0 ? sumaUnidades / countUnidades : null;

      // Bonus final
      const bFinal = bonusFMap[nc] || 0;
      let calOficialDinamica = null;
      let estatusFinalDinamico = null;

      if (promDinamico !== null) {
        const conBonus = Math.min(100, promDinamico + bFinal);
        const redondeado = Math.floor(conBonus) + (conBonus % 1 >= 0.5 ? 1 : 0);
        calOficialDinamica = redondeado;
        estatusFinalDinamico = redondeado >= 70 ? "Aprobado" : "Reprobado";
      }

      // Usar calificación de BD si existe y es más reciente (modificación manual),
      // de lo contrario usar el cálculo dinámico
      const calOficialFinal = al.calificacion_oficial != null
        ? parseFloat(al.calificacion_oficial)
        : calOficialDinamica;
      const promFinal = al.promedio_unidades != null
        ? parseFloat(al.promedio_unidades)
        : promDinamico;
      const estatusFinal = al.estatus_final || estatusFinalDinamico;

      return {
        ...al,
        promedio_unidades: promFinal,
        calificacion_oficial: calOficialFinal,
        estatus_final: estatusFinal,
        unidades: unidadesCalc,
      };
    });

    const total      = alumnosConCalif.length;
    const aprobados  = alumnosConCalif.filter((a) => a.estatus_final === "Aprobado").length;
    const reprobados = alumnosConCalif.filter((a) => a.estatus_final === "Reprobado").length;
    const pendientes = total - aprobados - reprobados;
    const conCalif   = alumnosConCalif.filter((a) => a.calificacion_oficial != null);
    const promGrupo  = conCalif.length > 0
      ? (conCalif.reduce((s, a) => s + parseFloat(a.calificacion_oficial), 0) / conCalif.length).toFixed(1)
      : null;

    res.json({ grupo, unidades, alumnos: alumnosConCalif,
               stats: { total, aprobados, reprobados, pendientes, promGrupo } });

  } catch (err) {
    console.error("Error en reporte grupo:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/reportes/alumno/:no_control — historial académico
// C-3 FIX: un alumno solo puede ver su propio historial.
//           Maestros y administradores pueden ver cualquier alumno.
router.get("/alumno/:no_control", verificarToken, (req, res) => {
  const { rol, id_referencia } = req.usuario;
  const { no_control }         = req.params;

  // C-3: si el usuario es alumno, solo puede consultar su propio no_control
  if (rol === "alumno" && id_referencia !== no_control) {
    return res.status(403).json({
      error: "No tienes permiso para consultar el expediente de otro alumno.",
    });
  }

  const sql = `
    SELECT
      i.id_grupo, i.tipo_curso, i.estatus AS estatus_inscripcion,
      m.nombre_materia, m.clave_materia,
      CONCAT(mae.nombre,' ',mae.apellido_paterno) AS nombre_maestro,
      p.descripcion AS periodo, YEAR(p.fecha_inicio) AS anio,
      cf.calificacion_oficial, cf.estatus_final
    FROM inscripcion i
    JOIN grupo g         ON i.id_grupo         = g.id_grupo
    JOIN materia m       ON g.clave_materia     = m.clave_materia
    JOIN maestro mae     ON g.rfc               = mae.rfc
    LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
    LEFT JOIN calificacion_final cf
           ON cf.no_control = i.no_control AND cf.id_grupo = i.id_grupo
    WHERE i.no_control = ?
    ORDER BY p.fecha_inicio DESC
  `;
  db.query(sql, [no_control], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error interno" });
    res.json(rows);
  });
});

module.exports = router;

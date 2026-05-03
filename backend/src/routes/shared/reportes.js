// src/routes/reportes.js
const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken } = require("../../middleware/auth");

// GET /api/reportes/grupos — lista de grupos para el filtro
router.get("/grupos", verificarToken, (req, res) => {
  const rol = req.usuario.rol;
  const id_ref = req.usuario.id_referencia;

  // ── FIX: se agrega g.id_periodo al SELECT para que el filtro de periodo funcione
  let sql = `
    SELECT g.id_grupo, g.id_periodo,
           m.nombre_materia, m.clave_materia,
           CONCAT(mae.nombre,' ',mae.apellido_paterno) AS nombre_maestro,
           p.descripcion AS periodo, YEAR(p.fecha_inicio) AS anio, g.estatus
    FROM grupo g
    JOIN materia m      ON g.clave_materia   = m.clave_materia
    JOIN maestro mae    ON g.rfc  = mae.rfc
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
router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  const { id_grupo } = req.params;

  // 1) Info del grupo
  const sqlGrupo = `
    SELECT g.id_grupo, m.nombre_materia, m.clave_materia, m.no_unidades,
           CONCAT(mae.nombre,' ',mae.apellido_paterno) AS nombre_maestro,
           p.descripcion AS periodo, YEAR(p.fecha_inicio) AS anio, g.estatus
    FROM grupo g
    JOIN materia m      ON g.clave_materia   = m.clave_materia
    JOIN maestro mae    ON g.rfc  = mae.rfc
    LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
    WHERE g.id_grupo = ?
  `;

  // 2) Alumnos inscritos con calificaciones de unidad y final
  const sqlAlumnos = `
    SELECT
      a.no_control,
      CONCAT(a.apellido_paterno,' ',COALESCE(a.apellido_materno,''),', ',a.nombre) AS nombre_completo,
      i.estatus AS estatus_inscripcion,
      i.tipo_curso,
      cf.promedio_unidades,
      cf.calificacion_oficial,
      cf.estatus_final
    FROM inscripcion i
    JOIN alumno a ON i.no_control = a.no_control
    LEFT JOIN calificacion_final cf
           ON cf.no_control = i.no_control AND cf.id_grupo = i.id_grupo
    WHERE i.id_grupo = ?
    ORDER BY a.apellido_paterno ASC
  `;

  // 3) Unidades del grupo (a través de la materia)
  // ── FIX PRINCIPAL: era u.id_materia, la columna correcta es u.clave_materia
  const sqlUnidades = `
    SELECT u.id_unidad, u.nombre_unidad
    FROM unidad u
    JOIN grupo g ON u.clave_materia = g.clave_materia
    WHERE g.id_grupo = ?
    ORDER BY u.id_unidad ASC
`;

  // 4) Calificaciones por unidad de todos los alumnos del grupo
  const sqlUnidadCalif = `
    SELECT cu.no_control, cu.id_unidad, cu.calificacion_unidad_final, cu.estatus_unidad
    FROM calificacion_unidad cu
    WHERE cu.id_grupo = ?
  `;

  db.query(sqlGrupo, [id_grupo], (err, grupoRows) => {
    if (err) return res.status(500).json({ error: "Error interno" });
    if (!grupoRows.length)
      return res.status(404).json({ error: "Grupo no encontrado" });

    const grupo = grupoRows[0];

    db.query(sqlAlumnos, [id_grupo], (err2, alumnos) => {
      if (err2) return res.status(500).json({ error: "Error interno" });

      db.query(sqlUnidades, [id_grupo], (err3, unidades) => {
        if (err3) return res.status(500).json({ error: "Error interno" });

        db.query(sqlUnidadCalif, [id_grupo], (err4, califUnidad) => {
          if (err4) return res.status(500).json({ error: "Error interno" });

          // Mapear califs de unidad por alumno
          const califMap = {};
          califUnidad.forEach((c) => {
            if (!califMap[c.no_control]) califMap[c.no_control] = {};
            califMap[c.no_control][c.id_unidad] = {
              calificacion: c.calificacion_unidad_final,
              estatus: c.estatus_unidad,
            };
          });

          const alumnosConCalif = alumnos.map((a) => ({
            ...a,
            unidades: califMap[a.no_control] || {},
          }));

          const total = alumnosConCalif.length;
          const aprobados = alumnosConCalif.filter(
            (a) => a.estatus_final === "Aprobado",
          ).length;
          const reprobados = alumnosConCalif.filter(
            (a) => a.estatus_final === "Reprobado",
          ).length;
          const pendientes = total - aprobados - reprobados;
          const conCalif = alumnosConCalif.filter(
            (a) => a.calificacion_oficial != null,
          );
          const promGrupo =
            conCalif.length > 0
              ? (
                  conCalif.reduce(
                    (s, a) => s + parseFloat(a.calificacion_oficial || 0),
                    0,
                  ) / conCalif.length
                ).toFixed(1)
              : null;

          res.json({
            grupo,
            unidades,
            alumnos: alumnosConCalif,
            stats: { total, aprobados, reprobados, pendientes, promGrupo },
          });
        });
      });
    });
  });
});

// GET /api/reportes/alumno/:no_control — historial académico del alumno
router.get("/alumno/:no_control", verificarToken, (req, res) => {
  const sql = `
    SELECT
      i.id_grupo, i.tipo_curso, i.estatus AS estatus_inscripcion,
      m.nombre_materia, m.clave_materia,
      CONCAT(mae.nombre,' ',mae.apellido_paterno) AS nombre_maestro,
      p.descripcion AS periodo, p.anio,
      cf.calificacion_oficial, cf.estatus_final
    FROM inscripcion i
    JOIN grupo g         ON i.id_grupo         = g.id_grupo
    JOIN materia m       ON g.clave_materia     = m.clave_materia
    JOIN maestro mae     ON g.rfc   = mae.rfc
    LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
    LEFT JOIN calificacion_final cf
           ON cf.no_control = i.no_control AND cf.id_grupo = i.id_grupo
    WHERE i.no_control = ?
    ORDER BY p.fecha_inicio DESC
  `;
  db.query(sql, [req.params.no_control], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error interno" });
    res.json(rows);
  });
});

module.exports = router;

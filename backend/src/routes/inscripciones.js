// backend/src/routes/inscripciones.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  verificarToken,
  soloAdmin,
  maestroOAdmin,
} = require("../middleware/auth");

// GET — todas las inscripciones (con datos del alumno y grupo)
router.get("/", verificarToken, (req, res) => {
  const sql = `
    SELECT i.matricula, i.id_grupo, i.fecha_inscripcion, i.estatus, i.tipo_curso,
           CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
           a.id_carrera,
           m.nombre_materia,
           CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
           p.descripcion AS periodo
    FROM inscripcion i
    JOIN alumno a  ON i.matricula = a.matricula
    JOIN grupo  g  ON i.id_grupo  = g.id_grupo
    JOIN materia m ON g.clave_materia = m.clave_materia
    JOIN maestro mae ON g.rfc = mae.rfc
    LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
    ORDER BY i.fecha_inscripcion DESC
  `;
  db.query(sql, (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// GET — inscripciones de un alumno específico
router.get("/alumno/:matricula", verificarToken, (req, res) => {
  const sql = `
    SELECT i.id_grupo, i.fecha_inscripcion, i.estatus, i.tipo_curso,
           m.nombre_materia, m.clave_materia,
           CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
           p.descripcion AS periodo, p.anio,
           cf.calificacion_oficial, cf.estatus_final
    FROM inscripcion i
    JOIN grupo g   ON i.id_grupo = g.id_grupo
    JOIN materia m ON g.clave_materia = m.clave_materia
    JOIN maestro mae ON g.rfc = mae.rfc
    LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
    LEFT JOIN calificacion_final cf ON cf.matricula = i.matricula AND cf.id_grupo = i.id_grupo
    WHERE i.matricula = ?
    ORDER BY p.fecha_inicio DESC
  `;
  db.query(sql, [req.params.matricula], (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// GET — alumnos inscritos en un grupo
router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  const sql = `
    SELECT i.matricula, i.fecha_inscripcion, i.estatus, i.tipo_curso,
           a.nombre, a.apellido_paterno, a.apellido_materno,
           a.correo_institucional, a.id_carrera
    FROM inscripcion i
    JOIN alumno a ON i.matricula = a.matricula
    WHERE i.id_grupo = ?
    ORDER BY a.apellido_paterno, a.nombre
  `;
  db.query(sql, [req.params.id_grupo], (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// POST — inscribir alumno a grupo
router.post("/", soloAdmin, (req, res) => {
  const { matricula, id_grupo, tipo_curso } = req.body;
  if (!matricula || !id_grupo)
    return res.status(400).json({ error: "Matrícula y grupo son requeridos" });

  // Verificar que el alumno no esté ya inscrito en otro grupo de la misma materia en el mismo periodo
  const sqlDuplicado = `
    SELECT i.id_grupo
    FROM inscripcion i
    JOIN grupo g_dest ON g_dest.id_grupo = ?
    JOIN grupo g_actual ON g_actual.id_grupo = i.id_grupo
    WHERE i.matricula = ?
      AND g_actual.clave_materia = g_dest.clave_materia
      AND g_actual.id_periodo    = g_dest.id_periodo
      AND i.estatus != 'Baja'
    LIMIT 1
  `;
  db.query(sqlDuplicado, [id_grupo, matricula], (errDup, dupRows) => {
    if (errDup)
      return res.status(500).json({ error: "Error interno del servidor" });

    if (dupRows.length > 0)
      return res.status(409).json({
        error: `El alumno ya está inscrito en un grupo de esta materia en el mismo periodo (Grupo #${dupRows[0].id_grupo}).`,
      });

  // BUG 3 FIX: verificar capacidad máxima antes de insertar
  const sqlCapacidad = `
    SELECT g.limite_alumnos,
           COUNT(i.matricula) AS inscritos_actuales
    FROM grupo g
    LEFT JOIN inscripcion i ON i.id_grupo = g.id_grupo AND i.estatus != 'Baja'
    WHERE g.id_grupo = ?
    GROUP BY g.id_grupo, g.limite_alumnos
  `;
  db.query(sqlCapacidad, [id_grupo], (errCap, capRows) => {
    if (errCap)
      return res.status(500).json({ error: "Error interno del servidor" });

    if (capRows.length > 0) {
      const { limite_alumnos, inscritos_actuales } = capRows[0];
      // Solo bloquear si el límite está definido y es mayor a 0
      if (limite_alumnos && inscritos_actuales >= limite_alumnos) {
        return res.status(400).json({
          error: `El grupo ya alcanzó su capacidad máxima (${limite_alumnos} alumnos).`,
        });
      }
    }

    // INSERT IGNORE: idempotente, reimportar el mismo CSV no falla
    const sql = `
      INSERT IGNORE INTO inscripcion (matricula, id_grupo, fecha_inscripcion, estatus, tipo_curso)
      VALUES (?, ?, CURDATE(), 'Cursando', ?)
    `;
    db.query(
      sql,
      [matricula, id_grupo, tipo_curso || "Ordinario"],
      (err, result) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Error interno del servidor", detalle: err.message });

        if (result.affectedRows === 0)
          return res.status(200).json({
            success: true,
            mensaje: "El alumno ya estaba inscrito (sin cambios)",
          });

        res
          .status(201)
          .json({ success: true, mensaje: "Alumno inscrito correctamente" });
      },
    );
  });
  }); // cierre sqlDuplicado
});

// POST — inscripción masiva (varios alumnos a un grupo)
router.post("/bulk", soloAdmin, (req, res) => {
  const { matriculas, id_grupo, tipo_curso } = req.body;
  if (!matriculas?.length || !id_grupo)
    return res.status(400).json({ error: "Matriculas y grupo son requeridos" });

  // BUG 3 FIX: verificar capacidad antes de inserción masiva
  const sqlCapacidad = `
    SELECT g.limite_alumnos,
           COUNT(i.matricula) AS inscritos_actuales
    FROM grupo g
    LEFT JOIN inscripcion i ON i.id_grupo = g.id_grupo AND i.estatus != 'Baja'
    WHERE g.id_grupo = ?
    GROUP BY g.id_grupo, g.limite_alumnos
  `;
  db.query(sqlCapacidad, [id_grupo], (errCap, capRows) => {
    if (errCap)
      return res.status(500).json({ error: "Error interno del servidor" });

    if (capRows.length > 0) {
      const { limite_alumnos, inscritos_actuales } = capRows[0];
      if (limite_alumnos && inscritos_actuales + matriculas.length > limite_alumnos) {
        const disponibles = Math.max(0, limite_alumnos - inscritos_actuales);
        return res.status(400).json({
          error: `Capacidad insuficiente. El grupo tiene espacio para ${disponibles} alumno(s) más (límite: ${limite_alumnos}).`,
        });
      }
    }

    const vals = matriculas.map((m) => [
      m,
      id_grupo,
      new Date().toISOString().split("T")[0],
      "Cursando",
      tipo_curso || "Ordinario",
    ]);
    db.query(
      "INSERT IGNORE INTO inscripcion (matricula, id_grupo, fecha_inscripcion, estatus, tipo_curso) VALUES ?",
      [vals],
      (err, r) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Error interno del servidor", detalle: err.message });
        res.status(201).json({ success: true, insertados: r.affectedRows });
      },
    );
  });
});

// PUT — cambiar estatus de inscripción
router.put("/:matricula/:id_grupo/estatus", soloAdmin, (req, res) => {
  const { estatus } = req.body;
  if (!estatus) return res.status(400).json({ error: "Estatus requerido" });
  db.query(
    "UPDATE inscripcion SET estatus = ? WHERE matricula = ? AND id_grupo = ?",
    [estatus, req.params.matricula, req.params.id_grupo],
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (r.affectedRows === 0)
        return res.status(404).json({ error: "Inscripción no encontrada" });
      res.json({ success: true });
    },
  );
});

// DELETE — dar de baja inscripción
router.delete("/:matricula/:id_grupo", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM inscripcion WHERE matricula = ? AND id_grupo = ?",
    [req.params.matricula, req.params.id_grupo],
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (r.affectedRows === 0)
        return res.status(404).json({ error: "Inscripción no encontrada" });
      res.json({ success: true });
    },
  );
});

module.exports = router;

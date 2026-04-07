// backend/src/routes/grupos.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  verificarToken,
  soloAdmin,
  maestroOAdmin,
} = require("../middleware/auth");

// GET — todos los grupos
router.get("/", verificarToken, (req, res) => {
  const query = `
    SELECT
      g.id_grupo, g.clave_materia, m.nombre_materia,
      g.numero_empleado,
      CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
      g.id_periodo,
      pe.descripcion AS descripcion_periodo, pe.anio,
      g.limite_alumnos, g.horario, g.aula, g.estatus
    FROM grupo g
    JOIN materia  m   ON g.clave_materia   = m.clave_materia
    JOIN maestro  mae ON g.numero_empleado  = mae.numero_empleado
    LEFT JOIN periodo_escolar pe ON g.id_periodo = pe.id_periodo
    ORDER BY g.id_grupo DESC
  `;
  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// ─── IMPORTANTE: rutas estáticas ANTES que /:id ──────────────────────────────

// GET — grupos del maestro autenticado (para formulario y mis_grupos)
// DEBE estar antes de /:id o Express lo captura como id="mis-grupos"
router.get("/mis-grupos", verificarToken, (req, res) => {
  if (req.usuario.rol !== "maestro" && req.usuario.rol !== "administrador") {
    return res.status(403).json({ error: "Solo para maestros" });
  }
  const numero_empleado = req.usuario.id_referencia;
  const query = `
    SELECT
      g.id_grupo, g.clave_materia, m.nombre_materia,
      g.numero_empleado,
      CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
      g.id_periodo,
      pe.descripcion AS descripcion_periodo, pe.anio,
      g.limite_alumnos, g.horario, g.aula, g.estatus
    FROM grupo g
    JOIN materia  m   ON g.clave_materia   = m.clave_materia
    JOIN maestro  mae ON g.numero_empleado  = mae.numero_empleado
    LEFT JOIN periodo_escolar pe ON g.id_periodo = pe.id_periodo
    WHERE g.numero_empleado = ?
    ORDER BY g.id_grupo DESC
  `;
  db.query(query, [numero_empleado], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// ─── Rutas dinámicas con :id ──────────────────────────────────────────────────

// GET — un grupo por id
router.get("/:id", verificarToken, (req, res) => {
  const query = `
    SELECT
      g.id_grupo, g.clave_materia, m.nombre_materia,
      g.numero_empleado,
      CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
      g.id_periodo,
      pe.descripcion AS descripcion_periodo,
      g.limite_alumnos, g.horario, g.aula, g.estatus
    FROM grupo g
    JOIN materia  m   ON g.clave_materia   = m.clave_materia
    JOIN maestro  mae ON g.numero_empleado  = mae.numero_empleado
    LEFT JOIN periodo_escolar pe ON g.id_periodo = pe.id_periodo
    WHERE g.id_grupo = ?
  `;
  db.query(query, [req.params.id], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    if (results.length === 0)
      return res.status(404).json({ error: "Grupo no encontrado" });
    res.json(results[0]);
  });
});

// GET — unidades de un grupo con su ponderación
router.get("/:id/unidades", verificarToken, (req, res) => {
  const sql = `
    SELECT gu.id_unidad, u.nombre_unidad, u.estatus, gu.ponderacion
    FROM grupo_unidad gu
    JOIN unidad u ON gu.id_unidad = u.id_unidad
    WHERE gu.id_grupo = ?
    ORDER BY gu.id_unidad
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// POST — crear grupo
router.post("/", soloAdmin, (req, res) => {
  const {
    clave_materia,
    numero_empleado,
    id_periodo,
    limite_alumnos,
    horario,
    aula,
  } = req.body;
  if (!clave_materia || !numero_empleado || !id_periodo) {
    return res
      .status(400)
      .json({
        error: "Clave de materia, número de empleado y periodo son requeridos",
      });
  }
  db.query(
    `INSERT INTO grupo (clave_materia, numero_empleado, id_periodo, limite_alumnos, horario, aula)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      clave_materia,
      numero_empleado,
      id_periodo,
      limite_alumnos ?? 30,
      horario ?? null,
      aula ?? null,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res
        .status(201)
        .json({
          success: true,
          mensaje: "Grupo creado",
          id_grupo: result.insertId,
        });
    },
  );
});

// POST — asignar unidad a grupo con ponderación
router.post("/:id/unidades", maestroOAdmin, (req, res) => {
  const { id_unidad, ponderacion } = req.body;
  if (!id_unidad || ponderacion === undefined) {
    return res
      .status(400)
      .json({ error: "id_unidad y ponderacion son requeridos" });
  }
  if (ponderacion < 0 || ponderacion > 100) {
    return res
      .status(400)
      .json({ error: "La ponderación debe estar entre 0 y 100" });
  }
  const sqlSuma = `
    SELECT COALESCE(SUM(ponderacion), 0) AS total
    FROM grupo_unidad
    WHERE id_grupo = ? AND id_unidad != ?
  `;
  db.query(sqlSuma, [req.params.id, id_unidad], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    const totalActual = parseFloat(result[0].total);
    if (totalActual + parseFloat(ponderacion) > 100) {
      return res
        .status(400)
        .json({
          error: `La suma supera 100%. Ya tienes ${totalActual}% asignado.`,
        });
    }
    db.query(
      `INSERT INTO grupo_unidad (id_grupo, id_unidad, ponderacion)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE ponderacion = VALUES(ponderacion)`,
      [req.params.id, id_unidad, ponderacion],
      (err2) => {
        if (err2)
          return res.status(500).json({ error: "Error interno del servidor" });
        res
          .status(201)
          .json({ success: true, mensaje: "Unidad asignada al grupo" });
      },
    );
  });
});

// PUT — editar grupo
router.put("/:id", soloAdmin, (req, res) => {
  const { limite_alumnos, horario, aula, estatus } = req.body;
  db.query(
    `UPDATE grupo SET limite_alumnos = ?, horario = ?, aula = ?, estatus = ? WHERE id_grupo = ?`,
    [
      limite_alumnos ?? 30,
      horario ?? null,
      aula ?? null,
      estatus ?? "Activo",
      req.params.id,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Grupo no encontrado" });
      res.json({ success: true, mensaje: "Grupo actualizado" });
    },
  );
});

// DELETE — quitar unidad de grupo
router.delete("/:id/unidades/:id_unidad", maestroOAdmin, (req, res) => {
  db.query(
    "DELETE FROM grupo_unidad WHERE id_grupo = ? AND id_unidad = ?",
    [req.params.id, req.params.id_unidad],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Relación no encontrada" });
      res.json({ success: true, mensaje: "Unidad removida del grupo" });
    },
  );
});

// DELETE — eliminar grupo
router.delete("/:id", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM grupo WHERE id_grupo = ?",
    [req.params.id],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Grupo no encontrado" });
      res.json({ success: true, mensaje: "Grupo eliminado" });
    },
  );
});

module.exports = router;

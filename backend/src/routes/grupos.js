// src/routes/grupos.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  verificarToken,
  soloMaestro,
  soloAdmin,
  maestroOAdmin,
} = require("../middleware/auth");

// GET — todos los grupos (con JOIN para mostrar nombre de materia y maestro)
router.get("/", verificarToken, (req, res) => {
  const query = `
        SELECT 
            g.id_grupo,
            g.clave_materia,
            m.nombre_materia,
            g.numero_empleado,
            CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
            g.id_periodo,
            g.limite_alumnos,
            g.horario,
            g.aula,
            g.estatus
        FROM Grupo g
        JOIN Materia  m   ON g.clave_materia   = m.clave_materia
        JOIN Maestro  mae ON g.numero_empleado  = mae.numero_empleado
    `;

  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });

    res.json(results);
  });
});

// GET — un grupo por id
router.get("/:id/unidades", verificarToken, (req, res) => {
  const sql = `
        SELECT
            gu.id_unidad,
            u.nombre_unidad,
            u.estatus,
            gu.ponderacion
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

// POST — crear grupo (solo maestro)
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

  // Verifica que la suma de ponderaciones no supere 100
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
      return res.status(400).json({
        error: `La suma de ponderaciones supera 100. Ya tienes ${totalActual}% asignado.`,
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

// PUT — editar grupo (solo maestro)
router.put("/:id", soloAdmin, (req, res) => {
  const { limite_alumnos, horario, aula, estatus } = req.body;

  const query = `
        UPDATE Grupo
        SET limite_alumnos = ?, horario = ?, aula = ?, estatus = ?
        WHERE id_grupo = ?
    `;

  db.query(
    query,
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

// DELETE — eliminar grupo (solo maestro)
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

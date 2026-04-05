// src/routes/grupos.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, soloAdmin } = require("../middleware/auth");

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
router.get("/:id", verificarToken, (req, res) => {
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

// POST — crear grupo (solo maestro)
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
    return res.status(400).json({
      error: "Clave de materia, número de empleado y periodo son requeridos",
    });
  }

  const query = `
        INSERT INTO Grupo (clave_materia, numero_empleado, id_periodo, limite_alumnos, horario, aula)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

  db.query(
    query,
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

      res.status(201).json({
        success: true,
        mensaje: "Grupo creado",
        id_grupo: result.insertId,
      });
    },
  );
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
router.delete("/:id", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM Grupo WHERE id_grupo = ?",
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

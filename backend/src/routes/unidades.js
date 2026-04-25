// src/routes/unidades.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, soloAdmin } = require("../middleware/auth");

router.get("/", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM unidad ORDER BY clave_materia, id_unidad",
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// Unidades de una materia específica
router.get("/materia/:clave", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM unidad WHERE clave_materia = ? ORDER BY id_unidad",
    [req.params.clave],
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// Materias de los grupos asignados al maestro autenticado (para su dropdown)
router.get("/mis-materias", verificarToken, (req, res) => {
  if (req.usuario.rol !== "maestro") {
    return res.status(403).json({ error: "Solo para maestros" });
  }
  db.query(
    `SELECT DISTINCT m.clave_materia, m.nombre_materia, m.no_unidades
     FROM grupo g
     JOIN materia m ON g.clave_materia = m.clave_materia
     WHERE g.rfc = ?
     ORDER BY m.nombre_materia`,
    [req.usuario.id_referencia],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    }
  );
});

router.get("/:id", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM unidad WHERE id_unidad = ?",
    [req.params.id],
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (results.length === 0)
        return res.status(404).json({ error: "Unidad no encontrada" });
      res.json(results[0]);
    },
  );
});

router.post("/", soloAdmin, (req, res) => {
  const { clave_materia, nombre_unidad, temario, estatus, fecha_cierre } =
    req.body;

  if (!clave_materia || !nombre_unidad) {
    return res
      .status(400)
      .json({ error: "Clave de materia y nombre son requeridos" });
  }

  db.query(
    `INSERT INTO unidad (clave_materia, nombre_unidad, temario, estatus, fecha_cierre)
         VALUES (?, ?, ?, ?, ?)`,
    [
      clave_materia,
      nombre_unidad,
      temario ?? null,
      estatus ?? "Pendiente",
      fecha_cierre ?? null,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res
        .status(201)
        .json({
          success: true,
          mensaje: "Unidad registrada",
          id_unidad: result.insertId,
        });
    },
  );
});

router.put("/:id", soloAdmin, (req, res) => {
  const { nombre_unidad, temario, estatus, fecha_cierre } = req.body;

  db.query(
    `UPDATE unidad SET nombre_unidad = ?, temario = ?, estatus = ?, fecha_cierre = ? WHERE id_unidad = ?`,
    [
      nombre_unidad,
      temario ?? null,
      estatus ?? "Pendiente",
      fecha_cierre ?? null,
      req.params.id,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Unidad no encontrada" });
      res.json({ success: true, mensaje: "Unidad actualizada" });
    },
  );
});

router.delete("/:id", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM unidad WHERE id_unidad = ?",
    [req.params.id],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Unidad no encontrada" });
      res.json({ success: true, mensaje: "Unidad eliminada" });
    },
  );
});


// POST /materia/:clave/configurar — Crea o actualiza las N unidades de una materia en un solo paso
// Body: [ { id_unidad?, nombre_unidad, temario? }, ... ]  — un objeto por unidad
router.post("/materia/:clave/configurar", soloAdmin, (req, res) => {
  const clave = req.params.clave;
  const unidades = req.body; // array

  if (!Array.isArray(unidades) || unidades.length === 0) {
    return res.status(400).json({ error: "Se requiere un arreglo de unidades" });
  }

  // Verificar que la materia existe y obtener no_unidades
  db.query("SELECT no_unidades FROM materia WHERE clave_materia = ?", [clave], (errM, rowsM) => {
    if (errM) return res.status(500).json({ error: "Error interno del servidor" });
    if (!rowsM.length) return res.status(404).json({ error: "Materia no encontrada" });

    const noUnidades = rowsM[0].no_unidades;
    if (unidades.length !== noUnidades) {
      return res.status(400).json({
        error: `La materia tiene ${noUnidades} unidad(es). Se enviaron ${unidades.length}.`
      });
    }

    // Validar que todos tengan nombre
    for (let i = 0; i < unidades.length; i++) {
      if (!unidades[i].nombre_unidad || !unidades[i].nombre_unidad.trim()) {
        return res.status(400).json({ error: `La unidad ${i + 1} no tiene nombre.` });
      }
    }

    // Obtener unidades existentes de la materia (ordenadas por id_unidad)
    db.query(
      "SELECT id_unidad FROM unidad WHERE clave_materia = ? ORDER BY id_unidad",
      [clave],
      (errE, existentes) => {
        if (errE) return res.status(500).json({ error: "Error interno del servidor" });

        const ops = [];
        for (let i = 0; i < unidades.length; i++) {
          const u = unidades[i];
          const nombre = u.nombre_unidad.trim();
          const temario = u.temario ?? null;

          if (existentes[i]) {
            // Actualizar la unidad ya existente en esa posición
            ops.push(new Promise((resolve, reject) => {
              db.query(
                "UPDATE unidad SET nombre_unidad = ?, temario = ? WHERE id_unidad = ?",
                [nombre, temario, existentes[i].id_unidad],
                (err) => err ? reject(err) : resolve({ accion: "actualizada", id: existentes[i].id_unidad })
              );
            }));
          } else {
            // Crear unidad nueva
            ops.push(new Promise((resolve, reject) => {
              db.query(
                "INSERT INTO unidad (clave_materia, nombre_unidad, temario) VALUES (?, ?, ?)",
                [clave, nombre, temario],
                (err, result) => err ? reject(err) : resolve({ accion: "creada", id: result.insertId })
              );
            }));
          }
        }

        Promise.all(ops)
          .then(resultados => res.json({ success: true, resultados }))
          .catch(() => res.status(500).json({ error: "Error al guardar las unidades" }));
      }
    );
  });
});


// ─── Tipos de actividad habilitados por unidad ────────────────────────────────

// GET /:id/tipos — retorna los tipos que el admin habilitó para esta unidad
// Si no hay ninguno configurado, retorna lista vacía (el maestro verá todos)
router.get('/:id/tipos', verificarToken, (req, res) => {
  db.query(
    `SELECT ta.*
       FROM unidad_tipo_actividad uta
       JOIN tipo_actividad ta ON uta.id_tipo = ta.id_tipo
      WHERE uta.id_unidad = ?
      ORDER BY ta.nombre`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error interno del servidor' });
      res.json(rows);
    }
  );
});

// POST /:id/tipos — admin reemplaza los tipos habilitados para la unidad
router.post('/:id/tipos', soloAdmin, (req, res) => {
  const { id_tipos } = req.body;

  db.query('DELETE FROM unidad_tipo_actividad WHERE id_unidad = ?', [req.params.id], (errD) => {
    if (errD) return res.status(500).json({ error: 'Error interno del servidor' });

    if (!Array.isArray(id_tipos) || id_tipos.length === 0) {
      return res.json({ success: true, mensaje: 'Sin tipos seleccionados' });
    }

    const values = id_tipos.map(t => [parseInt(req.params.id), parseInt(t)]);
    db.query(
      'INSERT INTO unidad_tipo_actividad (id_unidad, id_tipo) VALUES ?',
      [values],
      (errI) => {
        if (errI) return res.status(500).json({ error: 'Error interno del servidor' });
        res.json({ success: true, guardados: values.length });
      }
    );
  });
});

module.exports = router;

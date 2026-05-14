// src/routes/unidades.js
const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

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

// GET /csv — exportar TODAS las unidades (todas las materias) en formato plano
router.get("/csv", verificarToken, soloAdmin, (req, res) => {
  db.query(
    `SELECT u.clave_materia, m.nombre_materia,
            ROW_NUMBER() OVER (PARTITION BY u.clave_materia ORDER BY u.id_unidad) AS numero_unidad,
            u.nombre_unidad
     FROM unidad u
     JOIN materia m ON u.clave_materia = m.clave_materia
     ORDER BY u.clave_materia, u.id_unidad`,
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// POST /csv — importar unidades desde CSV
// Body: { unidades: [ { clave_materia, numero_unidad, nombre_unidad }, ... ] }
// Agrupa por clave_materia y llama a la lógica de configurar para cada una.
// IMPORTANTE: el número de unidades en el CSV debe coincidir con no_unidades en materia,
// o se actualiza automáticamente si todas las filas de una materia son válidas.
router.post("/csv", soloAdmin, async (req, res) => {
  const { unidades } = req.body;
  if (!Array.isArray(unidades) || !unidades.length)
    return res.status(400).json({ error: "No se recibieron datos" });

  // Función helper para queries con promesas
  const q = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.query(sql, params, (err, r) => (err ? reject(err) : resolve(r)))
    );

  // Agrupar filas por clave_materia, ordenadas por numero_unidad
  const porMateria = {};
  for (const fila of unidades) {
    const clave = (fila.clave_materia || "").trim();
    const nombre = (fila.nombre_unidad || "").trim();
    if (!clave || !nombre) continue;
    if (!porMateria[clave]) porMateria[clave] = [];
    porMateria[clave].push({
      numero: parseInt(fila.numero_unidad) || porMateria[clave].length + 1,
      nombre_unidad: nombre,
    });
  }

  const claves = Object.keys(porMateria);
  if (!claves.length)
    return res.status(400).json({ error: "No se encontraron filas válidas" });

  const errores = [];
  let materiasProcesadas = 0;
  let unidadesGuardadas = 0;

  for (const clave of claves) {
    try {
      // Ordenar por numero_unidad para respetar el orden del CSV
      const filas = porMateria[clave].sort((a, b) => a.numero - b.numero);
      const nombres = filas.map((f) => f.nombre_unidad);

      // Verificar que la materia existe
      const matRows = await q(
        "SELECT no_unidades FROM materia WHERE clave_materia = ?",
        [clave]
      );
      if (!matRows.length) {
        errores.push({ clave, motivo: "Materia no encontrada en la BD" });
        continue;
      }

      const noUnidadesActual = matRows[0].no_unidades;

      // Si el conteo difiere, actualizar no_unidades en la materia primero
      if (nombres.length !== noUnidadesActual) {
        await q(
          "UPDATE materia SET no_unidades = ? WHERE clave_materia = ?",
          [nombres.length, clave]
        );
      }

      // Obtener unidades existentes
      const existentes = await q(
        "SELECT id_unidad FROM unidad WHERE clave_materia = ? ORDER BY id_unidad",
        [clave]
      );

      // Aplicar la misma lógica que /configurar: actualizar existentes, insertar nuevas
      const ops = nombres.map((nombre, i) => {
        if (existentes[i]) {
          return q(
            "UPDATE unidad SET nombre_unidad = ? WHERE id_unidad = ?",
            [nombre, existentes[i].id_unidad]
          );
        } else {
          return q(
            "INSERT INTO unidad (clave_materia, nombre_unidad) VALUES (?, ?)",
            [clave, nombre]
          );
        }
      });

      // Si hay más existentes que nombres en el CSV, eliminar el exceso
      if (existentes.length > nombres.length) {
        const sobrantes = existentes.slice(nombres.length);
        for (const s of sobrantes) {
          ops.push(
            q("DELETE FROM unidad WHERE id_unidad = ?", [s.id_unidad])
          );
        }
      }

      await Promise.all(ops);
      materiasProcesadas++;
      unidadesGuardadas += nombres.length;
    } catch (e) {
      errores.push({ clave, motivo: e.message });
    }
  }

  res.json({
    success: true,
    materiasProcesadas,
    unidadesGuardadas,
    errores,
    mensaje: `${materiasProcesadas} materia(s) procesadas, ${unidadesGuardadas} unidad(es) guardadas. ${errores.length} con errores.`,
  });
});

// Unidades de una materia específica
router.get("/materia/:clave", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM unidad WHERE clave_materia = ? ORDER BY id_unidad",
    [req.params.clave],
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      const conNumero = results.map((u, i) => ({ ...u, numero_unidad: i + 1 }));
      res.json(conNumero);
    },
  );
});

// Materias de los grupos asignados al maestro autenticado
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
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
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
  const { clave_materia, nombre_unidad } = req.body;
  if (!clave_materia || !nombre_unidad) {
    return res
      .status(400)
      .json({ error: "Clave de materia y nombre son requeridos" });
  }
  db.query(
    `INSERT INTO unidad (clave_materia, nombre_unidad) VALUES (?, ?)`,
    [clave_materia, nombre_unidad],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.status(201).json({
        success: true,
        mensaje: "Unidad registrada",
        id_unidad: result.insertId,
      });
    },
  );
});

router.put("/:id", soloAdmin, (req, res) => {
  const { nombre_unidad } = req.body;
  db.query(
    `UPDATE unidad SET nombre_unidad = ? WHERE id_unidad = ?`,
    [nombre_unidad, req.params.id],
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

// POST /materia/:clave/configurar
router.post("/materia/:clave/configurar", soloAdmin, (req, res) => {
  const clave = req.params.clave;
  const unidades = req.body;

  if (!Array.isArray(unidades) || unidades.length === 0) {
    return res
      .status(400)
      .json({ error: "Se requiere un arreglo de unidades" });
  }

  db.query(
    "SELECT no_unidades FROM materia WHERE clave_materia = ?",
    [clave],
    (errM, rowsM) => {
      if (errM)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!rowsM.length)
        return res.status(404).json({ error: "Materia no encontrada" });

      const noUnidades = rowsM[0].no_unidades;
      if (unidades.length !== noUnidades) {
        return res.status(400).json({
          error: `La materia tiene ${noUnidades} unidad(es). Se enviaron ${unidades.length}.`,
        });
      }

      for (let i = 0; i < unidades.length; i++) {
        if (!unidades[i].nombre_unidad || !unidades[i].nombre_unidad.trim()) {
          return res
            .status(400)
            .json({ error: `La unidad ${i + 1} no tiene nombre.` });
        }
      }

      db.query(
        "SELECT id_unidad FROM unidad WHERE clave_materia = ? ORDER BY id_unidad",
        [clave],
        (errE, existentes) => {
          if (errE)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });

          const ops = [];
          for (let i = 0; i < unidades.length; i++) {
            const nombre = unidades[i].nombre_unidad.trim();
            if (existentes[i]) {
              ops.push(
                new Promise((resolve, reject) => {
                  db.query(
                    "UPDATE unidad SET nombre_unidad = ? WHERE id_unidad = ?",
                    [nombre, existentes[i].id_unidad],
                    (err) =>
                      err
                        ? reject(err)
                        : resolve({ accion: "actualizada", id: existentes[i].id_unidad }),
                  );
                }),
              );
            } else {
              ops.push(
                new Promise((resolve, reject) => {
                  db.query(
                    "INSERT INTO unidad (clave_materia, nombre_unidad) VALUES (?, ?)",
                    [clave, nombre],
                    (err, result) =>
                      err
                        ? reject(err)
                        : resolve({ accion: "creada", id: result.insertId }),
                  );
                }),
              );
            }
          }

          Promise.all(ops)
            .then((resultados) => res.json({ success: true, resultados }))
            .catch(() =>
              res.status(500).json({ error: "Error al guardar las unidades" }),
            );
        },
      );
    },
  );
});

// ─── Tipos de actividad habilitados por unidad ────────────────────────────────
router.get("/:id/tipos", verificarToken, (req, res) => {
  db.query(
    `SELECT ta.*
       FROM unidad_tipo_actividad uta
       JOIN tipo_actividad ta ON uta.id_tipo = ta.id_tipo
      WHERE uta.id_unidad = ?
      ORDER BY ta.nombre`,
    [req.params.id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(rows);
    },
  );
});

router.post("/:id/tipos", soloAdmin, (req, res) => {
  const { id_tipos } = req.body;
  db.query(
    "DELETE FROM unidad_tipo_actividad WHERE id_unidad = ?",
    [req.params.id],
    (errD) => {
      if (errD)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!Array.isArray(id_tipos) || id_tipos.length === 0) {
        return res.json({ success: true, mensaje: "Sin tipos seleccionados" });
      }
      const values = id_tipos.map((t) => [
        parseInt(req.params.id),
        parseInt(t),
      ]);
      db.query(
        "INSERT INTO unidad_tipo_actividad (id_unidad, id_tipo) VALUES ?",
        [values],
        (errI) => {
          if (errI)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          res.json({ success: true, guardados: values.length });
        },
      );
    },
  );
});

module.exports = router;

// src/routes/actividades.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, maestroOAdmin } = require("../middleware/auth");

// GET — actividades filtradas por rol (incluye nombre_unidad y numero_unidad)
router.get("/", verificarToken, (req, res) => {
  const { id_referencia, rol } = req.usuario;

  const camposSql = `
        a.*,
        u.nombre_unidad,
        u.clave_materia
    `;

  if (rol === "maestro") {
    const sql = `
            SELECT ${camposSql}
            FROM actividad a
            JOIN grupo  g ON a.id_grupo  = g.id_grupo
            LEFT JOIN unidad u ON a.id_unidad = u.id_unidad
            WHERE g.numero_empleado = ?
            ORDER BY a.id_grupo, a.id_unidad, a.id_actividad
        `;
    db.query(sql, [id_referencia], (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r);
    });
  } else {
    const sql = `
            SELECT ${camposSql}
            FROM actividad a
            LEFT JOIN unidad u ON a.id_unidad = u.id_unidad
            ORDER BY a.id_grupo, a.id_unidad, a.id_actividad
        `;
    db.query(sql, (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r);
    });
  }
});

// POST — crear actividad con validación de suma de ponderaciones
router.post("/", maestroOAdmin, (req, res) => {
  const {
    id_grupo,
    id_unidad,
    nombre_actividad,
    ponderacion,
    tipo_evaluacion,
    fecha_entrega,
  } = req.body;

  if (
    !id_grupo ||
    !id_unidad ||
    !nombre_actividad ||
    ponderacion === undefined ||
    ponderacion === ""
  ) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const pond = parseFloat(ponderacion);
  if (isNaN(pond) || pond <= 0 || pond > 100) {
    return res
      .status(400)
      .json({ error: "La ponderación debe ser un valor entre 1 y 100" });
  }

  // Verificar que la unidad pertenece a la materia del grupo
  const sqlVerifica = `
    SELECT g.clave_materia AS clave_grupo, u.clave_materia AS clave_unidad,
           u.nombre_unidad
    FROM grupo g
    CROSS JOIN unidad u
    WHERE g.id_grupo = ? AND u.id_unidad = ?
`;
  db.query(sqlVerifica, [id_grupo, id_unidad], (errV, rowsV) => {
    if (errV)
      return res.status(500).json({ error: "Error interno del servidor" });
    if (rowsV.length === 0) {
      return res
        .status(400)
        .json({ error: "Grupo o unidad no encontrados en la base de datos" });
    }
    if (rowsV[0].clave_grupo !== rowsV[0].clave_unidad) {
      return res.status(400).json({
        error: `La unidad "${rowsV[0].nombre_unidad}" pertenece a otra materia. Selecciona una unidad de la materia correcta.`,
      });
    }

    // Verificar que la suma no supere 100%
    const sqlSuma = `
      SELECT COALESCE(SUM(ponderacion), 0) AS total
      FROM actividad
      WHERE id_grupo = ? AND id_unidad = ?
    `;
    db.query(sqlSuma, [id_grupo, id_unidad], (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      const totalActual = parseFloat(result[0].total);
      if (totalActual + pond > 100) {
        return res.status(400).json({
          error: `La suma de ponderaciones superaría el 100%. Actualmente tienes ${totalActual}% asignado en esta unidad. Disponible: ${Math.round((100 - totalActual) * 100) / 100}%`,
          total_actual: totalActual,
          disponible: Math.round((100 - totalActual) * 100) / 100,
        });
      }

      db.query(
        `INSERT INTO actividad (id_grupo, id_unidad, nombre_actividad, ponderacion, tipo_evaluacion, fecha_entrega)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id_grupo,
          id_unidad,
          nombre_actividad,
          pond,
          tipo_evaluacion ?? "Sumativa",          fecha_entrega ?? null,
        ],
        (err2, result2) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          res.status(201).json({
            success: true,
            id_actividad: result2.insertId,
            total_ponderacion: Math.round((totalActual + pond) * 100) / 100,
          });
        },
      );
    });
  });
});

// PUT — editar actividad
router.put("/:id", maestroOAdmin, (req, res) => {
  const { nombre_actividad, ponderacion, tipo_evaluacion, fecha_entrega } =
    req.body;

  db.query(
    "SELECT bloqueado, id_grupo, id_unidad FROM actividad WHERE id_actividad = ?",
    [req.params.id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (rows.length === 0)
        return res.status(404).json({ error: "Actividad no encontrada" });

      if (rows[0].bloqueado) {
        return res.status(409).json({
          error:
            "Esta actividad está bloqueada porque ya tiene calificaciones registradas. No se puede modificar su ponderación.",
        });
      }

      if (ponderacion !== undefined) {
        const pond = parseFloat(ponderacion);
        const sqlSuma = `
          SELECT COALESCE(SUM(ponderacion), 0) AS total
          FROM actividad
          WHERE id_grupo = ? AND id_unidad = ? AND id_actividad != ?
        `;
        db.query(
          sqlSuma,
          [rows[0].id_grupo, rows[0].id_unidad, req.params.id],
          (err2, res2) => {
            if (err2)
              return res
                .status(500)
                .json({ error: "Error interno del servidor" });
            const totalOtros = parseFloat(res2[0].total);
            if (totalOtros + pond > 100) {
              return res.status(400).json({
                error: `La suma de ponderaciones superaría el 100%. Otras actividades ya suman ${totalOtros}%.`,
              });
            }
            ejecutarUpdate();
          },
        );
      } else {
        ejecutarUpdate();
      }

      function ejecutarUpdate() {
        db.query(
          `UPDATE actividad
           SET nombre_actividad = COALESCE(?, nombre_actividad),
               ponderacion       = COALESCE(?, ponderacion),
               tipo_evaluacion   = COALESCE(?, tipo_evaluacion),
               fecha_entrega     = COALESCE(?, fecha_entrega)
           WHERE id_actividad = ?`,
          [
            nombre_actividad ?? null,
            ponderacion ?? null,
            tipo_evaluacion ?? null,
            fecha_entrega ?? null,
            req.params.id,
          ],
          (err3, r3) => {
            if (err3)
              return res
                .status(500)
                .json({ error: "Error interno del servidor" });
            if (r3.affectedRows === 0)
              return res.status(404).json({ error: "No encontrada" });
            res.json({ success: true });
          },
        );
      }
    },
  );
});

// DELETE — eliminar actividad
router.delete("/:id", maestroOAdmin, (req, res) => {
  db.query(
    "DELETE FROM actividad WHERE id_actividad = ?",
    [req.params.id],
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (r.affectedRows === 0)
        return res.status(404).json({ error: "No encontrada" });
      res.json({ success: true });
    },
  );
});


// POST /bloquear-unidad — Bloquea (guarda definitivamente) todas las actividades de un grupo-unidad
// Una vez bloqueadas, no se pueden agregar ni eliminar actividades en esa unidad
router.post("/bloquear-unidad", maestroOAdmin, (req, res) => {
  const { id_grupo, id_unidad } = req.body;

  if (!id_grupo || !id_unidad) {
    return res.status(400).json({ error: "Se requiere id_grupo e id_unidad" });
  }

  // Verificar que la suma sea exactamente 100% antes de bloquear
  db.query(
    "SELECT COALESCE(SUM(ponderacion), 0) AS total, COUNT(*) AS cantidad FROM actividad WHERE id_grupo = ? AND id_unidad = ?",
    [id_grupo, id_unidad],
    (errC, rowsC) => {
      if (errC) return res.status(500).json({ error: "Error interno del servidor" });

      const total    = parseFloat(rowsC[0].total);
      const cantidad = parseInt(rowsC[0].cantidad);

      if (cantidad === 0) {
        return res.status(400).json({ error: "La unidad no tiene actividades configuradas." });
      }
      if (Math.round(total) !== 100) {
        return res.status(400).json({
          error: `La suma de ponderaciones debe ser exactamente 100%. Actualmente: ${total.toFixed(0)}%.`
        });
      }

      // Bloquear todas las actividades de este grupo-unidad
      db.query(
        "UPDATE actividad SET bloqueado = 1 WHERE id_grupo = ? AND id_unidad = ?",
        [id_grupo, id_unidad],
        (errU, result) => {
          if (errU) return res.status(500).json({ error: "Error interno del servidor" });
          res.json({
            success: true,
            mensaje: "Unidad guardada y bloqueada correctamente.",
            actividades_bloqueadas: result.affectedRows
          });
        }
      );
    }
  );
});

module.exports = router;

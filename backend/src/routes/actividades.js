// src/routes/actividades.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, maestroOAdmin } = require("../middleware/auth");

// GET — todas las actividades
router.get("/", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM actividad ORDER BY id_grupo, id_unidad, id_actividad",
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r);
    },
  );
});

// POST — crear actividad con validación de suma de ponderaciones (FIX 4)
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
    ponderacion === undefined
  ) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const pond = parseFloat(ponderacion);
  if (isNaN(pond) || pond <= 0 || pond > 100) {
    return res
      .status(400)
      .json({ error: "La ponderación debe ser un valor entre 1 y 100" });
  }

  // FIX 4: verificar que la suma no supere 100%
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
        error: `La suma de ponderaciones superaría el 100%. Actualmente tienes ${totalActual}% asignado en esta unidad.`,
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
        tipo_evaluacion ?? "Sumativa",
        fecha_entrega ?? null,
      ],
      (err2, result2) => {
        if (err2)
          return res.status(500).json({ error: "Error interno del servidor" });
        res.status(201).json({
          success: true,
          id_actividad: result2.insertId,
          total_ponderacion: Math.round((totalActual + pond) * 100) / 100,
        });
      },
    );
  });
});

// PUT — editar actividad (solo si no está bloqueada) (FIX 13)
router.put("/:id", maestroOAdmin, (req, res) => {
  const { nombre_actividad, ponderacion, tipo_evaluacion, fecha_entrega } =
    req.body;

  // Verificar si está bloqueada antes de permitir edición
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

      // Si se cambia la ponderación, validar suma
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

module.exports = router;

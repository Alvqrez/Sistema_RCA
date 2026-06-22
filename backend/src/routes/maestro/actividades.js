const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, maestroOAdmin, verificarPropietarioGrupo } = require("../../middleware/auth");

// ─── GET actividades ─────────────────────────────────────────────────────────
router.get("/", verificarToken, (req, res) => {
  const { id_referencia, rol } = req.usuario;
  const { id_grupo, id_unidad } = req.query;
  const camposSql = `a.*, u.nombre_unidad, u.clave_materia, ta.nombre AS nombre_tipo`;

  const conditions = [];
  const params = [];

  if (rol === "maestro") {
    conditions.push("g.rfc = ?");
    params.push(id_referencia);
  }
  if (id_grupo) {
    conditions.push("a.id_grupo = ?");
    params.push(id_grupo);
  }
  if (id_unidad) {
    conditions.push("a.id_unidad = ?");
    params.push(id_unidad);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const join = rol === "maestro" || !id_grupo
    ? "JOIN grupo g ON a.id_grupo = g.id_grupo"
    : "";

  db.query(
    `SELECT ${camposSql}
     FROM actividad a
     ${join}
     LEFT JOIN unidad u ON a.id_unidad = u.id_unidad
     LEFT JOIN tipo_actividad ta ON a.id_tipo_actividad = ta.id_tipo
     ${where}
     ORDER BY a.id_grupo, a.id_unidad, a.id_actividad`,
    params,
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r);
    },
  );
});

// ─── POST crear actividad ─────────────────────────────────────────────────────
router.post("/", maestroOAdmin, (req, res) => {
  const { id_grupo, id_unidad, ponderacion, id_tipo_actividad } = req.body;

  if (
    !id_grupo ||
    !id_unidad ||
    ponderacion === undefined ||
    ponderacion === ""
  )
    return res.status(400).json({ error: "Faltan campos requeridos" });

  const pond = parseFloat(ponderacion);
  if (isNaN(pond) || pond <= 0 || pond > 100)
    return res
      .status(400)
      .json({ error: "La ponderación debe ser un valor entre 1 y 100" });

  verificarPropietarioGrupo(id_grupo, req, res, () => {
    const sqlVerifica = `
      SELECT g.clave_materia AS clave_grupo, u.clave_materia AS clave_unidad, u.nombre_unidad
      FROM grupo g CROSS JOIN unidad u
      WHERE g.id_grupo = ? AND u.id_unidad = ?`;
    db.query(sqlVerifica, [id_grupo, id_unidad], (errV, rowsV) => {
      if (errV)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!rowsV.length)
        return res
          .status(400)
          .json({ error: "Grupo o unidad no encontrados en la base de datos" });
      if (rowsV[0].clave_grupo !== rowsV[0].clave_unidad)
        return res.status(400).json({
          error: `La unidad "${rowsV[0].nombre_unidad}" pertenece a otra materia. Selecciona una unidad de la materia correcta.`,
        });

      db.query(
        "SELECT COALESCE(SUM(ponderacion), 0) AS total FROM actividad WHERE id_grupo = ? AND id_unidad = ?",
        [id_grupo, id_unidad],
        (err, result) => {
          if (err)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          const totalActual = parseFloat(result[0].total);
          if (totalActual + pond > 100)
            return res.status(400).json({
              error: `La suma de ponderaciones superaría el 100%. Actualmente tienes ${totalActual}% asignado en esta unidad. Disponible: ${Math.round((100 - totalActual) * 100) / 100}%`,
              total_actual: totalActual,
              disponible: Math.round((100 - totalActual) * 100) / 100,
            });

          db.query(
            "INSERT INTO actividad (id_grupo, id_unidad, id_tipo_actividad, ponderacion) VALUES (?, ?, ?, ?)",
            [id_grupo, id_unidad, id_tipo_actividad ?? null, pond],
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
        },
      );
    });
  });
});

// ─── PUT editar actividad ─────────────────────────────────────────────────────
router.put("/:id", maestroOAdmin, (req, res) => {
  const { ponderacion } = req.body;

  db.query(
    "SELECT bloqueado, id_grupo, id_unidad FROM actividad WHERE id_actividad = ?",
    [req.params.id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!rows.length)
        return res.status(404).json({ error: "Actividad no encontrada" });
      if (rows[0].bloqueado)
        return res.status(409).json({
          error:
            "Esta actividad está bloqueada porque ya tiene calificaciones registradas. No se puede modificar su ponderación.",
        });

      verificarPropietarioGrupo(rows[0].id_grupo, req, res, () => {
        if (ponderacion !== undefined) {
          const pond = parseFloat(ponderacion);
          db.query(
            "SELECT COALESCE(SUM(ponderacion), 0) AS total FROM actividad WHERE id_grupo = ? AND id_unidad = ? AND id_actividad != ?",
            [rows[0].id_grupo, rows[0].id_unidad, req.params.id],
            (err2, res2) => {
              if (err2)
                return res
                  .status(500)
                  .json({ error: "Error interno del servidor" });
              const totalOtros = parseFloat(res2[0].total);
              if (totalOtros + pond > 100)
                return res.status(400).json({
                  error: `La suma de ponderaciones superaría el 100%. Otras actividades ya suman ${totalOtros}%.`,
                });
              ejecutarUpdate();
            },
          );
        } else {
          ejecutarUpdate();
        }

        function ejecutarUpdate() {
          db.query(
            "UPDATE actividad SET ponderacion = COALESCE(?, ponderacion) WHERE id_actividad = ?",
            [ponderacion ?? null, req.params.id],
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
      });
    },
  );
});

// ─── DELETE eliminar actividad ────────────────────────────────────────────────
router.delete("/:id", maestroOAdmin, (req, res) => {
  db.query(
    "SELECT id_grupo FROM actividad WHERE id_actividad = ?",
    [req.params.id],
    (errG, rowsG) => {
      if (errG)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!rowsG.length)
        return res.status(404).json({ error: "No encontrada" });

      verificarPropietarioGrupo(rowsG[0].id_grupo, req, res, () => {
        db.query(
          "SELECT COUNT(*) AS total FROM resultado_actividad WHERE id_actividad = ?",
          [req.params.id],
          (errC, rowsC) => {
            if (errC)
              return res
                .status(500)
                .json({ error: "Error interno del servidor" });
            if (rowsC[0].total > 0)
              return res.status(409).json({
                error: `No se puede eliminar esta actividad porque ya tiene ${rowsC[0].total} calificación(es) registrada(s). Anúlala o cancela los resultados primero.`,
              });

            db.query(
              "DELETE FROM actividad WHERE id_actividad = ?",
              [req.params.id],
              (err, r) => {
                if (err)
                  return res
                    .status(500)
                    .json({ error: "Error interno del servidor" });
                if (r.affectedRows === 0)
                  return res.status(404).json({ error: "No encontrada" });
                res.json({ success: true });
              },
            );
          },
        );
      });
    },
  );
});

// ─── POST bloquear unidad ─────────────────────────────────────────────────────
router.post("/bloquear-unidad", maestroOAdmin, (req, res) => {
  const { id_grupo, id_unidad } = req.body;
  if (!id_grupo || !id_unidad)
    return res.status(400).json({ error: "Se requiere id_grupo e id_unidad" });

  verificarPropietarioGrupo(id_grupo, req, res, () => {
    db.query(
      "SELECT COALESCE(SUM(ponderacion), 0) AS total, COUNT(*) AS cantidad FROM actividad WHERE id_grupo = ? AND id_unidad = ?",
      [id_grupo, id_unidad],
      (errC, rowsC) => {
        if (errC)
          return res.status(500).json({ error: "Error interno del servidor" });

        const total = parseFloat(rowsC[0].total);
        const cantidad = parseInt(rowsC[0].cantidad);

        if (cantidad === 0)
          return res
            .status(400)
            .json({ error: "La unidad no tiene actividades configuradas." });
        if (Math.round(total) !== 100)
          return res.status(400).json({
            error: `La suma de ponderaciones debe ser exactamente 100%. Actualmente: ${total.toFixed(0)}%.`,
          });

        db.query(
          "UPDATE actividad SET bloqueado = 1 WHERE id_grupo = ? AND id_unidad = ?",
          [id_grupo, id_unidad],
          (errU, result) => {
            if (errU)
              return res
                .status(500)
                .json({ error: "Error interno del servidor" });
            res.json({
              success: true,
              mensaje: "Unidad guardada y bloqueada correctamente.",
              actividades_bloqueadas: result.affectedRows,
            });
          },
        );
      },
    );
  });
});

module.exports = router;

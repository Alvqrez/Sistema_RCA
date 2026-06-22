const express = require("express");
const router = express.Router();
const db = require("../../db");
const {
  verificarToken,
  soloAdmin,
  maestroOAdmin,
  verificarPropietarioGrupo,
} = require("../../middleware/auth");

// ─── GET grupos filtrados por rol ─────────────────────────────────────────
router.get("/", verificarToken, (req, res) => {
  const { rol, id_referencia } = req.usuario;

  let query = `
    SELECT
      g.id_grupo, g.clave_materia, m.nombre_materia,
      g.rfc,
      CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
      g.id_periodo,
      pe.descripcion AS descripcion_periodo, YEAR(pe.fecha_inicio) AS anio,
      g.limite_alumnos, g.estatus
    FROM grupo g
    JOIN materia  m   ON g.clave_materia   = m.clave_materia
    JOIN maestro  mae ON g.rfc  = mae.rfc
    LEFT JOIN periodo_escolar pe ON g.id_periodo = pe.id_periodo
  `;
  const params = [];

  if (rol === "maestro") {
    query += " WHERE g.rfc = ?";
    params.push(id_referencia);
  } else if (rol === "alumno") {
    query += " JOIN inscripcion i ON i.id_grupo = g.id_grupo WHERE i.no_control = ?";
    params.push(id_referencia);
  }

  query += " ORDER BY g.id_grupo DESC";

  db.query(query, params, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// ─── GET mis grupos (maestro autenticado) ─────────────────────────────────
router.get("/mis-grupos", verificarToken, (req, res) => {
  if (req.usuario.rol !== "maestro" && req.usuario.rol !== "administrador") {
    return res.status(403).json({ error: "Solo para maestros" });
  }
  const rfc = req.usuario.id_referencia;
  const query = `
    SELECT
      g.id_grupo, g.clave_materia, m.nombre_materia,
      g.rfc,
      CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
      g.id_periodo,
      pe.descripcion AS descripcion_periodo, YEAR(pe.fecha_inicio) AS anio,
      g.limite_alumnos, g.estatus
    FROM grupo g
    JOIN materia  m   ON g.clave_materia   = m.clave_materia
    JOIN maestro  mae ON g.rfc  = mae.rfc
    LEFT JOIN periodo_escolar pe ON g.id_periodo = pe.id_periodo
    WHERE g.rfc = ?
    ORDER BY g.id_grupo DESC
  `;
  db.query(query, [rfc], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// ─── GET un grupo por id ──────────────────────────────────────────────────
router.get("/:id", verificarToken, (req, res) => {
  const query = `
    SELECT
      g.id_grupo, g.clave_materia, m.nombre_materia,
      g.rfc,
      CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
      g.id_periodo,
      pe.descripcion AS descripcion_periodo,
      g.limite_alumnos, g.estatus
    FROM grupo g
    JOIN materia  m   ON g.clave_materia   = m.clave_materia
    JOIN maestro  mae ON g.rfc  = mae.rfc
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

// ─── GET unidades de un grupo ─────────────────────────────────────────────
router.get("/:id/unidades", verificarToken, (req, res) => {
  const sql = `
    SELECT
        gu.id_unidad, u.nombre_unidad, u.estatus,
        u.clave_materia, gu.tipo_config
    FROM grupo_unidad gu
    JOIN unidad u ON gu.id_unidad = u.id_unidad
    WHERE gu.id_grupo = ?
    ORDER BY gu.id_unidad
`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      const sqlBase = `
        SELECT
            gu.id_unidad, u.nombre_unidad, u.estatus,
            u.clave_materia, 'original' AS tipo_config
        FROM grupo_unidad gu
        JOIN unidad u ON gu.id_unidad = u.id_unidad
        WHERE gu.id_grupo = ?
        ORDER BY gu.id_unidad
      `;
      return db.query(sqlBase, [req.params.id], (err2, results2) => {
        if (err2)
          return res.status(500).json({ error: "Error interno del servidor" });
        const conNumero = results2.map((u, i) => ({
          ...u,
          numero_unidad: i + 1,
        }));
        res.json(conNumero);
      });
    }

    const conNumero = results.map((u, i) => ({ ...u, numero_unidad: i + 1 }));
    res.json(conNumero);
  });
});

// ─── POST importar grupos desde CSV ────────────────────────────────────────
router.post("/csv", soloAdmin, async (req, res) => {
  const { grupos } = req.body;

  if (!Array.isArray(grupos) || grupos.length === 0)
    return res.status(400).json({ error: "No se recibieron datos" });

  const errores = [];
  let insertados = 0;

  for (const g of grupos) {
    const { clave_materia, rfc, id_periodo } = g;

    // Validar campos obligatorios
    if (!clave_materia || !rfc || !id_periodo) {
      errores.push({
        fila: `${clave_materia || "?"}/${rfc || "?"}`,
        motivo: "Faltan campos requeridos (clave_materia, rfc, id_periodo)",
      });
      continue;
    }

    try {
      await new Promise((ok, fail) => {
        db.query(
          `INSERT INTO grupo
             (clave_materia, rfc, id_periodo, limite_alumnos)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             limite_alumnos = VALUES(limite_alumnos)`,
          [
            clave_materia.trim(),
            rfc.trim(),
            parseInt(id_periodo),
            parseInt(g.limite_alumnos) || 30,
          ],
          (err) => (err ? fail(err) : ok()),
        );
      });
      insertados++;
    } catch (e) {
      let motivo = e.message;
      if (e.code === "ER_NO_REFERENCED_ROW_2") {
        if (motivo.includes("fk_Grupo_Mat")) motivo = `La materia '${clave_materia}' no existe en el sistema`;
        else if (motivo.includes("fk_Grupo_Mae")) motivo = `El RFC '${rfc}' no existe como maestro`;
        else if (motivo.includes("fk_Grupo_Per")) motivo = `El periodo '${id_periodo}' no existe`;
        else motivo = `Referencia inválida: ${motivo}`;
      } else if (e.code === "ER_DUP_ENTRY") {
        motivo = "Grupo duplicado (mismo maestro, materia y periodo ya existe)";
      }
      errores.push({
        fila: `${clave_materia}/${rfc}`,
        motivo,
      });
    }
  }

  res.json({
    success: true,
    insertados,
    errores,
    mensaje: `${insertados} grupo(s) importados. ${errores.length} con errores.`,
  });
});

// ─── POST crear grupo ─────────────────────────────────────────────────────
router.post("/", soloAdmin, (req, res) => {
  const { clave_materia, rfc, id_periodo, limite_alumnos } = req.body;

  if (!clave_materia || !rfc || !id_periodo) {
    return res.status(400).json({
      error: "Clave de materia, número de empleado y periodo son requeridos",
    });
  }

  insertarGrupo(res, clave_materia, rfc, id_periodo, limite_alumnos);
});

function insertarGrupo(res, clave_materia, rfc, id_periodo, limite_alumnos) {
  db.query(
    `INSERT INTO grupo (clave_materia, rfc, id_periodo, limite_alumnos)
     VALUES (?, ?, ?, ?)`,
    [
      clave_materia,
      rfc,
      id_periodo,
      limite_alumnos ?? 30,
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            error:
              "Este maestro ya tiene un grupo asignado para esta materia en este periodo.",
          });
        }
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.status(201).json({
        success: true,
        mensaje: "Grupo creado",
        id_grupo: result.insertId,
      });
    },
  );
}

// ─── POST auto-vincular unidades de la materia ────────────────────────────
router.post("/:id/unidades/auto-vincular", maestroOAdmin, (req, res) => {
  const idGrupo = req.params.id;

  db.query(
    "SELECT clave_materia FROM grupo WHERE id_grupo = ?",
    [idGrupo],
    (err, grupos) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!grupos.length)
        return res.status(404).json({ error: "Grupo no encontrado" });

      const claveMateria = grupos[0].clave_materia;

      db.query(
        "SELECT id_unidad FROM unidad WHERE clave_materia = ?",
        [claveMateria],
        (err2, unidades) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          if (!unidades.length)
            return res.json({
              success: true,
              vinculadas: 0,
              mensaje: "No hay unidades creadas para esta materia",
            });

          let vinculadas = 0;
          let pendientes = unidades.length;

          db.query(
            `SELECT ids_origen FROM grupo_unidad_layout WHERE id_grupo = ?`,
            [idGrupo],
            (errL, layouts) => {
              const idsReemplazados = new Set();
              (layouts || []).forEach(row => {
                row.ids_origen.split(",").forEach(id => idsReemplazados.add(parseInt(id)));
              });

              const unidadesFiltradas = unidades.filter(u => !idsReemplazados.has(u.id_unidad));
              if (!unidadesFiltradas.length) {
                return res.json({ success: true, vinculadas: 0, mensaje: "No hay unidades nuevas para vincular" });
              }

              pendientes = unidadesFiltradas.length;
              unidadesFiltradas.forEach((u) => {
                db.query(
                  "INSERT IGNORE INTO grupo_unidad (id_grupo, id_unidad) VALUES (?, ?)",
                  [idGrupo, u.id_unidad],
                  (err3, result) => {
                    if (!err3 && result.affectedRows > 0) vinculadas++;
                    pendientes--;
                    if (pendientes === 0) {
                      res.json({
                        success: true,
                        vinculadas,
                        mensaje: `${vinculadas} unidad(es) vinculada(s) correctamente`,
                      });
                    }
                  },
                );
              });
            }
          );
        },
      );
    },
  );
});


// ─── PUT editar grupo ─────────────────────────────────────────────────────
router.put("/:id", soloAdmin, (req, res) => {
  const { limite_alumnos, estatus } = req.body;
  db.query(
    `UPDATE grupo SET limite_alumnos = ?, estatus = ? WHERE id_grupo = ?`,
    [
      limite_alumnos ?? 30,
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

// ─── DELETE quitar unidad de grupo ────────────────────────────────────────
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

// ─── DELETE eliminar grupo ────────────────────────────────────────────────
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



function qp(sql, params = []) {
  return new Promise((res, rej) =>
    db.query(sql, params, (err, r) => (err ? rej(err) : res(r)))
  );
}

// ─── POST dividir una unidad ──────────────────────────────────────────────
router.post("/:id/dividir-unidad", maestroOAdmin, async (req, res) => {
  const id_grupo  = parseInt(req.params.id);
  const { id_unidad, nombre_a, nombre_b } = req.body;

  if (!id_grupo || !id_unidad || !nombre_a || !nombre_b)
    return res.status(400).json({ error: "Faltan campos requeridos (id_unidad, nombre_a, nombre_b)" });

  await new Promise((resolve) => verificarPropietarioGrupo(id_grupo, req, res, resolve));
  if (res.headersSent) return;

  try {
    const [gu] = await qp(
      "SELECT * FROM grupo_unidad WHERE id_grupo = ? AND id_unidad = ?",
      [id_grupo, id_unidad]
    );
    if (!gu) return res.status(404).json({ error: "La unidad no pertenece a este grupo" });

    const [{ total }] = await qp(
      "SELECT COUNT(*) AS total FROM actividad WHERE id_grupo = ? AND id_unidad = ?",
      [id_grupo, id_unidad]
    );
    if (total > 0)
      return res.status(409).json({ error: "No se puede dividir: la unidad ya tiene actividades configuradas" });

    const [grupo] = await qp("SELECT clave_materia FROM grupo WHERE id_grupo = ?", [id_grupo]);
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

    const rA = await qp(
      "INSERT INTO unidad (clave_materia, nombre_unidad) VALUES (?, ?)",
      [grupo.clave_materia, nombre_a.trim()]
    );
    const rB = await qp(
      "INSERT INTO unidad (clave_materia, nombre_unidad) VALUES (?, ?)",
      [grupo.clave_materia, nombre_b.trim()]
    );
    const id_a = rA.insertId;
    const id_b = rB.insertId;

    await qp(
      "INSERT INTO grupo_unidad (id_grupo, id_unidad, tipo_config) VALUES (?, ?, 'dividida'), (?, ?, 'dividida')",
      [id_grupo, id_a, id_grupo, id_b]
    );

    await qp(
      "INSERT INTO grupo_unidad_layout (id_grupo, id_unidad_real, ids_origen, tipo) VALUES (?, ?, ?, 'division_a'), (?, ?, ?, 'division_b')",
      [id_grupo, id_a, String(id_unidad), id_grupo, id_b, String(id_unidad)]
    );
    await qp(
      "DELETE FROM grupo_unidad WHERE id_grupo = ? AND id_unidad = ?",
      [id_grupo, id_unidad]
    );

    res.json({
      success: true,
      id_a,
      id_b,
      nombre_a: nombre_a.trim(),
      nombre_b: nombre_b.trim(),
      mensaje: `Unidad dividida en "${nombre_a}" (id:${id_a}) y "${nombre_b}" (id:${id_b})`
    });
  } catch (err) {
    console.error("Error dividir-unidad:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── POST fusionar dos unidades ───────────────────────────────────────────
router.post("/:id/fusionar-unidades", maestroOAdmin, async (req, res) => {
  const id_grupo = parseInt(req.params.id);
  const { id_unidad_a, id_unidad_b, nombre_fusion } = req.body;

  if (!id_grupo || !id_unidad_a || !id_unidad_b || !nombre_fusion)
    return res.status(400).json({ error: "Faltan campos requeridos (id_unidad_a, id_unidad_b, nombre_fusion)" });

  await new Promise((resolve) => verificarPropietarioGrupo(id_grupo, req, res, resolve));
  if (res.headersSent) return;
  if (id_unidad_a === id_unidad_b)
    return res.status(400).json({ error: "No se puede fusionar una unidad consigo misma" });

  try {
    const guRows = await qp(
      "SELECT id_unidad FROM grupo_unidad WHERE id_grupo = ? AND id_unidad IN (?, ?)",
      [id_grupo, id_unidad_a, id_unidad_b]
    );
    if (guRows.length < 2)
      return res.status(404).json({ error: "Una o ambas unidades no pertenecen a este grupo" });

    const [{ totalA }] = await qp(
      "SELECT COUNT(*) AS totalA FROM actividad WHERE id_grupo = ? AND id_unidad = ?",
      [id_grupo, id_unidad_a]
    );
    const [{ totalB }] = await qp(
      "SELECT COUNT(*) AS totalB FROM actividad WHERE id_grupo = ? AND id_unidad = ?",
      [id_grupo, id_unidad_b]
    );
    if (totalA > 0 || totalB > 0)
      return res.status(409).json({ error: "No se puede fusionar: una o ambas unidades ya tienen actividades configuradas" });

    const [grupo] = await qp("SELECT clave_materia FROM grupo WHERE id_grupo = ?", [id_grupo]);

    const rF = await qp(
      "INSERT INTO unidad (clave_materia, nombre_unidad) VALUES (?, ?)",
      [grupo.clave_materia, nombre_fusion.trim()]
    );
    const id_fusion = rF.insertId;

    await qp(
      "INSERT INTO grupo_unidad (id_grupo, id_unidad, tipo_config) VALUES (?, ?, 'fusionada')",
      [id_grupo, id_fusion]
    );

    await qp(
      "INSERT INTO grupo_unidad_layout (id_grupo, id_unidad_real, ids_origen, tipo) VALUES (?, ?, ?, 'fusion')",
      [id_grupo, id_fusion, `${id_unidad_a},${id_unidad_b}`]
    );
    await qp(
      "DELETE FROM grupo_unidad WHERE id_grupo = ? AND id_unidad IN (?, ?)",
      [id_grupo, id_unidad_a, id_unidad_b]
    );

    res.json({
      success: true,
      id_fusion,
      nombre_fusion: nombre_fusion.trim(),
      mensaje: `Unidades ${id_unidad_a} y ${id_unidad_b} fusionadas en "${nombre_fusion}" (id:${id_fusion})`
    });
  } catch (err) {
    console.error("Error fusionar-unidades:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── POST revertir división o fusión de una unidad ────────────────────────
router.post("/:id/revertir-unidad", maestroOAdmin, async (req, res) => {
  const id_grupo      = parseInt(req.params.id);
  const { id_unidad_real } = req.body;

  if (!id_grupo || !id_unidad_real)
    return res.status(400).json({ error: "Faltan campos requeridos (id_unidad_real)" });

  await new Promise((resolve) => verificarPropietarioGrupo(id_grupo, req, res, resolve));
  if (res.headersSent) return;

  try {
    const [layout] = await qp(
      "SELECT * FROM grupo_unidad_layout WHERE id_grupo = ? AND id_unidad_real = ?",
      [id_grupo, id_unidad_real]
    );
    if (!layout)
      return res.status(404).json({ error: "No se encontró registro de división/fusión para esta unidad" });

    const hermanas = await qp(
      "SELECT * FROM grupo_unidad_layout WHERE id_grupo = ? AND ids_origen = ?",
      [id_grupo, layout.ids_origen]
    );
    const todasLasIds = hermanas.map(h => h.id_unidad_real);

    const placeholders = todasLasIds.map(() => "?").join(",");
    const [{ total }] = await qp(
      `SELECT COUNT(*) AS total FROM actividad WHERE id_grupo = ? AND id_unidad IN (${placeholders})`,
      [id_grupo, ...todasLasIds]
    );
    if (total > 0)
      return res.status(409).json({ error: "No se puede revertir: hay actividades configuradas. Elimínalas primero." });

    const idsOrigen = layout.ids_origen.split(",").map(Number);

    for (const id_orig of idsOrigen) {
      await qp(
        "INSERT IGNORE INTO grupo_unidad (id_grupo, id_unidad, tipo_config) VALUES (?, ?, 'original')",
        [id_grupo, id_orig]
      );
    }

    for (const id_hermana of todasLasIds) {
      await qp(
        "DELETE FROM grupo_unidad_layout WHERE id_grupo = ? AND id_unidad_real = ?",
        [id_grupo, id_hermana]
      );
      await qp(
        "DELETE FROM grupo_unidad WHERE id_grupo = ? AND id_unidad = ?",
        [id_grupo, id_hermana]
      );
      const [{ usos }] = await qp(
        "SELECT COUNT(*) AS usos FROM grupo_unidad WHERE id_unidad = ?",
        [id_hermana]
      );
      if (usos === 0) await qp("DELETE FROM unidad WHERE id_unidad = ?", [id_hermana]);
    }

    res.json({
      success: true,
      ids_restaurados: idsOrigen,
      hermanas_revertidas: todasLasIds,
      mensaje: `Revertidas ${todasLasIds.length} unidad(es). Restauradas: ${idsOrigen.join(", ")}`
    });
  } catch (err) {
    console.error("Error revertir-unidad:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── GET unidades efectivas del grupo (layout) ────────────────────────────
router.get("/:id/layout-unidades", verificarToken, async (req, res) => {
  const id_grupo = parseInt(req.params.id);
  try {
    const unidades = await qp(
      `SELECT u.id_unidad, u.nombre_unidad, u.clave_materia,
              gu.tipo_config,
              gul.ids_origen, gul.tipo AS tipo_layout,
              CASE
                WHEN gul.ids_origen IS NOT NULL
                THEN CAST(SUBSTRING_INDEX(gul.ids_origen, ',', 1) AS UNSIGNED)
                ELSE u.id_unidad
              END AS orden_efectivo,
              CASE
                WHEN gul.ids_origen IS NOT NULL
                THEN CAST(SUBSTRING_INDEX(gul.ids_origen, ',', 1) AS UNSIGNED)
                ELSE u.id_unidad
              END AS id_orden_base
       FROM grupo_unidad gu
       JOIN unidad u ON gu.id_unidad = u.id_unidad
       LEFT JOIN grupo_unidad_layout gul
              ON gul.id_grupo = gu.id_grupo AND gul.id_unidad_real = gu.id_unidad
       WHERE gu.id_grupo = ?
       ORDER BY orden_efectivo`,
      [id_grupo]
    );
    res.json(unidades);
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


// ─── POST resetear unidades a original ────────────────────────────────────
router.post("/:id/reset-unidades", maestroOAdmin, async (req, res) => {
  const id_grupo = parseInt(req.params.id);
  await new Promise((resolve) => verificarPropietarioGrupo(id_grupo, req, res, resolve));
  if (res.headersSent) return;
  try {
    const custom = await qp(
      "SELECT id_unidad_real FROM grupo_unidad_layout WHERE id_grupo = ?",
      [id_grupo]
    );
    if (custom.length) {
      const ids = custom.map(r => r.id_unidad_real);
      const placeholders = ids.map(() => "?").join(",");
      const [{ total }] = await qp(
        `SELECT COUNT(*) AS total FROM actividad WHERE id_grupo = ? AND id_unidad IN (${placeholders})`,
        [id_grupo, ...ids]
      );
      if (total > 0)
        return res.status(409).json({ error: "No se puede restaurar: hay unidades con actividades configuradas. Elimínalas primero." });
    }

    const [grupo] = await qp("SELECT clave_materia FROM grupo WHERE id_grupo = ?", [id_grupo]);
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

    if (custom.length) {
      const ids = custom.map(r => r.id_unidad_real);
      const placeholders = ids.map(() => "?").join(",");
      await qp(
        `DELETE FROM grupo_unidad WHERE id_grupo = ? AND id_unidad IN (${placeholders})`,
        [id_grupo, ...ids]
      );
      await qp("DELETE FROM grupo_unidad_layout WHERE id_grupo = ?", [id_grupo]);
      for (const id of ids) {
        const [{ usos }] = await qp(
          "SELECT COUNT(*) AS usos FROM grupo_unidad WHERE id_unidad = ?", [id]
        );
        if (usos === 0) await qp("DELETE FROM unidad WHERE id_unidad = ?", [id]);
      }
    }

    const unidades = await qp(
      "SELECT id_unidad FROM unidad WHERE clave_materia = ?",
      [grupo.clave_materia]
    );
    for (const u of unidades) {
      await qp(
        "INSERT IGNORE INTO grupo_unidad (id_grupo, id_unidad, tipo_config) VALUES (?, ?, 'original')",
        [id_grupo, u.id_unidad]
      );
    }

    res.json({ success: true, mensaje: "Unidades restauradas al original", restauradas: unidades.length });
  } catch (err) {
    console.error("Error reset-unidades:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


// ─── PATCH cerrar grupo ───────────────────────────────────────────────────
router.patch("/:id/cerrar", maestroOAdmin, (req, res) => {
  const id_grupo = req.params.id;
  const { rol, id_referencia } = req.usuario;

  // Verificar que el grupo existe y pertenece al maestro
  db.query(
    "SELECT rfc, estatus FROM grupo WHERE id_grupo = ?",
    [id_grupo],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (!rows.length) return res.status(404).json({ error: "Grupo no encontrado" });

      const grupo = rows[0];
      if (rol === "maestro" && grupo.rfc !== id_referencia)
        return res.status(403).json({ error: "No tienes permiso para cerrar este grupo" });
      if (grupo.estatus === "Cerrado")
        return res.status(400).json({ error: "El grupo ya está cerrado" });

      db.query(
        "UPDATE grupo SET estatus = 'Cerrado' WHERE id_grupo = ?",
        [id_grupo],
        (err2, result) => {
          if (err2) return res.status(500).json({ error: "Error interno del servidor" });
          res.json({ success: true, mensaje: "Grupo cerrado. Ya no se pueden realizar modificaciones." });
        }
      );
    }
  );
});

module.exports = router;

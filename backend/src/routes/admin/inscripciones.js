// backend/src/routes/inscripciones.js
// N-2 FIX: GET /alumno/:no_control ahora verifica que un alumno solo pueda
//          consultar sus propias inscripciones.
// MEJORA:  GET / filtra por rol — alumnos ven solo las suyas, maestros ven
//          solo los alumnos de sus grupos, admins ven todo.
const express = require("express");
const router = express.Router();
const db = require("../../db");
const {
  verificarToken,
  soloAdmin,
  maestroOAdmin,
} = require("../../middleware/auth");

// GET — todas las inscripciones (filtrado por rol)
// MEJORA: antes devolvía todo a cualquier usuario autenticado.
router.get("/", verificarToken, (req, res) => {
  const { rol, id_referencia } = req.usuario;

  const base = `
    SELECT i.no_control, i.id_grupo, i.fecha_inscripcion, i.estatus, i.tipo_curso,
           CONCAT(a.nombre,' ',a.apellido_paterno) AS nombre_alumno,
           a.id_carrera,
           m.nombre_materia,
           CONCAT(mae.nombre,' ',mae.apellido_paterno) AS nombre_maestro,
           p.descripcion AS periodo
    FROM inscripcion i
    JOIN alumno a   ON i.no_control   = a.no_control
    JOIN grupo  g   ON i.id_grupo     = g.id_grupo
    JOIN materia m  ON g.clave_materia = m.clave_materia
    JOIN maestro mae ON g.rfc         = mae.rfc
    LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
  `;

  let query, params;
  if (rol === "alumno") {
    query = base + " WHERE i.no_control = ? ORDER BY i.fecha_inscripcion DESC";
    params = [id_referencia];
  } else if (rol === "maestro") {
    query = base + " WHERE g.rfc = ? ORDER BY i.fecha_inscripcion DESC";
    params = [id_referencia];
  } else {
    query = base + " ORDER BY i.fecha_inscripcion DESC";
    params = [];
  }

  db.query(query, params, (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// GET — inscripciones de un alumno específico
// N-2: alumno solo puede consultar sus propias inscripciones.
router.get("/alumno/:no_control", verificarToken, (req, res) => {
  const { rol, id_referencia } = req.usuario;
  const { no_control } = req.params;

  if (rol === "alumno" && id_referencia !== no_control)
    return res.status(403).json({
      error:
        "No tienes permiso para consultar las inscripciones de otro alumno.",
    });

  db.query(
    `SELECT i.id_grupo, i.fecha_inscripcion, i.estatus, i.tipo_curso,
            m.nombre_materia, m.clave_materia,
            CONCAT(mae.nombre,' ',mae.apellido_paterno) AS nombre_maestro,
            p.descripcion AS periodo, YEAR(p.fecha_inicio) AS anio,
            cf.calificacion_oficial, cf.estatus_final
     FROM inscripcion i
     JOIN grupo g    ON i.id_grupo       = g.id_grupo
     JOIN materia m  ON g.clave_materia  = m.clave_materia
     JOIN maestro mae ON g.rfc           = mae.rfc
     LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
     LEFT JOIN alumno a ON a.no_control  = i.no_control
     LEFT JOIN reticula r ON r.clave_materia = g.clave_materia AND r.id_carrera = a.id_carrera
     LEFT JOIN calificacion_final cf ON cf.no_control = i.no_control AND cf.id_grupo = i.id_grupo
     WHERE i.no_control = ?
     ORDER BY p.fecha_inicio DESC`,
    [no_control],
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r);
    },
  );
});

// GET — alumnos inscritos en un grupo
router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  db.query(
    `SELECT i.no_control, i.fecha_inscripcion, i.estatus, i.tipo_curso,
            a.nombre, a.apellido_paterno, a.apellido_materno,
            a.correo_institucional, a.id_carrera
     FROM inscripcion i
     JOIN alumno a ON i.no_control = a.no_control
     WHERE i.id_grupo = ?
     ORDER BY a.apellido_paterno, a.nombre`,
    [req.params.id_grupo],
    (err, r) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Error interno del servidor", detalle: err.message });
      res.json(r);
    },
  );
});

// POST — inscribir alumno a grupo
router.post("/", soloAdmin, (req, res) => {
  const { no_control, id_grupo, tipo_curso } = req.body;
  if (!no_control || !id_grupo)
    return res
      .status(400)
      .json({ error: "No. Control y grupo son requeridos" });

  const sqlDuplicado = `
    SELECT i.id_grupo
    FROM inscripcion i
    JOIN grupo g_dest   ON g_dest.id_grupo   = ?
    JOIN grupo g_actual ON g_actual.id_grupo = i.id_grupo
    WHERE i.no_control = ?
      AND g_actual.clave_materia = g_dest.clave_materia
      AND g_actual.id_periodo    = g_dest.id_periodo
      AND i.estatus != 'Baja'
    LIMIT 1`;
  db.query(sqlDuplicado, [id_grupo, no_control], (errDup, dupRows) => {
    if (errDup)
      return res.status(500).json({ error: "Error interno del servidor" });
    if (dupRows.length > 0)
      return res.status(409).json({
        error: `El alumno ya está inscrito en un grupo de esta materia en el mismo periodo (Grupo #${dupRows[0].id_grupo}).`,
      });

    db.query(
      `SELECT g.limite_alumnos, COUNT(i.no_control) AS inscritos_actuales
       FROM grupo g
       LEFT JOIN inscripcion i ON i.id_grupo = g.id_grupo AND i.estatus != 'Baja'
       WHERE g.id_grupo = ?
       GROUP BY g.id_grupo, g.limite_alumnos`,
      [id_grupo],
      (errCap, capRows) => {
        if (errCap)
          return res.status(500).json({ error: "Error interno del servidor" });
        if (capRows.length > 0) {
          const { limite_alumnos, inscritos_actuales } = capRows[0];
          if (limite_alumnos && inscritos_actuales >= limite_alumnos)
            return res.status(400).json({
              error: `El grupo ya alcanzó su capacidad máxima (${limite_alumnos} alumnos).`,
            });
        }

        db.query(
          `SELECT p.descripcion FROM grupo g JOIN periodo_escolar p ON p.id_periodo = g.id_periodo WHERE g.id_grupo = ?`,
          [id_grupo],
          (errP, periodoRows) => {
            if (errP)
              return res
                .status(500)
                .json({ error: "Error interno del servidor" });
            const desc = (periodoRows[0]?.descripcion || "").toLowerCase();
            const esSemestral =
              desc.includes("enero") || desc.includes("agosto");
            const esVerano = desc.includes("verano");

            if (esVerano) {
              return db.query(
                `SELECT COUNT(*) AS total FROM inscripcion i
                 JOIN grupo g ON g.id_grupo = i.id_grupo
                 WHERE i.no_control = ? AND g.id_periodo = (SELECT id_periodo FROM grupo WHERE id_grupo = ?) AND i.estatus = 'Cursando'`,
                [no_control, id_grupo],
                (errV, veraRows) => {
                  if (errV)
                    return res
                      .status(500)
                      .json({ error: "Error interno del servidor" });
                  const materiasVerano = parseInt(veraRows[0]?.total || 0);
                  if (materiasVerano >= 2)
                    return res.status(400).json({
                      error: `El alumno ya tiene ${materiasVerano} materia(s) en este verano. El máximo permitido es 2.`,
                      materias_verano: materiasVerano,
                    });
                  insertarInscripcion();
                },
              );
            }

            insertarInscripcion();
          },
        );

        function insertarInscripcion() {
          db.query(
            "INSERT IGNORE INTO inscripcion (no_control, id_grupo, fecha_inscripcion, estatus, tipo_curso) VALUES (?, ?, CURDATE(), 'Cursando', ?)",
            [no_control, id_grupo, tipo_curso || "Ordinario"],
            (err, result) => {
              if (err)
                return res.status(500).json({
                  error: "Error interno del servidor",
                  detalle: err.message,
                });
              if (result.affectedRows === 0)
                return res.status(200).json({
                  success: true,
                  mensaje: "El alumno ya estaba inscrito (sin cambios)",
                });
              res.status(201).json({
                success: true,
                mensaje: "Alumno inscrito correctamente",
              });
            },
          );
        }
      },
    );
  });
});

// POST — inscripción masiva
router.post("/bulk", soloAdmin, async (req, res) => {
  let registros = [];

  if (
    Array.isArray(req.body.inscripciones) &&
    req.body.inscripciones.length > 0
  ) {
    const raw = req.body.inscripciones;
    const necesitaResolver = raw.some(
      (r) => !r.id_grupo && (r.clave_materia || r.rfc),
    );

    if (necesitaResolver) {
      const uniqueKeys = [
        ...new Set(
          raw.map((r) => `${r.clave_materia}|${r.rfc}|${r.id_periodo || ""}`),
        ),
      ].map((k) => {
        const [cm, rfc, per] = k.split("|");
        return { cm, rfc, per };
      });
      const resoluciones = await Promise.all(
        uniqueKeys.map(
          ({ cm, rfc, per }) =>
            new Promise((resolve) => {
              const sql = per
                ? `SELECT id_grupo FROM grupo WHERE clave_materia=? AND rfc=? AND id_periodo=? LIMIT 1`
                : `SELECT id_grupo FROM grupo WHERE clave_materia=? AND rfc=? LIMIT 1`;
              const params = per ? [cm, rfc, parseInt(per)] : [cm, rfc];
              db.query(sql, params, (e, rows) =>
                resolve({
                  key: `${cm}|${rfc}|${per}`,
                  id_grupo: rows?.[0]?.id_grupo || null,
                }),
              );
            }),
        ),
      );
      const mapaGrupos = {};
      resoluciones.forEach(({ key, id_grupo }) => (mapaGrupos[key] = id_grupo));
      registros = raw
        .map((r) => {
          const key = `${r.clave_materia}|${r.rfc}|${r.id_periodo || ""}`;
          const id_grupo = r.id_grupo ? parseInt(r.id_grupo) : mapaGrupos[key];
          return {
            no_control: r.no_control,
            id_grupo,
            tipo_curso: r.tipo_curso || "Ordinario",
          };
        })
        .filter((r) => r.no_control && r.id_grupo);
    } else {
      registros = raw
        .map((r) => ({
          no_control: r.no_control,
          id_grupo: parseInt(r.id_grupo),
          tipo_curso: r.tipo_curso || "Ordinario",
        }))
        .filter((r) => r.no_control && r.id_grupo);
    }
  } else if (
    Array.isArray(req.body.no_controls) &&
    req.body.no_controls.length > 0 &&
    req.body.id_grupo
  ) {
    registros = req.body.no_controls.map((nc) => ({
      no_control: nc,
      id_grupo: parseInt(req.body.id_grupo),
      tipo_curso: req.body.tipo_curso || "Ordinario",
    }));
  }

  if (!registros.length)
    return res
      .status(400)
      .json({ error: "No_controls y grupo son requeridos" });

  const gruposUnicos = [...new Set(registros.map((r) => r.id_grupo))];
  Promise.all(
    gruposUnicos.map(
      (idg) =>
        new Promise((resolve, reject) =>
          db.query(
            `SELECT p.descripcion, g.id_periodo FROM grupo g JOIN periodo_escolar p ON p.id_periodo = g.id_periodo WHERE g.id_grupo = ? LIMIT 1`,
            [idg],
            (e, rows) => (e ? reject(e) : resolve({ idg, info: rows[0] })),
          ),
        ),
    ),
  )
    .then((gruposInfo) => {
      const grupoMap = {};
      gruposInfo.forEach(({ idg, info }) => (grupoMap[idg] = info));

      const validaciones = registros.map(
        (reg) =>
          new Promise((resolve) => {
            const info = grupoMap[reg.id_grupo];
            if (!info) return resolve({ reg, ok: true });
            const desc = (info.descripcion || "").toLowerCase();
            const esVerano = desc.includes("verano");

            if (esVerano) {
              return db.query(
                `SELECT COUNT(*) AS total FROM inscripcion i JOIN grupo g ON g.id_grupo = i.id_grupo WHERE i.no_control = ? AND g.id_periodo = ? AND i.estatus = 'Cursando'`,
                [reg.no_control, info.id_periodo],
                (ev, vrows) => {
                  if (ev) return resolve({ reg, ok: true });
                  const materiasVerano = parseInt(vrows[0]?.total || 0);
                  if (materiasVerano >= 2)
                    return resolve({
                      reg,
                      ok: false,
                      razon: `Excede el límite de 2 materias en verano (tiene ${materiasVerano})`,
                    });
                  resolve({ reg, ok: true });
                },
              );
            }
            resolve({ reg, ok: true });
          }),
      );

      Promise.all(validaciones).then((resultados) => {
        const aprobados = resultados.filter((r) => r.ok).map((r) => r.reg);
        const rechazados = resultados
          .filter((r) => !r.ok)
          .map((r) => ({ no_control: r.reg.no_control, razon: r.razon }));

        if (!aprobados.length)
          return res.status(400).json({
            error:
              "Ningún alumno pudo inscribirse por límite de materias en periodo de verano (máximo 2).",
            rechazados,
          });

        const gruposAprobados = [...new Set(aprobados.map((r) => r.id_grupo))];
        Promise.all(
          gruposAprobados.map(
            (idg) =>
              new Promise((resolve, reject) =>
                db.query(
                  `SELECT g.limite_alumnos, COUNT(i.no_control) AS inscritos_actuales
                 FROM grupo g LEFT JOIN inscripcion i ON i.id_grupo = g.id_grupo AND i.estatus != 'Baja'
                 WHERE g.id_grupo = ? GROUP BY g.id_grupo, g.limite_alumnos`,
                  [idg],
                  (e, rows) => (e ? reject(e) : resolve({ idg, cap: rows[0] })),
                ),
              ),
          ),
        )
          .then((caps) => {
            const capMap = {};
            caps.forEach(({ idg, cap }) => (capMap[idg] = cap));

            const aprobadosFinal = [];
            const rechazadosCapacidad = [];
            const porGrupo = {};
            aprobados.forEach((r) => {
              if (!porGrupo[r.id_grupo]) porGrupo[r.id_grupo] = [];
              porGrupo[r.id_grupo].push(r);
            });

            Object.entries(porGrupo).forEach(([idg, regs]) => {
              const cap = capMap[parseInt(idg)];
              const limite = cap?.limite_alumnos || 0;
              const actuales = cap?.inscritos_actuales || 0;
              if (limite && actuales >= limite) {
                regs.forEach((r) =>
                  rechazadosCapacidad.push({
                    no_control: r.no_control,
                    razon: `El grupo #${idg} ya está lleno (${actuales}/${limite})`,
                  }),
                );
              } else if (limite && actuales + regs.length > limite) {
                const espacios = limite - actuales;
                regs.slice(0, espacios).forEach((r) => aprobadosFinal.push(r));
                regs.slice(espacios).forEach((r) =>
                  rechazadosCapacidad.push({
                    no_control: r.no_control,
                    razon: `El grupo #${idg} no tiene suficiente espacio (${actuales}/${limite})`,
                  }),
                );
              } else {
                regs.forEach((r) => aprobadosFinal.push(r));
              }
            });

            const todosRechazados = [...rechazados, ...rechazadosCapacidad];
            if (!aprobadosFinal.length)
              return res.status(400).json({
                error:
                  "Ningún alumno pudo inscribirse. Los grupos están llenos.",
                rechazados: todosRechazados,
              });

            const fecha = new Date().toISOString().split("T")[0];
            const vals = aprobadosFinal.map((r) => [
              r.no_control,
              r.id_grupo,
              fecha,
              "Cursando",
              r.tipo_curso,
            ]);
            db.query(
              "INSERT IGNORE INTO inscripcion (no_control, id_grupo, fecha_inscripcion, estatus, tipo_curso) VALUES ?",
              [vals],
              (err, r) => {
                if (err)
                  return res.status(500).json({
                    error: "Error interno del servidor",
                    detalle: err.message,
                  });
                res.status(201).json({
                  success: true,
                  insertados: r.affectedRows,
                  rechazados: todosRechazados,
                });
              },
            );
          })
          .catch(() =>
            res.status(500).json({ error: "Error interno del servidor" }),
          );
      });
    })
    .catch(() => res.status(500).json({ error: "Error interno del servidor" }));
});

// PUT — cambiar estatus de inscripción
router.put("/:no_control/:id_grupo/estatus", soloAdmin, (req, res) => {
  const { estatus } = req.body;
  if (!estatus) return res.status(400).json({ error: "Estatus requerido" });
  db.query(
    "UPDATE inscripcion SET estatus = ? WHERE no_control = ? AND id_grupo = ?",
    [estatus, req.params.no_control, req.params.id_grupo],
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
router.delete("/:no_control/:id_grupo", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM inscripcion WHERE no_control = ? AND id_grupo = ?",
    [req.params.no_control, req.params.id_grupo],
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (r.affectedRows === 0)
        return res.status(404).json({ error: "Inscripción no encontrada" });
      res.json({ success: true });
    },
  );
});

// POST — validar carga de alumnos sin insertar
router.post("/validar-carga", verificarToken, (req, res) => {
  const { no_controls, id_grupo } = req.body;
  if (!Array.isArray(no_controls) || !no_controls.length || !id_grupo)
    return res.status(400).json({ error: "Parametros requeridos" });

  db.query(
    `SELECT p.descripcion, g.id_periodo FROM grupo g JOIN periodo_escolar p ON p.id_periodo = g.id_periodo WHERE g.id_grupo = ?`,
    [id_grupo],
    (errG, grupoRows) => {
      if (errG || !grupoRows.length)
        return res
          .status(500)
          .json({ error: "Error al obtener datos del grupo" });

      const { descripcion, id_periodo } = grupoRows[0];
      const esVerano = (descripcion || "").toLowerCase().includes("verano");

      if (!esVerano)
        return res.json(
          no_controls.map((nc) => ({
            no_control: nc,
            ok: true,
            carga_actual: 0,
            limite: null,
          })),
        );

      const placeholders = no_controls.map(() => "?").join(",");
      db.query(
        `SELECT i.no_control, COUNT(*) AS carga FROM inscripcion i JOIN grupo g ON g.id_grupo = i.id_grupo WHERE i.no_control IN (${placeholders}) AND g.id_periodo = ? AND i.estatus = 'Cursando' GROUP BY i.no_control`,
        [...no_controls, id_periodo],
        (errC, cargaRows) => {
          if (errC)
            return res.status(500).json({ error: "Error al calcular carga" });
          const cargaMap = {};
          cargaRows.forEach(
            (r) => (cargaMap[r.no_control] = parseInt(r.carga)),
          );
          const resultado = no_controls.map((nc) => {
            const carga_actual = cargaMap[nc] || 0;
            const total = carga_actual + 1;
            return {
              no_control: nc,
              ok: total <= 2,
              carga_actual,
              agrega: 1,
              total,
              limite: 2,
              es_verano: true,
            };
          });
          res.json(resultado);
        },
      );
    },
  );
});

module.exports = router;

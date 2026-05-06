// backend/src/routes/inscripciones.js
const express = require("express");
const router = express.Router();
const db = require("../../db");
const {
  verificarToken,
  soloAdmin,
  maestroOAdmin,
} = require("../../middleware/auth");

// GET — todas las inscripciones (con datos del alumno y grupo)
router.get("/", verificarToken, (req, res) => {
  const sql = `
    SELECT i.no_control, i.id_grupo, i.fecha_inscripcion, i.estatus, i.tipo_curso,
           CONCAT(a.nombre, ' ', a.apellido_paterno) AS nombre_alumno,
           a.id_carrera,
           m.nombre_materia,
           CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
           p.descripcion AS periodo
    FROM inscripcion i
    JOIN alumno a  ON i.no_control = a.no_control
    JOIN grupo  g  ON i.id_grupo  = g.id_grupo
    JOIN materia m ON g.clave_materia = m.clave_materia
    JOIN maestro mae ON g.rfc = mae.rfc
    LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
    ORDER BY i.fecha_inscripcion DESC
  `;
  db.query(sql, (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// GET — inscripciones de un alumno específico
router.get("/alumno/:no_control", verificarToken, (req, res) => {
  const sql = `
    SELECT i.id_grupo, i.fecha_inscripcion, i.estatus, i.tipo_curso,
           m.nombre_materia, m.clave_materia, m.creditos_totales,
           CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
           p.descripcion AS periodo, YEAR(p.fecha_inicio) AS anio,
           cf.calificacion_oficial, cf.estatus_final
    FROM inscripcion i
    JOIN grupo g   ON i.id_grupo = g.id_grupo
    JOIN materia m ON g.clave_materia = m.clave_materia
    JOIN maestro mae ON g.rfc = mae.rfc
    LEFT JOIN periodo_escolar p ON g.id_periodo = p.id_periodo
    LEFT JOIN calificacion_final cf ON cf.no_control = i.no_control AND cf.id_grupo = i.id_grupo
    WHERE i.no_control = ?
    ORDER BY p.fecha_inicio DESC
  `;
  db.query(sql, [req.params.no_control], (err, r) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(r);
  });
});

// GET — alumnos inscritos en un grupo
router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  const sql = `
    SELECT i.no_control, i.fecha_inscripcion, i.estatus, i.tipo_curso,
           a.nombre, a.apellido_paterno, a.apellido_materno,
           a.correo_institucional, a.id_carrera
    FROM inscripcion i
    JOIN alumno a ON i.no_control = a.no_control
    WHERE i.id_grupo = ?
    ORDER BY a.apellido_paterno, a.nombre
  `;
  db.query(sql, [req.params.id_grupo], (err, r) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Error interno del servidor", detalle: err.message });
    res.json(r);
  });
});

// POST — inscribir alumno a grupo
router.post("/", soloAdmin, (req, res) => {
  const { no_control, id_grupo, tipo_curso } = req.body;
  if (!no_control || !id_grupo)
    return res
      .status(400)
      .json({ error: "No. Control y grupo son requeridos" });

  // Verificar que el alumno no esté ya inscrito en otro grupo de la misma materia en el mismo periodo
  const sqlDuplicado = `
    SELECT i.id_grupo
    FROM inscripcion i
    JOIN grupo g_dest ON g_dest.id_grupo = ?
    JOIN grupo g_actual ON g_actual.id_grupo = i.id_grupo
    WHERE i.no_control = ?
      AND g_actual.clave_materia = g_dest.clave_materia
      AND g_actual.id_periodo    = g_dest.id_periodo
      AND i.estatus != 'Baja'
    LIMIT 1
  `;
  db.query(sqlDuplicado, [id_grupo, no_control], (errDup, dupRows) => {
    if (errDup)
      return res.status(500).json({ error: "Error interno del servidor" });

    if (dupRows.length > 0)
      return res.status(409).json({
        error: `El alumno ya está inscrito en un grupo de esta materia en el mismo periodo (Grupo #${dupRows[0].id_grupo}).`,
      });

    // BUG 3 FIX: verificar capacidad máxima antes de insertar
    const sqlCapacidad = `
    SELECT g.limite_alumnos,
           COUNT(i.no_control) AS inscritos_actuales
    FROM grupo g
    LEFT JOIN inscripcion i ON i.id_grupo = g.id_grupo AND i.estatus != 'Baja'
    WHERE g.id_grupo = ?
    GROUP BY g.id_grupo, g.limite_alumnos
  `;
    db.query(sqlCapacidad, [id_grupo], (errCap, capRows) => {
      if (errCap)
        return res.status(500).json({ error: "Error interno del servidor" });

      if (capRows.length > 0) {
        const { limite_alumnos, inscritos_actuales } = capRows[0];
        // Solo bloquear si el límite está definido y es mayor a 0
        if (limite_alumnos && inscritos_actuales >= limite_alumnos) {
          return res.status(400).json({
            error: `El grupo ya alcanzó su capacidad máxima (${limite_alumnos} alumnos).`,
          });
        }
      }

      // ── Validación de créditos (solo periodos semestrales) ──────────────
      const sqlPeriodoTipo = `
        SELECT p.descripcion
        FROM grupo g
        JOIN periodo_escolar p ON p.id_periodo = g.id_periodo
        WHERE g.id_grupo = ?
      `;
      db.query(sqlPeriodoTipo, [id_grupo], (errP, periodoRows) => {
        if (errP)
          return res.status(500).json({ error: "Error interno del servidor" });

        const desc = (periodoRows[0]?.descripcion || "").toLowerCase();
        const esSemestral =
          desc.includes("enero") || desc.includes("agosto");

        const esVerano = desc.includes("verano");

        if (esVerano) {
          // Verano — máximo 2 materias por periodo específico
          const sqlVerano = `
            SELECT COUNT(*) AS total
            FROM inscripcion i
            JOIN grupo g ON g.id_grupo = i.id_grupo
            WHERE i.no_control = ?
              AND g.id_periodo = (SELECT id_periodo FROM grupo WHERE id_grupo = ?)
              AND i.estatus = 'Cursando'
          `;
          return db.query(sqlVerano, [no_control, id_grupo], (errV, veraRows) => {
            if (errV)
              return res.status(500).json({ error: "Error interno del servidor" });
            const materiasVerano = parseInt(veraRows[0]?.total || 0);
            if (materiasVerano >= 2) {
              return res.status(400).json({
                error: `El alumno ya tiene ${materiasVerano} materia(s) en este verano. El máximo permitido es 2.`,
                materias_verano: materiasVerano,
              });
            }
            insertarInscripcion();
          });
        }

        if (!esSemestral) {
          // Otro tipo de periodo sin validación especial
          return insertarInscripcion();
        }

        // Sumar créditos actuales del alumno en este periodo
        const sqlCreditos = `
          SELECT COALESCE(SUM(m.creditos_totales), 0) AS total
          FROM inscripcion i
          JOIN grupo g      ON g.id_grupo = i.id_grupo
          JOIN materia m    ON m.clave_materia = g.clave_materia
          WHERE i.no_control = ?
            AND g.id_periodo = (SELECT id_periodo FROM grupo WHERE id_grupo = ?)
            AND i.estatus = 'Cursando'
        `;
        db.query(sqlCreditos, [no_control, id_grupo], (errC, credRows) => {
          if (errC)
            return res.status(500).json({ error: "Error interno del servidor" });

          const creditosActuales = parseFloat(credRows[0]?.total || 0);

          // Créditos de la materia nueva
          const sqlNuevos = `
            SELECT m.creditos_totales
            FROM grupo g JOIN materia m ON m.clave_materia = g.clave_materia
            WHERE g.id_grupo = ?
          `;
          db.query(sqlNuevos, [id_grupo], (errN, nuevosRows) => {
            if (errN)
              return res.status(500).json({ error: "Error interno del servidor" });

            const creditosNuevos = parseFloat(nuevosRows[0]?.creditos_totales || 0);
            const total = creditosActuales + creditosNuevos;

            if (total > 36) {
              return res.status(400).json({
                error: `El alumno excedería la carga máxima de 36 créditos. ` +
                  `Tiene ${creditosActuales} créditos y esta materia agrega ${creditosNuevos} (total: ${total}).`,
                creditos_actuales: creditosActuales,
                creditos_nuevos: creditosNuevos,
                total,
              });
            }

            insertarInscripcion();
          });
        });
      });

      function insertarInscripcion() {
        // INSERT IGNORE: idempotente, reimportar el mismo CSV no falla
        const sql = `
          INSERT IGNORE INTO inscripcion (no_control, id_grupo, fecha_inscripcion, estatus, tipo_curso)
          VALUES (?, ?, CURDATE(), 'Cursando', ?)
        `;
        db.query(
          sql,
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

            res
              .status(201)
              .json({ success: true, mensaje: "Alumno inscrito correctamente" });
          },
        );
      }
    });
  }); // cierre sqlDuplicado
});

// POST — inscripción masiva (varios alumnos a un grupo)
// Acepta dos formatos:
//   Formato A (wizard): { no_controls: [...], id_grupo, tipo_curso }
//   Formato B (CSV):    { inscripciones: [{no_control, id_grupo, tipo_curso}] }
router.post("/bulk", soloAdmin, (req, res) => {
  let registros = []; // [{no_control, id_grupo, tipo_curso}]

  if (
    Array.isArray(req.body.inscripciones) &&
    req.body.inscripciones.length > 0
  ) {
    // Formato B
    registros = req.body.inscripciones
      .map((r) => ({
        no_control: r.no_control,
        id_grupo: parseInt(r.id_grupo),
        tipo_curso: r.tipo_curso || "Ordinario",
      }))
      .filter((r) => r.no_control && r.id_grupo);
  } else if (
    Array.isArray(req.body.no_controls) &&
    req.body.no_controls.length > 0 &&
    req.body.id_grupo
  ) {
    // Formato A
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

  // Detectar si el periodo es semestral (Enero o Agosto) para validar créditos
  const sqlPeriodoDesc = `
    SELECT p.descripcion, g.id_periodo,
           m.creditos_totales AS creditos_nuevos
    FROM grupo g
    JOIN periodo_escolar p ON p.id_periodo = g.id_periodo
    JOIN materia m ON m.clave_materia = g.clave_materia
    WHERE g.id_grupo = ?
  `;

  // Obtener todos los id_grupo únicos del lote
  const gruposUnicos = [...new Set(registros.map((r) => r.id_grupo))];

  // Consultar info de cada grupo único
  Promise.all(
    gruposUnicos.map(
      (idg) =>
        new Promise((resolve, reject) =>
          db.query(sqlPeriodoDesc, [idg], (e, rows) =>
            e ? reject(e) : resolve({ idg, info: rows[0] }),
          ),
        ),
    ),
  )
    .then((gruposInfo) => {
      const grupoMap = {}; // id_grupo → { descripcion, id_periodo, creditos_nuevos }
      gruposInfo.forEach(({ idg, info }) => (grupoMap[idg] = info));

      // Para cada alumno en cada grupo semestral, verificar créditos
      const validaciones = registros.map(
        (reg) =>
          new Promise((resolve) => {
            const info = grupoMap[reg.id_grupo];
            if (!info) return resolve({ reg, ok: true });

            const desc = (info.descripcion || "").toLowerCase();
            const esSemestral =
              desc.includes("enero") || desc.includes("agosto");

            const esVerano = desc.includes("verano");

            if (esVerano) {
              // Verano — máximo 2 materias por periodo específico
              const sqlVer = `
                SELECT COUNT(*) AS total
                FROM inscripcion i
                JOIN grupo g ON g.id_grupo = i.id_grupo
                WHERE i.no_control = ?
                  AND g.id_periodo = ?
                  AND i.estatus = 'Cursando'
              `;
              return db.query(sqlVer, [reg.no_control, info.id_periodo], (ev, vrows) => {
                if (ev) return resolve({ reg, ok: true });
                const materiasVerano = parseInt(vrows[0]?.total || 0);
                if (materiasVerano >= 2) {
                  return resolve({
                    reg,
                    ok: false,
                    razon: `Excede el límite de 2 materias en verano (tiene ${materiasVerano})`,
                  });
                }
                resolve({ reg, ok: true });
              });
            }

            if (!esSemestral) return resolve({ reg, ok: true });

            const sqlCred = `
              SELECT COALESCE(SUM(m.creditos_totales), 0) AS total
              FROM inscripcion i
              JOIN grupo g   ON g.id_grupo = i.id_grupo
              JOIN materia m ON m.clave_materia = g.clave_materia
              WHERE i.no_control = ?
                AND g.id_periodo = ?
                AND i.estatus = 'Cursando'
            `;
            db.query(
              sqlCred,
              [reg.no_control, info.id_periodo],
              (e, rows) => {
                if (e) return resolve({ reg, ok: true }); // si falla la validación, dejamos pasar
                const actuales = parseFloat(rows[0]?.total || 0);
                const nuevos = parseFloat(info.creditos_nuevos || 0);
                const total = actuales + nuevos;
                if (total > 36) {
                  return resolve({
                    reg,
                    ok: false,
                    razon: `Excede 36 créditos (tiene ${actuales}, agrega ${nuevos})`,
                  });
                }
                resolve({ reg, ok: true });
              },
            );
          }),
      );

      Promise.all(validaciones).then((resultados) => {
        const aprobados = resultados.filter((r) => r.ok).map((r) => r.reg);
        const rechazados = resultados
          .filter((r) => !r.ok)
          .map((r) => ({ no_control: r.reg.no_control, razon: r.razon }));

        if (!aprobados.length) {
          const todosVerano = rechazados.every((r) => r.razon?.includes("verano"));
          const errorMsg = todosVerano
            ? "Ningún alumno pudo inscribirse por límite de materias en periodo de verano (máximo 2 por verano)."
            : "Ningún alumno pudo inscribirse por límite de créditos.";
          return res.status(400).json({ error: errorMsg, rechazados });
        }

        // Verificar capacidad máxima de cada grupo antes de insertar
        const gruposAprobados = [...new Set(aprobados.map((r) => r.id_grupo))];
        Promise.all(
          gruposAprobados.map(
            (idg) =>
              new Promise((resolve, reject) =>
                db.query(
                  `SELECT g.limite_alumnos, COUNT(i.no_control) AS inscritos_actuales
                   FROM grupo g
                   LEFT JOIN inscripcion i ON i.id_grupo = g.id_grupo AND i.estatus != 'Baja'
                   WHERE g.id_grupo = ?
                   GROUP BY g.id_grupo, g.limite_alumnos`,
                  [idg],
                  (e, rows) => (e ? reject(e) : resolve({ idg, cap: rows[0] })),
                ),
              ),
          ),
        ).then((caps) => {
          const capMap = {};
          caps.forEach(({ idg, cap }) => (capMap[idg] = cap));

          // Filtrar aprobados que no excedan la capacidad del grupo
          const aprobadosFinal = [];
          const rechazadosCapacidad = [];

          // Agrupar aprobados por grupo para contar cuántos se van a inscribir
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

          if (!aprobadosFinal.length) {
            return res.status(400).json({
              error: "Ningún alumno pudo inscribirse. Los grupos están llenos.",
              rechazados: todosRechazados,
            });
          }

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
        }).catch(() =>
          res.status(500).json({ error: "Error interno del servidor" }),
        );
      });
    })
    .catch(() =>
      res.status(500).json({ error: "Error interno del servidor" }),
    );
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
// Recibe { no_controls: [...], id_grupo } y devuelve por cada alumno
// si puede inscribirse o no, con el detalle de su carga actual.
router.post("/validar-carga", verificarToken, (req, res) => {
  const { no_controls, id_grupo } = req.body;
  if (!Array.isArray(no_controls) || !no_controls.length || !id_grupo)
    return res.status(400).json({ error: "Parametros requeridos" });

  const sqlGrupo = `
    SELECT p.descripcion, g.id_periodo, m.creditos_totales
    FROM grupo g
    JOIN periodo_escolar p ON p.id_periodo = g.id_periodo
    JOIN materia m ON m.clave_materia = g.clave_materia
    WHERE g.id_grupo = ?
  `;
  db.query(sqlGrupo, [id_grupo], (errG, grupoRows) => {
    if (errG || !grupoRows.length)
      return res.status(500).json({ error: "Error al obtener datos del grupo" });

    const { descripcion, id_periodo, creditos_totales } = grupoRows[0];
    const desc = (descripcion || "").toLowerCase();
    const esVerano = desc.includes("verano");
    const esSemestral = desc.includes("enero") || desc.includes("agosto");

    if (!esVerano && !esSemestral) {
      return res.json(
        no_controls.map((nc) => ({ no_control: nc, ok: true, carga_actual: 0, limite: null }))
      );
    }

    const placeholders = no_controls.map(() => "?").join(",");
    const sqlCarga = esVerano
      ? `SELECT i.no_control, COUNT(*) AS carga
         FROM inscripcion i
         JOIN grupo g ON g.id_grupo = i.id_grupo
         WHERE i.no_control IN (${placeholders})
           AND g.id_periodo = ? AND i.estatus = 'Cursando'
         GROUP BY i.no_control`
      : `SELECT i.no_control, COALESCE(SUM(m.creditos_totales), 0) AS carga
         FROM inscripcion i
         JOIN grupo g ON g.id_grupo = i.id_grupo
         JOIN materia m ON m.clave_materia = g.clave_materia
         WHERE i.no_control IN (${placeholders})
           AND g.id_periodo = ? AND i.estatus = 'Cursando'
         GROUP BY i.no_control`;

    db.query(sqlCarga, [...no_controls, id_periodo], (errC, cargaRows) => {
      if (errC)
        return res.status(500).json({ error: "Error al calcular carga" });

      const cargaMap = {};
      cargaRows.forEach((r) => (cargaMap[r.no_control] = parseFloat(r.carga)));

      const limite = esVerano ? 2 : 36;
      const agregar = esVerano ? 1 : parseFloat(creditos_totales || 0);

      const resultado = no_controls.map((nc) => {
        const carga_actual = cargaMap[nc] || 0;
        const total = carga_actual + agregar;
        return { no_control: nc, ok: total <= limite, carga_actual, agrega: agregar, total, limite, es_verano: esVerano };
      });

      res.json(resultado);
    });
  });
});

module.exports = router;

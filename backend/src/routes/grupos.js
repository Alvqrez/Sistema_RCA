// backend/src/routes/grupos.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  verificarToken,
  soloAdmin,
  maestroOAdmin,
} = require("../middleware/auth");

// GET — todos los grupos
router.get("/", verificarToken, (req, res) => {
  const query = `
    SELECT
      g.id_grupo, g.clave_materia, m.nombre_materia,
      g.rfc,
      CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
      g.id_periodo,
      pe.descripcion AS descripcion_periodo, pe.anio,
      g.limite_alumnos, g.horario, g.aula, g.estatus
    FROM grupo g
    JOIN materia  m   ON g.clave_materia   = m.clave_materia
    JOIN maestro  mae ON g.rfc  = mae.rfc
    LEFT JOIN periodo_escolar pe ON g.id_periodo = pe.id_periodo
    ORDER BY g.id_grupo DESC
  `;
  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// ─── IMPORTANTE: rutas estáticas ANTES que /:id ──────────────────────────────

// GET — grupos del maestro autenticado (para formulario y mis_grupos)
// DEBE estar antes de /:id o Express lo captura como id="mis-grupos"
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
      pe.descripcion AS descripcion_periodo, pe.anio,
      g.limite_alumnos, g.horario, g.aula, g.estatus
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

// ─── Rutas dinámicas con :id ──────────────────────────────────────────────────

// GET — un grupo por id
router.get("/:id", verificarToken, (req, res) => {
  const query = `
    SELECT
      g.id_grupo, g.clave_materia, m.nombre_materia,
      g.rfc,
      CONCAT(mae.nombre, ' ', mae.apellido_paterno) AS nombre_maestro,
      g.id_periodo,
      pe.descripcion AS descripcion_periodo,
      g.limite_alumnos, g.horario, g.aula, g.estatus
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

// GET — unidades de un grupo con su ponderación
router.get("/:id/unidades", verificarToken, (req, res) => {
  const sql = `
    SELECT
        gu.id_unidad, u.nombre_unidad, u.estatus,
        gu.ponderacion, u.clave_materia,
        gu.agrupacion_id, gu.tipo_config
    FROM grupo_unidad gu
    JOIN unidad u ON gu.id_unidad = u.id_unidad
    WHERE gu.id_grupo = ?
    ORDER BY gu.id_unidad
`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      // Fallback: las columnas agrupacion_id / tipo_config pueden no existir
      // si el ALTER TABLE de corrección 4 aún no se ha aplicado en la BD.
      const sqlBase = `
        SELECT
            gu.id_unidad, u.nombre_unidad, u.estatus,
            gu.ponderacion, u.clave_materia,
            NULL AS agrupacion_id, 'original' AS tipo_config
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

    // Agregar numero_unidad en JS (sin ROW_NUMBER)
    const conNumero = results.map((u, i) => ({ ...u, numero_unidad: i + 1 }));
    res.json(conNumero);
  });
});

// ─── Utilidades de horario ────────────────────────────────────────────────────
// Parsea "Lun-Mie-Vie 07:00-08:00" → { dias:["Lun","Mie","Vie"], inicio:"07:00", fin:"08:00" }
function parsearHorario(horarioStr) {
  if (!horarioStr) return null;
  const partes = horarioStr.trim().split(" ");
  if (partes.length < 2) return null;
  const dias = partes[0].split("-").map((d) => d.trim().toLowerCase());
  const horas = partes[1].split("-");
  if (horas.length < 2) return null;
  return { dias, inicio: horas[0], fin: horas[1] };
}

// Convierte "07:00" → minutos desde medianoche
function toMinutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Verifica si dos listas de días comparten al menos uno
function diasSolapan(dias1, dias2) {
  return dias1.some((d) => dias2.includes(d));
}

// Verifica si dos rangos horarios se solapan (exclusivo en extremos)
function horariosSolapan(ini1, fin1, ini2, fin2) {
  const s1 = toMinutos(ini1),
    e1 = toMinutos(fin1);
  const s2 = toMinutos(ini2),
    e2 = toMinutos(fin2);
  return s1 < e2 && s2 < e1;
}

// POST — crear grupo con validación de unicidad y conflicto de aula
router.post("/", soloAdmin, (req, res) => {
  const { clave_materia, rfc, id_periodo, limite_alumnos, horario, aula } =
    req.body;

  if (!clave_materia || !rfc || !id_periodo) {
    return res.status(400).json({
      error: "Clave de materia, número de empleado y periodo son requeridos",
    });
  }

  // Si hay aula Y horario, verificar conflicto de salón en ese periodo
  if (aula && horario) {
    const nuevoH = parsearHorario(horario);

    if (nuevoH) {
      db.query(
        `SELECT id_grupo, horario FROM grupo WHERE id_periodo = ? AND aula = ? AND horario IS NOT NULL`,
        [id_periodo, aula],
        (err, existentes) => {
          if (err)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });

          const conflicto = existentes.find((g) => {
            const exH = parsearHorario(g.horario);
            if (!exH) return false;
            return (
              diasSolapan(nuevoH.dias, exH.dias) &&
              horariosSolapan(nuevoH.inicio, nuevoH.fin, exH.inicio, exH.fin)
            );
          });

          if (conflicto) {
            return res.status(409).json({
              conflict: true,
              error: `El aula "${aula}" ya está ocupada ese horario (Grupo #${conflicto.id_grupo}: ${conflicto.horario}). Elige otro salón u otro horario.`,
            });
          }

          // Sin conflicto → insertar
          insertarGrupo(
            res,
            clave_materia,
            rfc,
            id_periodo,
            limite_alumnos,
            horario,
            aula,
          );
        },
      );
      return; // esperar callback
    }
  }

  // Sin aula o sin horario → insertar directamente
  insertarGrupo(
    res,
    clave_materia,
    rfc,
    id_periodo,
    limite_alumnos,
    horario,
    aula,
  );
});

function insertarGrupo(
  res,
  clave_materia,
  rfc,
  id_periodo,
  limite_alumnos,
  horario,
  aula,
) {
  db.query(
    `INSERT INTO grupo (clave_materia, rfc, id_periodo, limite_alumnos, horario, aula)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      clave_materia,
      rfc,
      id_periodo,
      limite_alumnos ?? 30,
      horario ?? null,
      aula ?? null,
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
      res
        .status(201)
        .json({
          success: true,
          mensaje: "Grupo creado",
          id_grupo: result.insertId,
        });
    },
  );
}

// POST — auto-vincular todas las unidades de la materia del grupo
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

          unidades.forEach((u) => {
            db.query(
              "INSERT IGNORE INTO grupo_unidad (id_grupo, id_unidad, ponderacion) VALUES (?, ?, 0)",
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
        },
      );
    },
  );
});

// POST — asignar unidad a grupo con ponderación
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
        error: `La suma supera 100%. Ya tienes ${totalActual}% asignado.`,
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

// PUT — editar grupo
router.put("/:id", soloAdmin, (req, res) => {
  const { limite_alumnos, horario, aula, estatus } = req.body;
  db.query(
    `UPDATE grupo SET limite_alumnos = ?, horario = ?, aula = ?, estatus = ? WHERE id_grupo = ?`,
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

// DELETE — quitar unidad de grupo
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

// DELETE — eliminar grupo
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

router.put("/:id/unidades/agrupacion", maestroOAdmin, (req, res) => {
  const { unidades } = req.body;
  // unidades = [{ id_unidad, agrupacion_id, tipo_config }]
  if (!Array.isArray(unidades) || !unidades.length) {
    return res.status(400).json({ error: "Se requiere array de unidades" });
  }

  const updates = unidades.map(
    (u) =>
      new Promise((resolve, reject) => {
        db.query(
          `UPDATE grupo_unidad
             SET agrupacion_id = ?, tipo_config = ?
             WHERE id_grupo = ? AND id_unidad = ?`,
          [
            u.agrupacion_id ?? null,
            u.tipo_config ?? "original",
            req.params.id,
            u.id_unidad,
          ],
          (err) => (err ? reject(err) : resolve()),
        );
      }),
  );

  Promise.all(updates)
    .then(() => res.json({ success: true }))
    .catch(() => res.status(500).json({ error: "Error interno del servidor" }));
});

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
             (clave_materia, rfc, id_periodo, limite_alumnos, horario, aula)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             limite_alumnos = VALUES(limite_alumnos),
             horario        = VALUES(horario),
             aula           = VALUES(aula)`,
          [
            clave_materia.trim(),
            rfc.trim(),
            parseInt(id_periodo),
            parseInt(g.limite_alumnos) || 30,
            g.horario?.trim() || null,
            g.aula?.trim() || null,
          ],
          (err) => (err ? fail(err) : ok()),
        );
      });
      insertados++;
    } catch (e) {
      errores.push({
        fila: `${clave_materia}/${rfc}`,
        motivo: e.message,
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

module.exports = router;

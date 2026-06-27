const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../../db");
const { soloAdmin, verificarToken } = require("../../middleware/auth");

// ─── GET estadísticas generales del sistema ───────────────────────────────
router.get("/stats", soloAdmin, (req, res) => {
  const queries = {
    alumnos: "SELECT COUNT(*) AS total FROM alumno",
    maestros: "SELECT COUNT(*) AS total FROM maestro",
    grupos_activos:
      "SELECT COUNT(*) AS total FROM grupo WHERE estatus = 'Activo'",
    materias: "SELECT COUNT(*) AS total FROM materia",
    inscripciones:
      "SELECT COUNT(*) AS total FROM inscripcion WHERE estatus = 'Cursando'",
    usuarios_activos: "SELECT COUNT(*) AS total FROM usuario WHERE activo = 1",
    periodos_vigentes:
      "SELECT COUNT(*) AS total FROM periodo_escolar WHERE estatus = 'Vigente'",
    calificaciones_pendientes: `
      SELECT COUNT(DISTINCT i.no_control, i.id_grupo) AS total
      FROM inscripcion i
      LEFT JOIN calificacion_final cf ON cf.no_control = i.no_control AND cf.id_grupo = i.id_grupo
      WHERE i.estatus = 'Cursando' AND cf.calificacion_oficial IS NULL
    `,
  };
  const keys = Object.keys(queries);
  const results = {};
  let done = 0;
  keys.forEach((key) => {
    db.query(queries[key], (err, rows) => {
      results[key] = err ? 0 : (rows[0]?.total ?? 0);
      if (++done === keys.length) res.json(results);
    });
  });
});

// ─── GET todos los usuarios del sistema ───────────────────────────────────
router.get("/usuarios", soloAdmin, (req, res) => {
  db.query(
    `SELECT id_usuario, username, rol, id_referencia, activo, fecha_creacion, ultimo_acceso
     FROM usuario ORDER BY rol, username`,
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// ─── POST crear usuario para cualquier rol ────────────────────────────────
router.post("/usuarios", soloAdmin, async (req, res) => {
  const { username, password, rol, id_referencia } = req.body;
  if (!username || !password || !rol || !id_referencia)
    return res.status(400).json({ error: "Faltan campos requeridos" });
  if (!["administrador", "maestro", "alumno"].includes(rol))
    return res.status(400).json({ error: "Rol inválido" });
  try {
    const hash = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO usuario (username, pwd, rol, id_referencia) VALUES (?, ?, ?, ?)",
      [username, hash, rol, id_referencia],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res.status(409).json({ error: "El username ya existe" });
          return res.status(500).json({ error: "Error interno del servidor" });
        }
        res.status(201).json({
          success: true,
          mensaje: "Usuario creado",
          id_usuario: result.insertId,
        });
      },
    );
  } catch {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── PUT activar/desactivar usuario ───────────────────────────────────────
router.put("/usuarios/:id/estatus", soloAdmin, (req, res) => {
  const { activo } = req.body;
  if (activo === undefined)
    return res.status(400).json({ error: "El campo activo es requerido" });

  db.query(
    "UPDATE usuario SET activo = ? WHERE id_usuario = ?",
    [activo ? 1 : 0, req.params.id],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!result.affectedRows)
        return res.status(404).json({ error: "Usuario no encontrado" });

      db.query(
        "SELECT rol, id_referencia FROM usuario WHERE id_usuario = ?",
        [req.params.id],
        (err2, rows) => {
          if (!err2 && rows.length && rows[0].rol === "administrador") {
            db.query(
              "UPDATE administrador SET activo = ? WHERE rfc = ?",
              [activo ? 1 : 0, rows[0].id_referencia],
              () => {},
            );
          }
          res.json({
            success: true,
            mensaje: `Usuario ${activo ? "activado" : "desactivado"}`,
          });
        },
      );
    },
  );
});

// ─── PUT resetear contraseña de usuario ───────────────────────────────────
router.put("/usuarios/:id/password", soloAdmin, async (req, res) => {
  const { nuevaPassword } = req.body;
  if (!nuevaPassword)
    return res.status(400).json({ error: "La nueva contraseña es requerida" });
  try {
    const hash = await bcrypt.hash(nuevaPassword, 10);
    db.query(
      "UPDATE usuario SET pwd = ? WHERE id_usuario = ?",
      [hash, req.params.id],
      (err, result) => {
        if (err)
          return res.status(500).json({ error: "Error interno del servidor" });
        if (!result.affectedRows)
          return res.status(404).json({ error: "Usuario no encontrado" });
        res.json({ success: true, mensaje: "Contraseña actualizada" });
      },
    );
  } catch {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ── ADMINISTRADORES ────────────────────────────────────────────────────────────

// ─── GET todos los administradores ────────────────────────────────────────
router.get("/administradores", soloAdmin, (req, res) => {
  db.query(
    `SELECT rfc, nombre, apellido_paterno, apellido_materno,
            correo_institucional, correo_personal, tel_celular, activo
     FROM administrador ORDER BY activo DESC, nombre`,
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// ─── POST crear administrador + usuario ───────────────────────────────────
router.post("/administradores", soloAdmin, async (req, res) => {
  const {
    rfc,
    username,
    nombre,
    apellido_paterno,
    apellido_materno,
    correo_institucional,
    correo_personal,
    tel_celular,
    password,
  } = req.body;

  if (
    !rfc ||
    !username ||
    !nombre ||
    !apellido_paterno ||
    !correo_institucional ||
    !password
  )
    return res.status(400).json({
      error:
        "Faltan campos requeridos (rfc, username, nombre, apellido_paterno, correo_institucional, password)",
    });

  if (rfc.length < 12 || rfc.length > 13)
    return res
      .status(400)
      .json({ error: "El RFC debe tener entre 12 y 13 caracteres" });

  try {
    const hash = await bcrypt.hash(password, 10);
    const rfcUpper = rfc.toUpperCase();
    const usernameTrimmed = username.trim();

    db.query(
      `INSERT INTO administrador
         (rfc, nombre, apellido_paterno, apellido_materno,
          correo_institucional, correo_personal, tel_celular)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        rfcUpper,
        nombre,
        apellido_paterno,
        apellido_materno ?? null,
        correo_institucional,
        correo_personal ?? null,
        tel_celular ?? null,
      ],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res
              .status(409)
              .json({ error: "Ya existe un administrador con ese RFC" });
          return res.status(500).json({ error: "Error interno del servidor" });
        }
        db.query(
          "INSERT INTO usuario (username, pwd, rol, id_referencia) VALUES (?, ?, 'administrador', ?)",
          [usernameTrimmed, hash, rfcUpper],
          (err2) => {
            if (err2) {
              if (err2.code === "ER_DUP_ENTRY")
                return res
                  .status(409)
                  .json({ error: "El nombre de usuario ya está en uso" });
              return res
                .status(500)
                .json({ error: "Error interno del servidor" });
            }
            res.status(201).json({
              success: true,
              mensaje: "Administrador creado",
              rfc: rfcUpper,
            });
          },
        );
      },
    );
  } catch {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── PUT editar administrador ─────────────────────────────────────────────
router.put("/administradores/:id", soloAdmin, (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    correo_institucional,
    correo_personal,
    tel_celular,
  } = req.body;

  if (!nombre || !apellido_paterno || !correo_institucional)
    return res.status(400).json({ error: "Faltan campos requeridos" });

  db.query(
    `UPDATE administrador
     SET nombre=?, apellido_paterno=?, apellido_materno=?,
         correo_institucional=?, correo_personal=?, tel_celular=?
     WHERE rfc=?`,
    [
      nombre,
      apellido_paterno,
      apellido_materno ?? null,
      correo_institucional,
      correo_personal ?? null,
      tel_celular ?? null,
      req.params.id,
    ],
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!r.affectedRows)
        return res.status(404).json({ error: "Administrador no encontrado" });
      res.json({ success: true, mensaje: "Administrador actualizado" });
    },
  );
});

// ─── DELETE desactivar administrador ──────────────────────────────────────
router.delete("/administradores/:id", soloAdmin, (req, res) => {
  if (String(req.usuario.id_referencia) === String(req.params.id))
    return res
      .status(400)
      .json({ error: "No puedes desactivar tu propia cuenta" });

  db.query(
    "UPDATE administrador SET activo=0 WHERE rfc=?",
    [req.params.id],
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!r.affectedRows)
        return res.status(404).json({ error: "Administrador no encontrado" });
      db.query(
        "UPDATE usuario SET activo=0 WHERE id_referencia=? AND rol='administrador'",
        [req.params.id],
        () => res.json({ success: true, mensaje: "Administrador desactivado" }),
      );
    },
  );
});

// ── RESPALDO ───────────────────────────────────────────────────────────────────

// ─── GET exportar respaldo completo del sistema ────────────────────────────
router.get("/backup", soloAdmin, (req, res) => {
  console.log(`[BACKUP] ${new Date().toISOString()} — usuario: ${req.usuario.username} (${req.usuario.id_referencia}) descargó el respaldo del sistema`);
  const tablas = {
    carreras: "SELECT * FROM carrera",
    periodos: "SELECT * FROM periodo_escolar",
    materias: "SELECT * FROM materia",
    unidades: "SELECT * FROM unidad",
    alumnos: "SELECT * FROM alumno",
    maestros: "SELECT * FROM maestro",
    administradores: "SELECT * FROM administrador",
    usuarios: "SELECT * FROM usuario",
    reticula: "SELECT * FROM reticula",
    grupos: "SELECT * FROM grupo",
    inscripciones: "SELECT * FROM inscripcion",
    tipo_actividad: "SELECT * FROM tipo_actividad",
    materia_actividad: "SELECT * FROM materia_actividad",
    actividades: "SELECT * FROM actividad",
    resultado_actividad: "SELECT * FROM resultado_actividad",
    calificaciones_unidad: "SELECT * FROM calificacion_unidad",
    calificaciones_final: "SELECT * FROM calificacion_final",
    bonus_unidad: "SELECT * FROM bonusunidad",
    bonus_final: "SELECT * FROM bonusfinal",
    modificaciones_final: "SELECT * FROM modificacionfinal",
  };

  const keys = Object.keys(tablas);
  const resultado = {};
  let pendientes = keys.length;

  keys.forEach((key) => {
    db.query(tablas[key], (err, rows) => {
      resultado[key] = err ? [] : rows;
      if (--pendientes === 0) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="rca_backup_${new Date().toISOString().slice(0, 10)}.json"`,
        );
        res.json({
          sistema: "RCA",
          version: "1.1",
          fecha_backup: new Date().toISOString(),
          datos: resultado,
        });
      }
    });
  });
});

// ─── POST importar respaldo JSON ──────────────────────────────────────────
router.post("/backup/restore", soloAdmin, async (req, res) => {
  const { datos, sistema } = req.body;

  if (!datos || sistema !== "RCA")
    return res
      .status(400)
      .json({ error: "El archivo no es un respaldo válido del sistema RCA" });

  const orden = [
    { clave: "carreras", tabla: "carrera" },
    { clave: "periodos", tabla: "periodo_escolar" },
    { clave: "materias", tabla: "materia" },
    { clave: "unidades", tabla: "unidad" },
    { clave: "alumnos", tabla: "alumno" },
    { clave: "maestros", tabla: "maestro" },
    { clave: "administradores", tabla: "administrador" },
    { clave: "usuarios", tabla: "usuario" },
    { clave: "reticula", tabla: "reticula" },
    { clave: "grupos", tabla: "grupo" },
    { clave: "inscripciones", tabla: "inscripcion" },
    { clave: "tipo_actividad", tabla: "tipo_actividad" },
    { clave: "materia_actividad", tabla: "materia_actividad" },
    { clave: "actividades", tabla: "actividad" },
    { clave: "resultado_actividad", tabla: "resultado_actividad" },
    { clave: "calificaciones_unidad", tabla: "calificacion_unidad" },
    { clave: "calificaciones_final", tabla: "calificacion_final" },
    { clave: "bonus_unidad", tabla: "bonusunidad" },
    { clave: "bonus_final", tabla: "bonusfinal" },
    { clave: "modificaciones_final", tabla: "modificacionfinal" },
  ];

  const q = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.query(sql, params, (err, r) => (err ? reject(err) : resolve(r))),
    );

  const resumen = {};

  try {
    await q("SET FOREIGN_KEY_CHECKS = 0");

    for (const { clave, tabla } of orden) {
      const filas = datos[clave];
      if (!filas || !Array.isArray(filas) || filas.length === 0) {
        resumen[clave] = { insertadas: 0, omitidas: 0 };
        continue;
      }

      let insertadas = 0,
        omitidas = 0;

      for (const fila of filas) {
        const cols = Object.keys(fila);
        const vals = cols.map((c) => {
          const v = fila[c];
          if (
            typeof v === "string" &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)
          ) {
            return v.replace("T", " ").slice(0, 19);
          }
          return v;
        });
        const colsStr = cols.map((c) => `\`${c}\``).join(", ");
        const placeholders = cols.map(() => "?").join(", ");
        const sql = `REPLACE INTO \`${tabla}\` (${colsStr}) VALUES (${placeholders})`;
        try {
          const r = await q(sql, vals);
          if (r.affectedRows) insertadas++;
          else omitidas++;
        } catch (_) {
          omitidas++;
        }
      }

      resumen[clave] = { insertadas, omitidas };
    }

    await q("SET FOREIGN_KEY_CHECKS = 1");

    return res.json({
      success: true,
      mensaje: "Respaldo restaurado correctamente",
      resumen,
    });
  } catch (err) {
    await q("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
    return res
      .status(500)
      .json({ error: "Error al restaurar el respaldo" });
  }
});

// ── PERFIL PROPIO ──────────────────────────────────────────────────────────────

// ─── PUT cambiar contraseña del usuario autenticado ────────────────────────
router.put("/mi-password", verificarToken, async (req, res) => {
  const { passwordActual, nuevaPassword } = req.body;

  if (!passwordActual || !nuevaPassword)
    return res.status(400).json({ error: "Faltan campos requeridos" });
  if (nuevaPassword.length < 6)
    return res
      .status(400)
      .json({ error: "La contraseña debe tener al menos 6 caracteres" });

  db.query(
    "SELECT id_usuario, pwd FROM usuario WHERE id_usuario = ?",
    [req.usuario.id_usuario],
    async (err, rows) => {
      if (err || !rows.length)
        return res.status(404).json({ error: "Usuario no encontrado" });

      const valida = await bcrypt.compare(passwordActual, rows[0].pwd);
      if (!valida)
        return res.status(401).json({ error: "Contraseña actual incorrecta" });

      const hash = await bcrypt.hash(nuevaPassword, 10);
      db.query(
        "UPDATE usuario SET pwd = ? WHERE id_usuario = ?",
        [hash, req.usuario.id_usuario],
        (e) => {
          if (e) return res.status(500).json({ error: "Error interno" });
          res.json({
            success: true,
            mensaje: "Contraseña actualizada correctamente",
          });
        },
      );
    },
  );
});

module.exports = router;

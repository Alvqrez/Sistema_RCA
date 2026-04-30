// src/routes/admin.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db");
const { soloAdmin } = require("../middleware/auth");

// GET — estadísticas generales del sistema (dashboard)
router.get("/stats", soloAdmin, (req, res) => {
  const queries = {
    alumnos: "SELECT COUNT(*) AS total FROM alumno",
    maestros: "SELECT COUNT(*) AS total FROM maestro WHERE estatus = 'Activo'",
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

// GET — todos los usuarios del sistema
router.get("/usuarios", soloAdmin, (req, res) => {
  const query = `
        SELECT
            u.id_usuario,
            u.username,
            u.rol,
            u.id_referencia,
            u.activo,
            u.fecha_creacion,
            u.ultimo_acceso
        FROM usuario u
        ORDER BY u.rol, u.username
    `;

  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// POST — crear usuario para cualquier rol
router.post("/usuarios", soloAdmin, async (req, res) => {
  const { username, password, rol, id_referencia } = req.body;

  if (!username || !password || !rol || !id_referencia) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  if (!["administrador", "maestro", "alumno"].includes(rol)) {
    return res.status(400).json({ error: "Rol inválido" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    const query = `
            INSERT INTO usuario (username, pwd, rol, id_referencia)
            VALUES (?, ?, ?, ?)
        `;

    db.query(query, [username, hash, rol, id_referencia], (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "El username ya existe" });
        }
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.status(201).json({
        success: true,
        mensaje: "Usuario creado",
        id_usuario: result.insertId,
      });
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT — activar o desactivar usuario
router.put("/usuarios/:id/estatus", soloAdmin, (req, res) => {
  const { activo } = req.body;

  if (activo === undefined) {
    return res.status(400).json({ error: "El campo activo es requerido" });
  }

  db.query(
    "UPDATE usuario SET activo = ? WHERE id_usuario = ?",
    [activo ? 1 : 0, req.params.id],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Usuario no encontrado" });
      res.json({
        success: true,
        mensaje: `Usuario ${activo ? "activado" : "desactivado"}`,
      });
    },
  );
});

// PUT — resetear contraseña
router.put("/usuarios/:id/password", soloAdmin, async (req, res) => {
  const { nuevaPassword } = req.body;

  if (!nuevaPassword) {
    return res.status(400).json({ error: "La nueva contraseña es requerida" });
  }

  try {
    const hash = await bcrypt.hash(nuevaPassword, 10);

    db.query(
      "UPDATE usuario SET pwd = ? WHERE id_usuario = ?",
      [hash, req.params.id],
      (err, result) => {
        if (err)
          return res.status(500).json({ error: "Error interno del servidor" });
        if (result.affectedRows === 0)
          return res.status(404).json({ error: "Usuario no encontrado" });
        res.json({ success: true, mensaje: "Contraseña actualizada" });
      },
    );
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET — todos los administradores
router.get("/administradores", soloAdmin, (req, res) => {
  db.query("SELECT * FROM administrador WHERE activo = 1", (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// POST — crear administrador + su usuario (RFC = PK y username automático)
router.post("/administradores", soloAdmin, async (req, res) => {
  const {
    rfc,
    nombre,
    apellido_paterno,
    apellido_materno,
    correo_institucional,
    password,
  } = req.body;

  if (!rfc || !nombre || !apellido_paterno || !correo_institucional || !password) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  if (rfc.length < 12 || rfc.length > 13) {
    return res.status(400).json({ error: "El RFC debe tener entre 12 y 13 caracteres" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const rfcUpper = rfc.toUpperCase();

    // Primero crea el administrador (rfc = PK)
    db.query(
      `INSERT INTO administrador (rfc, nombre, apellido_paterno, apellido_materno, correo_institucional)
             VALUES (?, ?, ?, ?, ?)`,
      [rfcUpper, nombre, apellido_paterno, apellido_materno ?? null, correo_institucional],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Ya existe un administrador con ese RFC" });
          }
          return res.status(500).json({ error: "Error interno del servidor" });
        }

        // Luego crea su usuario (username = RFC, id_referencia = RFC)
        db.query(
          `INSERT INTO usuario (username, pwd, rol, id_referencia)
                     VALUES (?, ?, 'administrador', ?)`,
          [rfcUpper, hash, rfcUpper],
          (err2) => {
            if (err2) {
              if (err2.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ error: "Ya existe un usuario con ese RFC" });
              }
              return res.status(500).json({ error: "Error interno del servidor" });
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
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET — exportar respaldo completo del sistema en JSON
// Incluye: alumnos, maestros, materias, grupos, inscripciones, unidades, actividades
router.get("/backup", soloAdmin, (req, res) => {
  const tablas = {
    alumnos:
      "SELECT no_control, nombre, apellido_paterno, apellido_materno, id_carrera, correo_institucional FROM alumno",
    maestros:
      "SELECT rfc, nombre, apellido_paterno, apellido_materno, correo_institucional, departamento, estatus FROM maestro",
    carreras: "SELECT * FROM carrera",
    materias: "SELECT * FROM materia",
    periodos: "SELECT * FROM periodo_escolar",
    grupos: "SELECT * FROM grupo",
    inscripciones: "SELECT * FROM inscripcion",
    unidades: "SELECT * FROM unidad",
    actividades: "SELECT * FROM actividad",
    calificaciones_unidad: "SELECT * FROM calificacion_unidad",
    calificaciones_final: "SELECT * FROM calificacion_final",
    bonus_unidad: "SELECT * FROM bonusunidad",
    bonus_final: "SELECT * FROM bonusfinal",
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

// PUT — cambiar contraseña del usuario autenticado (perfil propio)
router.put("/mi-password", async (req, res) => {
  // Acepta cualquier rol autenticado
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "No autorizado" });
  const jwt = require("jsonwebtoken");
  let payload;
  try {
    payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
  const { passwordActual, nuevaPassword } = req.body;
  if (!passwordActual || !nuevaPassword)
    return res.status(400).json({ error: "Faltan campos requeridos" });
  if (nuevaPassword.length < 6)
    return res
      .status(400)
      .json({ error: "La contraseña debe tener al menos 6 caracteres" });

  db.query(
    "SELECT id_usuario, pwd FROM usuario WHERE id_usuario = ?",
    [payload.id_usuario],
    async (err, rows) => {
      if (err || !rows.length)
        return res.status(404).json({ error: "Usuario no encontrado" });
      const bcrypt = require("bcrypt");
      const valida = await bcrypt.compare(passwordActual, rows[0].pwd);
      if (!valida)
        return res.status(401).json({ error: "Contraseña actual incorrecta" });
      const hash = await bcrypt.hash(nuevaPassword, 10);
      db.query(
        "UPDATE usuario SET pwd = ? WHERE id_usuario = ?",
        [hash, payload.id_usuario],
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

// PUT — editar administrador
router.put("/administradores/:id", soloAdmin, (req, res) => {
  const { nombre, apellido_paterno, apellido_materno, correo_institucional } = req.body;
  if (!nombre || !apellido_paterno || !correo_institucional) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  db.query(
    "UPDATE administrador SET nombre=?, apellido_paterno=?, apellido_materno=?, correo_institucional=? WHERE rfc=?",
    [nombre, apellido_paterno, apellido_materno ?? null, correo_institucional, req.params.id],
    (err, r) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (!r.affectedRows) return res.status(404).json({ error: "No encontrado" });
      res.json({ success: true, mensaje: "Administrador actualizado" });
    }
  );
});

// DELETE — desactivar administrador (soft delete)
router.delete("/administradores/:id", soloAdmin, (req, res) => {
  if (String(req.usuario.id_referencia) === String(req.params.id)) {
    return res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
  }
  db.query("UPDATE administrador SET activo=0 WHERE rfc=?", [req.params.id], (err, r) => {
    if (err) return res.status(500).json({ error: "Error interno del servidor" });
    if (!r.affectedRows) return res.status(404).json({ error: "No encontrado" });
    db.query("UPDATE usuario SET activo=0 WHERE id_referencia=? AND rol='administrador'", [req.params.id], () => {
      res.json({ success: true, mensaje: "Administrador desactivado" });
    });
  });
});

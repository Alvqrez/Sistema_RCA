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
      SELECT COUNT(DISTINCT i.matricula, i.id_grupo) AS total
      FROM inscripcion i
      LEFT JOIN calificacion_final cf ON cf.matricula = i.matricula AND cf.id_grupo = i.id_grupo
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
      res
        .status(201)
        .json({
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

// POST — crear administrador + su usuario
router.post("/administradores", soloAdmin, async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    correo_institucional,
    username,
    password,
  } = req.body;

  if (
    !nombre ||
    !apellido_paterno ||
    !correo_institucional ||
    !username ||
    !password
  ) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    // Primero crea el administrador
    db.query(
      `INSERT INTO administrador (nombre, apellido_paterno, apellido_materno, correo_institucional)
             VALUES (?, ?, ?, ?)`,
      [
        nombre,
        apellido_paterno,
        apellido_materno ?? null,
        correo_institucional,
      ],
      (err, result) => {
        if (err)
          return res.status(500).json({ error: "Error interno del servidor" });

        const id_admin = result.insertId;

        // Luego crea su usuario
        db.query(
          `INSERT INTO usuario (username, pwd, rol, id_referencia)
                     VALUES (?, ?, 'administrador', ?)`,
          [username, hash, id_admin],
          (err2) => {
            if (err2) {
              if (err2.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ error: "El username ya existe" });
              }
              return res
                .status(500)
                .json({ error: "Error interno del servidor" });
            }
            res
              .status(201)
              .json({
                success: true,
                mensaje: "Administrador creado",
                id_admin,
              });
          },
        );
      },
    );
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;

// src/routes/admin/maestros.js — v12
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// GET — todos los maestros
router.get("/", verificarToken, (req, res) => {
  db.query(
    `SELECT m.rfc, m.nombre, m.apellido_paterno, m.apellido_materno,
            m.curp, m.fecha_nacimiento,
            m.correo_institucional, m.correo_personal, m.tel_celular,
            u.username, u.pwd
     FROM maestro m
     LEFT JOIN usuario u ON u.id_referencia = m.rfc AND u.rol = 'maestro'`,
    (err, results) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// GET — un maestro por RFC
router.get("/:id", verificarToken, (req, res) => {
  db.query(
    `SELECT rfc, nombre, apellido_paterno, apellido_materno,
            curp, fecha_nacimiento,
            correo_institucional, correo_personal, tel_celular
     FROM maestro WHERE rfc = ?`,
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (!results.length) return res.status(404).json({ error: "Maestro no encontrado" });
      res.json(results[0]);
    },
  );
});

// POST CSV — importar maestros
router.post("/csv", soloAdmin, async (req, res) => {
  const { maestros } = req.body;
  if (!Array.isArray(maestros) || !maestros.length)
    return res.status(400).json({ error: "No se recibieron datos" });

  const errores = [];
  let insertados = 0;

  for (const m of maestros) {
    const { rfc, nombre, apellido_paterno, correo_institucional, username } = m;
    const passwordRaw = m.password || m.pwd || "";

    if (!rfc || !nombre || !apellido_paterno || !correo_institucional || !username || !passwordRaw) {
      errores.push({ rfc: rfc || "?", motivo: "Faltan campos requeridos (rfc, nombre, apellido_paterno, correo_institucional, username, password)" });
      continue;
    }

    try {
      const hash = passwordRaw.startsWith("$2b$") || passwordRaw.startsWith("$2a$")
        ? passwordRaw
        : await bcrypt.hash(passwordRaw.trim(), 10);

      const s = (v) => (v != null && String(v).trim() !== "" ? String(v).trim() : null);

      await new Promise((ok, fail) =>
        db.query(
          `INSERT IGNORE INTO maestro
             (rfc, nombre, apellido_paterno, apellido_materno,
              correo_institucional, correo_personal,
              curp, fecha_nacimiento, tel_celular)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rfc.trim().toUpperCase(),
            nombre.trim(),
            apellido_paterno.trim(),
            s(m.apellido_materno),
            correo_institucional.trim(),
            s(m.correo_personal),
            s(m.curp)?.toUpperCase() || null,
            s(m.fecha_nacimiento),
            s(m.tel_celular),
          ],
          (err) => (err ? fail(err) : ok()),
        ),
      );

      await new Promise((ok, fail) =>
        db.query(
          `INSERT INTO usuario (username, pwd, rol, id_referencia, activo)
           SELECT ?, ?, 'maestro', ?, 1
           WHERE NOT EXISTS (
             SELECT 1 FROM usuario WHERE id_referencia = ? AND rol = 'maestro'
           )`,
          [username.trim(), hash, rfc.trim().toUpperCase(), rfc.trim().toUpperCase()],
          (err) => (err ? fail(err) : ok()),
        ),
      );

      insertados++;
    } catch (e) {
      errores.push({ rfc, motivo: e.message });
    }
  }

  res.json({ success: true, insertados, errores, mensaje: `${insertados} maestro(s) importados. ${errores.length} con errores.` });
});

// POST — registrar maestro individual
router.post("/", soloAdmin, async (req, res) => {
  const {
    rfc, nombre, apellido_paterno, apellido_materno,
    curp, fecha_nacimiento,
    correo_institucional, correo_personal, tel_celular,
    password,
  } = req.body;

  if (!rfc || !nombre || !apellido_paterno || !correo_institucional || !password)
    return res.status(400).json({ error: "Faltan campos requeridos" });

  try {
    const hash = await bcrypt.hash(password, 10);
    const rfcClean = rfc.trim().toUpperCase();

    db.query(
      `INSERT INTO maestro
         (rfc, nombre, apellido_paterno, apellido_materno,
          curp, fecha_nacimiento,
          correo_institucional, correo_personal, tel_celular)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rfcClean, nombre, apellido_paterno, apellido_materno ?? null,
        curp?.trim().toUpperCase() || null, fecha_nacimiento ?? null,
        correo_institucional, correo_personal ?? null, tel_celular ?? null,
      ],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res.status(409).json({ error: "El RFC ya está registrado" });
          return res.status(500).json({ error: err.message });
        }
        db.query(
          `INSERT INTO usuario (username, pwd, rol, id_referencia) VALUES (?, ?, 'maestro', ?)`,
          [rfcClean, hash, rfcClean],
          (err2) => {
            if (err2) {
              if (err2.code === "ER_DUP_ENTRY")
                return res.status(409).json({ error: "El username ya existe" });
              return res.status(500).json({ error: "Error interno del servidor" });
            }
            res.status(201).json({ success: true, mensaje: "Maestro registrado" });
          },
        );
      },
    );
  } catch {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT — editar maestro
router.put("/:id", soloAdmin, (req, res) => {
  const {
    nombre, apellido_paterno, apellido_materno,
    curp, fecha_nacimiento,
    correo_institucional, correo_personal, tel_celular,
  } = req.body;

  if (!nombre || !apellido_paterno || !correo_institucional)
    return res.status(400).json({ error: "Faltan campos requeridos" });

  db.query(
    `UPDATE maestro
     SET nombre = ?, apellido_paterno = ?, apellido_materno = ?,
         curp = ?, fecha_nacimiento = ?,
         correo_institucional = ?, correo_personal = ?, tel_celular = ?
     WHERE rfc = ?`,
    [
      nombre, apellido_paterno, apellido_materno ?? null,
      curp ?? null, fecha_nacimiento ?? null,
      correo_institucional, correo_personal ?? null, tel_celular ?? null,
      req.params.id,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (!result.affectedRows) return res.status(404).json({ error: "Maestro no encontrado" });
      res.json({ success: true, mensaje: "Maestro actualizado" });
    },
  );
});

// DELETE — eliminar maestro
router.delete("/:id", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM maestro WHERE rfc = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (!result.affectedRows) return res.status(404).json({ error: "Maestro no encontrado" });
      res.json({ success: true, mensaje: "Maestro eliminado" });
    },
  );
});

module.exports = router;

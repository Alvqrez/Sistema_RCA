// src/routes/maestros.js — CORREGIDO (agrega GET por ID y PUT)
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db");
const { verificarToken, soloAdmin } = require("../middleware/auth");

// GET — todos los maestros
router.get("/", verificarToken, (req, res) => {
  db.query(
    "SELECT numero_empleado, nombre, apellido_paterno, apellido_materno, correo_institucional, departamento, tel_celular, estatus FROM maestro",
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// GET — un maestro por numero_empleado  ← NUEVO
router.get("/:id", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM maestro WHERE numero_empleado = ?",
    [req.params.id],
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (results.length === 0)
        return res.status(404).json({ error: "Maestro no encontrado" });
      res.json(results[0]);
    },
  );
});

// POST — registrar maestro + su usuario
router.post("/", soloAdmin, async (req, res) => {
  const {
    numero_empleado,
    nombre,
    apellido_paterno,
    apellido_materno,
    curp,
    correo_institucional,
    correo_personal,
    tel_celular,
    tel_oficina,
    direccion,
    tipo_contrato,
    estatus,
    fecha_ingreso,
    grado_academico,
    especialidad,
    departamento,
    username,
    password,
  } = req.body;

  if (
    !numero_empleado ||
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

    db.query(
      `INSERT INTO maestro (numero_empleado, nombre, apellido_paterno, apellido_materno,
          curp, correo_institucional, correo_personal, tel_celular, tel_oficina,
          direccion, tipo_contrato, estatus, fecha_ingreso, grado_academico, especialidad, departamento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numero_empleado,
        nombre,
        apellido_paterno,
        apellido_materno ?? null,
        // curp puede ser null — el schema fue corregido a NULL DEFAULT NULL
        curp?.trim().toUpperCase() || null,
        correo_institucional,
        correo_personal ?? null,
        tel_celular ?? null,
        tel_oficina ?? null,
        direccion ?? null,
        tipo_contrato ?? null,
        estatus ?? "Activo",
        fecha_ingreso ?? null,
        grado_academico ?? null,
        especialidad ?? null,
        departamento ?? null,
      ],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res
              .status(409)
              .json({ error: "El número de empleado ya existe" });
          return res.status(500).json({ error: "Error interno del servidor" });
        }

        db.query(
          `INSERT INTO usuario (username, pwd, rol, id_referencia) VALUES (?, ?, 'maestro', ?)`,
          [username, hash, numero_empleado],
          (err2) => {
            if (err2) {
              if (err2.code === "ER_DUP_ENTRY")
                return res.status(409).json({ error: "El username ya existe" });
              return res
                .status(500)
                .json({ error: "Error interno del servidor" });
            }
            res
              .status(201)
              .json({ success: true, mensaje: "Maestro registrado" });
          },
        );
      },
    );
  } catch {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT — editar maestro  ← NUEVO
router.put("/:id", soloAdmin, (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    curp,
    correo_institucional,
    correo_personal,
    tel_celular,
    tel_oficina,
    direccion,
    tipo_contrato,
    estatus,
    fecha_ingreso,
    grado_academico,
    especialidad,
    departamento,
  } = req.body;

  if (!nombre || !apellido_paterno || !correo_institucional) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  db.query(
    `UPDATE maestro
     SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, curp = ?,
         correo_institucional = ?, correo_personal = ?, tel_celular = ?, tel_oficina = ?,
         direccion = ?, tipo_contrato = ?, estatus = ?, fecha_ingreso = ?,
         grado_academico = ?, especialidad = ?, departamento = ?
     WHERE numero_empleado = ?`,
    [
      nombre,
      apellido_paterno,
      apellido_materno ?? null,
      curp ?? null,
      correo_institucional,
      correo_personal ?? null,
      tel_celular ?? null,
      tel_oficina ?? null,
      direccion ?? null,
      tipo_contrato ?? null,
      estatus ?? "Activo",
      fecha_ingreso ?? null,
      grado_academico ?? null,
      especialidad ?? null,
      departamento ?? null,
      req.params.id,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Maestro no encontrado" });
      res.json({ success: true, mensaje: "Maestro actualizado" });
    },
  );
});

// DELETE — eliminar maestro
router.delete("/:id", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM maestro WHERE numero_empleado = ?",
    [req.params.id],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Maestro no encontrado" });
      res.json({ success: true, mensaje: "Maestro eliminado" });
    },
  );
});

router.post("/csv", soloAdmin, async (req, res) => {
  const { maestros } = req.body;

  if (!Array.isArray(maestros) || maestros.length === 0)
    return res.status(400).json({ error: "No se recibieron datos" });

  const errores = [];
  let insertados = 0;

  for (const m of maestros) {
    const {
      numero_empleado,
      nombre,
      apellido_paterno,
      correo_institucional,
      username,
      password,
    } = m;

    if (
      !numero_empleado ||
      !nombre ||
      !apellido_paterno ||
      !correo_institucional ||
      !username ||
      !password
    ) {
      errores.push({
        numero_empleado: numero_empleado || "?",
        motivo:
          "Faltan campos requeridos (numero_empleado, nombre, apellido_paterno, correo_institucional, username, password)",
      });
      continue;
    }

    try {
      const hash = await bcrypt.hash(password.trim(), 10);

      await new Promise((ok, fail) =>
        db.query(
          `INSERT INTO maestro
             (numero_empleado, nombre, apellido_paterno, apellido_materno,
              correo_institucional, departamento, especialidad,
              grado_academico, tipo_contrato, tel_celular, estatus)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo')
           ON DUPLICATE KEY UPDATE
             nombre               = VALUES(nombre),
             apellido_paterno     = VALUES(apellido_paterno),
             correo_institucional = VALUES(correo_institucional),
             departamento         = VALUES(departamento)`,
          [
            numero_empleado.trim(),
            nombre.trim(),
            apellido_paterno.trim(),
            m.apellido_materno?.trim() || null,
            correo_institucional.trim(),
            m.departamento?.trim() || null,
            m.especialidad?.trim() || null,
            m.grado_academico?.trim() || null,
            m.tipo_contrato?.trim() || null,
            m.tel_celular?.trim() || null,
          ],
          (err) => (err ? fail(err) : ok()),
        ),
      );

      // Crear usuario solo si no existe
      await new Promise((ok, fail) =>
        db.query(
          `INSERT INTO usuario (username, pwd, rol, id_referencia, activo)
           VALUES (?, ?, 'maestro', ?, 1)
           ON DUPLICATE KEY UPDATE pwd = VALUES(pwd)`,
          [username.trim(), hash, numero_empleado.trim()],
          (err) => (err ? fail(err) : ok()),
        ),
      );

      insertados++;
    } catch (e) {
      errores.push({ numero_empleado, motivo: e.message });
    }
  }

  res.json({
    success: true,
    insertados,
    errores,
    mensaje: `${insertados} maestro(s) importados. ${errores.length} con errores.`,
  });
});

module.exports = router;

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

module.exports = router;

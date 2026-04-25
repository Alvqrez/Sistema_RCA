// src/routes/alumnos.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db");
const { verificarToken, soloAdmin } = require("../middleware/auth");

// GET — todos los alumnos
router.get("/", verificarToken, (req, res) => {
  db.query(
    "SELECT matricula, nombre, apellido_paterno, apellido_materno, correo_institucional, id_carrera FROM Alumno",
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      res.json(results);
    },
  );
});

router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  const sql = `
        SELECT a.matricula, a.nombre, a.apellido_paterno, a.apellido_materno,
               a.correo_institucional, a.id_carrera
        FROM inscripcion i
        JOIN alumno a ON i.matricula = a.matricula
        WHERE i.id_grupo = ? AND i.estatus = 'Cursando'
        ORDER BY a.apellido_paterno, a.nombre
    `;

  db.query(sql, [req.params.id_grupo], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// GET — un alumno por matrícula
router.get("/:matricula", verificarToken, (req, res) => {
  db.query(
    "SELECT matricula, nombre, apellido_paterno, apellido_materno, correo_institucional, id_carrera FROM Alumno WHERE matricula = ?",
    [req.params.matricula],
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      if (results.length === 0)
        return res.status(404).json({ error: "Alumno no encontrado" });

      res.json(results[0]);
    },
  );
});

// POST — registrar alumno (solo maestro)
router.post("/", soloAdmin, async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    matricula,
    id_carrera,
    correo_institucional,
    curp,
    fecha_nacimiento,
    genero,
    tel_celular,
    tel_casa,
    direccion,
    correo_personal,
    username,
    password,
  } = req.body;

  if (
    !nombre ||
    !matricula ||
    !id_carrera ||
    !correo_institucional ||
    !username ||
    !password
  ) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    // 1. Inserta en alumno (sin usuario ni password — esos campos ya no se usan)
    db.query(
      `INSERT INTO alumno
         (matricula, nombre, apellido_paterno, apellido_materno, id_carrera,
          correo_institucional, curp, fecha_nacimiento, genero,
          tel_celular, tel_casa, direccion, correo_personal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matricula,
        nombre,
        apellido_paterno,
        apellido_materno   ?? null,
        id_carrera,
        correo_institucional,
        curp?.trim().toUpperCase() || null,
        fecha_nacimiento   || null,
        genero             || null,
        tel_celular        || null,
        tel_casa           || null,
        direccion          || null,
        correo_personal    || null,
      ],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            if (err.message.includes("matricula") || err.message.includes("PRIMARY"))
              return res.status(409).json({ error: "La matrícula ya está registrada en el sistema." });
            if (err.message.includes("curp") || err.message.includes("CURP"))
              return res.status(409).json({ error: "El CURP ya está registrado en otro alumno." });
            return res.status(409).json({ error: "Ya existe un alumno con esos datos." });
          }
          if (err.code === "ER_NO_REFERENCED_ROW_2")
            return res.status(400).json({ error: "La carrera seleccionada no existe." });
          console.error("❌ ERROR ALUMNO:", err.message);
          return res.status(500).json({ error: "Error al registrar alumno: " + err.message });
        }
        console.log(
          "✅ Perfil de alumno creado, procediendo a crear cuenta de usuario...",
        );

        // 2. Crea el acceso en la tabla usuario
        db.query(
          `INSERT INTO usuario (username, pwd, rol, id_referencia, activo) VALUES (?, ?, 'alumno', ?, 1)`,
          [username, hash, matricula],
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
              .json({ success: true, mensaje: "Alumno registrado" });
          },
        );
      },
    );
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT — editar alumno (solo maestro)
router.put("/:matricula", soloAdmin, (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    correo_institucional,
    id_carrera,
  } = req.body;

  if (!nombre || !apellido_paterno || !correo_institucional) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const query = `
        UPDATE alumno
        SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, correo_institucional = ?, id_carrera = ?
        WHERE matricula = ?
    `;

  db.query(
    query,
    [
      nombre,
      apellido_paterno,
      apellido_materno ?? null,
      correo_institucional,
      id_carrera,
      req.params.matricula,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Alumno no encontrado" });

      res.json({ success: true, mensaje: "Alumno actualizado" });
    },
  );
});

// POST — importar alumnos desde CSV (bulk)
router.post("/csv", soloAdmin, async (req, res) => {
  const { alumnos } = req.body;
  if (!Array.isArray(alumnos) || alumnos.length === 0)
    return res.status(400).json({ error: "No se recibieron datos" });

  const bcrypt = require("bcrypt");
  const errores = [];
  let insertados = 0;

  for (const alumno of alumnos) {
    const {
      matricula,
      nombre,
      apellido_paterno,
      apellido_materno,
      id_carrera,
      correo_institucional,
      username,
      password,
    } = alumno;
    if (!matricula || !nombre || !id_carrera || !username || !password) {
      errores.push({
        matricula: matricula || "?",
        motivo: "Campos requeridos faltantes",
      });
      continue;
    }
    try {
      const hash = await bcrypt.hash(password, 10);
      await new Promise((ok, fail) => {
        db.query(
          `INSERT INTO alumno (matricula, id_carrera, nombre, apellido_paterno, apellido_materno, correo_institucional)
           VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)`,
          [
            matricula,
            id_carrera,
            nombre,
            apellido_paterno || "",
            apellido_materno || "",
            correo_institucional || "",
          ],
          (err) => {
            if (err) fail(err);
            else ok();
          },
        );
      });
      await new Promise((ok, fail) => {
        db.query(
          `INSERT INTO usuario (username, pwd, rol, id_referencia, activo) VALUES (?,?,'alumno',?,1)
           ON DUPLICATE KEY UPDATE pwd=VALUES(pwd)`,
          [username, hash, matricula],
          (err) => {
            if (err) fail(err);
            else ok();
          },
        );
      });
      insertados++;
    } catch (e) {
      errores.push({ matricula, motivo: e.message });
    }
  }
  res.json({ success: true, insertados, errores });
});

// DELETE — eliminar alumno (solo maestro)
router.delete("/:matricula", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM alumno WHERE matricula = ?",
    [req.params.matricula],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Alumno no encontrado" });

      res.json({ success: true, mensaje: "Alumno eliminado" });
    },
  );
});

module.exports = router;

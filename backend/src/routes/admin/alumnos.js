// src/routes/alumnos.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// GET — todos los alumnos
router.get("/", verificarToken, (req, res) => {
  db.query(
    "SELECT no_control, nombre, apellido_paterno, apellido_materno, correo_institucional, id_carrera, tel_celular FROM alumno",
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      res.json(results);
    },
  );
});

router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  const sql = `
        SELECT a.no_control, a.nombre, a.apellido_paterno, a.apellido_materno,
               a.correo_institucional, a.id_carrera
        FROM inscripcion i
        JOIN alumno a ON i.no_control = a.no_control
        WHERE i.id_grupo = ? AND i.estatus = 'Cursando'
        ORDER BY a.apellido_paterno, a.nombre
    `;

  db.query(sql, [req.params.id_grupo], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    res.json(results);
  });
});

// GET — un alumno por no_control
router.get("/:no_control", verificarToken, (req, res) => {
  db.query(
    "SELECT no_control, nombre, apellido_paterno, apellido_materno, correo_institucional, id_carrera, curp, fecha_nacimiento, genero, tel_celular, tel_casa, direccion, correo_personal FROM alumno WHERE no_control = ?",
    [req.params.no_control],
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });

      if (results.length === 0)
        return res.status(404).json({ error: "Alumno no encontrado" });

      res.json(results[0]);
    },
  );
});

//________________________
async function generarNumeroControl() {
  const year = new Date().getFullYear().toString().slice(-2); // "24"
  const fijo = "02";
  const prefijo = `${year}${fijo}`; // "2402"

  return new Promise((resolve, reject) => {
    db.query(
      `SELECT no_control 
       FROM alumno 
       WHERE no_control LIKE ? 
       ORDER BY no_control DESC 
       LIMIT 1`,
      [`${prefijo}%`],
      (err, results) => {
        if (err) return reject(err);

        let consecutivo = 1;

        if (results.length > 0) {
          const ultimo = results[0].no_control;
          const numero = parseInt(ultimo.slice(4)); // últimos 4 dígitos
          consecutivo = numero + 1;
        }

        const consecutivoStr = String(consecutivo).padStart(4, "0");

        resolve(`${prefijo}${consecutivoStr}`);
      },
    );
  });
}
//___________________________

// POST — registrar alumno (solo maestro)
router.post("/", soloAdmin, async (req, res) => {
  const {
  nombre,
  apellido_paterno,
  apellido_materno,
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

  if (!nombre || !id_carrera || !correo_institucional || !password){
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const no_control = await generarNumeroControl();

  // El username del alumno siempre es su número de control
  const usernameAlumno = no_control;

  try {
    const hash = await bcrypt.hash(password, 10);

    // 1. Inserta en alumno (sin usuario ni password — esos campos ya no se usan)
    db.query(
      `INSERT INTO alumno
         (no_control, nombre, apellido_paterno, apellido_materno, id_carrera,
          correo_institucional, curp, fecha_nacimiento, genero,
          tel_celular, tel_casa, direccion, correo_personal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        no_control,
        nombre,
        apellido_paterno,
        apellido_materno ?? null,
        id_carrera,
        correo_institucional,
        curp?.trim().toUpperCase() || null,
        fecha_nacimiento || null,
        genero || null,
        tel_celular || null,
        tel_casa || null,
        direccion || null,
        correo_personal || null,
      ],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            if (
              err.message.includes("no_control") ||
              err.message.includes("PRIMARY")
            )
              return res.status(409).json({
                error: "La no_control ya está registrada en el sistema.",
              });
            if (err.message.includes("curp") || err.message.includes("CURP"))
              return res
                .status(409)
                .json({ error: "El CURP ya está registrado en otro alumno." });
            return res
              .status(409)
              .json({ error: "Ya existe un alumno con esos datos." });
          }
          if (err.code === "ER_NO_REFERENCED_ROW_2")
            return res
              .status(400)
              .json({ error: "La carrera seleccionada no existe." });
          console.error("❌ ERROR ALUMNO:", err.message);
          return res
            .status(500)
            .json({ error: "Error al registrar alumno: " + err.message });
        }
        console.log(
          "✅ Perfil de alumno creado, procediendo a crear cuenta de usuario...",
        );

        // 2. Crea el acceso en la tabla usuario
        db.query(
          `INSERT INTO usuario (username, pwd, rol, id_referencia, activo) VALUES (?, ?, 'alumno', ?, 1)`,
          [usernameAlumno, hash, no_control],
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

// PUT — editar alumno (solo admin)
router.put("/:no_control", soloAdmin, (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    correo_institucional,
    id_carrera,
    curp,
    fecha_nacimiento,
    genero,
    tel_celular,
    tel_casa,
    direccion,
    correo_personal,
  } = req.body;

  if (!nombre || !apellido_paterno || !correo_institucional) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const query = `
        UPDATE alumno
        SET nombre = ?, apellido_paterno = ?, apellido_materno = ?,
            correo_institucional = ?, id_carrera = ?,
            curp = ?, fecha_nacimiento = ?, genero = ?,
            tel_celular = ?, tel_casa = ?, direccion = ?, correo_personal = ?
        WHERE no_control = ?
    `;

  db.query(
    query,
    [
      nombre,
      apellido_paterno,
      apellido_materno ?? null,
      correo_institucional,
      id_carrera,
      curp?.trim().toUpperCase() || null,
      fecha_nacimiento || null,
      genero || null,
      tel_celular || null,
      tel_casa || null,
      direccion || null,
      correo_personal || null,
      req.params.no_control,
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res
            .status(409)
            .json({ error: "El CURP ya está registrado en otro alumno." });
        return res.status(500).json({ error: "Error interno del servidor" });
      }
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
      no_control,
      nombre,
      apellido_paterno,
      apellido_materno,
      id_carrera,
      correo_institucional,
      password,
    } = alumno;
    if (!no_control || !nombre || !id_carrera || !password) {
      errores.push({
        no_control: no_control || "?",
        motivo: "Campos requeridos faltantes",
      });
      continue;
    }
    try {
      const hash = await bcrypt.hash(password, 10);
      await new Promise((ok, fail) => {
        db.query(
          `INSERT INTO alumno (no_control, id_carrera, nombre, apellido_paterno, apellido_materno, correo_institucional)
           VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)`,
          [
            no_control,
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
          [no_control, hash, no_control],
          (err) => {
            if (err) fail(err);
            else ok();
          },
        );
      });
      insertados++;
    } catch (e) {
      errores.push({ no_control, motivo: e.message });
    }
  }
  res.json({ success: true, insertados, errores });
});

// DELETE — eliminar alumno (solo maestro)
router.delete("/:no_control", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM alumno WHERE no_control = ?",
    [req.params.no_control],
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

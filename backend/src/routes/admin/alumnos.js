// src/routes/admin/alumnos.js — v12
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function generarNumeroControl() {
  const prefijo = new Date().getFullYear().toString().slice(-2);
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT no_control FROM alumno WHERE no_control LIKE ? ORDER BY no_control DESC LIMIT 1",
      [`${prefijo}%`],
      (err, results) => {
        if (err) return reject(err);
        let consecutivo = 1;
        if (results.length > 0) {
          const num = parseInt(results[0].no_control.slice(2));
          if (!isNaN(num)) consecutivo = num + 1;
        }
        resolve(`${prefijo}${String(consecutivo).padStart(6, "0")}`);
      },
    );
  });
}

function generarCorreo(no_control) {
  return `L${no_control}@veracruz.tecnm.mx`;
}

function generarPasswordDesdeFecha(fechaStr) {
  if (!fechaStr) return null;
  const partes = fechaStr.trim().split("-");
  if (partes.length !== 3) return null;
  const [year, month, day] = partes.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return `${year}${month}${day}`;
}

// ─── GET todos los alumnos ────────────────────────────────────────────────────
router.get("/", verificarToken, (req, res) => {
  db.query(
    `SELECT no_control, id_carrera, nombre, apellido_paterno, apellido_materno,
            curp, fecha_nacimiento,
            correo_institucional, correo_personal, tel_celular
     FROM alumno`,
    (err, results) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// ─── GET siguiente no_control (antes de /:no_control) ────────────────────────
router.get("/siguiente-control", verificarToken, async (req, res) => {
  try {
    const no_control = await generarNumeroControl();
    res.json({ no_control, correo_institucional: generarCorreo(no_control) });
  } catch {
    res.status(500).json({ error: "Error al obtener el siguiente número de control" });
  }
});

// ─── GET alumnos de un grupo ──────────────────────────────────────────────────
router.get("/grupo/:id_grupo", verificarToken, (req, res) => {
  db.query(
    `SELECT a.no_control, a.nombre, a.apellido_paterno, a.apellido_materno,
            a.correo_institucional, a.id_carrera
     FROM inscripcion i
     JOIN alumno a ON i.no_control = a.no_control
     WHERE i.id_grupo = ? AND i.estatus = 'Cursando'
     ORDER BY a.apellido_paterno, a.nombre`,
    [req.params.id_grupo],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.json(results);
    },
  );
});

// ─── GET un alumno por no_control ─────────────────────────────────────────────
router.get("/:no_control", verificarToken, (req, res) => {
  db.query(
    `SELECT no_control, nombre, apellido_paterno, apellido_materno,
            correo_institucional, id_carrera, curp, fecha_nacimiento,
            tel_celular, correo_personal
     FROM alumno WHERE no_control = ?`,
    [req.params.no_control],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (!results.length) return res.status(404).json({ error: "Alumno no encontrado" });
      res.json(results[0]);
    },
  );
});

// ─── POST registrar alumno ────────────────────────────────────────────────────
router.post("/", soloAdmin, async (req, res) => {
  const {
    nombre, apellido_paterno, apellido_materno,
    id_carrera, fecha_nacimiento, curp,
    tel_celular, correo_personal,
  } = req.body;

  if (!nombre || !apellido_paterno || !id_carrera || !fecha_nacimiento)
    return res.status(400).json({ error: "Faltan campos requeridos: nombre, apellido paterno, carrera y fecha de nacimiento." });

  try {
    const no_control = await generarNumeroControl();
    const correo_institucional = generarCorreo(no_control);
    const passwordPlana = generarPasswordDesdeFecha(fecha_nacimiento);

    if (!passwordPlana)
      return res.status(400).json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD." });

    const hash = await bcrypt.hash(passwordPlana, 10);

    db.getConnection((connErr, conn) => {
      if (connErr) return res.status(500).json({ error: "Error interno del servidor" });

      conn.beginTransaction((txErr) => {
        if (txErr) { conn.release(); return res.status(500).json({ error: "Error interno del servidor" }); }

        conn.query(
          `INSERT INTO alumno
             (no_control, nombre, apellido_paterno, apellido_materno, id_carrera,
              correo_institucional, curp, fecha_nacimiento, tel_celular, correo_personal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            no_control, nombre, apellido_paterno, apellido_materno ?? null, id_carrera,
            correo_institucional, curp?.trim().toUpperCase() || null, fecha_nacimiento,
            tel_celular || null, correo_personal || null,
          ],
          (err) => {
            if (err) {
              return conn.rollback(() => {
                conn.release();
                if (err.code === "ER_DUP_ENTRY") {
                  if (err.message.includes("PRIMARY"))
                    return res.status(409).json({ error: "El número de control ya está registrado." });
                  if (err.message.toLowerCase().includes("curp"))
                    return res.status(409).json({ error: "El CURP ya está registrado en otro alumno." });
                  return res.status(409).json({ error: "Ya existe un alumno con esos datos." });
                }
                if (err.code === "ER_NO_REFERENCED_ROW_2")
                  return res.status(400).json({ error: "La carrera seleccionada no existe." });
                return res.status(500).json({ error: "Error al registrar alumno: " + err.message });
              });
            }

            conn.query(
              "INSERT INTO usuario (username, pwd, rol, id_referencia, activo) VALUES (?, ?, 'alumno', ?, 1)",
              [no_control, hash, no_control],
              (err2) => {
                if (err2) {
                  return conn.rollback(() => {
                    conn.release();
                    if (err2.code === "ER_DUP_ENTRY")
                      return res.status(409).json({ error: "El usuario ya existe." });
                    return res.status(500).json({ error: "Error interno del servidor" });
                  });
                }
                conn.commit((commitErr) => {
                  conn.release();
                  if (commitErr) return res.status(500).json({ error: "Error interno del servidor" });
                  res.status(201).json({ success: true, mensaje: "Alumno registrado correctamente", no_control, correo_institucional });
                });
              },
            );
          },
        );
      });
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── PUT editar alumno ────────────────────────────────────────────────────────
router.put("/:no_control", soloAdmin, (req, res) => {
  const { curp, fecha_nacimiento, tel_celular, correo_personal } = req.body;

  db.query(
    `UPDATE alumno
     SET curp = ?, fecha_nacimiento = ?, tel_celular = ?, correo_personal = ?
     WHERE no_control = ?`,
    [
      curp?.trim().toUpperCase() || null,
      fecha_nacimiento || null,
      tel_celular || null,
      correo_personal || null,
      req.params.no_control,
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ error: "El CURP ya está registrado en otro alumno." });
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      if (!result.affectedRows) return res.status(404).json({ error: "Alumno no encontrado" });
      res.json({ success: true, mensaje: "Alumno actualizado" });
    },
  );
});

// ─── POST CSV — importar alumnos ──────────────────────────────────────────────
router.post("/csv", soloAdmin, async (req, res) => {
  const { alumnos } = req.body;
  if (!Array.isArray(alumnos) || !alumnos.length)
    return res.status(400).json({ error: "No se recibieron datos" });

  const errores = [];
  let insertados = 0;

  for (const alumno of alumnos) {
    const { no_control, nombre, id_carrera } = alumno;

    if (!no_control || !nombre || !id_carrera) {
      errores.push({ no_control: no_control || "?", motivo: "Faltan campos: no_control, nombre, id_carrera" });
      continue;
    }

    const correo = alumno.correo_institucional?.trim() || generarCorreo(no_control);

    let passwordPlana;
    if (alumno.password?.trim()) {
      passwordPlana = alumno.password.trim();
    } else if (alumno.fecha_nacimiento?.trim()) {
      passwordPlana = generarPasswordDesdeFecha(alumno.fecha_nacimiento.trim()) || no_control;
    } else {
      passwordPlana = no_control;
    }

    try {
      const hash = await bcrypt.hash(passwordPlana, 10);
      const s = (v) => (v != null && String(v).trim() !== "" ? String(v).trim() : null);

      await new Promise((ok, fail) => {
        db.query(
          `INSERT INTO alumno
             (no_control, id_carrera, nombre, apellido_paterno, apellido_materno,
              correo_institucional, curp, fecha_nacimiento,
              correo_personal, tel_celular)
           VALUES (?,?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE
             apellido_materno = COALESCE(VALUES(apellido_materno), apellido_materno),
             curp             = COALESCE(VALUES(curp),             curp),
             fecha_nacimiento = COALESCE(VALUES(fecha_nacimiento), fecha_nacimiento),
             correo_personal  = COALESCE(VALUES(correo_personal),  correo_personal),
             tel_celular      = COALESCE(VALUES(tel_celular),      tel_celular)`,
          [
            no_control, id_carrera, nombre,
            s(alumno.apellido_paterno) || "",
            s(alumno.apellido_materno) || "",
            correo,
            s(alumno.curp)?.toUpperCase() || null,
            s(alumno.fecha_nacimiento),
            s(alumno.correo_personal),
            s(alumno.tel_celular),
          ],
          (err) => (err ? fail(err) : ok()),
        );
      });

      await new Promise((ok, fail) => {
        db.query(
          "INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia, activo) VALUES (?,?,'alumno',?,1)",
          [no_control, hash, no_control],
          (err) => (err ? fail(err) : ok()),
        );
      });

      insertados++;
    } catch (e) {
      errores.push({ no_control, motivo: e.message });
    }
  }

  res.json({ success: true, insertados, errores });
});

// ─── DELETE eliminar alumno ───────────────────────────────────────────────────
router.delete("/:no_control", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM alumno WHERE no_control = ?",
    [req.params.no_control],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      if (!result.affectedRows) return res.status(404).json({ error: "Alumno no encontrado" });
      res.json({ success: true, mensaje: "Alumno eliminado" });
    },
  );
});

module.exports = router;

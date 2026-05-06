// src/routes/materias.js
const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// GET — todas las materias con sus carreras asociadas
router.get("/", verificarToken, (req, res) => {
  const sql = `
    SELECT m.*,
           GROUP_CONCAT(
             CONCAT(r.id_carrera, ':', c.nombre_carrera, ':', COALESCE(r.semestre, 0))
             ORDER BY c.nombre_carrera SEPARATOR '|'
           ) AS carreras_raw
    FROM materia m
    LEFT JOIN reticula r ON m.clave_materia = r.clave_materia
    LEFT JOIN carrera  c ON r.id_carrera    = c.id_carrera
    GROUP BY m.clave_materia
    ORDER BY m.nombre_materia
  `;
  db.query(sql, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    const parsed = results.map((m) => ({
      ...m,
      carreras: m.carreras_raw
        ? m.carreras_raw.split("|").map((s) => {
            const [id_carrera, nombre_carrera, semestre] = s.split(":");
            return {
              id_carrera,
              nombre_carrera,
              semestre: parseInt(semestre) || null,
            };
          })
        : [],
    }));
    res.json(parsed);
  });
});

// GET — una materia por clave (con carreras)
router.get("/:clave", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM materia WHERE clave_materia = ?",
    [req.params.clave],
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!results.length)
        return res.status(404).json({ error: "Materia no encontrada" });
      const m = results[0];
      // Obtener carreras de la retícula
      db.query(
        `SELECT r.id_carrera, c.nombre_carrera, r.semestre, r.creditos
         FROM reticula r JOIN carrera c ON r.id_carrera = c.id_carrera
         WHERE r.clave_materia = ? ORDER BY c.nombre_carrera`,
        [req.params.clave],
        (err2, carreras) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          res.json({ ...m, carreras: carreras || [] });
        },
      );
    },
  );
});

// POST — crear materia
router.post("/", soloAdmin, (req, res) => {
  const {
    clave_materia,
    nombre_materia,
    creditos_totales,
    horas_teoricas,
    horas_practicas,
    no_unidades,
  } = req.body;
  if (!clave_materia || !nombre_materia)
    return res.status(400).json({ error: "Clave y nombre son requeridos" });

  db.query(
    `INSERT INTO materia (clave_materia, nombre_materia, creditos_totales, horas_teoricas, horas_practicas, no_unidades)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      clave_materia,
      nombre_materia,
      creditos_totales ?? 0,
      horas_teoricas ?? 0,
      horas_practicas ?? 0,
      no_unidades ?? 0,
    ],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res
            .status(409)
            .json({ error: "La clave de materia ya existe" });
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.status(201).json({ success: true, mensaje: "Materia registrada" });
    },
  );
});

// PUT — editar materia
router.put("/:clave", soloAdmin, (req, res) => {
  const {
    nombre_materia,
    creditos_totales,
    horas_teoricas,
    horas_practicas,
    no_unidades,
  } = req.body;
  if (!nombre_materia)
    return res.status(400).json({ error: "El nombre es requerido" });

  db.query(
    `UPDATE materia SET nombre_materia=?, creditos_totales=?, horas_teoricas=?, horas_practicas=?, no_unidades=?
     WHERE clave_materia=?`,
    [
      nombre_materia,
      creditos_totales ?? 0,
      horas_teoricas ?? 0,
      horas_practicas ?? 0,
      no_unidades ?? 0,
      req.params.clave,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!result.affectedRows)
        return res.status(404).json({ error: "Materia no encontrada" });
      res.json({ success: true, mensaje: "Materia actualizada" });
    },
  );
});

// DELETE — eliminar materia (borra retícula primero para evitar error de FK)
router.delete("/:clave", soloAdmin, (req, res) => {
  const clave = req.params.clave;
  // 1. Borrar registros dependientes en retícula
  db.query("DELETE FROM reticula WHERE clave_materia=?", [clave], (err) => {
    if (err) {
      console.error("Error borrando retícula:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
    // 2. Borrar la materia
    db.query(
      "DELETE FROM materia WHERE clave_materia=?",
      [clave],
      (err2, result) => {
        if (err2) {
          console.error("Error borrando materia:", err2);
          return res.status(500).json({ error: "Error interno del servidor" });
        }
        if (!result.affectedRows)
          return res.status(404).json({ error: "Materia no encontrada" });
        res.json({ success: true, mensaje: "Materia eliminada" });
      },
    );
  });
});

// ── RETÍCULA (asociar materia ↔ carrera) ──────────────────────────────────────

// POST — vincular materia a una carrera
router.post("/:clave/carreras", soloAdmin, (req, res) => {
  const { id_carrera, semestre, creditos } = req.body;
  if (!id_carrera)
    return res.status(400).json({ error: "Se requiere id_carrera" });

  db.query(
    `INSERT INTO reticula (clave_materia, id_carrera, semestre, creditos)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE semestre=VALUES(semestre), creditos=VALUES(creditos)`,
    [req.params.clave, id_carrera, semestre ?? 1, creditos ?? 0],
    (err) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.status(201).json({ success: true, mensaje: "Carrera vinculada" });
    },
  );
});

// DELETE — desvincular materia de una carrera
router.delete("/:clave/carreras/:id_carrera", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM reticula WHERE clave_materia=? AND id_carrera=?",
    [req.params.clave, req.params.id_carrera],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!result.affectedRows)
        return res.status(404).json({ error: "Vínculo no encontrado" });
      res.json({ success: true, mensaje: "Carrera desvinculada" });
    },
  );
});

// POST CSV
router.post("/csv", soloAdmin, (req, res) => {
  const { materias } = req.body;
  if (!Array.isArray(materias) || !materias.length)
    return res.status(400).json({ error: "No se recibieron datos" });

  const errores = [];
  let insertados = 0;
  let pendientes = materias.length;

  const finalizar = () => {
    if (--pendientes === 0)
      res.json({
        success: true,
        insertados,
        errores,
        mensaje: `${insertados} materia(s) importadas. ${errores.length} con errores.`,
      });
  };

  for (const mat of materias) {
    const { clave_materia, nombre_materia } = mat;
    if (!clave_materia || !nombre_materia) {
      errores.push({
        clave: clave_materia || "?",
        motivo: "clave_materia y nombre_materia son obligatorios",
      });
      finalizar();
      continue;
    }
    db.query(
      `INSERT INTO materia (clave_materia, nombre_materia, creditos_totales, horas_teoricas, horas_practicas, no_unidades)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre_materia=VALUES(nombre_materia), creditos_totales=VALUES(creditos_totales), no_unidades=VALUES(no_unidades)`,
      [
        clave_materia.trim(),
        nombre_materia.trim(),
        parseInt(mat.creditos_totales) || 0,
        parseInt(mat.horas_teoricas) || 0,
        parseInt(mat.horas_practicas) || 0,
        parseInt(mat.no_unidades) || 3,
      ],
      (err) => {
        if (err) errores.push({ clave: clave_materia, motivo: err.message });
        else insertados++;
        finalizar();
      },
    );
  }
});

module.exports = router;

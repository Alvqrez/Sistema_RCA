const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// ─── GET todas las materias con sus carreras asociadas ─────────────────────
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

// ─── POST importar materias desde CSV ──────────────────────────────────────
router.post("/csv", soloAdmin, (req, res) => {
  const { materias } = req.body;
  if (!Array.isArray(materias) || !materias.length)
    return res.status(400).json({ error: "No se recibieron datos" });

  const errores = [];
  let insertados = 0;
  let reticulas = 0;
  let pendientes = materias.length;

  const finalizar = () => {
    if (--pendientes === 0)
      res.json({
        success: true,
        insertados,
        reticulas,
        errores,
        mensaje: `${insertados} materia(s) importada(s), ${reticulas} vínculo(s) de carrera procesado(s). ${errores.length} fila(s) con errores.`,
      });
  };

  for (const mat of materias) {
    const { clave_materia, nombre_materia, id_carrera, semestre } = mat;

    if (!clave_materia || !nombre_materia) {
      errores.push({
        clave: clave_materia || "?",
        motivo: "clave_materia y nombre_materia son obligatorios",
      });
      finalizar();
      continue;
    }

    db.query(
      `INSERT IGNORE INTO materia (clave_materia, nombre_materia, no_unidades)
       VALUES (?, ?, ?)`,
      [
        clave_materia.trim(),
        nombre_materia.trim(),
        parseInt(mat.no_unidades) || 3,
      ],
      (err, result) => {
        if (err) {
          errores.push({ clave: clave_materia, motivo: err.message });
          finalizar();
          return;
        }

        if (result.affectedRows > 0) insertados++;

        if (id_carrera && String(id_carrera).trim() !== "") {
          db.query(
            `INSERT INTO reticula (clave_materia, id_carrera, semestre)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE semestre = VALUES(semestre)`,
            [
              clave_materia.trim(),
              String(id_carrera).trim(),
              parseInt(semestre) || 1,
            ],
            (err2) => {
              if (err2) {
                errores.push({
                  clave: clave_materia,
                  motivo: `Retícula: ${err2.message}`,
                });
              } else {
                reticulas++;
              }
              finalizar();
            }
          );
        } else {
          finalizar();
        }
      }
    );
  }
});

// ─── GET materia por clave ────────────────────────────────────────────────
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
      db.query(
        `SELECT r.id_carrera, c.nombre_carrera, r.semestre
         FROM reticula r JOIN carrera c ON r.id_carrera = c.id_carrera
         WHERE r.clave_materia = ? ORDER BY c.nombre_carrera`,
        [req.params.clave],
        (err2, carreras) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          res.json({ ...m, carreras: carreras || [] });
        }
      );
    }
  );
});

// ─── POST crear materia ───────────────────────────────────────────────────
router.post("/", soloAdmin, (req, res) => {
  const { clave_materia, nombre_materia, no_unidades } = req.body;
  if (!clave_materia || !nombre_materia)
    return res.status(400).json({ error: "Clave y nombre son requeridos" });

  db.query(
    `INSERT INTO materia (clave_materia, nombre_materia, no_unidades)
     VALUES (?, ?, ?)`,
    [clave_materia, nombre_materia, no_unidades ?? 0],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res
            .status(409)
            .json({ error: "La clave de materia ya existe" });
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.status(201).json({ success: true, mensaje: "Materia registrada" });
    }
  );
});

// ─── PUT editar materia ───────────────────────────────────────────────────
router.put("/:clave", soloAdmin, (req, res) => {
  const { nombre_materia, no_unidades } = req.body;
  if (!nombre_materia)
    return res.status(400).json({ error: "El nombre es requerido" });

  db.query(
    `UPDATE materia SET nombre_materia=?, no_unidades=?
     WHERE clave_materia=?`,
    [nombre_materia, no_unidades ?? 0, req.params.clave],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!result.affectedRows)
        return res.status(404).json({ error: "Materia no encontrada" });
      res.json({ success: true, mensaje: "Materia actualizada" });
    }
  );
});

// ─── DELETE eliminar materia ──────────────────────────────────────────────
router.delete("/:clave", soloAdmin, (req, res) => {
  const clave = req.params.clave;
  db.query("DELETE FROM reticula WHERE clave_materia=?", [clave], (err) => {
    if (err)
      return res.status(500).json({ error: "Error interno del servidor" });
    db.query(
      "DELETE FROM materia WHERE clave_materia=?",
      [clave],
      (err2, result) => {
        if (err2)
          return res.status(500).json({ error: "Error interno del servidor" });
        if (!result.affectedRows)
          return res.status(404).json({ error: "Materia no encontrada" });
        res.json({ success: true, mensaje: "Materia eliminada" });
      }
    );
  });
});

// ── RETÍCULA (asociar materia ↔ carrera) ──────────────────────────────────────

// ─── POST vincular materia a una carrera ──────────────────────────────────
router.post("/:clave/carreras", soloAdmin, (req, res) => {
  const { id_carrera, semestre } = req.body;
  if (!id_carrera)
    return res.status(400).json({ error: "Se requiere id_carrera" });

  db.query(
    `INSERT INTO reticula (clave_materia, id_carrera, semestre)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE semestre=VALUES(semestre)`,
    [req.params.clave, id_carrera, semestre ?? 1],
    (err) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.status(201).json({ success: true, mensaje: "Carrera vinculada" });
    }
  );
});

// ─── DELETE desvincular materia de una carrera ────────────────────────────
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
    }
  );
});

module.exports = router;

// backend/src/routes/periodos.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, soloAdmin } = require("../middleware/auth");

// ─── Verifica solapamiento de fechas con otros periodos ──────────────────────
function verificarSolapamiento(fecha_inicio, fecha_fin, excluirId = null) {
  return new Promise((resolve, reject) => {
    const sql = `
            SELECT id_periodo, descripcion, fecha_inicio, fecha_fin
            FROM periodo_escolar
            WHERE ? <= fecha_fin AND ? >= fecha_inicio
            ${excluirId ? "AND id_periodo != ?" : ""}
        `;
    const params = excluirId
      ? [fecha_inicio, fecha_fin, excluirId]
      : [fecha_inicio, fecha_fin];

    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows); // vacío = sin solapamiento
    });
  });
}

// GET — todos los periodos
router.get("/", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM periodo_escolar ORDER BY fecha_inicio DESC",
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r);
    },
  );
});

// GET — periodo vigente
router.get("/vigente", verificarToken, (req, res) => {
  db.query(
    "SELECT * FROM periodo_escolar WHERE estatus = 'Vigente' LIMIT 1",
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r[0] || null);
    },
  );
});

// POST — crear periodo (con validación de solapamiento y orden de fechas)
router.post("/", soloAdmin, async (req, res) => {
  const { descripcion, anio, fecha_inicio, fecha_fin, estatus } = req.body;

  if (!descripcion || !anio || !fecha_inicio || !fecha_fin)
    return res.status(400).json({ error: "Faltan campos requeridos" });

  // Validar que la fecha de inicio sea anterior a la de fin
  if (new Date(fecha_inicio) >= new Date(fecha_fin))
    return res.status(400).json({
      error: "La fecha de inicio debe ser anterior a la fecha de fin",
    });

  try {
    const solapados = await verificarSolapamiento(fecha_inicio, fecha_fin);
    if (solapados.length > 0) {
      return res.status(409).json({
        error: `Las fechas se solapan con el periodo existente: "${solapados[0].descripcion}" (${solapados[0].fecha_inicio} — ${solapados[0].fecha_fin}). Los periodos no pueden compartir fechas.`,
      });
    }

    db.query(
      "INSERT INTO periodo_escolar (descripcion, anio, fecha_inicio, fecha_fin, estatus) VALUES (?,?,?,?,?)",
      [descripcion, anio, fecha_inicio, fecha_fin, estatus || "Proximo"],
      (err, r) => {
        if (err)
          return res.status(500).json({ error: "Error interno del servidor" });
        res.status(201).json({ success: true, id_periodo: r.insertId });
      },
    );
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT — actualizar periodo (con validación de solapamiento)
router.put("/:id", soloAdmin, async (req, res) => {
  const { descripcion, anio, fecha_inicio, fecha_fin, estatus } = req.body;
  const id = req.params.id;

  if (new Date(fecha_inicio) >= new Date(fecha_fin))
    return res.status(400).json({
      error: "La fecha de inicio debe ser anterior a la fecha de fin",
    });

  try {
    const solapados = await verificarSolapamiento(fecha_inicio, fecha_fin, id);
    if (solapados.length > 0) {
      return res.status(409).json({
        error: `Las fechas se solapan con: "${solapados[0].descripcion}" (${solapados[0].fecha_inicio} — ${solapados[0].fecha_fin})`,
      });
    }

    const update = () => {
      db.query(
        "UPDATE periodo_escolar SET descripcion=?, anio=?, fecha_inicio=?, fecha_fin=?, estatus=? WHERE id_periodo=?",
        [descripcion, anio, fecha_inicio, fecha_fin, estatus, id],
        (err, r) => {
          if (err)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          if (r.affectedRows === 0)
            return res.status(404).json({ error: "Periodo no encontrado" });
          res.json({ success: true });
        },
      );
    };

    if (estatus === "Vigente") {
      db.query(
        "UPDATE periodo_escolar SET estatus = 'Concluido' WHERE estatus = 'Vigente' AND id_periodo != ?",
        [id],
        () => update(),
      );
    } else {
      update();
    }
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// DELETE
router.delete("/:id", soloAdmin, (req, res) => {
  db.query(
    "DELETE FROM periodo_escolar WHERE id_periodo = ?",
    [req.params.id],
    (err, r) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Error interno del servidor", detalle: err.message });
      if (r.affectedRows === 0)
        return res.status(404).json({ error: "Periodo no encontrado" });
      res.json({ success: true });
    },
  );
});

module.exports = router;

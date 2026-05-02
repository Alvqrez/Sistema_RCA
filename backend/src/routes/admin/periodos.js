// backend/src/routes/admin/periodos.js
const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// GET — lista con anio calculado desde fecha_inicio (no almacenado)
router.get("/", verificarToken, (req, res) => {
  db.query(
    `SELECT id_periodo, descripcion,
                YEAR(fecha_inicio) AS anio,
                fecha_inicio, fecha_fin, estatus
         FROM periodo_escolar ORDER BY fecha_inicio DESC`,
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
    `SELECT id_periodo, descripcion,
                YEAR(fecha_inicio) AS anio,
                fecha_inicio, fecha_fin, estatus
         FROM periodo_escolar WHERE estatus = 'Vigente' LIMIT 1`,
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r[0] || null);
    },
  );
});

// POST — crear periodo (SIN anio en el INSERT)
router.post("/", soloAdmin, async (req, res) => {
  const { descripcion, fecha_inicio, fecha_fin, estatus } = req.body;

  if (!descripcion || !fecha_inicio || !fecha_fin)
    return res.status(400).json({ error: "Faltan campos requeridos" });

  if (new Date(fecha_inicio) >= new Date(fecha_fin))
    return res
      .status(400)
      .json({ error: "La fecha de inicio debe ser anterior a la de fin" });

  // Verificar solapamiento
  db.query(
    `SELECT id_periodo, descripcion FROM periodo_escolar
         WHERE ? <= fecha_fin AND ? >= fecha_inicio`,
    [fecha_inicio, fecha_fin],
    (err, solapados) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (solapados.length > 0) {
        return res.status(409).json({
          error: `Las fechas se solapan con: "${solapados[0].descripcion}"`,
        });
      }

      db.query(
        "INSERT INTO periodo_escolar (descripcion, fecha_inicio, fecha_fin, estatus) VALUES (?,?,?,?)",
        [descripcion, fecha_inicio, fecha_fin, estatus || "Proximo"],
        (err2, r) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          res.status(201).json({ success: true, id_periodo: r.insertId });
        },
      );
    },
  );
});

// PUT — actualizar periodo (SIN anio)
router.put("/:id", soloAdmin, (req, res) => {
  const { descripcion, fecha_inicio, fecha_fin, estatus } = req.body;
  const id = req.params.id;

  if (new Date(fecha_inicio) >= new Date(fecha_fin))
    return res
      .status(400)
      .json({ error: "La fecha de inicio debe ser anterior a la de fin" });

  const update = () => {
    db.query(
      "UPDATE periodo_escolar SET descripcion=?, fecha_inicio=?, fecha_fin=?, estatus=? WHERE id_periodo=?",
      [descripcion, fecha_inicio, fecha_fin, estatus, id],
      (err, r) => {
        if (err)
          return res.status(500).json({ error: "Error interno del servidor" });
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

// backend/src/routes/periodos.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const { verificarToken, soloAdmin } = require("../middleware/auth");

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

// POST — crear periodo
router.post("/", soloAdmin, (req, res) => {
  const { descripcion, anio, fecha_inicio, fecha_fin, estatus } = req.body;
  if (!descripcion || !anio || !fecha_inicio || !fecha_fin)
    return res.status(400).json({ error: "Faltan campos requeridos" });

  db.query(
    "INSERT INTO periodo_escolar (descripcion, anio, fecha_inicio, fecha_fin, estatus) VALUES (?,?,?,?,?)",
    [descripcion, anio, fecha_inicio, fecha_fin, estatus || "Proximo"],
    (err, r) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      res.status(201).json({ success: true, id_periodo: r.insertId });
    },
  );
});

// PUT — actualizar periodo
router.put("/:id", soloAdmin, (req, res) => {
  const { descripcion, anio, fecha_inicio, fecha_fin, estatus } = req.body;
  // Si se activa este como Vigente, poner los demás como Concluido/Proximo
  const update = () => {
    db.query(
      "UPDATE periodo_escolar SET descripcion=?, anio=?, fecha_inicio=?, fecha_fin=?, estatus=? WHERE id_periodo=?",
      [descripcion, anio, fecha_inicio, fecha_fin, estatus, req.params.id],
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
      [req.params.id],
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

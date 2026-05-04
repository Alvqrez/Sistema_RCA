// backend/src/routes/admin/periodos.js
const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// GET — lista
router.get("/", verificarToken, (req, res) => {
  db.query(
    `SELECT id_periodo, descripcion,
            YEAR(fecha_inicio) AS anio,
            fecha_inicio, fecha_fin, estatus
     FROM periodo_escolar ORDER BY fecha_inicio DESC`,
    (err, r) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r);
    }
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
      if (err) return res.status(500).json({ error: "Error interno del servidor" });
      res.json(r[0] || null);
    }
  );
});

// POST — crear periodo
router.post("/", soloAdmin, (req, res) => {
  const { descripcion, fecha_inicio, fecha_fin, estatus } = req.body;

  if (!descripcion || !fecha_inicio || !fecha_fin)
    return res.status(400).json({ error: "Faltan campos requeridos" });

  if (new Date(fecha_inicio) >= new Date(fecha_fin))
    return res.status(400).json({ error: "La fecha de inicio debe ser anterior a la de fin" });

  const anio = new Date(fecha_inicio + "T00:00:00").getFullYear();

  // 1) Verificar duplicado: misma descripcion en el mismo año
  db.query(
    `SELECT id_periodo FROM periodo_escolar
     WHERE descripcion = ? AND YEAR(fecha_inicio) = ?`,
    [descripcion, anio],
    (err, dup) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor", detalle: err.message });
      if (dup.length > 0)
        return res.status(409).json({ error: `Ya existe el periodo "${descripcion}" para el año ${anio}` });

      // 2) Verificar solapamiento de fechas
      db.query(
        `SELECT id_periodo, descripcion, YEAR(fecha_inicio) AS anio
         FROM periodo_escolar
         WHERE ? < fecha_fin AND ? > fecha_inicio`,
        [fecha_inicio, fecha_fin],
        (err2, solapados) => {
          if (err2) return res.status(500).json({ error: "Error interno del servidor", detalle: err2.message });
          if (solapados.length > 0)
            return res.status(409).json({
              error: `Las fechas se solapan con: "${solapados[0].descripcion} ${solapados[0].anio}"`
            });

          // 3) Insertar
          db.query(
            "INSERT INTO periodo_escolar (descripcion, fecha_inicio, fecha_fin, estatus) VALUES (?,?,?,?)",
            [descripcion, fecha_inicio, fecha_fin, estatus || "Proximo"],
            (err3, r) => {
              if (err3) return res.status(500).json({ error: "Error interno del servidor", detalle: err3.message });
              res.status(201).json({ success: true, id_periodo: r.insertId });
            }
          );
        }
      );
    }
  );
});

// PUT — solo permite cambiar el estatus
router.put("/:id", soloAdmin, (req, res) => {
  const { estatus } = req.body;
  const id = req.params.id;

  const estatusValidos = ["Vigente", "Concluido", "Proximo"];
  if (!estatus || !estatusValidos.includes(estatus))
    return res.status(400).json({ error: "Estatus no válido. Use: Vigente, Concluido o Proximo" });

  const update = () => {
    db.query(
      "UPDATE periodo_escolar SET estatus=? WHERE id_periodo=?",
      [estatus, id],
      (err, r) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor", detalle: err.message });
        if (r.affectedRows === 0) return res.status(404).json({ error: "Periodo no encontrado" });
        res.json({ success: true });
      }
    );
  };

  // Si se marca como Vigente, el anterior Vigente pasa a Concluido
  if (estatus === "Vigente") {
    db.query(
      "UPDATE periodo_escolar SET estatus = 'Concluido' WHERE estatus = 'Vigente' AND id_periodo != ?",
      [id],
      () => update()
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
      if (err) return res.status(500).json({ error: "Error interno del servidor", detalle: err.message });
      if (r.affectedRows === 0) return res.status(404).json({ error: "Periodo no encontrado" });
      res.json({ success: true });
    }
  );
});

module.exports = router;

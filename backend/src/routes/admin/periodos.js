const express = require("express");
const router = express.Router();
const db = require("../../db");
const { verificarToken, soloAdmin } = require("../../middleware/auth");

// ─── GET lista de periodos ────────────────────────────────────────────────
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

// ─── GET periodo vigente ──────────────────────────────────────────────────
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

// ─── POST crear periodo ───────────────────────────────────────────────────
router.post("/", soloAdmin, (req, res) => {
  const { descripcion, fecha_inicio, fecha_fin, estatus } = req.body;

  if (!descripcion || !fecha_inicio || !fecha_fin)
    return res.status(400).json({ error: "Faltan campos requeridos" });

  const fechaInicioDate = new Date(fecha_inicio + "T00:00:00");
  const fechaFinDate = new Date(fecha_fin + "T00:00:00");
  if (isNaN(fechaInicioDate.getTime()) || isNaN(fechaFinDate.getTime()))
    return res.status(400).json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD." });

  if (fechaInicioDate >= fechaFinDate)
    return res.status(400).json({ error: "La fecha de inicio debe ser anterior a la de fin" });

  const anio = fechaInicioDate.getFullYear();

  db.query(
    `SELECT id_periodo FROM periodo_escolar
     WHERE descripcion = ? AND YEAR(fecha_inicio) = ?`,
    [descripcion, anio],
    (err, dup) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor"});
      if (dup.length > 0)
        return res.status(409).json({ error: `Ya existe el periodo "${descripcion}" para el año ${anio}` });

      db.query(
        `SELECT id_periodo, descripcion, YEAR(fecha_inicio) AS anio
         FROM periodo_escolar
         WHERE ? < fecha_fin AND ? > fecha_inicio`,
        [fecha_inicio, fecha_fin],
        (err2, solapados) => {
          if (err2) return res.status(500).json({ error: "Error interno del servidor"});
          if (solapados.length > 0)
            return res.status(409).json({
              error: `Las fechas se solapan con: "${solapados[0].descripcion} ${solapados[0].anio}"`
            });
          db.query(
            "INSERT INTO periodo_escolar (descripcion, fecha_inicio, fecha_fin, estatus) VALUES (?,?,?,?)",
            [descripcion, fecha_inicio, fecha_fin, estatus || "Proximo"],
            (err3, r) => {
              if (err3) return res.status(500).json({ error: "Error interno del servidor"});
              res.status(201).json({ success: true, id_periodo: r.insertId });
            }
          );
        }
      );
    }
  );
});

// ─── PUT cambiar estatus de periodo ───────────────────────────────────────
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
        if (err) return res.status(500).json({ error: "Error interno del servidor"});
        if (r.affectedRows === 0) return res.status(404).json({ error: "Periodo no encontrado" });
        res.json({ success: true });
      }
    );
  };

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

// ─── DELETE eliminar periodo ──────────────────────────────────────────────
router.delete("/:id", soloAdmin, (req, res) => {
  const id = req.params.id;

  db.query(
    "SELECT COUNT(*) AS total FROM grupo WHERE id_periodo = ?",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error interno del servidor"});
      if (rows[0].total > 0)
        return res.status(409).json({
          error: `No se puede eliminar: el periodo tiene ${rows[0].total} grupo(s) asignado(s). Elimina los grupos primero.`
        });

      db.query(
        "DELETE FROM periodo_escolar WHERE id_periodo = ?",
        [id],
        (err2, r) => {
          if (err2) return res.status(500).json({ error: "Error interno del servidor"});
          if (r.affectedRows === 0) return res.status(404).json({ error: "Periodo no encontrado" });
          res.json({ success: true });
        }
      );
    }
  );
});


// ─── POST importar periodos desde CSV ──────────────────────────────────────
router.post("/csv", soloAdmin, async (req, res) => {
  const { periodos } = req.body;
  if (!Array.isArray(periodos) || periodos.length === 0)
    return res.status(400).json({ error: "No se recibieron datos" });

  const errores = [];
  let insertados = 0;

  for (const p of periodos) {
    const s = (v) => (v != null && String(v).trim() !== "" ? String(v).trim() : null);
    const descripcion  = s(p.descripcion);
    const fecha_inicio = s(p.fecha_inicio);
    const fecha_fin    = s(p.fecha_fin);
    const estatus      = s(p.estatus) || "Proximo";

    if (!descripcion || !fecha_inicio || !fecha_fin) {
      errores.push({ fila: descripcion || "?", motivo: "Faltan campos requeridos (descripcion, fecha_inicio, fecha_fin)" });
      continue;
    }

    if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
      errores.push({ fila: descripcion, motivo: "fecha_inicio debe ser anterior a fecha_fin" });
      continue;
    }

    try {
      await new Promise((ok, fail) =>
        db.query(
          `INSERT INTO periodo_escolar (descripcion, fecha_inicio, fecha_fin, estatus)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             fecha_inicio = VALUES(fecha_inicio),
             fecha_fin    = VALUES(fecha_fin),
             estatus      = VALUES(estatus)`,
          [descripcion, fecha_inicio, fecha_fin, estatus],
          (err) => (err ? fail(err) : ok())
        )
      );
      insertados++;
    } catch (e) {
      errores.push({ fila: descripcion, motivo: e.message });
    }
  }

  res.json({
    success: true,
    insertados,
    errores,
    mensaje: `${insertados} periodo(s) importados. ${errores.length} con errores.`,
  });
});

module.exports = router;

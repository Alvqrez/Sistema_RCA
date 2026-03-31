const express = require("express");
const router = express.Router();

// Obtener calificaciones de un alumno por ID
router.get("/alumno/:id", (req, res) => {
    const { id } = req.params;
    res.json({
        ok: true,
        alumnoId: id,
        notas: [10, 9, 8]
    });
});

// Registrar una nueva calificación
router.post("/", (req, res) => {
    const { alumnoId, materia, nota } = req.body;
    res.json({
        ok: true,
        msg: `Calificación de ${nota} registrada en ${materia}`
    });
});

// IMPORTANTE: Exportar el router
module.exports = router;
const express = require("express");
const router = express.Router();

// Obtener todos los grupos
router.get("/", (req, res) => {
    res.json({
        ok: true,
        msg: "Lista de grupos obtenida con éxito"
    });
});

// Crear un nuevo grupo
router.post("/", (req, res) => {
    const { nombre, grado } = req.body;
    res.json({
        ok: true,
        msg: `Grupo ${nombre} de ${grado} creado`
    });
});

// IMPORTANTE: Exportar el router
module.exports = router;
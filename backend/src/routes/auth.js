const express = require("express");
const router = express.Router();

// Definición de una ruta de ejemplo para login
router.post("/login", (req, res) => {
    const { email, password } = req.body;
    
    // Aquí iría tu lógica de validación
    res.json({
        message: "Intento de login recibido",
        user: email
    });
});

// Definición de una ruta de ejemplo para registro
router.post("/register", (req, res) => {
    res.json({
        message: "Ruta de registro lista"
    });
});

// ESTA LÍNEA ES LA MÁS IMPORTANTE
// Es la que permite que app.use() en server.js reciba una función/router
module.exports = router;
// src/middleware/auth.js
const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({ error: "Token requerido" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Token inválido" });
    }

    try {
        const decoded  = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario    = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Token expirado o inválido" });
    }

}

function soloMaestro(req, res, next) {
    verificarToken(req, res, () => {
        if (req.usuario.rol !== "maestro") {
            return res.status(403).json({ error: "Acceso solo para maestros" });
        }
        next();
    });
}

function soloAdmin(req, res, next) {
    verificarToken(req, res, () => {
        if (req.usuario.rol !== "administrador") {
            return res.status(403).json({ error: "Acceso solo para administradores" });
        }
        next();
    });
}

// Maestro o administrador pueden pasar
function maestroOAdmin(req, res, next) {
    verificarToken(req, res, () => {
        if (req.usuario.rol !== "maestro" && req.usuario.rol !== "administrador") {
            return res.status(403).json({ error: "Acceso no autorizado" });
        }
        next();
    });
}

module.exports = { verificarToken, soloMaestro, soloAdmin, maestroOAdmin };
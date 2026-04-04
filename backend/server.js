// server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = require("./src/db");

// LOGIN
app.post("/login", (req, res) => {

    const { usuario, password, rol } = req.body;

    if (!usuario || !password || !rol) {
        return res.status(400).json({ success: false, message: "Faltan campos requeridos" });
    }

    let sql;

    if (rol === "alumno") {
        sql = "SELECT * FROM Alumno WHERE usuario = ?";
    } else if (rol === "maestro") {
        sql = "SELECT * FROM Maestro WHERE usuario = ?";
    } else {
        return res.status(400).json({ success: false, message: "Rol inválido" });
    }

    db.query(sql, [usuario], async (err, result) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Error interno del servidor" });
        }

        if (result.length === 0) {
            return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }

        const user = result[0];

        // Comparar password con bcrypt
        const passwordValida = await bcrypt.compare(password, user.password);

        if (!passwordValida) {
            return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                id: user.matricula || user.numero_empleado,
                usuario: user.usuario,
                rol: rol
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            success: true,
            token,
            rol,
            nombre: user.nombre
        });

    });

});

// Rutas
app.use("/api/alumnos",        require("./src/routes/alumnos"));
app.use("/api/grupos",         require("./src/routes/grupos"));
app.use("/api/calificaciones", require("./src/routes/calificaciones"));

app.get("/", (req, res) => {
    res.json({ mensaje: "API RCA activa", version: "1.0" });
});

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto " + PORT);
});
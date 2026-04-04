// server.js
const express = require("express");
const cors    = require("cors");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
require("dotenv").config();

const app  = express();
const PORT = process.env.PORT || 3000;
const db   = require("./src/db");

app.use(cors());
app.use(express.json());

// ─── LOGIN ────────────────────────────────────────────────────────────────────
app.post("/login", (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Faltan campos requeridos" });
    }

    // Busca en la tabla centralizada
    const sql = "SELECT * FROM usuario WHERE username = ? AND activo = 1";

    db.query(sql, [username], async (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Error interno del servidor" });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }

        const userRow = results[0];

        // Comparar contra el campo pwd (no password)
        const passwordValida = await bcrypt.compare(password, userRow.pwd);

        if (!passwordValida) {
            return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }

        // Actualizar último acceso
        db.query(
            "UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = ?",
            [userRow.id_usuario]
        );

        // Obtener el nombre según el rol
        let sqlNombre;
        if (userRow.rol === "alumno") {
            sqlNombre = "SELECT nombre, apellido_paterno FROM alumno WHERE matricula = ?";
        } else if (userRow.rol === "maestro") {
            sqlNombre = "SELECT nombre, apellido_paterno FROM maestro WHERE numero_empleado = ?";
        } else if (userRow.rol === "administrador") {
            sqlNombre = "SELECT nombre, apellido_paterno FROM administrador WHERE id_admin = ?";
        }

        db.query(sqlNombre, [userRow.id_referencia], (err2, persona) => {

            if (err2 || persona.length === 0) {
                return res.status(500).json({ success: false, message: "Error interno del servidor" });
            }

            const token = jwt.sign(
                {
                    id_usuario:   userRow.id_usuario,
                    id_referencia: userRow.id_referencia,
                    username:     userRow.username,
                    rol:          userRow.rol
                },
                process.env.JWT_SECRET,
                { expiresIn: "8h" }
            );

            res.json({
                success: true,
                token,
                rol:    userRow.rol,
                nombre: `${persona[0].nombre} ${persona[0].apellido_paterno}`
            });

        });

    });

});

// ─── RUTAS ────────────────────────────────────────────────────────────────────
app.use("/api/alumnos",        require("./src/routes/alumnos"));
app.use("/api/materias",       require("./src/routes/materias"));
app.use("/api/grupos",         require("./src/routes/grupos"));
app.use("/api/calificaciones", require("./src/routes/calificaciones"));
app.use("/api/admin",          require("./src/routes/admin"));

app.get("/", (req, res) => {
    res.json({ mensaje: "API RCA activa", version: "1.0" });
});

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto " + PORT);
});
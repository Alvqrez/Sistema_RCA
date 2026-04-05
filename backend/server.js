// server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const db = require("./src/db");

app.use(cors());
app.use(express.json());

// ─── LOGIN ────────────────────────────────────────────────────────────────────
app.post("/login", (req, res) => {
  const { username, password, rol } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Faltan campos requeridos" });
  }

  // Busca en la tabla centralizada
  const sql = "SELECT * FROM usuario WHERE username = ? AND activo = 1";

  db.query(sql, [username], async (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }

    if (results.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Credenciales incorrectas" });
    }

    const userRow = results[0];

    // Comparar contra el campo pwd (no password)
    const passwordValida = await bcrypt.compare(password, userRow.pwd);

    if (!passwordValida) {
      return res
        .status(401)
        .json({ success: false, message: "Credenciales incorrectas" });
    }

    if (rol && userRow.rol !== rol) {
      return res.status(401).json({
        success: false,
        message: `Esta cuenta no es de tipo "${rol}"`,
      });
    }

    // Actualizar último acceso
    db.query("UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = ?", [
      userRow.id_usuario,
    ]);

    // Obtener el nombre según el rol
    let sqlNombre;
    if (userRow.rol === "alumno") {
      sqlNombre =
        "SELECT nombre, apellido_paterno FROM alumno WHERE matricula = ?";
    } else if (userRow.rol === "maestro") {
      sqlNombre =
        "SELECT nombre, apellido_paterno FROM maestro WHERE numero_empleado = ?";
    } else if (userRow.rol === "administrador") {
      sqlNombre =
        "SELECT nombre, apellido_paterno FROM administrador WHERE id_admin = ?";
    }

    // server.js — bloque del login, solo la parte del nombre (reemplaza la que tienes)
    db.query(sqlNombre, [userRow.id_referencia], (err2, persona) => {
      if (err2) {
        console.error("Error buscando persona:", err2);
        return res
          .status(500)
          .json({ success: false, message: "Error interno del servidor" });
      }

      // Si no encuentra al alumno/maestro/admin referenciado — problema de datos
      if (persona.length === 0) {
        console.error(
          `No se encontró la persona con id_referencia: ${userRow.id_referencia} para rol: ${userRow.rol}`,
        );
        return res
          .status(500)
          .json({
            success: false,
            message: "Error interno del servidor: perfil de usuario incompleto",
          });
      }

      const token = jwt.sign(
        {
          id_usuario: userRow.id_usuario,
          id_referencia: userRow.id_referencia,
          username: userRow.username,
          rol: userRow.rol,
        },
        process.env.JWT_SECRET,
        { expiresIn: "8h" },
      );

      res.json({
        success: true,
        token,
        rol: userRow.rol,
        nombre: `${persona[0].nombre} ${persona[0].apellido_paterno}`,
      });
    });
  });
});

// ─── RUTAS ────────────────────────────────────────────────────────────────────
app.use("/api/alumnos", require("./src/routes/alumnos"));
app.use("/api/materias", require("./src/routes/materias"));
app.use("/api/grupos", require("./src/routes/grupos"));
app.use("/api/calificaciones", require("./src/routes/calificaciones"));
app.use("/api/admin", require("./src/routes/admin"));
app.use("/api/maestros", require("./src/routes/maestros"));
app.use("/api/unidades", require("./src/routes/unidades"));
app.use("/api/carreras", require("./src/routes/carreras"));

app.get("/", (req, res) => {
  res.json({ mensaje: "API RCA activa", version: "1.0" });
});

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});

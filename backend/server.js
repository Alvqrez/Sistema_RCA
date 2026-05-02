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

  db.query(
    "SELECT * FROM usuario WHERE username = ? AND activo = 1",
    [username],
    async (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Error interno del servidor" });
      if (results.length === 0)
        return res
          .status(401)
          .json({ success: false, message: "Credenciales incorrectas" });

      const userRow = results[0];
      const passwordValida = await bcrypt.compare(password, userRow.pwd);
      if (!passwordValida)
        return res
          .status(401)
          .json({ success: false, message: "Credenciales incorrectas" });

      if (rol && userRow.rol !== rol) {
        return res.status(401).json({
          success: false,
          message: `Esta cuenta no es de tipo "${rol}"`,
        });
      }

      db.query(
        "UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = ?",
        [userRow.id_usuario],
      );

      let sqlNombre;
      if (userRow.rol === "alumno")
        sqlNombre =
          "SELECT nombre, apellido_paterno FROM alumno WHERE no_control = ?";
      else if (userRow.rol === "maestro")
        sqlNombre =
          "SELECT nombre, apellido_paterno FROM maestro WHERE rfc = ?";
      else if (userRow.rol === "administrador")
        sqlNombre =
          "SELECT nombre, apellido_paterno FROM administrador WHERE rfc = ?";

      db.query(sqlNombre, [userRow.id_referencia], (err2, persona) => {
        if (err2)
          return res
            .status(500)
            .json({ success: false, message: "Error de conexión" });
        if (!persona || persona.length === 0) {
          return res.status(401).json({
            success: false,
            message: "Error de perfil: no se encontró información del usuario.",
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
    },
  );
});

// ─── RUTAS ────────────────────────────────────────────────────────────────────

// ADMIN
app.use("/api/alumnos", require("./src/routes/admin/alumnos"));
app.use("/api/maestros", require("./src/routes/admin/maestros"));
app.use("/api/inscripciones", require("./src/routes/admin/inscripciones"));
app.use("/api/admin", require("./src/routes/admin/admin"));
app.use("/api/carreras", require("./src/routes/admin/carreras"));
app.use("/api/periodos", require("./src/routes/admin/periodos"));
app.use("/api/materias", require("./src/routes/admin/materias")); // ← era shared/materias (no existe)

// MAESTRO
app.use("/api/actividades", require("./src/routes/maestro/actividades"));
app.use("/api/calificaciones", require("./src/routes/maestro/calificaciones"));
app.use(
  "/api/config-evaluacion",
  require("./src/routes/maestro/config_evaluacion"),
);
app.use(
  "/api/resultado-actividad",
  require("./src/routes/maestro/resultado_actividad"),
);
app.use("/api/bonus", require("./src/routes/maestro/bonus"));
app.use("/api/unidades", require("./src/routes/maestro/unidades")); // ← era shared/unidades (no existe)

// SHARED
app.use("/api/grupos", require("./src/routes/shared/grupos"));
app.use("/api/reportes", require("./src/routes/shared/reportes"));
app.use(
  "/api/tipo-actividades",
  require("./src/routes/shared/tipo_actividades"),
); // ← era admin/ (no existe)
app.use(
  "/api/materia-actividades",
  require("./src/routes/shared/materia_actividades"),
); // ← era admin/ (no existe)
app.use(
  "/api/modificacion-final",
  require("./src/routes/shared/modificacion_final"),
); // ← era maestro/ (no existe)

app.get("/", (req, res) =>
  res.json({ mensaje: "API RCA activa", version: "1.1" }),
);

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

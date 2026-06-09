// server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

// ── C-4: validar JWT_SECRET antes de arrancar ──────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === "") {
  console.error(
    "❌ FATAL: JWT_SECRET no está definido en .env.\n" +
      "   Genera uno con: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const db = require("./src/db");
const { verificarToken } = require("./src/middleware/auth");

// ── A-4: headers de seguridad HTTP ────────────────────────────────────────
app.use(
  helmet({
    // CSP básico: ajusta las directivas según tus CDNs reales
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://code.iconify.design",
          "https://cdn.jsdelivr.net",
          "'unsafe-inline'",
        ],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
  }),
);

// ── M-1: CORS — sin wildcard, lista explícita de orígenes ─────────────────
const origenesPermitidos = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [
      "http://localhost:3000",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
    ];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir peticiones sin origin (Postman, curl, mismo servidor)
      if (!origin || origenesPermitidos.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS rechazado para el origen: ${origin}`));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ── A-2: rate limiting en /login — máx. 5 intentos por minuto por IP ─────
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Demasiados intentos de inicio de sesión. Espera un minuto e intenta de nuevo.",
  },
  skipSuccessfulRequests: true,
});

const cambiarPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Demasiados intentos. Espera 15 minutos." },
});

// ── LOGIN ─────────────────────────────────────────────────────────────────
app.post("/login", loginLimiter, (req, res) => {
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
          // A-3: indicar si el usuario nunca ha cambiado su contraseña
          primer_acceso: userRow.primer_acceso === 1,
        });
      });
    },
  );
});

// ── CAMBIAR CONTRASEÑA (A-3) ──────────────────────────────────────────────
// Requiere token válido. Verifica la contraseña actual y actualiza.
app.post("/cambiar-password", cambiarPasswordLimiter, verificarToken, async (req, res) => {
  const { password_actual, password_nuevo } = req.body;
  const id_usuario = req.usuario.id_usuario;

  if (!password_actual || !password_nuevo) {
    return res
      .status(400)
      .json({ error: "Se requieren password_actual y password_nuevo" });
  }
  if (password_nuevo.length < 8) {
    return res
      .status(400)
      .json({ error: "La nueva contraseña debe tener al menos 8 caracteres" });
  }

  db.query(
    "SELECT pwd FROM usuario WHERE id_usuario = ?",
    [id_usuario],
    async (err, rows) => {
      if (err)
        return res.status(500).json({ error: "Error interno del servidor" });
      if (!rows.length)
        return res.status(404).json({ error: "Usuario no encontrado" });

      const valida = await bcrypt.compare(password_actual, rows[0].pwd);
      if (!valida)
        return res
          .status(401)
          .json({ error: "La contraseña actual es incorrecta" });

      const nuevoHash = await bcrypt.hash(password_nuevo, 10);
      db.query(
        "UPDATE usuario SET pwd = ?, primer_acceso = 0 WHERE id_usuario = ?",
        [nuevoHash, id_usuario],
        (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          res.json({
            success: true,
            mensaje: "Contraseña actualizada correctamente",
          });
        },
      );
    },
  );
});

// ── RUTAS ─────────────────────────────────────────────────────────────────

// ADMIN
app.use("/api/alumnos", require("./src/routes/admin/alumnos"));
app.use("/api/maestros", require("./src/routes/admin/maestros"));
app.use("/api/inscripciones", require("./src/routes/admin/inscripciones"));
app.use("/api/admin", require("./src/routes/admin/admin"));
app.use("/api/carreras", require("./src/routes/admin/carreras"));
app.use("/api/periodos", require("./src/routes/admin/periodos"));
app.use("/api/materias", require("./src/routes/admin/materias"));

// MAESTRO
app.use("/api/actividades", require("./src/routes/maestro/actividades"));
app.use("/api/calificaciones", require("./src/routes/maestro/calificaciones"));
app.use(
  "/api/config-evaluacion",
  require("./src/routes/maestro/config_evaluacion_backend"),
);
app.use(
  "/api/resultado-actividad",
  require("./src/routes/maestro/resultado_actividad"),
);
app.use("/api/bonus", require("./src/routes/maestro/bonus"));
app.use("/api/unidades", require("./src/routes/maestro/unidades"));

// SHARED
app.use("/api/grupos", require("./src/routes/shared/grupos"));
app.use("/api/reportes", require("./src/routes/shared/reportes"));
app.use(
  "/api/tipo-actividades",
  require("./src/routes/shared/tipo_actividades"),
);
app.use(
  "/api/materia-actividades",
  require("./src/routes/shared/materia_actividades"),
);
app.use(
  "/api/modificacion-final",
  require("./src/routes/shared/modificacion_final"),
);

app.get("/", (req, res) =>
  res.json({ mensaje: "API RCA activa", version: "1.2" }),
);

// ── NOTIFICACIONES (stub — retorna arreglo vacío para que el frontend no reciba 404) ──
app.get("/api/notificaciones", verificarToken, (req, res) => {
  res.json([]);
});

// ── INFO PÚBLICA (sin token) ──────────────────────────────────────────────
app.get("/api/info-publica", (req, res) => {
  db.query(
    `SELECT
       (SELECT COUNT(*) FROM alumno)  AS alumnos,
       (SELECT COUNT(*) FROM maestro) AS maestros,
       (SELECT COUNT(*) FROM grupo   WHERE estatus = 'Activo') AS grupos,
       (SELECT descripcion FROM periodo_escolar
        WHERE estatus IN ('Vigente','Activo','activo')
        ORDER BY fecha_inicio DESC LIMIT 1) AS periodo`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error" });
      res.json(rows[0] || {});
    },
  );
});

// Error handler global — captura excepciones no manejadas sin exponer detalles al cliente
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

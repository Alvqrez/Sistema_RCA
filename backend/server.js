const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar conexión a la base de datos
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

app.post("/login", (req, res) => {

    const { usuario, password, rol } = req.body;

    let sql;
    let values;

    if (rol === "alumno") {

        sql = "SELECT * FROM Alumno WHERE NumeroControl = ? AND password = ?";
        values = [usuario, password];

    } else if (rol === "maestro") {

        sql = "SELECT * FROM Maestro WHERE usuario = ? AND password = ?";
        values = [usuario, password];

    }

    db.query(sql, values, (err, result) => {

        if (err) {
            return res.json({ success: false });
        }

        if (result.length > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }

    });

});

app.use(cors());
app.use(express.json());

app.use("/api/alumnos", require("./src/routes/alumnos"));
app.use("/api/grupos", require("./src/routes/grupos"));
app.use("/api/calificaciones", require("./src/routes/calificaciones"));

app.get('/', (req, res) => {
  res.json({
    mensaje: "API RCA activa",
    version: "1.0"
  });
});

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto " + PORT);
});
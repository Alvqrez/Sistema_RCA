const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

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
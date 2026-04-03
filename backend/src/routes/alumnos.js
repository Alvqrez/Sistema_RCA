const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todos los alumnos
router.get("/", (req, res) => {

    const query = "SELECT * FROM Alumno";

    db.query(query, (err, results) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(results);

    });

});

// Registrar alumno
router.post("/", (req, res) => {

    const { nombre, apellido_paterno, apellido_materno, matricula, correo_institucional } = req.body;

    const query = `
        INSERT INTO Alumno 
        (nombre, apellido_paterno, apellido_materno, matricula, id_carrera, correo_institucional)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [nombre, apellido_paterno, apellido_materno, matricula, 1, correo_institucional], (err, result) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ success:false });
        }

        res.json({
            success:true,
            mensaje:"Alumno registrado"
        });

    });

});

// Eliminar alumno
router.delete("/:id", (req,res)=>{

    const id = req.params.id;

    const query = "DELETE FROM Alumno WHERE matricula = ?";

    db.query(query,[id],(err,result)=>{

        if(err){
            return res.status(500).json(err);
        }

        res.json({mensaje:"Alumno eliminado"});

    });

});

// Editar alumno
// router.put("/:id", (req,res)=>{

//     const id = req.params.id;

//     const { nombre, apellido_paterno, apellido_materno } = req.body;

//     const query = `
//         UPDATE Alumno
//         SET nombre=?, apellido_paterno=?, apellido_materno=?
//         WHERE id_alumno=?
//     `;

//     db.query(query,[nombre,apellido_paterno,apellido_materno,id],(err,result)=>{

//         if(err) return res.status(500).json(err);

//         res.json({success:true});

//     });

// });

module.exports = router;
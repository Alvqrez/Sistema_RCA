// src/routes/maestros.js
const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcrypt");
const db      = require("../db");
const { verificarToken, soloAdmin } = require("../middleware/auth");

router.get("/", verificarToken, (req, res) => {
    db.query("SELECT numero_empleado, nombre, apellido_paterno, apellido_materno, correo_institucional, departamento, tel_celular, estatus FROM maestro", (err, results) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        res.json(results);
    });
});

router.post("/", soloAdmin, async (req, res) => {

    const { numero_empleado, nombre, apellido_paterno, apellido_materno,
            curp, correo_institucional, correo_personal, tel_celular, tel_oficina,
            direccion, tipo_contrato, estatus, fecha_ingreso, grado_academico,
            especialidad, departamento, username, password } = req.body;

    if (!numero_empleado || !nombre || !apellido_paterno || !correo_institucional || !username || !password) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    try {
        const hash = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO maestro (numero_empleado, nombre, apellido_paterno, apellido_materno,
                curp, correo_institucional, correo_personal, tel_celular, tel_oficina,
                direccion, tipo_contrato, estatus, fecha_ingreso, grado_academico, especialidad, departamento)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(query, [numero_empleado, nombre, apellido_paterno, apellido_materno ?? null,
            curp ?? null, correo_institucional, correo_personal ?? null, tel_celular ?? null,
            tel_oficina ?? null, direccion ?? null, tipo_contrato ?? null, estatus ?? "Activo",
            fecha_ingreso ?? null, grado_academico ?? null, especialidad ?? null, departamento ?? null],
            (err) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "El número de empleado ya existe" });
                    return res.status(500).json({ error: "Error interno del servidor" });
                }

                db.query(
                    `INSERT INTO usuario (username, pwd, rol, id_referencia) VALUES (?, ?, 'maestro', ?)`,
                    [username, hash, numero_empleado],
                    (err2) => {
                        if (err2) {
                            if (err2.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "El username ya existe" });
                            return res.status(500).json({ error: "Error interno del servidor" });
                        }
                        res.status(201).json({ success: true, mensaje: "Maestro registrado" });
                    }
                );
            }
        );

    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor" });
    }

});

router.delete("/:id", soloAdmin, (req, res) => {
    db.query("DELETE FROM maestro WHERE numero_empleado = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Maestro no encontrado" });
        res.json({ success: true, mensaje: "Maestro eliminado" });
    });
});

module.exports = router;
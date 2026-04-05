// backend/seed.js — versión completa y corregida
const bcrypt = require("bcrypt");
const db     = require("./src/db");

async function seed() {

    try {

        // ── Datos base: carrera ───────────────────────────────────────────────
        await query(`
            INSERT IGNORE INTO carrera (id_carrera, nombre_carrera)
            VALUES ('ISC', 'Ingeniería en Sistemas Computacionales')
        `);

        // ── 1. Administrador ──────────────────────────────────────────────────
        await query(`
            INSERT IGNORE INTO administrador (nombre, apellido_paterno, correo_institucional)
            VALUES ('Admin', 'Sistema', 'admin@itver.edu.mx')
        `);

        const admins   = await query("SELECT id_admin FROM administrador WHERE correo_institucional = 'admin@itver.edu.mx'");
        const id_admin = admins[0].id_admin;
        const hashAdmin = await bcrypt.hash("admin123", 10);

        await query(
            `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia) VALUES (?, ?, 'administrador', ?)`,
            [hashAdmin, "admin", id_admin]   // ← ojo: el orden era incorrecto antes
        );

        // Corrección: el orden correcto de parámetros
        await query(
            `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia) VALUES (?, ?, 'administrador', ?)`,
            ["admin", hashAdmin, id_admin]
        );

        console.log("✓ Admin      →  admin / admin123");

        // ── 2. Maestro ────────────────────────────────────────────────────────
        await query(`
            INSERT IGNORE INTO maestro (numero_empleado, nombre, apellido_paterno, apellido_materno, curp, correo_institucional)
            VALUES ('EMP001', 'Juan', 'Pérez', 'López', 'PELJ800101HVZRPN01', 'profe@itver.edu.mx')
        `);

        const hashMaestro = await bcrypt.hash("maestro123", 10);

        // ← ESTE INSERT FALTABA
        await query(
            `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia) VALUES (?, ?, 'maestro', ?)`,
            ["profe01", hashMaestro, "EMP001"]
        );

        console.log("✓ Maestro    →  profe01 / maestro123");

        // ── 3. Alumno ─────────────────────────────────────────────────────────
        await query(`
            INSERT IGNORE INTO alumno (matricula, id_carrera, nombre, apellido_paterno, correo_institucional)
            VALUES ('20231001', 'ISC', 'Carlos', 'Ramírez', 'alumno@itver.edu.mx')
        `);

        const hashAlumno = await bcrypt.hash("alumno123", 10);

        // ← ESTE INSERT TAMBIÉN FALTABA
        await query(
            `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia) VALUES (?, ?, 'alumno', ?)`,
            ["20231001", hashAlumno, "20231001"]
        );

        console.log("✓ Alumno     →  20231001 / alumno123");
        console.log("\n✓ Seed completado.");

    } catch (err) {
        console.error("Error en seed:", err.message);
    } finally {
        db.end();
    }

}

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

seed();
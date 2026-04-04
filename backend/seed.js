// backend/seed.js
const bcrypt = require("bcrypt");
const db     = require("./src/db");

async function seed() {

    try {

        // ── 1. Administrador ──────────────────────────────────────────────────
        const hashAdmin = await bcrypt.hash("admin123", 10);

        await query(
            `INSERT IGNORE INTO administrador (nombre, apellido_paterno, correo_institucional)
             VALUES ('Admin', 'Sistema', 'admin@itver.edu.mx')`
        );

        const admins = await query("SELECT id_admin FROM administrador WHERE correo_institucional = 'admin@itver.edu.mx'");
        const id_admin = admins[0].id_admin;

        await query(
            `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia)
             VALUES ('admin', ?, 'administrador', ?)`,
            [hashAdmin, id_admin]
        );

        console.log("✓ Administrador creado  →  admin / admin123");

        // ── 2. Maestro ────────────────────────────────────────────────────────
        const hashMaestro = await bcrypt.hash("maestro123", 10);

        // ── Maestro ─────────────────────
await query(`
INSERT IGNORE INTO maestro
(numero_empleado,nombre,apellido_paterno,apellido_materno,curp,correo_institucional)
VALUES
('EMP001','Juan','Pérez','Lopez','CURP123456789012','profe@itver.edu.mx')
`);

        console.log("✓ Maestro creado        →  profe01 / maestro123");

        // ── 3. Alumno ─────────────────────────────────────────────────────────
        const hashAlumno = await bcrypt.hash("alumno123", 10);

        // ── Alumno ─────────────────────
await query(`
INSERT IGNORE INTO alumno
(matricula,id_carrera,nombre,apellido_paterno,correo_institucional)
VALUES
('20231001','ISC','Carlos','Ramirez','alumno@itver.edu.mx')
`);

        console.log("✓ Alumno creado         →  20231001 / alumno123");

        console.log("\nSeed completado.");

    } catch (err) {
        console.error("Error en seed:", err);
    } finally {
        db.end();
    }

}

// Promisify db.query para poder usar async/await
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

seed();
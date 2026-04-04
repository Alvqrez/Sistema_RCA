// ESTO ES DE PRUEBA, NO EJECUTAR POR FAVOR 
const bcrypt = require("bcrypt");
const db = require("./src/db");

async function crearUsuarios() {
    console.log("Iniciando hashing de contraseñas...");
    const hashMaestro = await bcrypt.hash("maestro123", 10);
    const hashAlumno  = await bcrypt.hash("alumno123", 10);

    console.log("Intentando insertar usuarios en la base de datos...");

    // --- CONFIGURACIÓN PARA EL MAESTRO ---
    const queryMaestro = `
        INSERT INTO Maestro (
            numero_empleado, usuario, password, nombre, 
            apellido_paterno, apellido_materno, correo_institucional, curp
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
            usuario = VALUES(usuario), 
            password = VALUES(password), 
            correo_institucional = VALUES(correo_institucional)`;

    const valsMaestro = [
        "EMP001", "profe01", hashMaestro, "Juan", 
        "Perez", "Garcia", "profe01@caferaices.edu.mx", "CURP_M_001"
    ];

    db.query(queryMaestro, valsMaestro, (err) => {
        if (err) console.error("❌ Error en Maestro:", err.message);
        else console.log("✅ Maestro guardado/actualizado.");
    });

    // --- CONFIGURACIÓN PARA EL ALUMNO ---
    const queryAlumno = `
        INSERT INTO Alumno (
            matricula, usuario, password, nombre, 
            apellido_paterno, apellido_materno, correo_institucional, curp, id_carrera
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
            usuario = VALUES(usuario), 
            password = VALUES(password), 
            correo_institucional = VALUES(correo_institucional)`;

    const valsAlumno = [
        "20231001", "alumno01", hashAlumno, "Carlos", 
        "Lopez", "Rodriguez", "alumno01@caferaices.edu.mx", "CURP_A_001", 1
    ];

    db.query(queryAlumno, valsAlumno, (err) => {
        if (err) {
            console.error("❌ Error en Alumno:", err.message);
        } else {
            console.log("✅ Alumno guardado/actualizado.");
        }
        
        db.end(() => console.log("--- Proceso terminado ---"));
    });
}

crearUsuarios();
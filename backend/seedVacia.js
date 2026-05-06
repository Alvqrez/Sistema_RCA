// backend/seedVacia.js
// Seed mínimo: solo crea un administrador listo para la demo.
// Uso: node seedVacia.js
//
// Credenciales creadas:
//   Usuario:    admin
//   Contraseña: admin123

const bcrypt = require("bcrypt");
const db = require("./src/db");

function q(sql, params = []) {
  return new Promise((res, rej) =>
    db.query(sql, params, (err, r) => (err ? rej(err) : res(r))),
  );
}

async function seedVacia() {
  try {
    console.log("Iniciando seedVacia...\n");

    // ── ADMINISTRADOR ──────────────────────────────────────────────────────
    const rfcAdmin = "ADMN800101ITV";

    await q(
      `INSERT IGNORE INTO administrador
         (rfc, nombre, apellido_paterno, apellido_materno,
          correo_institucional, correo_personal, tel_celular, activo)
       VALUES (?, 'Admin', 'Sistema', 'RCA',
               'admin@itver.edu.mx', 'admin@gmail.com', '2290000000', 1)`,
      [rfcAdmin],
    );

    await q(
      `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia)
       VALUES (?, ?, 'administrador', ?)`,
      ["admin", await bcrypt.hash("admin123", 10), rfcAdmin],
    );

    console.log("✓ Administrador creado:");
    console.log("    Usuario:    admin");
    console.log("    Contraseña: admin123");
    console.log("\n¡seedVacia completado! El sistema está listo para la demo.");
    process.exit(0);
  } catch (err) {
    console.error("Error en seedVacia:", err);
    process.exit(1);
  }
}

seedVacia();

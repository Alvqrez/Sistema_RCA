// backend/semillaMaestro.js
// Simula lo que el Admin importa desde la UI.
// El maestro NO tiene nada configurado — tipo_actividad, actividad,
// grupo_unidad y calificaciones están vacíos para que el maestro
// haga todo desde la aplicación.
//
// Uso: node semillaMaestro.js
//
// ─── CREDENCIALES ────────────────────────────────────────────────────────────
//  Admin    ADMN800101ITV  / admin123
//  Maestro  PELJ800101HVZ  / maestro123   (Juan Pérez)
//  Maestro  GASM850215MVZ  / maestro456   (María García)
//  Alumnos  26000001..26000010 / alumno001..alumno010
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt = require("bcrypt");
const db = require("./src/db");

function q(sql, params = []) {
  return new Promise((res, rej) =>
    db.query(sql, params, (err, r) => (err ? rej(err) : res(r))),
  );
}

async function semillaMaestro() {
  try {
    console.log("Iniciando semillaMaestro...\n");

    // ══════════════════════════════════════════════════════════════════════
    // 1. PERIODOS
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO periodo_escolar
               (id_periodo, descripcion, fecha_inicio, fecha_fin, estatus)
             VALUES
               (1, 'Enero-Junio', '2025-01-13', '2025-06-20', 'Concluido'),
               (4, 'Enero-Junio', '2026-01-12', '2026-06-19', 'Vigente')`);
    console.log("✓ Periodos       → 2 (EJ2025 Concluido, EJ2026 Vigente)");

    // ══════════════════════════════════════════════════════════════════════
    // 2. CARRERA
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO carrera (id_carrera, nombre_carrera, siglas)
             VALUES ('ISC', 'Ingeniería en Sistemas Computacionales', 'ISC')`);
    console.log("✓ Carreras       → ISC");

    // ══════════════════════════════════════════════════════════════════════
    // 3. ADMINISTRADOR
    // ══════════════════════════════════════════════════════════════════════
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
      [rfcAdmin, await bcrypt.hash("admin123", 10), rfcAdmin],
    );
    console.log(`✓ Administrador  → ${rfcAdmin} / admin123`);

    // ══════════════════════════════════════════════════════════════════════
    // 4. MAESTROS
    // ══════════════════════════════════════════════════════════════════════
    const maestros = [
      {
        rfc: "PELJ800101HVZ", nom: "Juan",  ap: "Pérez",  am: "López",
        curp: "PELJ800101HVZRPN01", fn: "1980-01-01",
        ci: "juan.pl@veracruz.tecnm.mx", cp: "juan.perez@gmail.com",
        cel: "2291100001", pwd: "maestro123",
      },
      {
        rfc: "GASM850215MVZ", nom: "María", ap: "García", am: "Soto",
        curp: "GASM850215MVZRTN02", fn: "1985-02-15",
        ci: "maria.gs@veracruz.tecnm.mx", cp: "maria.garcia@gmail.com",
        cel: "2291100002", pwd: "maestro456",
      },
    ];
    for (const m of maestros) {
      await q(
        `INSERT IGNORE INTO maestro
           (rfc, nombre, apellido_paterno, apellido_materno, curp,
            fecha_nacimiento, correo_institucional, correo_personal, tel_celular)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.rfc, m.nom, m.ap, m.am, m.curp, m.fn, m.ci, m.cp, m.cel],
      );
      await q(
        `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia)
         VALUES (?, ?, 'maestro', ?)`,
        [m.rfc, await bcrypt.hash(m.pwd, 10), m.rfc],
      );
    }
    console.log("✓ Maestros       → 2 (Juan Pérez, María García)");

    // ══════════════════════════════════════════════════════════════════════
    // 5. MATERIAS
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO materia (clave_materia, nombre_materia, no_unidades) VALUES
               ('FBD001', 'Fundamentos de Bases de Datos',    3),
               ('POO001', 'Programación Orientada a Objetos', 3),
               ('ADS001', 'Análisis y Diseño de Sistemas',    2),
               ('RED001', 'Redes de Computadoras',            4)`);
    console.log("✓ Materias       → 4 (FBD001, POO001, ADS001, RED001)");

    // ══════════════════════════════════════════════════════════════════════
    // 6. RETÍCULA
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO reticula (clave_materia, id_carrera, semestre) VALUES
               ('FBD001', 'ISC', 4),
               ('POO001', 'ISC', 3),
               ('ADS001', 'ISC', 5),
               ('RED001', 'ISC', 6)`);
    console.log("✓ Retícula       → 4 materias en ISC");

    // ══════════════════════════════════════════════════════════════════════
    // 7. UNIDADES
    // ══════════════════════════════════════════════════════════════════════
    const unidades = [
      // FBD001 — 3 unidades
      [1,  "FBD001", "Modelo Entidad-Relación"],
      [2,  "FBD001", "Modelo Relacional"],
      [3,  "FBD001", "SQL y Consultas"],
      // POO001 — 3 unidades
      [4,  "POO001", "Clases y Objetos"],
      [5,  "POO001", "Herencia y Polimorfismo"],
      [6,  "POO001", "Patrones de Diseño"],
      // ADS001 — 2 unidades
      [7,  "ADS001", "Análisis de Requerimientos"],
      [8,  "ADS001", "Diseño de Sistemas"],
      // RED001 — 4 unidades
      [9,  "RED001", "Modelos OSI y TCP/IP"],
      [10, "RED001", "Capa de Red y Enrutamiento"],
      [11, "RED001", "Capa de Transporte"],
      [12, "RED001", "Seguridad en Redes"],
    ];
    for (const [id, clave, nombre] of unidades)
      await q(
        `INSERT IGNORE INTO unidad (id_unidad, clave_materia, nombre_unidad) VALUES (?, ?, ?)`,
        [id, clave, nombre],
      );
    console.log(`✓ Unidades       → ${unidades.length} (FBD×3, POO×3, ADS×2, RED×4)`);

    // ══════════════════════════════════════════════════════════════════════
    // 8. GRUPOS
    //    Juan Pérez   → G1:FBD, G2:FBD, G3:ADS, G4:RED
    //    María García → G5:POO
    // ══════════════════════════════════════════════════════════════════════
    const grupos = [
      [1, "FBD001", "PELJ800101HVZ", 4, 35],
      [2, "FBD001", "PELJ800101HVZ", 4, 30],
      [3, "ADS001", "PELJ800101HVZ", 4, 35],
      [4, "RED001", "PELJ800101HVZ", 4, 30],
      [5, "POO001", "GASM850215MVZ", 4, 35],
    ];
    for (const [id, mat, rfc, per, lim] of grupos)
      await q(
        `INSERT IGNORE INTO grupo
           (id_grupo, clave_materia, rfc, id_periodo, limite_alumnos, estatus)
         VALUES (?, ?, ?, ?, ?, 'Activo')`,
        [id, mat, rfc, per, lim],
      );
    console.log("✓ Grupos         → 5 (G1-G4: Juan Pérez, G5: María García)");

    // ══════════════════════════════════════════════════════════════════════
    // 9. ALUMNOS
    // ══════════════════════════════════════════════════════════════════════
    const alumnos = [
      { nc:"26000001", nom:"Carlos",    ap:"Ramírez",  am:"Vega",     curp:"RAVC030512HVZMRL01", fn:"2003-05-12", ci:"L26000001@veracruz.tecnm.mx", cp:"c.ramirez@gmail.com",   cel:"2291201001", pwd:"alumno001" },
      { nc:"26000002", nom:"Diana",     ap:"López",    am:"Cruz",     curp:"LOCD040820MVZPRA02", fn:"2004-08-20", ci:"L26000002@veracruz.tecnm.mx", cp:"diana.lopez@gmail.com", cel:"2291201002", pwd:"alumno002" },
      { nc:"26000003", nom:"Ernesto",   ap:"Martínez", am:"Ruiz",     curp:"MARE030115HVZRNA03", fn:"2003-01-15", ci:"L26000003@veracruz.tecnm.mx", cp:"e.mtz@gmail.com",       cel:"2291201003", pwd:"alumno003" },
      { nc:"26000004", nom:"Fernanda",  ap:"Torres",   am:"Díaz",     curp:"TODF040930MVZRZA04", fn:"2004-09-30", ci:"L26000004@veracruz.tecnm.mx", cp:"fer.torres@gmail.com",  cel:"2291201004", pwd:"alumno004" },
      { nc:"26000005", nom:"Rodrigo",   ap:"Sánchez",  am:"Luna",     curp:"SALR031201HVZNCH05", fn:"2003-12-01", ci:"L26000005@veracruz.tecnm.mx", cp:"r.sanchez@gmail.com",   cel:"2291201005", pwd:"alumno005" },
      { nc:"26000006", nom:"Alejandra", ap:"Morales",  am:"Jiménez",  curp:"MOJA040315MVZRLA06", fn:"2004-03-15", ci:"L26000006@veracruz.tecnm.mx", cp:"ale.morales@gmail.com", cel:"2291201006", pwd:"alumno006" },
      { nc:"26000007", nom:"Brandon",   ap:"Castillo", am:"Reyes",    curp:"CARB030628HVZRST07", fn:"2003-06-28", ci:"L26000007@veracruz.tecnm.mx", cp:"brandon.c@gmail.com",   cel:"2291201007", pwd:"alumno007" },
      { nc:"26000008", nom:"Itzel",     ap:"Flores",   am:"Espinoza", curp:"FEEI040507MVZRLA08", fn:"2004-05-07", ci:"L26000008@veracruz.tecnm.mx", cp:"itzel.f@gmail.com",     cel:"2291201008", pwd:"alumno008" },
      { nc:"26000009", nom:"Sofía",     ap:"Mendoza",  am:"Ríos",     curp:"MERS031205MVZRFA09", fn:"2003-12-05", ci:"L26000009@veracruz.tecnm.mx", cp:"sofia.mnd@gmail.com",   cel:"2291201009", pwd:"alumno009" },
      { nc:"26000010", nom:"Adrián",    ap:"Guzmán",   am:"Flores",   curp:"GUFA030818HVZRMN10", fn:"2003-08-18", ci:"L26000010@veracruz.tecnm.mx", cp:"adrian.gz@gmail.com",   cel:"2291201010", pwd:"alumno010" },
    ];
    for (const a of alumnos) {
      await q(
        `INSERT IGNORE INTO alumno
           (no_control, id_carrera, nombre, apellido_paterno, apellido_materno,
            curp, fecha_nacimiento, correo_institucional, correo_personal, tel_celular)
         VALUES (?, 'ISC', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.nc, a.nom, a.ap, a.am, a.curp, a.fn, a.ci, a.cp, a.cel],
      );
      await q(
        `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia)
         VALUES (?, ?, 'alumno', ?)`,
        [a.nc, await bcrypt.hash(a.pwd, 10), a.nc],
      );
    }
    console.log("✓ Alumnos        → 10 (26000001–26000010 / alumno001..alumno010)");

    // ══════════════════════════════════════════════════════════════════════
    // 10. INSCRIPCIONES
    // ══════════════════════════════════════════════════════════════════════
    const inscripciones = [
      // G1 FBD (Juan) — 10 alumnos
      ["26000001",1],["26000002",1],["26000003",1],["26000004",1],["26000005",1],
      ["26000006",1],["26000007",1],["26000008",1],["26000009",1],["26000010",1],
      // G2 FBD (Juan) — 5 alumnos
      ["26000001",2],["26000002",2],["26000003",2],["26000004",2],["26000005",2],
      // G3 ADS (Juan) — 6 alumnos
      ["26000001",3],["26000002",3],["26000003",3],["26000004",3],["26000005",3],["26000006",3],
      // G4 RED (Juan) — 5 alumnos
      ["26000006",4],["26000007",4],["26000008",4],["26000009",4],["26000010",4],
      // G5 POO (María) — 8 alumnos
      ["26000001",5],["26000002",5],["26000003",5],["26000004",5],
      ["26000005",5],["26000006",5],["26000007",5],["26000008",5],
    ];
    for (const [nc, ig] of inscripciones)
      await q(
        `INSERT IGNORE INTO inscripcion
           (no_control, id_grupo, fecha_inscripcion, estatus, tipo_curso)
         VALUES (?, ?, '2026-01-13', 'Cursando', 'Ordinario')`,
        [nc, ig],
      );
    console.log("✓ Inscripciones  → G1×10, G2×5, G3×6, G4×5, G5×8");

    // ══════════════════════════════════════════════════════════════════════
    // RESUMEN
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n✅ semillaMaestro completado.");
    console.log("─────────────────────────────────────────────────────────────");
    console.log("  CREDENCIALES:");
    console.log(`  ${rfcAdmin}  / admin123`);
    console.log("  PELJ800101HVZ  / maestro123   (Juan Pérez)");
    console.log("  GASM850215MVZ  / maestro456   (María García)");
    console.log("  26000001..26000010 / alumno001..alumno010");
    console.log("─────────────────────────────────────────────────────────────");
    console.log("  PENDIENTE POR EL MAESTRO (desde la UI):");
    console.log("  · Admin: crear tipos de actividad en catálogo");
    console.log("  · Juan:  configurar actividades en G1, G2, G3, G4");
    console.log("  · María: configurar actividades en G5");
    console.log("  · Todos: capturar calificaciones una vez configurados");
    console.log("─────────────────────────────────────────────────────────────");

  } catch (err) {
    console.error("❌ Error en semillaMaestro:", err.message, err);
  } finally {
    db.end();
  }
}

semillaMaestro();

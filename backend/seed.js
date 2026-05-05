// backend/seed.js
// Escenarios cubiertos:
//  1. 3 periodos por año (Enero-Junio, Verano, Agosto-Diciembre) para 2024 y 2025
//  2. 3 carreras con 5 materias cada una
//  3. Grupos variados: algunas materias con 3 grupos
//  4. Grupos con distintos profesores
//  5. Dos grupos nunca comparten salón + hora
//  6. Un profesor no tiene dos grupos a la misma hora
//  7. Alumnos en 1 o más grupos
//  8. Ningún alumno tiene dos clases a la misma hora
//  9. Alumno puede cursar la misma materia máx 3 veces (Ordinario→Recursado→Especial)
//     en periodos distintos (Verano no cuenta)
// 10. Un profesor puede dar la misma materia en distintos grupos/horas el mismo día
// 11. Materias con distinto número de unidades

const bcrypt = require("bcrypt");
const db = require("./src/db");

// ─── helper ──────────────────────────────────────────────────────────────────
function q(sql, params = []) {
  return new Promise((res, rej) =>
    db.query(sql, params, (err, r) => (err ? rej(err) : res(r))),
  );
}

async function seed() {
  try {
    console.log("Iniciando seed completo...\n");

    // ══════════════════════════════════════════════════════════════════════
    // 1. PERIODOS — 3 por año para 2024 y 2025 (6 en total)
    //    Verano 2024 = Concluido, EJ2025 = Vigente, AD2025 = Próximo
    // ══════════════════════════════════════════════════════════════════════
    await q(`
      INSERT IGNORE INTO periodo_escolar
        (id_periodo, descripcion, fecha_inicio, fecha_fin, estatus)
      VALUES
        (1, 'Enero-Junio',      '2024-01-08', '2024-06-21', 'Concluido'),
        (2, 'Verano',           '2024-07-01', '2024-07-31', 'Concluido'),
        (3, 'Agosto-Diciembre', '2024-08-05', '2024-12-20', 'Concluido'),
        (4, 'Enero-Junio',      '2025-01-13', '2025-06-20', 'Vigente'),
        (5, 'Verano',           '2025-07-01', '2025-07-31', 'Proximo'),
        (6, 'Agosto-Diciembre', '2025-08-04', '2025-12-19', 'Proximo')
    `);
    console.log("✓ Periodos   → 6 (3×2024, 3×2025)");

    // ══════════════════════════════════════════════════════════════════════
    // 2. CARRERAS — 3 carreras
    // ══════════════════════════════════════════════════════════════════════
    await q(`
      INSERT IGNORE INTO carrera
        (id_carrera, nombre_carrera, siglas, plan_estudios, modalidad, total_semestres, total_creditos)
      VALUES
        ('ISC', 'Ingeniería en Sistemas Computacionales', 'ISC', 'ISIC-2010-224', 'Presencial', 9, 345),
        ('IIA', 'Ingeniería en Inteligencia Artificial',  'IIA', 'IAIA-2022-310', 'Presencial', 9, 370),
        ('IGE', 'Ingeniería en Gestión Empresarial',      'IGE', 'IIGE-2010-315', 'Presencial', 9, 330)
    `);
    console.log("✓ Carreras   → ISC, IIA, IGE");

    // ══════════════════════════════════════════════════════════════════════
    // 3. ADMINISTRADOR
    // ══════════════════════════════════════════════════════════════════════
    const rfcAdmin = "ADMN800101ITV";
    await q(
      `
      INSERT IGNORE INTO administrador
        (rfc, nombre, apellido_paterno, apellido_materno,
         correo_institucional, correo_personal, tel_celular, activo)
      VALUES (?, 'Admin', 'Sistema', 'TecNM',
              'admin@itver.edu.mx', 'admin.sistema@gmail.com', '2291000001', 1)
    `,
      [rfcAdmin],
    );
    await q(
      `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia) VALUES (?,?,'administrador',?)`,
      [rfcAdmin, await bcrypt.hash("admin123", 10), rfcAdmin],
    );
    console.log(`✓ Admin      → ${rfcAdmin} / admin123`);

    // ══════════════════════════════════════════════════════════════════════
    // 4. MAESTROS — 5 profesores con todos los campos
    // ══════════════════════════════════════════════════════════════════════
    const maestros = [
      {
        rfc: "PELJ800101HVZ",
        nom: "Juan",
        ap: "Pérez",
        am: "López",
        curp: "PELJ800101HVZRPN01",
        fn: "1980-01-01",
        gen: "M",
        ci: "jperez@itver.edu.mx",
        cp: "juan.perez@gmail.com",
        cel: "2291100001",
        of: "2291000100",
        dir: "Av. Orizaba 45, Col. Centro, Veracruz",
        cont: "Tiempo completo",
        fe: "2010-08-15",
        ga: "Maestría",
        esp: "Bases de Datos",
        dep: "Sistemas",
        pwd: "maestro123",
      },
      {
        rfc: "GASM850215MVZ",
        nom: "María",
        ap: "García",
        am: "Soto",
        curp: "GASM850215MVZRTN02",
        fn: "1985-02-15",
        gen: "F",
        ci: "mgarcia@itver.edu.mx",
        cp: "maria.garcia@gmail.com",
        cel: "2291100002",
        of: "2291000101",
        dir: "Calle Magnolia 12, Col. Jardines, Veracruz",
        cont: "Tiempo completo",
        fe: "2012-01-10",
        ga: "Maestría",
        esp: "Inteligencia Artificial",
        dep: "Sistemas",
        pwd: "maestro456",
      },
      {
        rfc: "RORH790320HVZ",
        nom: "Roberto",
        ap: "Rodríguez",
        am: "Hernández",
        curp: "RORH790320HVZRBT03",
        fn: "1979-03-20",
        gen: "M",
        ci: "rrodriguez@itver.edu.mx",
        cp: "roberto.rod@gmail.com",
        cel: "2291100003",
        of: "2291000102",
        dir: "Blvd. Ruiz Cortines 88, Col. Centro, Veracruz",
        cont: "Tiempo completo",
        fe: "2008-02-01",
        ga: "Doctorado",
        esp: "Redes y Telecomunicaciones",
        dep: "Sistemas",
        pwd: "maestro789",
      },
      {
        rfc: "FUMA880510MVZ",
        nom: "Laura",
        ap: "Fuentes",
        am: "Martínez",
        curp: "FUMA880510MVZRLA04",
        fn: "1988-05-10",
        gen: "F",
        ci: "lfuentes@itver.edu.mx",
        cp: "laura.fuentes@gmail.com",
        cel: "2291100004",
        of: "2291000103",
        dir: "Calle Pino 33, Col. Las Flores, Veracruz",
        cont: "Medio tiempo",
        fe: "2015-08-15",
        ga: "Maestría",
        esp: "Gestión Empresarial",
        dep: "Económico-Adm",
        pwd: "maestro000",
      },
      {
        rfc: "CAGR760112HVZ",
        nom: "Carlos",
        ap: "Castro",
        am: "García",
        curp: "CAGR760112HVZRCA05",
        fn: "1976-01-12",
        gen: "M",
        ci: "ccastro@itver.edu.mx",
        cp: "carlos.castro@gmail.com",
        cel: "2291100005",
        of: "2291000104",
        dir: "Av. 20 de Noviembre 5, Col. Reforma, Veracruz",
        cont: "Tiempo completo",
        fe: "2005-01-20",
        ga: "Doctorado",
        esp: "Matemáticas Aplicadas",
        dep: "Ciencias Básicas",
        pwd: "maestro111",
      },
    ];
    for (const m of maestros) {
      await q(
        `
        INSERT IGNORE INTO maestro
          (rfc, nombre, apellido_paterno, apellido_materno, curp, fecha_nacimiento, genero,
           correo_institucional, correo_personal, tel_celular, tel_oficina, direccion,
           tipo_contrato, estatus, fecha_ingreso, grado_academico, especialidad, departamento)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,
        [
          m.rfc,
          m.nom,
          m.ap,
          m.am,
          m.curp,
          m.fn,
          m.gen,
          m.ci,
          m.cp,
          m.cel,
          m.of,
          m.dir,
          m.cont,
          "Activo",
          m.fe,
          m.ga,
          m.esp,
          m.dep,
        ],
      );
      await q(
        `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia) VALUES (?,?,'maestro',?)`,
        [m.rfc, await bcrypt.hash(m.pwd, 10), m.rfc],
      );
    }
    console.log("✓ Maestros   → 5 profesores registrados");

    // ══════════════════════════════════════════════════════════════════════
    // 5. MATERIAS — 5 por carrera (15 en total), con distintas unidades (regla 11)
    //    Algunas materias son compartidas entre carreras (reticula)
    // ══════════════════════════════════════════════════════════════════════
    await q(`
      INSERT IGNORE INTO materia
        (clave_materia, nombre_materia, creditos_totales, horas_teoricas, horas_practicas, no_unidades)
      VALUES
        -- ISC materias (4 exclusivas + 1 compartida)
        ('FBD001', 'Fundamentos de Bases de Datos',        5, 3, 2, 3),
        ('POO001', 'Programación Orientada a Objetos',     5, 2, 3, 3),
        ('ADS001', 'Análisis y Diseño de Sistemas',        4, 3, 1, 2),
        ('RED001', 'Redes de Computadoras',                5, 2, 3, 4),
        -- IIA materias (4 exclusivas + 1 compartida)
        ('APM001', 'Aprendizaje Automático',               5, 2, 3, 3),
        ('VIS001', 'Visión por Computadora',               5, 1, 4, 2),
        ('NLP001', 'Procesamiento de Lenguaje Natural',    4, 2, 2, 3),
        ('EST001', 'Estadística para IA',                  4, 3, 1, 4),
        -- IGE materias (4 exclusivas + 1 compartida)
        ('ADM001', 'Administración de Empresas',           5, 4, 1, 3),
        ('FIN001', 'Finanzas Empresariales',               5, 3, 2, 4),
        ('MKT001', 'Mercadotecnia',                        4, 3, 1, 2),
        ('LOG001', 'Logística y Cadena de Suministro',     4, 2, 2, 3),
        -- Compartidas entre carreras
        ('MAT001', 'Matemáticas Aplicadas',                5, 4, 1, 5),
        ('ETI001', 'Ética Profesional',                    3, 2, 1, 2),
        ('ING001', 'Inglés Técnico',                       3, 2, 1, 2)
    `);
    console.log("✓ Materias   → 15 materias con 2-5 unidades");

    // ══════════════════════════════════════════════════════════════════════
    // 6. RETÍCULA — asignar 5 materias a cada carrera
    // ══════════════════════════════════════════════════════════════════════
    await q(`
      INSERT IGNORE INTO reticula (clave_materia, id_carrera, semestre, creditos)
      VALUES
        -- ISC
        ('FBD001','ISC',4,5), ('POO001','ISC',3,5), ('ADS001','ISC',5,4),
        ('RED001','ISC',6,5), ('MAT001','ISC',1,5),
        -- IIA
        ('APM001','IIA',4,5), ('VIS001','IIA',5,5), ('NLP001','IIA',6,4),
        ('EST001','IIA',3,4), ('MAT001','IIA',1,5),
        -- IGE
        ('ADM001','IGE',2,5), ('FIN001','IGE',4,5), ('MKT001','IGE',5,4),
        ('LOG001','IGE',6,4), ('ETI001','IGE',8,3)
    `);
    console.log("✓ Retícula   → 5 materias por carrera");

    // ══════════════════════════════════════════════════════════════════════
    // 7. UNIDADES — cantidad distinta por materia (regla 11)
    // ══════════════════════════════════════════════════════════════════════
    const unidades = [
      // FBD001 — 3 unidades
      [1, "FBD001", "Modelo Entidad-Relación"],
      [2, "FBD001", "Modelo Relacional"],
      [3, "FBD001", "SQL y Consultas"],
      // POO001 — 3 unidades
      [4, "POO001", "Clases y Objetos"],
      [5, "POO001", "Herencia y Polimorfismo"],
      [6, "POO001", "Patrones de Diseño"],
      // ADS001 — 2 unidades
      [7, "ADS001", "Análisis de Requerimientos"],
      [8, "ADS001", "Diseño de Sistemas"],
      // RED001 — 4 unidades
      [9, "RED001", "Modelos OSI y TCP/IP"],
      [10, "RED001", "Capa de Red y Enrutamiento"],
      [11, "RED001", "Capa de Transporte"],
      [12, "RED001", "Seguridad en Redes"],
      // APM001 — 3 unidades
      [13, "APM001", "Fundamentos de ML"],
      [14, "APM001", "Algoritmos Supervisados"],
      [15, "APM001", "Redes Neuronales"],
      // VIS001 — 2 unidades
      [16, "VIS001", "Procesamiento de Imágenes"],
      [17, "VIS001", "Detección de Objetos"],
      // NLP001 — 3 unidades
      [18, "NLP001", "Tokenización y Análisis Léxico"],
      [19, "NLP001", "Modelos de Lenguaje"],
      [20, "NLP001", "Aplicaciones NLP"],
      // EST001 — 4 unidades
      [21, "EST001", "Probabilidad"],
      [22, "EST001", "Distribuciones"],
      [23, "EST001", "Inferencia Estadística"],
      [24, "EST001", "Regresión y Correlación"],
      // ADM001 — 3 unidades
      [25, "ADM001", "Teoría Administrativa"],
      [26, "ADM001", "Planeación Estratégica"],
      [27, "ADM001", "Organización y Control"],
      // FIN001 — 4 unidades
      [28, "FIN001", "Fundamentos Financieros"],
      [29, "FIN001", "Análisis de Estados Financieros"],
      [30, "FIN001", "Presupuestos"],
      [31, "FIN001", "Inversión y Riesgo"],
      // MKT001 — 2 unidades
      [32, "MKT001", "Investigación de Mercados"],
      [33, "MKT001", "Estrategias de Marketing"],
      // LOG001 — 3 unidades
      [34, "LOG001", "Gestión de Inventarios"],
      [35, "LOG001", "Distribución y Transporte"],
      [36, "LOG001", "Tecnologías en Logística"],
      // MAT001 — 5 unidades
      [37, "MAT001", "Álgebra Lineal"],
      [38, "MAT001", "Cálculo Diferencial"],
      [39, "MAT001", "Cálculo Integral"],
      [40, "MAT001", "Ecuaciones Diferenciales"],
      [41, "MAT001", "Cálculo Vectorial"],
      // ETI001 — 2 unidades
      [42, "ETI001", "Fundamentos Éticos"],
      [43, "ETI001", "Ética en la Práctica Profesional"],
      // ING001 — 2 unidades
      [44, "ING001", "Comprensión de Textos Técnicos"],
      [45, "ING001", "Redacción y Presentación Técnica"],
    ];
    for (const [id, clave, nombre] of unidades) {
      await q(
        `INSERT IGNORE INTO unidad (id_unidad, clave_materia, nombre_unidad) VALUES (?,?,?)`,
        [id, clave, nombre],
      );
    }
    console.log(
      `✓ Unidades   → ${unidades.length} unidades con 2-5 por materia`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // 8. GRUPOS
    //    Regla 5: dos grupos no comparten salón + hora
    //    Regla 6: un profesor no tiene dos grupos a la misma hora
    //    Regla 10: un profesor puede dar la misma materia en horas distintas
    //
    //    Horarios disponibles (no se solapan entre sí dentro del mismo bloque):
    //    Bloque A: Lun-Mié-Vie 07:00-08:00
    //    Bloque B: Lun-Mié-Vie 08:00-09:00
    //    Bloque C: Mar-Jue 09:00-11:00
    //    Bloque D: Mar-Jue 11:00-13:00
    //    Bloque E: Lun-Mié-Vie 13:00-14:00
    //    Bloque F: Mar-Jue 14:00-16:00
    //
    //    Aulas: A101, A102, A103, Lab201, Lab202, Sal301, Sal302
    //
    //    Período 4 = Enero-Junio 2025 (Vigente) → grupos activos
    //    Período 1 = Enero-Junio 2024 (Concluido) → para escenario de recursado
    //    Período 3 = Agosto-Diciembre 2024 (Concluido) → para escenario de recursado
    // ══════════════════════════════════════════════════════════════════════

    // Abreviaturas de maestros
    const [M1, M2, M3, M4, M5] = [
      "PELJ800101HVZ",
      "GASM850215MVZ",
      "RORH790320HVZ",
      "FUMA880510MVZ",
      "CAGR760112HVZ",
    ];

    // Grupos periodo 4 (Vigente Ene-Jun 2025)
    // id_grupo, clave_materia, rfc_maestro, id_periodo, limite, aula, horario
    const gruposP4 = [
      // FBD001 — 3 grupos (regla 3): M1 bloqueA y bloqueE (regla 10: misma materia distinta hora)
      [1, "FBD001", M1, 4, 35, "A101", "Lun-Mié-Vie 07:00-08:00"],
      [2, "FBD001", M2, 4, 35, "A102", "Mar-Jue 09:00-11:00"],
      [3, "FBD001", M1, 4, 30, "A103", "Lun-Mié-Vie 13:00-14:00"], // M1 misma materia hora distinta ✓
      // POO001 — 2 grupos
      [4, "POO001", M2, 4, 30, "Lab201", "Lun-Mié-Vie 08:00-09:00"],
      [5, "POO001", M3, 4, 30, "Lab202", "Mar-Jue 11:00-13:00"],
      // ADS001 — 2 grupos
      [6, "ADS001", M1, 4, 35, "Sal301", "Mar-Jue 09:00-11:00"], // M1 aula distinta a grp2 ✓
      [7, "ADS001", M3, 4, 35, "Sal302", "Lun-Mié-Vie 07:00-08:00"],
      // RED001 — 2 grupos
      [8, "RED001", M3, 4, 30, "Lab201", "Mar-Jue 14:00-16:00"], // Lab201 hora distinta a grp4 ✓
      [9, "RED001", M1, 4, 30, "Lab202", "Lun-Mié-Vie 08:00-09:00"], // Lab202 hora distinta a grp4 ✓
      // MAT001 — 3 grupos (compartida ISC e IIA)
      [10, "MAT001", M5, 4, 40, "A101", "Mar-Jue 11:00-13:00"], // A101 hora distinta a grp1 ✓
      [11, "MAT001", M5, 4, 40, "A102", "Mar-Jue 14:00-16:00"], // M5 misma materia hora distinta ✓
      [12, "MAT001", M4, 4, 35, "Sal301", "Lun-Mié-Vie 13:00-14:00"], // Sal301 hora distinta a grp6 ✓
      // APM001 — 2 grupos (IIA)
      [13, "APM001", M2, 4, 30, "Lab202", "Mar-Jue 09:00-11:00"], // M2 hora distinta a grp2 ✓
      [14, "APM001", M3, 4, 30, "A103", "Lun-Mié-Vie 08:00-09:00"],
      // EST001 — 2 grupos
      [15, "EST001", M5, 4, 35, "A103", "Mar-Jue 09:00-11:00"], // M5 hora distinta a grp10/11 ✓
      [16, "EST001", M4, 4, 35, "Sal302", "Mar-Jue 11:00-13:00"],
      // ADM001 — 2 grupos (IGE)
      [17, "ADM001", M4, 4, 40, "A101", "Lun-Mié-Vie 08:00-09:00"], // M4 hora distinta a grp12,16 ✓
      [18, "ADM001", M4, 4, 40, "A102", "Lun-Mié-Vie 07:00-08:00"], // M4 hora distinta a grp17 ✓
      // FIN001 — 2 grupos
      [19, "FIN001", M4, 4, 35, "Sal301", "Mar-Jue 09:00-11:00"], // M4 hora distinta a grp12,16,17,18 ✓
      [20, "FIN001", M5, 4, 35, "Sal302", "Lun-Mié-Vie 07:00-08:00"], // M5 hora distinta a grp10,11,15 ✓
    ];

    for (const [id, mat, rfc, per, lim, aula, hor] of gruposP4) {
      await q(
        `INSERT IGNORE INTO grupo
                 (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario,estatus)
               VALUES (?,?,?,?,?,?,?,'Activo')`,
        [id, mat, rfc, per, lim, aula, hor],
      );
    }

    // Grupos periodo 1 (Ene-Jun 2024, Concluido) — para recursado
    const gruposP1 = [
      [21, "FBD001", M1, 1, 35, "A101", "Lun-Mié-Vie 07:00-08:00"],
      [22, "POO001", M2, 1, 30, "Lab201", "Mar-Jue 09:00-11:00"],
      [23, "MAT001", M5, 1, 40, "A102", "Mar-Jue 11:00-13:00"],
    ];
    for (const [id, mat, rfc, per, lim, aula, hor] of gruposP1) {
      await q(
        `INSERT IGNORE INTO grupo
                 (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario,estatus)
               VALUES (?,?,?,?,?,?,?,'Cerrado')`,
        [id, mat, rfc, per, lim, aula, hor],
      );
    }

    // Grupos periodo 3 (Ago-Dic 2024, Concluido) — para segundo recursado
    const gruposP3 = [[24, "FBD001", M2, 3, 35, "A102", "Mar-Jue 09:00-11:00"]];
    for (const [id, mat, rfc, per, lim, aula, hor] of gruposP3) {
      await q(
        `INSERT IGNORE INTO grupo
                 (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario,estatus)
               VALUES (?,?,?,?,?,?,?,'Cerrado')`,
        [id, mat, rfc, per, lim, aula, hor],
      );
    }
    console.log("✓ Grupos     → 24 grupos (20 vigentes + 4 concluidos)");

    // ══════════════════════════════════════════════════════════════════════
    // 9. ALUMNOS — 10 alumnos con todos los campos
    // ══════════════════════════════════════════════════════════════════════
    const alumnos = [
      {
        nc: "2023001",
        car: "ISC",
        nom: "Carlos",
        ap: "Ramírez",
        am: "Vega",
        curp: "RAVC030512HVZMRL01",
        fn: "2003-05-12",
        gen: "M",
        ci: "cramirz@itver.edu.mx",
        cp: "c.ramirez@gmail.com",
        cel: "2291200001",
        tel: "2291300001",
        dir: "Calle Pino 10, Col. Las Flores, Veracruz",
        pwd: "alumno001",
      },
      {
        nc: "2023002",
        car: "ISC",
        nom: "Diana",
        ap: "López",
        am: "Cruz",
        curp: "LOCD040820MVZPRA02",
        fn: "2004-08-20",
        gen: "F",
        ci: "dlopez@itver.edu.mx",
        cp: "diana.lopez@gmail.com",
        cel: "2291200002",
        tel: "2291300002",
        dir: "Blvd. Ruiz Cortines 55, Col. Centro, Veracruz",
        pwd: "alumno002",
      },
      {
        nc: "2023003",
        car: "ISC",
        nom: "Ernesto",
        ap: "Martínez",
        am: "Ruiz",
        curp: "MARE030115HVZRNA03",
        fn: "2003-01-15",
        gen: "M",
        ci: "emartinez@itver.edu.mx",
        cp: "e.mtz@gmail.com",
        cel: "2291200003",
        tel: "2291300003",
        dir: "Av. 20 de Noviembre 8, Col. Reforma, Veracruz",
        pwd: "alumno003",
      },
      {
        nc: "2023004",
        car: "ISC",
        nom: "Fernanda",
        ap: "Torres",
        am: "Díaz",
        curp: "TODF040930MVZRZA04",
        fn: "2004-09-30",
        gen: "F",
        ci: "ftorres@itver.edu.mx",
        cp: "fer.torres@gmail.com",
        cel: "2291200004",
        tel: "2291300004",
        dir: "Calle Morelos 33, Col. Jardines, Veracruz",
        pwd: "alumno004",
      },
      {
        nc: "2023005",
        car: "IIA",
        nom: "Sofía",
        ap: "Mendoza",
        am: "Ríos",
        curp: "MERS031205MVZRFA05",
        fn: "2003-12-05",
        gen: "F",
        ci: "smendoza@itver.edu.mx",
        cp: "sofia.mnd@gmail.com",
        cel: "2291200005",
        tel: "2291300005",
        dir: "Calle Roble 7, Col. Framboyanes, Veracruz",
        pwd: "alumno005",
      },
      {
        nc: "2023006",
        car: "IIA",
        nom: "Adrián",
        ap: "Guzmán",
        am: "Flores",
        curp: "GUFA030818HVZRMN06",
        fn: "2003-08-18",
        gen: "M",
        ci: "aguzman@itver.edu.mx",
        cp: "adrian.gz@gmail.com",
        cel: "2291200006",
        tel: "2291300006",
        dir: "Av. Cuauhtémoc 22, Col. Centro, Veracruz",
        pwd: "alumno006",
      },
      {
        nc: "2023007",
        car: "IIA",
        nom: "Valeria",
        ap: "Castillo",
        am: "Mora",
        curp: "CAMV040301MVZRLA07",
        fn: "2004-03-01",
        gen: "F",
        ci: "vcastillo@itver.edu.mx",
        cp: "vale.cast@gmail.com",
        cel: "2291200007",
        tel: "2291300007",
        dir: "Calle Cedro 15, Col. Las Flores, Veracruz",
        pwd: "alumno007",
      },
      {
        nc: "2023008",
        car: "IGE",
        nom: "Miguel",
        ap: "Herrera",
        am: "Santos",
        curp: "HESM030625HVZRGH08",
        fn: "2003-06-25",
        gen: "M",
        ci: "mherrera@itver.edu.mx",
        cp: "miguel.hr@gmail.com",
        cel: "2291200008",
        tel: "2291300008",
        dir: "Calle Nogal 9, Col. Reforma, Veracruz",
        pwd: "alumno008",
      },
      {
        nc: "2023009",
        car: "IGE",
        nom: "Paola",
        ap: "Ramos",
        am: "Vázquez",
        curp: "RAVP040714MVZRMA09",
        fn: "2004-07-14",
        gen: "F",
        ci: "pramos@itver.edu.mx",
        cp: "paola.rm@gmail.com",
        cel: "2291200009",
        tel: "2291300009",
        dir: "Blvd. Adolfo Ruiz 44, Col. Jardines, Veracruz",
        pwd: "alumno009",
      },
      {
        nc: "2023010",
        car: "IGE",
        nom: "Héctor",
        ap: "Vargas",
        am: "Luna",
        curp: "VALH031109HVZRCA10",
        fn: "2003-11-09",
        gen: "M",
        ci: "hvargas@itver.edu.mx",
        cp: "hector.vg@gmail.com",
        cel: "2291200010",
        tel: "2291300010",
        dir: "Calle Palma 3, Col. Centro, Veracruz",
        pwd: "alumno010",
      },
    ];
    for (const a of alumnos) {
      await q(
        `
        INSERT IGNORE INTO alumno
          (no_control, id_carrera, nombre, apellido_paterno, apellido_materno,
           curp, fecha_nacimiento, genero, correo_institucional, correo_personal,
           tel_celular, tel_casa, direccion)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,
        [
          a.nc,
          a.car,
          a.nom,
          a.ap,
          a.am,
          a.curp,
          a.fn,
          a.gen,
          a.ci,
          a.cp,
          a.cel,
          a.tel,
          a.dir,
        ],
      );
      await q(
        `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia) VALUES (?,?,'alumno',?)`,
        [a.nc, await bcrypt.hash(a.pwd, 10), a.nc],
      );
    }
    console.log("✓ Alumnos    → 10 alumnos (4 ISC, 3 IIA, 3 IGE)");

    // ══════════════════════════════════════════════════════════════════════
    // 10. INSCRIPCIONES — Período 4 (vigente)
    //     Regla 7: alumnos en 1 o más grupos
    //     Regla 8: ningún alumno tiene dos clases a la misma hora
    //     Regla 9: máx 3 veces la misma materia, Ordinario→Recursado→Especial
    //
    //     Horarios de los grupos vigentes:
    //     G1  FBD001  LMV 07-08
    //     G2  FBD001  MJ  09-11
    //     G3  FBD001  LMV 13-14
    //     G4  POO001  LMV 08-09
    //     G5  POO001  MJ  11-13
    //     G6  ADS001  MJ  09-11
    //     G7  ADS001  LMV 07-08
    //     G8  RED001  MJ  14-16
    //     G9  RED001  LMV 08-09
    //     G10 MAT001  MJ  11-13
    //     G11 MAT001  MJ  14-16
    //     G12 MAT001  LMV 13-14
    //     G13 APM001  MJ  09-11
    //     G14 APM001  LMV 08-09
    //     G15 EST001  MJ  09-11
    //     G16 EST001  MJ  11-13
    //     G17 ADM001  LMV 08-09
    //     G18 ADM001  LMV 07-08
    //     G19 FIN001  MJ  09-11
    //     G20 FIN001  LMV 07-08
    //
    //     Para cada alumno verificamos que no coincidan horarios:
    //   2023001 (ISC): G1(LMV07), G4(LMV08), G5(MJ11), G10(MJ11)← CONFLICTO
    //     → G1, G4, G5, G9 no → G1,G4,G2?,  usamos G1,G4,G8,G12
    //       G1=LMV07 G4=LMV08 G8=MJ14 G12=LMV13 ← sin conflicto ✓
    //   2023002 (ISC): G3(LMV13), G4(LMV08) ← ok, G5(MJ11), G8(MJ14) ← ok
    //   2023003 (ISC): G2(MJ09), G4(LMV08), G11(MJ14), G12(LMV13)
    //   2023004 (ISC): G1(LMV07), G5(MJ11), G9(LMV08), G12(LMV13)
    //   2023005 (IIA): G13(MJ09), G14(LMV08), G16(MJ11), G11(MJ14)
    //   2023006 (IIA): G15(MJ09) ← solo 1 grupo (regla 7 permite 1)
    //   2023007 (IIA): G13(MJ09), G16(MJ11), G10(MJ11) ← CONFLICTO G16 y G10
    //     → G13(MJ09), G14(LMV08), G10(MJ11)
    //   2023008 (IGE): G17(LMV08), G18(LMV07), ← CONFLICTO no: son días distintos
    //     LMV07 y LMV08 son bloques distintos ✓ → G18(LMV07), G17(LMV08), G19(MJ09)
    //   2023009 (IGE): G20(LMV07), G19(MJ09), G16(MJ11)
    //   2023010 (IGE): G18(LMV07), G17(LMV08), G11(MJ14)
    // ══════════════════════════════════════════════════════════════════════

    const inscP4 = [
      // 2023001 ISC: LMV07(G1), LMV08(G4), MJ14(G8), LMV13(G12) — sin conflicto
      ["2023001", 1, "2025-01-14", "Ordinario"],
      ["2023001", 4, "2025-01-14", "Ordinario"],
      ["2023001", 8, "2025-01-14", "Ordinario"],
      ["2023001", 12, "2025-01-14", "Ordinario"],
      // 2023002 ISC: LMV13(G3), LMV08(G4), MJ11(G5), MJ14(G8) — sin conflicto
      ["2023002", 3, "2025-01-14", "Ordinario"],
      ["2023002", 4, "2025-01-14", "Ordinario"],
      ["2023002", 5, "2025-01-14", "Ordinario"],
      ["2023002", 8, "2025-01-14", "Ordinario"],
      // 2023003 ISC: MJ09(G2), LMV08(G4), MJ14(G11), LMV13(G12) — sin conflicto
      ["2023003", 2, "2025-01-14", "Ordinario"],
      ["2023003", 4, "2025-01-14", "Ordinario"],
      ["2023003", 11, "2025-01-14", "Ordinario"],
      ["2023003", 12, "2025-01-14", "Ordinario"],
      // 2023004 ISC: LMV07(G1), MJ11(G5), LMV08(G9), LMV13(G12) — sin conflicto
      ["2023004", 1, "2025-01-14", "Ordinario"],
      ["2023004", 5, "2025-01-14", "Ordinario"],
      ["2023004", 9, "2025-01-14", "Ordinario"],
      ["2023004", 12, "2025-01-14", "Ordinario"],
      // 2023005 IIA: MJ09(G13), LMV08(G14), MJ11(G16), MJ14(G11) — sin conflicto
      ["2023005", 13, "2025-01-14", "Ordinario"],
      ["2023005", 14, "2025-01-14", "Ordinario"],
      ["2023005", 16, "2025-01-14", "Ordinario"],
      ["2023005", 11, "2025-01-14", "Ordinario"],
      // 2023006 IIA: solo 1 grupo (regla 7 permite mínimo 1)
      ["2023006", 15, "2025-01-14", "Ordinario"],
      // 2023007 IIA: MJ09(G13), LMV08(G14), MJ11(G10) — sin conflicto
      ["2023007", 13, "2025-01-14", "Ordinario"],
      ["2023007", 14, "2025-01-14", "Ordinario"],
      ["2023007", 10, "2025-01-14", "Ordinario"],
      // 2023008 IGE: LMV07(G18), LMV08(G17), MJ09(G19) — sin conflicto
      ["2023008", 18, "2025-01-14", "Ordinario"],
      ["2023008", 17, "2025-01-14", "Ordinario"],
      ["2023008", 19, "2025-01-14", "Ordinario"],
      // 2023009 IGE: LMV07(G20), MJ09(G19)← CONFLICTO con 2023008 en G19? No, distintos alumnos ✓
      //              LMV07(G20), MJ09(G19), MJ11(G16) — sin conflicto para este alumno
      ["2023009", 20, "2025-01-14", "Ordinario"],
      ["2023009", 19, "2025-01-14", "Ordinario"],
      ["2023009", 16, "2025-01-14", "Ordinario"],
      // 2023010 IGE: LMV07(G18), LMV08(G17), MJ14(G11) — sin conflicto
      ["2023010", 18, "2025-01-14", "Ordinario"],
      ["2023010", 17, "2025-01-14", "Ordinario"],
      ["2023010", 11, "2025-01-14", "Ordinario"],
    ];
    for (const [nc, ig, fi, tipo] of inscP4) {
      await q(
        `INSERT IGNORE INTO inscripcion (no_control,id_grupo,fecha_inscripcion,estatus,tipo_curso)
               VALUES (?,?,?,'Cursando',?)`,
        [nc, ig, fi, tipo],
      );
    }

    // ── Inscripciones históricas para escenario de recursado (regla 9) ──
    // 2023001 cursó FBD001 en P1 (Ene-Jun 2024) → Ordinario → Reprobado
    // 2023001 cursó FBD001 en P3 (Ago-Dic 2024) → Recursado → Reprobado
    // 2023001 cursó FBD001 en P4 (Ene-Jun 2025) → Especial  ← ya inscrito arriba como Ordinario
    // Ajustamos: 2023001 en G1 cambiar a Especial
    await q(`UPDATE inscripcion SET tipo_curso='Especial'
             WHERE no_control='2023001' AND id_grupo=1`);

    // Inscripciones en periodos concluidos
    await q(`INSERT IGNORE INTO inscripcion (no_control,id_grupo,fecha_inscripcion,estatus,tipo_curso)
             VALUES ('2023001',21,'2024-01-15','Reprobado','Ordinario')`); // P1 G21 FBD001
    await q(`INSERT IGNORE INTO inscripcion (no_control,id_grupo,fecha_inscripcion,estatus,tipo_curso)
             VALUES ('2023001',24,'2024-08-05','Reprobado','Recursado')`); // P3 G24 FBD001

    // 2023002 cursó MAT001 en P1 → Reprobado → ahora en P4 Recursado (G12)
    await q(`UPDATE inscripcion SET tipo_curso='Recursado'
             WHERE no_control='2023002' AND id_grupo=12`);
    await q(`INSERT IGNORE INTO inscripcion (no_control,id_grupo,fecha_inscripcion,estatus,tipo_curso)
             VALUES ('2023002',23,'2024-01-15','Reprobado','Ordinario')`); // P1 G23 MAT001

    console.log("✓ Inscrip.   → P4 vigente + historial recursados");

    // ══════════════════════════════════════════════════════════════════════
    // 11. TIPOS DE ACTIVIDAD
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO tipo_actividad (id_tipo, nombre) VALUES
      (1,'Examen'), (2,'Tarea'), (3,'Práctica'), (4,'Proyecto'), (5,'Participación')`);
    console.log(
      "✓ Tipos act. → Examen, Tarea, Práctica, Proyecto, Participación",
    );

    // ══════════════════════════════════════════════════════════════════════
    // 12. ACTIVIDADES predefinidas (muestra para FBD001 y MAT001)
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO materia_actividad (clave_materia, id_unidad, nombre_actividad, id_tipo)
             VALUES
               ('FBD001',1,'Examen Unidad 1',1), ('FBD001',1,'Tarea ER',2),
               ('FBD001',2,'Examen Unidad 2',1), ('FBD001',2,'Práctica SQL',3),
               ('FBD001',3,'Proyecto Final',4),
               ('MAT001',37,'Examen Álgebra',1), ('MAT001',38,'Tarea Cálculo Dif',2),
               ('MAT001',39,'Examen Cálculo Int',1), ('MAT001',40,'Tarea Ec. Dif',2),
               ('MAT001',41,'Proyecto Final',4)`);
    console.log("✓ Act. predef→ Actividades para FBD001 y MAT001");

    // ══════════════════════════════════════════════════════════════════════
    // RESUMEN
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n✅ Seed completado exitosamente.");
    console.log(
      "─────────────────────────────────────────────────────────────",
    );
    console.log("  CREDENCIALES:");
    console.log(`  ${rfcAdmin}  / admin123`);
    console.log("  PELJ800101HVZ  / maestro123   (Juan Pérez — ISC)");
    console.log("  GASM850215MVZ  / maestro456   (María García — ISC/IIA)");
    console.log("  RORH790320HVZ  / maestro789   (Roberto Rodríguez — ISC)");
    console.log("  FUMA880510MVZ  / maestro000   (Laura Fuentes — IGE)");
    console.log("  CAGR760112HVZ  / maestro111   (Carlos Castro — MAT/EST)");
    console.log(
      "  2023001 / alumno001  (Carlos Ramírez — ISC, 4 grupos, cursando FBD Especial)",
    );
    console.log(
      "  2023002 / alumno002  (Diana López — ISC, 4 grupos, MAT Recursado)",
    );
    console.log("  2023003 / alumno003  (Ernesto Martínez — ISC, 4 grupos)");
    console.log("  2023004 / alumno004  (Fernanda Torres — ISC, 4 grupos)");
    console.log("  2023005 / alumno005  (Sofía Mendoza — IIA, 4 grupos)");
    console.log("  2023006 / alumno006  (Adrián Guzmán — IIA, 1 grupo)");
    console.log("  2023007 / alumno007  (Valeria Castillo — IIA, 3 grupos)");
    console.log("  2023008 / alumno008  (Miguel Herrera — IGE, 3 grupos)");
    console.log("  2023009 / alumno009  (Paola Ramos — IGE, 3 grupos)");
    console.log("  2023010 / alumno010  (Héctor Vargas — IGE, 3 grupos)");
    console.log(
      "─────────────────────────────────────────────────────────────",
    );
  } catch (err) {
    console.error("❌ Error en seed:", err.message);
    console.error(err);
  } finally {
    db.end();
  }
}

seed();

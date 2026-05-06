// backend/seed.js — v3
// Periodos en 2026, mín 5 alumnos por grupo, calificaciones pendientes de guardar

const bcrypt = require("bcrypt");
const db = require("./src/db");

function q(sql, params = []) {
  return new Promise((res, rej) =>
    db.query(sql, params, (err, r) => (err ? rej(err) : res(r))),
  );
}

async function seed() {
  try {
    console.log("Iniciando seed completo v3...\n");

    // ══════════════════════════════════════════════════════════════════════
    // 1. PERIODOS 2025-2026
    //    EJ2025=Concluido, V2025=Concluido, AD2025=Concluido
    //    EJ2026=Vigente (hoy estamos en 2026), V2026=Proximo, AD2026=Proximo
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO periodo_escolar
               (id_periodo, descripcion, fecha_inicio, fecha_fin, estatus)
             VALUES
               (1,'Enero-Junio',      '2025-01-13','2025-06-20','Concluido'),
               (2,'Verano',           '2025-07-01','2025-07-31','Concluido'),
               (3,'Agosto-Diciembre', '2025-08-04','2025-12-19','Concluido'),
               (4,'Enero-Junio',      '2026-01-12','2026-06-19','Vigente'),
               (5,'Verano',           '2026-07-01','2026-07-31','Proximo'),
               (6,'Agosto-Diciembre', '2026-08-03','2026-12-18','Proximo')`);
    console.log(
      "✓ Periodos   → 6 (3×2025 concluidos, 3×2026 vigente/próximos)",
    );

    // ══════════════════════════════════════════════════════════════════════
    // 2. CARRERAS
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO carrera
               (id_carrera,nombre_carrera,siglas,plan_estudios,modalidad,total_semestres,total_creditos,estatus)
             VALUES
               ('ISC','Ingeniería en Sistemas Computacionales','ISC','ISIC-2010-224','Presencial',9,345,'Aceptada'),
               ('IIA','Ingeniería en Inteligencia Artificial', 'IIA','IAIA-2022-310','Presencial',9,370,'Aceptada'),
               ('IGE','Ingeniería en Gestión Empresarial',     'IGE','IIGE-2010-315','Presencial',9,330,'Aceptada')`);
    console.log("✓ Carreras   → ISC, IIA, IGE");

    // ══════════════════════════════════════════════════════════════════════
    // 3. ADMINISTRADOR
    // ══════════════════════════════════════════════════════════════════════
    const rfcAdmin = "ADMN800101ITV";
    await q(
      `INSERT IGNORE INTO administrador
               (rfc,nombre,apellido_paterno,apellido_materno,
                correo_institucional,correo_personal,tel_celular,activo)
             VALUES (?,'Leonardo','Álvarez','Díaz',
                    'lealvarez@veracruz.tecnm.mx','leonardo.alvarez@gmail.com','2291000001',1)`,
      [rfcAdmin],
    );
    await q(
      `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia) VALUES (?,?,'administrador',?)`,
      [rfcAdmin, await bcrypt.hash("admin123", 10), rfcAdmin],
    );
    console.log(`✓ Admin      → ${rfcAdmin} / admin123`);

    // ══════════════════════════════════════════════════════════════════════
    // 4. MAESTROS — 5 profesores
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
        ci: "juan.pl@veracruz.tecnm.mx",
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
        ci: "maria.gs@veracruz.tecnm.mx",
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
        ci: "roberto.rh@veracruz.tecnm.mx",
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
        ci: "laura.fm@veracruz.tecnm.mx",
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
        ci: "carlos.cg@veracruz.tecnm.mx",
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
        `INSERT IGNORE INTO maestro
                 (rfc,nombre,apellido_paterno,apellido_materno,curp,fecha_nacimiento,genero,
                  correo_institucional,correo_personal,tel_celular,tel_oficina,direccion,
                  tipo_contrato,estatus,fecha_ingreso,grado_academico,especialidad,departamento)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    const [M1, M2, M3, M4, M5] = maestros.map((m) => m.rfc);
    console.log("✓ Maestros   → 5 profesores");

    // ══════════════════════════════════════════════════════════════════════
    // 5. MATERIAS — 5 por carrera
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO materia
               (clave_materia,nombre_materia,creditos_totales,no_unidades)
             VALUES
               ('FBD001','Fundamentos de Bases de Datos',      5,3),
               ('POO001','Programación Orientada a Objetos',   5,3),
               ('ADS001','Análisis y Diseño de Sistemas',      4,2),
               ('RED001','Redes de Computadoras',              5,4),
               ('APM001','Aprendizaje Automático',             5,3),
               ('VIS001','Visión por Computadora',             5,2),
               ('NLP001','Procesamiento de Lenguaje Natural',  4,3),
               ('EST001','Estadística para IA',                4,4),
               ('ADM001','Administración de Empresas',         5,3),
               ('FIN001','Finanzas Empresariales',             5,4),
               ('MKT001','Mercadotecnia',                      4,2),
               ('LOG001','Logística y Cadena de Suministro',   4,3),
               ('MAT001','Matemáticas Aplicadas',              5,5),
               ('ETI001','Ética Profesional',                  3,2),
               ('ING001','Inglés Técnico',                     3,2)`);
    console.log("✓ Materias   → 15 materias");

    // ══════════════════════════════════════════════════════════════════════
    // 6. RETÍCULA
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO reticula (clave_materia,id_carrera,semestre,creditos) VALUES
               ('FBD001','ISC',4,5),('POO001','ISC',3,5),('ADS001','ISC',5,4),
               ('RED001','ISC',6,5),('MAT001','ISC',1,5),
               ('APM001','IIA',4,5),('VIS001','IIA',5,5),('NLP001','IIA',6,4),
               ('EST001','IIA',3,4),('MAT001','IIA',1,5),
               ('ADM001','IGE',2,5),('FIN001','IGE',4,5),('MKT001','IGE',5,4),
               ('LOG001','IGE',6,4),('ETI001','IGE',8,3)`);
    console.log("✓ Retícula   → 5 materias por carrera");

    // ══════════════════════════════════════════════════════════════════════
    // 7. UNIDADES — 2 a 5 por materia
    // ══════════════════════════════════════════════════════════════════════
    const unidades = [
      [1, "FBD001", "Modelo Entidad-Relación"],
      [2, "FBD001", "Modelo Relacional"],
      [3, "FBD001", "SQL y Consultas"],
      [4, "POO001", "Clases y Objetos"],
      [5, "POO001", "Herencia y Polimorfismo"],
      [6, "POO001", "Patrones de Diseño"],
      [7, "ADS001", "Análisis de Requerimientos"],
      [8, "ADS001", "Diseño de Sistemas"],
      [9, "RED001", "Modelos OSI y TCP/IP"],
      [10, "RED001", "Capa de Red y Enrutamiento"],
      [11, "RED001", "Capa de Transporte"],
      [12, "RED001", "Seguridad en Redes"],
      [13, "APM001", "Fundamentos de ML"],
      [14, "APM001", "Algoritmos Supervisados"],
      [15, "APM001", "Redes Neuronales"],
      [16, "VIS001", "Procesamiento de Imágenes"],
      [17, "VIS001", "Detección de Objetos"],
      [18, "NLP001", "Tokenización y Análisis Léxico"],
      [19, "NLP001", "Modelos de Lenguaje"],
      [20, "NLP001", "Aplicaciones NLP"],
      [21, "EST001", "Probabilidad"],
      [22, "EST001", "Distribuciones"],
      [23, "EST001", "Inferencia Estadística"],
      [24, "EST001", "Regresión y Correlación"],
      [25, "ADM001", "Teoría Administrativa"],
      [26, "ADM001", "Planeación Estratégica"],
      [27, "ADM001", "Organización y Control"],
      [28, "FIN001", "Fundamentos Financieros"],
      [29, "FIN001", "Análisis de Estados Financieros"],
      [30, "FIN001", "Presupuestos"],
      [31, "FIN001", "Inversión y Riesgo"],
      [32, "MKT001", "Investigación de Mercados"],
      [33, "MKT001", "Estrategias de Marketing"],
      [34, "LOG001", "Gestión de Inventarios"],
      [35, "LOG001", "Distribución y Transporte"],
      [36, "LOG001", "Tecnologías en Logística"],
      [37, "MAT001", "Álgebra Lineal"],
      [38, "MAT001", "Cálculo Diferencial"],
      [39, "MAT001", "Cálculo Integral"],
      [40, "MAT001", "Ecuaciones Diferenciales"],
      [41, "MAT001", "Cálculo Vectorial"],
      [42, "ETI001", "Fundamentos Éticos"],
      [43, "ETI001", "Ética en la Práctica Profesional"],
      [44, "ING001", "Comprensión de Textos Técnicos"],
      [45, "ING001", "Redacción y Presentación Técnica"],
    ];
    for (const [id, clave, nombre] of unidades)
      await q(
        `INSERT IGNORE INTO unidad (id_unidad,clave_materia,nombre_unidad) VALUES (?,?,?)`,
        [id, clave, nombre],
      );
    console.log(`✓ Unidades   → ${unidades.length} unidades`);

    // ══════════════════════════════════════════════════════════════════════
    // 8. GRUPOS (período 4 = EJ2026 Vigente)
    //    Reglas: sin conflicto de salón+hora, sin conflicto de maestro+hora
    // ══════════════════════════════════════════════════════════════════════
    // Bloques horarios:
    //   A = LMV 07:00-08:00   B = LMV 08:00-09:00   C = MJ 09:00-11:00
    //   D = MJ 11:00-13:00    E = LMV 13:00-14:00   F = MJ 14:00-16:00
    const grupos = [
      // FBD001 — 3 grupos (M1 bloqueA y E: misma materia horas distintas, regla 10)
      [1, "FBD001", M1, 4, 35, "A101", "Lun-Mié-Vie 07:00-08:00"], // M1 bloque A
      [2, "FBD001", M2, 4, 35, "A102", "Mar-Jue 09:00-11:00"], // M2 bloque C
      [3, "FBD001", M1, 4, 30, "A103", "Lun-Mié-Vie 13:00-14:00"], // M1 bloque E ← distinta hora ✓
      // POO001 — 2 grupos
      [4, "POO001", M2, 4, 30, "Lab201", "Lun-Mié-Vie 08:00-09:00"], // M2 bloque B (distinto a bloque C) ✓
      [5, "POO001", M3, 4, 30, "Lab202", "Mar-Jue 11:00-13:00"], // M3 bloque D
      // ADS001 — 2 grupos
      [6, "ADS001", M1, 4, 35, "Sal301", "Mar-Jue 09:00-11:00"], // M1 bloque C (A101 bloque A) ✓
      [7, "ADS001", M3, 4, 35, "Sal302", "Lun-Mié-Vie 07:00-08:00"], // M3 bloque A (Lab202 bloque D) ✓
      // RED001 — 2 grupos
      [8, "RED001", M3, 4, 30, "Lab201", "Mar-Jue 14:00-16:00"], // M3 bloque F (Lab201 libre en F) ✓
      [9, "RED001", M1, 4, 30, "Lab202", "Lun-Mié-Vie 08:00-09:00"], // M1 bloque B (libre en B) ✓
      // MAT001 — 3 grupos (M5 dos grupos horas distintas, regla 10)
      [10, "MAT001", M5, 4, 40, "A101", "Mar-Jue 11:00-13:00"], // M5 bloque D, A101 libre en D ✓
      [11, "MAT001", M5, 4, 40, "A102", "Mar-Jue 14:00-16:00"], // M5 bloque F (distinto a D) ✓
      [12, "MAT001", M4, 4, 35, "Sal301", "Lun-Mié-Vie 13:00-14:00"], // M4 bloque E
      // APM001 — 2 grupos
      [13, "APM001", M2, 4, 30, "Lab202", "Mar-Jue 09:00-11:00"], // M2 bloque C (Lab202 libre en C) ✓
      [14, "APM001", M3, 4, 30, "A103", "Lun-Mié-Vie 08:00-09:00"], // M3 bloque B (libre en B) ✓
      // EST001 — 2 grupos
      [15, "EST001", M5, 4, 35, "A103", "Mar-Jue 09:00-11:00"], // M5 bloque C (A103 libre) ✓
      [16, "EST001", M4, 4, 35, "Sal302", "Mar-Jue 11:00-13:00"], // M4 bloque D (libre en D) ✓
      // ADM001 — 2 grupos
      [17, "ADM001", M4, 4, 40, "A101", "Lun-Mié-Vie 08:00-09:00"], // M4 bloque B (libre en B) ✓
      [18, "ADM001", M4, 4, 40, "A102", "Lun-Mié-Vie 07:00-08:00"], // M4 bloque A (libre en A) ✓
      // FIN001 — 2 grupos
      [19, "FIN001", M4, 4, 35, "Sal301", "Mar-Jue 09:00-11:00"], // M4 bloque C (libre en C) ✓
      [20, "FIN001", M5, 4, 35, "Sal302", "Lun-Mié-Vie 07:00-08:00"], // M5 bloque A (libre en A) ✓
    ];
    for (const [id, mat, rfc, per, lim, aula, hor] of grupos)
      await q(
        `INSERT IGNORE INTO grupo
                 (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario,estatus)
               VALUES (?,?,?,?,?,?,?,'Activo')`,
        [id, mat, rfc, per, lim, aula, hor],
      );

    // Grupos históricos para recursado (periodo 1 = EJ2025 concluido)
    await q(
      `INSERT IGNORE INTO grupo
               (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario,estatus)
             VALUES (21,'FBD001',?,1,35,'A101','Lun-Mié-Vie 07:00-08:00','Cerrado')`,
      [M1],
    );
    await q(
      `INSERT IGNORE INTO grupo
               (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario,estatus)
             VALUES (22,'MAT001',?,1,40,'A102','Mar-Jue 11:00-13:00','Cerrado')`,
      [M5],
    );
    console.log("✓ Grupos     → 22 grupos (20 vigentes + 2 históricos)");

    // ══════════════════════════════════════════════════════════════════════
    // 9. ALUMNOS — 20 alumnos (8 ISC, 6 IIA, 6 IGE)
    // ══════════════════════════════════════════════════════════════════════
    const alumnos = [
      // ISC
      {
        nc: "26000001",
        car: "ISC",
        nom: "Carlos",
        ap: "Ramírez",
        am: "Vega",
        curp: "RAVC030512HVZMRL01",
        fn: "2003-05-12",
        gen: "M",
        ci: "L26000001@veracruz.tecnm.mx",
        cp: "c.ramirez@gmail.com",
        cel: "2291201001",
        tel: "2291301001",
        dir: "Calle Pino 10, Col. Las Flores, Veracruz",
        pwd: "alumno001",
      },
      {
        nc: "26000002",
        car: "ISC",
        nom: "Diana",
        ap: "López",
        am: "Cruz",
        curp: "LOCD040820MVZPRA02",
        fn: "2004-08-20",
        gen: "F",
        ci: "L26000002@veracruz.tecnm.mx",
        cp: "diana.lopez@gmail.com",
        cel: "2291201002",
        tel: "2291301002",
        dir: "Blvd. Ruiz Cortines 55, Col. Centro, Veracruz",
        pwd: "alumno002",
      },
      {
        nc: "26000003",
        car: "ISC",
        nom: "Ernesto",
        ap: "Martínez",
        am: "Ruiz",
        curp: "MARE030115HVZRNA03",
        fn: "2003-01-15",
        gen: "M",
        ci: "L26000003@veracruz.tecnm.mx",
        cp: "e.mtz@gmail.com",
        cel: "2291201003",
        tel: "2291301003",
        dir: "Av. 20 de Noviembre 8, Col. Reforma, Veracruz",
        pwd: "alumno003",
      },
      {
        nc: "26000004",
        car: "ISC",
        nom: "Fernanda",
        ap: "Torres",
        am: "Díaz",
        curp: "TODF040930MVZRZA04",
        fn: "2004-09-30",
        gen: "F",
        ci: "L26000004@veracruz.tecnm.mx",
        cp: "fer.torres@gmail.com",
        cel: "2291201004",
        tel: "2291301004",
        dir: "Calle Morelos 33, Col. Jardines, Veracruz",
        pwd: "alumno004",
      },
      {
        nc: "26000005",
        car: "ISC",
        nom: "Rodrigo",
        ap: "Sánchez",
        am: "Luna",
        curp: "SALR031201HVZNCH05",
        fn: "2003-12-01",
        gen: "M",
        ci: "L26000005@veracruz.tecnm.mx",
        cp: "r.sanchez@gmail.com",
        cel: "2291201005",
        tel: "2291301005",
        dir: "Calle Cedro 5, Col. Las Flores, Veracruz",
        pwd: "alumno005",
      },
      {
        nc: "26000006",
        car: "ISC",
        nom: "Alejandra",
        ap: "Morales",
        am: "Jiménez",
        curp: "MOJA040315MVZRLA06",
        fn: "2004-03-15",
        gen: "F",
        ci: "L26000006@veracruz.tecnm.mx",
        cp: "ale.morales@gmail.com",
        cel: "2291201006",
        tel: "2291301006",
        dir: "Av. Cuauhtémoc 14, Col. Centro, Veracruz",
        pwd: "alumno006",
      },
      {
        nc: "26000007",
        car: "ISC",
        nom: "Brandon",
        ap: "Castillo",
        am: "Reyes",
        curp: "CARB030628HVZRST07",
        fn: "2003-06-28",
        gen: "M",
        ci: "L26000007@veracruz.tecnm.mx",
        cp: "brandon.c@gmail.com",
        cel: "2291201007",
        tel: "2291301007",
        dir: "Calle Roble 22, Col. Framboyanes, Veracruz",
        pwd: "alumno007",
      },
      {
        nc: "26000008",
        car: "ISC",
        nom: "Itzel",
        ap: "Flores",
        am: "Espinoza",
        curp: "FEEI040507MVZRLA08",
        fn: "2004-05-07",
        gen: "F",
        ci: "L26000008@veracruz.tecnm.mx",
        cp: "itzel.f@gmail.com",
        cel: "2291201008",
        tel: "2291301008",
        dir: "Calle Nogal 9, Col. Reforma, Veracruz",
        pwd: "alumno008",
      },
      // IIA
      {
        nc: "26000009",
        car: "IIA",
        nom: "Sofía",
        ap: "Mendoza",
        am: "Ríos",
        curp: "MERS031205MVZRFA09",
        fn: "2003-12-05",
        gen: "F",
        ci: "L26000009@veracruz.tecnm.mx",
        cp: "sofia.mnd@gmail.com",
        cel: "2291201009",
        tel: "2291301009",
        dir: "Calle Roble 7, Col. Framboyanes, Veracruz",
        pwd: "alumno009",
      },
      {
        nc: "26000010",
        car: "IIA",
        nom: "Adrián",
        ap: "Guzmán",
        am: "Flores",
        curp: "GUFA030818HVZRMN10",
        fn: "2003-08-18",
        gen: "M",
        ci: "L26000010@veracruz.tecnm.mx",
        cp: "adrian.gz@gmail.com",
        cel: "2291201010",
        tel: "2291301010",
        dir: "Av. Cuauhtémoc 22, Col. Centro, Veracruz",
        pwd: "alumno010",
      },
      {
        nc: "26000011",
        car: "IIA",
        nom: "Valeria",
        ap: "Castillo",
        am: "Mora",
        curp: "CAMV040301MVZRLA11",
        fn: "2004-03-01",
        gen: "F",
        ci: "L26000011@veracruz.tecnm.mx",
        cp: "vale.cast@gmail.com",
        cel: "2291201011",
        tel: "2291301011",
        dir: "Calle Cedro 15, Col. Las Flores, Veracruz",
        pwd: "alumno011",
      },
      {
        nc: "26000012",
        car: "IIA",
        nom: "Daniel",
        ap: "Vargas",
        am: "Peña",
        curp: "VAPD031025HVZRNA12",
        fn: "2003-10-25",
        gen: "M",
        ci: "L26000012@veracruz.tecnm.mx",
        cp: "daniel.vg@gmail.com",
        cel: "2291201012",
        tel: "2291301012",
        dir: "Blvd. Adolfo Ruiz 33, Col. Jardines, Veracruz",
        pwd: "alumno012",
      },
      {
        nc: "26000013",
        car: "IIA",
        nom: "Camila",
        ap: "Ortega",
        am: "Nava",
        curp: "ONCA040614MVZRRT13",
        fn: "2004-06-14",
        gen: "F",
        ci: "L26000013@veracruz.tecnm.mx",
        cp: "camila.og@gmail.com",
        cel: "2291201013",
        tel: "2291301013",
        dir: "Calle Palma 11, Col. Centro, Veracruz",
        pwd: "alumno013",
      },
      {
        nc: "26000014",
        car: "IIA",
        nom: "Javier",
        ap: "Herrera",
        am: "Campos",
        curp: "HECJ031118HVZRCA14",
        fn: "2003-11-18",
        gen: "M",
        ci: "L26000014@veracruz.tecnm.mx",
        cp: "javier.hr@gmail.com",
        cel: "2291201014",
        tel: "2291301014",
        dir: "Av. 5 de Mayo 44, Col. Reforma, Veracruz",
        pwd: "alumno014",
      },
      // IGE
      {
        nc: "26000015",
        car: "IGE",
        nom: "Miguel",
        ap: "Herrera",
        am: "Santos",
        curp: "HESM030625HVZRGH15",
        fn: "2003-06-25",
        gen: "M",
        ci: "L26000015@veracruz.tecnm.mx",
        cp: "miguel.hr@gmail.com",
        cel: "2291201015",
        tel: "2291301015",
        dir: "Calle Nogal 9, Col. Reforma, Veracruz",
        pwd: "alumno015",
      },
      {
        nc: "26000016",
        car: "IGE",
        nom: "Paola",
        ap: "Ramos",
        am: "Vázquez",
        curp: "RAVP040714MVZRMA16",
        fn: "2004-07-14",
        gen: "F",
        ci: "L26000016@veracruz.tecnm.mx",
        cp: "paola.rm@gmail.com",
        cel: "2291201016",
        tel: "2291301016",
        dir: "Blvd. Adolfo Ruiz 44, Col. Jardines, Veracruz",
        pwd: "alumno016",
      },
      {
        nc: "26000017",
        car: "IGE",
        nom: "Héctor",
        ap: "Vargas",
        am: "Luna",
        curp: "VALH031109HVZRCA17",
        fn: "2003-11-09",
        gen: "M",
        ci: "L26000017@veracruz.tecnm.mx",
        cp: "hector.vg@gmail.com",
        cel: "2291201017",
        tel: "2291301017",
        dir: "Calle Palma 3, Col. Centro, Veracruz",
        pwd: "alumno017",
      },
      {
        nc: "26000018",
        car: "IGE",
        nom: "Mariana",
        ap: "Cruz",
        am: "Ibarra",
        curp: "CRIM040222MVZRNA18",
        fn: "2004-02-22",
        gen: "F",
        ci: "L26000018@veracruz.tecnm.mx",
        cp: "mari.cruz@gmail.com",
        cel: "2291201018",
        tel: "2291301018",
        dir: "Calle Fresno 17, Col. Las Flores, Veracruz",
        pwd: "alumno018",
      },
      {
        nc: "26000019",
        car: "IGE",
        nom: "Omar",
        ap: "Delgado",
        am: "Suárez",
        curp: "DESO031004HVZRLA19",
        fn: "2003-10-04",
        gen: "M",
        ci: "L26000019@veracruz.tecnm.mx",
        cp: "omar.del@gmail.com",
        cel: "2291201019",
        tel: "2291301019",
        dir: "Av. Independencia 28, Col. Centro, Veracruz",
        pwd: "alumno019",
      },
      {
        nc: "26000020",
        car: "IGE",
        nom: "Lucía",
        ap: "Peña",
        am: "Mora",
        curp: "PEML040809MVZRLA20",
        fn: "2004-08-09",
        gen: "F",
        ci: "L26000020@veracruz.tecnm.mx",
        cp: "lucia.pn@gmail.com",
        cel: "2291201020",
        tel: "2291301020",
        dir: "Calle Magnolia 6, Col. Jardines, Veracruz",
        pwd: "alumno020",
      },
    ];
    for (const a of alumnos) {
      await q(
        `INSERT IGNORE INTO alumno
                 (no_control,id_carrera,nombre,apellido_paterno,apellido_materno,
                  curp,fecha_nacimiento,genero,correo_institucional,correo_personal,
                  tel_celular,tel_casa,direccion)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    console.log("✓ Alumnos    → 20 alumnos (8 ISC, 6 IIA, 6 IGE)");

    // ══════════════════════════════════════════════════════════════════════
    // 10. INSCRIPCIONES — mínimo 5 por grupo, sin conflicto de horario
    //
    // Horarios de grupos vigentes:
    //  G1  FBD001  LMV07   G2  FBD001  MJ09    G3  FBD001  LMV13
    //  G4  POO001  LMV08   G5  POO001  MJ11     G6  ADS001  MJ09
    //  G7  ADS001  LMV07   G8  RED001  MJ14     G9  RED001  LMV08
    //  G10 MAT001  MJ11    G11 MAT001  MJ14     G12 MAT001  LMV13
    //  G13 APM001  MJ09    G14 APM001  LMV08    G15 EST001  MJ09
    //  G16 EST001  MJ11    G17 ADM001  LMV08    G18 ADM001  LMV07
    //  G19 FIN001  MJ09    G20 FIN001  LMV07
    //
    // Reglas por alumno (sin dos grupos a la misma hora, 1 grupo por materia):
    //
    // ISC (G1-G9, G12): deben inscribirse en FBD, POO o ADS, RED, MAT
    //   2026001: G1(LMV07) G4(LMV08) G5(MJ11) G8(MJ14) G12(LMV13)
    //   2026002: G2(MJ09) G4(LMV08) G5(MJ11) G8(MJ14) G12(LMV13)
    //   2026003: G1(LMV07) G4(LMV08) G10(MJ11) G8(MJ14) G3(LMV13)  ← G10=MAT
    //   2026004: G2(MJ09) G9(LMV08) G5(MJ11) G11(MJ14) G3(LMV13)
    //   2026005: G1(LMV07) G9(LMV08) G10(MJ11) G11(MJ14) G12(LMV13)
    //   2026006: G3(LMV13) G4(LMV08) G5(MJ11) G8(MJ14) G6(MJ09)
    //   2026007: G2(MJ09) G9(LMV08) G10(MJ11) G8(MJ14) G12(LMV13)
    //   2026008: G1(LMV07) G4(LMV08) G5(MJ11) G11(MJ14) G3(LMV13)
    //
    // IIA (G10-G16 + MAT): APM, EST, MAT
    //   2026009: G13(MJ09) G14(LMV08) G16(MJ11) G11(MJ14)
    //   2026010: G15(MJ09) G14(LMV08) G10(MJ11) G11(MJ14)  ← G15,G14 solo 2 activos
    //   2026011: G13(MJ09) G14(LMV08) G16(MJ11) G10(MJ11)  ← CONFLICTO G16 y G10 ambos MJ11
    //            → G13(MJ09) G14(LMV08) G16(MJ11)            ← sin MAT en este alumno
    //   2026012: G15(MJ09) G14(LMV08) G10(MJ11) G8(MJ14)   ← G8=RED, IIA puede cursarla
    //   2026013: G13(MJ09) G14(LMV08) G16(MJ11) G11(MJ14)
    //   2026014: G15(MJ09) G14(LMV08) G16(MJ11) G11(MJ14)
    //
    // IGE (G17-G20): ADM, FIN + pueden cursar MAT
    //   2026015: G18(LMV07) G17(LMV08) G19(MJ09) G11(MJ14)
    //   2026016: G20(LMV07) G17(LMV08) G19(MJ09) G10(MJ11)
    //   2026017: G18(LMV07) G17(LMV08) G19(MJ09) G16(MJ11)
    //   2026018: G20(LMV07) G17(LMV08) G19(MJ09) G11(MJ14)
    //   2026019: G18(LMV07) G17(LMV08) G19(MJ09) G10(MJ11)
    //   2026020: G20(LMV07) G17(LMV08) G19(MJ09) G16(MJ11)
    // ══════════════════════════════════════════════════════════════════════

    const inscripciones = [
      // ISC alumnos
      ["26000001", 1],
      ["26000001", 4],
      ["26000001", 5],
      ["26000001", 8],
      ["26000001", 12],
      ["26000002", 2],
      ["26000002", 4],
      ["26000002", 5],
      ["26000002", 8],
      ["26000002", 12],
      ["26000003", 1],
      ["26000003", 4],
      ["26000003", 10],
      ["26000003", 8],
      ["26000003", 3],
      ["26000004", 2],
      ["26000004", 9],
      ["26000004", 5],
      ["26000004", 11],
      ["26000004", 3],
      ["26000005", 1],
      ["26000005", 9],
      ["26000005", 10],
      ["26000005", 11],
      ["26000005", 12],
      ["26000006", 3],
      ["26000006", 4],
      ["26000006", 5],
      ["26000006", 8],
      ["26000006", 6],
      ["26000007", 2],
      ["26000007", 9],
      ["26000007", 10],
      ["26000007", 8],
      ["26000007", 12],
      ["26000008", 1],
      ["26000008", 4],
      ["26000008", 5],
      ["26000008", 11],
      ["26000008", 3],
      // IIA alumnos
      ["26000009", 13],
      ["26000009", 14],
      ["26000009", 16],
      ["26000009", 11],
      ["26000010", 15],
      ["26000010", 14],
      ["26000010", 10],
      ["26000010", 11],
      ["26000011", 13],
      ["26000011", 14],
      ["26000011", 16],
      ["26000012", 15],
      ["26000012", 14],
      ["26000012", 10],
      ["26000012", 8],
      ["26000013", 13],
      ["26000013", 14],
      ["26000013", 16],
      ["26000013", 11],
      ["26000014", 15],
      ["26000014", 14],
      ["26000014", 16],
      ["26000014", 11],
      // IGE alumnos
      ["26000015", 18],
      ["26000015", 17],
      ["26000015", 19],
      ["26000015", 11],
      ["26000016", 20],
      ["26000016", 17],
      ["26000016", 19],
      ["26000016", 10],
      ["26000017", 18],
      ["26000017", 17],
      ["26000017", 19],
      ["26000017", 16],
      ["26000018", 20],
      ["26000018", 17],
      ["26000018", 19],
      ["26000018", 11],
      ["26000019", 18],
      ["26000019", 17],
      ["26000019", 19],
      ["26000019", 10],
      ["26000020", 20],
      ["26000020", 17],
      ["26000020", 19],
      ["26000020", 16],
    ];
    for (const [nc, ig] of inscripciones)
      await q(
        `INSERT IGNORE INTO inscripcion
                 (no_control,id_grupo,fecha_inscripcion,estatus,tipo_curso)
               VALUES (?,?,'2026-01-13','Cursando','Ordinario')`,
        [nc, ig],
      );

    // Historial recursado: 2026001 reprobó FBD en EJ2025 (G21)
    await q(`INSERT IGNORE INTO inscripcion (no_control,id_grupo,fecha_inscripcion,estatus,tipo_curso)
             VALUES ('2026001',21,'2025-01-15','Reprobado','Ordinario')`);
    // Ahora cursa FBD G1 en EJ2026 como Recursado
    await q(
      `UPDATE inscripcion SET tipo_curso='Recursado' WHERE no_control='2026001' AND id_grupo=1`,
    );

    console.log("✓ Inscrip.   → min 5 por grupo, sin conflictos de horario");

    // ══════════════════════════════════════════════════════════════════════
    // 11. TIPOS DE ACTIVIDAD
    // ══════════════════════════════════════════════════════════════════════
    await q(`INSERT IGNORE INTO tipo_actividad (id_tipo,nombre) VALUES
               (1,'Examen'),(2,'Tarea'),(3,'Práctica'),(4,'Proyecto'),(5,'Participación')`);

    // ══════════════════════════════════════════════════════════════════════
    // 11b. ACTIVIDADES PREDEFINIDAS (materia_actividad) — catálogo admin
    //      Estas aparecen en actividadesAdmin.html
    // ══════════════════════════════════════════════════════════════════════
    const actPred = [
      ["FBD001", 1, "Examen U1: Modelo ER", 1],
      ["FBD001", 1, "Tarea: Diagrama ER", 2],
      ["FBD001", 1, "Práctica: Entidades y relaciones", 3],
      ["FBD001", 2, "Examen U2: Modelo Relacional", 1],
      ["FBD001", 2, "Tarea: Normalización", 2],
      ["FBD001", 3, "Examen U3: SQL", 1],
      ["FBD001", 3, "Práctica: Consultas SQL", 3],
      ["FBD001", 3, "Proyecto Final BD", 4],
      ["POO001", 4, "Examen U1: Clases y Objetos", 1],
      ["POO001", 4, "Tarea: Diagrama UML", 2],
      ["POO001", 4, "Práctica: Implementación de clases", 3],
      ["POO001", 5, "Examen U2: Herencia", 1],
      ["POO001", 5, "Práctica: Polimorfismo", 3],
      ["POO001", 6, "Examen U3: Patrones", 1],
      ["POO001", 6, "Proyecto: Patrón de diseño", 4],
      ["ADS001", 7, "Examen U1: Requerimientos", 1],
      ["ADS001", 7, "Tarea: Casos de uso", 2],
      ["ADS001", 8, "Examen U2: Diseño", 1],
      ["ADS001", 8, "Proyecto: Diseño del sistema", 4],
      ["RED001", 9, "Examen U1: OSI y TCP/IP", 1],
      ["RED001", 9, "Tarea: Modelos de red", 2],
      ["RED001", 10, "Examen U2: Enrutamiento", 1],
      ["RED001", 10, "Práctica: Config router", 3],
      ["RED001", 11, "Examen U3: Transporte", 1],
      ["RED001", 12, "Examen U4: Seguridad", 1],
      ["RED001", 12, "Proyecto: Seguridad en red", 4],
      ["APM001", 13, "Examen U1: Fundamentos ML", 1],
      ["APM001", 13, "Tarea: Tipos de aprendizaje", 2],
      ["APM001", 14, "Examen U2: Algoritmos", 1],
      ["APM001", 14, "Práctica: Regresión lineal", 3],
      ["APM001", 15, "Examen U3: Redes Neuronales", 1],
      ["APM001", 15, "Proyecto: Modelo ML", 4],
      ["VIS001", 16, "Examen U1: Procesamiento imágenes", 1],
      ["VIS001", 16, "Práctica: Filtros", 3],
      ["VIS001", 17, "Examen U2: Detección objetos", 1],
      ["VIS001", 17, "Proyecto: Detector objetos", 4],
      ["NLP001", 18, "Examen U1: Tokenización", 1],
      ["NLP001", 18, "Tarea: Análisis léxico", 2],
      ["NLP001", 19, "Examen U2: Modelos de lenguaje", 1],
      ["NLP001", 19, "Práctica: LM básico", 3],
      ["NLP001", 20, "Proyecto Final NLP", 4],
      ["EST001", 21, "Examen U1: Probabilidad", 1],
      ["EST001", 21, "Tarea: Ejercicios probabilidad", 2],
      ["EST001", 22, "Examen U2: Distribuciones", 1],
      ["EST001", 23, "Examen U3: Inferencia", 1],
      ["EST001", 23, "Práctica: Prueba de hipótesis", 3],
      ["EST001", 24, "Examen U4: Regresión", 1],
      ["EST001", 24, "Proyecto: Análisis estadístico", 4],
      ["ADM001", 25, "Examen U1: Teoría Administrativa", 1],
      ["ADM001", 25, "Tarea: Escuelas administrativas", 2],
      ["ADM001", 26, "Examen U2: Planeación", 1],
      ["ADM001", 26, "Proyecto: Plan estratégico", 4],
      ["ADM001", 27, "Examen U3: Control", 1],
      ["FIN001", 28, "Examen U1: Fundamentos", 1],
      ["FIN001", 28, "Tarea: Conceptos financieros", 2],
      ["FIN001", 29, "Examen U2: Estados financieros", 1],
      ["FIN001", 29, "Práctica: Análisis de estados", 3],
      ["FIN001", 30, "Examen U3: Presupuestos", 1],
      ["FIN001", 31, "Examen U4: Inversión", 1],
      ["FIN001", 31, "Proyecto: Plan de inversión", 4],
      ["MKT001", 32, "Examen U1: Investigación mercados", 1],
      ["MKT001", 32, "Práctica: Encuesta mercado", 3],
      ["MKT001", 33, "Examen U2: Estrategias", 1],
      ["MKT001", 33, "Proyecto: Plan de marketing", 4],
      ["LOG001", 34, "Examen U1: Inventarios", 1],
      ["LOG001", 34, "Tarea: Sistemas de inventario", 2],
      ["LOG001", 35, "Examen U2: Distribución", 1],
      ["LOG001", 35, "Práctica: Rutas distribución", 3],
      ["LOG001", 36, "Examen U3: Tecnologías", 1],
      ["LOG001", 36, "Proyecto: Sistema logístico", 4],
      ["MAT001", 37, "Examen U1: Álgebra Lineal", 1],
      ["MAT001", 37, "Tarea: Matrices y vectores", 2],
      ["MAT001", 38, "Examen U2: Cálculo Diferencial", 1],
      ["MAT001", 38, "Práctica: Derivadas", 3],
      ["MAT001", 39, "Examen U3: Cálculo Integral", 1],
      ["MAT001", 39, "Tarea: Integrales", 2],
      ["MAT001", 40, "Examen U4: Ec. Diferenciales", 1],
      ["MAT001", 40, "Práctica: EDOs", 3],
      ["MAT001", 41, "Examen U5: Cálculo Vectorial", 1],
      ["MAT001", 41, "Proyecto Final MAT", 4],
      ["ETI001", 42, "Examen U1: Fundamentos Éticos", 1],
      ["ETI001", 42, "Ensayo: Dilema ético", 2],
      ["ETI001", 43, "Examen U2: Ética Profesional", 1],
      ["ETI001", 43, "Proyecto: Código de ética", 4],
      ["ING001", 44, "Examen U1: Comprensión lectora", 1],
      ["ING001", 44, "Tarea: Resumen texto técnico", 2],
      ["ING001", 45, "Examen U2: Redacción técnica", 1],
      ["ING001", 45, "Proyecto: Presentación técnica", 4],
    ];
    for (const [cm, iu, na, it] of actPred)
      await q(
        `INSERT IGNORE INTO materia_actividad (clave_materia,id_unidad,nombre_actividad,id_tipo) VALUES (?,?,?,?)`,
        [cm, iu, na, it],
      );
    console.log(
      `✓ Act.predef → ${actPred.length} actividades predefinidas para 15 materias`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // 12. ACTIVIDADES — solo para G1 (FBD001) y G10 (MAT001)
    //     Creadas por el maestro, con ponderaciones sumando 100% por unidad
    //     Punto 5: calificaciones capturadas pero en estatus Pendiente
    //              para que se puedan modificar
    // ══════════════════════════════════════════════════════════════════════

    // G1 FBD001 — Unidad 1 (acts 1-3), Unidad 2 (acts 4-5), Unidad 3 abierta (acts 6-7)
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (1, 1,1,'Tarea ER básico',        20,'Formativa',1),
               (2, 1,1,'Examen parcial U1',       60,'Sumativa', 1),
               (3, 1,1,'Participación U1',         20,'Formativa',1),
               (4, 1,2,'Tarea Normalización',      30,'Formativa',1),
               (5, 1,2,'Examen Modelo Relacional', 70,'Sumativa', 1),
               (6, 1,3,'Lab SQL Básico',           40,'Sumativa', 0),
               (7, 1,3,'Proyecto Consultas',        60,'Sumativa', 0)`);

    // G10 MAT001 — Unidad 37 Álgebra (acts 8-10), Unidad 38 Cálculo Dif abierta (acts 11-12)
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (8, 10,37,'Tarea Vectores',         25,'Formativa',1),
               (9, 10,37,'Práctica Matrices',       25,'Formativa',1),
               (10,10,37,'Examen Álgebra Lineal',   50,'Sumativa', 1),
               (11,10,38,'Tarea Límites',           30,'Formativa',0),
               (12,10,38,'Examen Cálculo Diferencial',70,'Sumativa',0)`);

    // ── Calificaciones U1 y U2 de G1 (cerradas, bloqueadas) ───────────────
    // Formato: [no_control, id_actividad, calificacion]
    const calsG1U1U2 = [
      // act 1 (pond 20), act 2 (pond 60), act 3 (pond 20) — U1 cerrada
      ["26000001", 1, 85],
      ["26000001", 2, 72],
      ["26000001", 3, 90],
      ["26000002", 1, 60],
      ["26000002", 2, 58],
      ["26000002", 3, 70],
      ["26000003", 1, 95],
      ["26000003", 2, 88],
      ["26000003", 3, 80],
      ["26000004", 1, 75],
      ["26000004", 2, 80],
      ["26000004", 3, 85],
      ["26000005", 1, 90],
      ["26000005", 2, 92],
      ["26000005", 3, 88],
      ["26000006", 1, 50],
      ["26000006", 2, 55],
      ["26000006", 3, 60],
      ["26000007", 1, 78],
      ["26000007", 2, 82],
      ["26000007", 3, 75],
      ["26000008", 1, 88],
      ["26000008", 2, 70],
      ["26000008", 3, 95],
      // act 4 (pond 30), act 5 (pond 70) — U2 cerrada
      ["26000001", 4, 78],
      ["26000001", 5, 81],
      ["26000002", 4, 65],
      ["26000002", 5, 68],
      ["26000003", 4, 92],
      ["26000003", 5, 95],
      ["26000004", 4, 80],
      ["26000004", 5, 77],
      ["26000005", 4, 88],
      ["26000005", 5, 90],
      ["26000006", 4, 52],
      ["26000006", 5, 58],
      ["26000007", 4, 75],
      ["26000007", 5, 79],
      ["26000008", 4, 85],
      ["26000008", 5, 88],
    ];
    for (const [nc, ia, cal] of calsG1U1U2)
      await q(
        `INSERT IGNORE INTO resultado_actividad
                 (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,'Validada',?)`,
        [nc, ia, cal, M1],
      );

    // ── Calificaciones U3 de G1 (acto 6) — Pendiente, modificables ────────
    const calsG1U3 = [
      ["26000001", 6, 88],
      ["26000002", 6, 71],
      ["26000003", 6, 96],
      ["26000004", 6, 78],
      ["26000005", 6, 92],
      ["26000006", 6, 55],
      ["26000007", 6, 80],
      ["26000008", 6, 85],
    ];
    for (const [nc, ia, cal] of calsG1U3)
      await q(
        `INSERT IGNORE INTO resultado_actividad
                 (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,'Pendiente',?)`,
        [nc, ia, cal, M1],
      );

    // ── Calificaciones U37 de G10 (MAT) — cerrada ─────────────────────────
    const calsG10U37 = [
      // alumnos inscritos en G10: 2026003,2026005,2026007,2026010,2026012,2026016,2026019
      ["26000003", 8, 80],
      ["26000003", 9, 75],
      ["26000003", 10, 85],
      ["26000005", 8, 90],
      ["26000005", 9, 88],
      ["26000005", 10, 92],
      ["26000007", 8, 72],
      ["26000007", 9, 78],
      ["26000007", 10, 70],
      ["26000010", 8, 85],
      ["26000010", 9, 80],
      ["26000010", 10, 88],
      ["26000012", 8, 60],
      ["26000012", 9, 65],
      ["26000012", 10, 58],
      ["26000016", 8, 78],
      ["26000016", 9, 82],
      ["26000016", 10, 80],
      ["26000019", 8, 88],
      ["26000019", 9, 90],
      ["26000019", 10, 92],
    ];
    for (const [nc, ia, cal] of calsG10U37)
      await q(
        `INSERT IGNORE INTO resultado_actividad
                 (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,'Validada',?)`,
        [nc, ia, cal, M5],
      );

    // ── Calificaciones U38 de G10 (act 11) — Pendiente, modificables ──────
    const calsG10U38 = [
      ["26000003", 11, 78],
      ["26000005", 11, 88],
      ["26000007", 11, 65],
      ["26000010", 11, 82],
      ["26000012", 11, 55],
      ["26000016", 11, 75],
      ["26000019", 11, 85],
    ];
    for (const [nc, ia, cal] of calsG10U38)
      await q(
        `INSERT IGNORE INTO resultado_actividad
                 (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,'Pendiente',?)`,
        [nc, ia, cal, M5],
      );

    // ── Calificaciones de unidad (U1 y U2 de G1 calculadas) ───────────────
    // U1: 20% tarea + 60% examen + 20% participación
    const cu1 = [
      ["26000001", 1, 1, 85 * 0.2 + 72 * 0.6 + 90 * 0.2, "Aprobada"], // 77.2
      ["26000002", 1, 1, 60 * 0.2 + 58 * 0.6 + 70 * 0.2, "Reprobada"], // 61.8
      ["26000003", 1, 1, 95 * 0.2 + 88 * 0.6 + 80 * 0.2, "Aprobada"], // 87.8
      ["26000004", 1, 1, 75 * 0.2 + 80 * 0.6 + 85 * 0.2, "Aprobada"], // 80.0
      ["26000005", 1, 1, 90 * 0.2 + 92 * 0.6 + 88 * 0.2, "Aprobada"], // 91.2
      ["26000006", 1, 1, 50 * 0.2 + 55 * 0.6 + 60 * 0.2, "Reprobada"], // 55.0
      ["26000007", 1, 1, 78 * 0.2 + 82 * 0.6 + 75 * 0.2, "Aprobada"], // 80.4
      ["26000008", 1, 1, 88 * 0.2 + 70 * 0.6 + 95 * 0.2, "Aprobada"], // 78.6
    ];
    // U2: 30% tarea + 70% examen
    const cu2 = [
      ["26000001", 2, 1, 78 * 0.3 + 81 * 0.7, "Aprobada"], // 79.8
      ["26000002", 2, 1, 65 * 0.3 + 68 * 0.7, "Reprobada"], // 67.1
      ["26000003", 2, 1, 92 * 0.3 + 95 * 0.7, "Aprobada"], // 94.1
      ["26000004", 2, 1, 80 * 0.3 + 77 * 0.7, "Aprobada"], // 77.9
      ["26000005", 2, 1, 88 * 0.3 + 90 * 0.7, "Aprobada"], // 89.4
      ["26000006", 2, 1, 52 * 0.3 + 58 * 0.7, "Reprobada"], // 56.2
      ["26000007", 2, 1, 75 * 0.3 + 79 * 0.7, "Aprobada"], // 77.8
      ["26000008", 2, 1, 85 * 0.3 + 88 * 0.7, "Aprobada"], // 87.1
    ];
    for (const [nc, idu, idg, prom, est] of [...cu1, ...cu2])
      await q(
        `INSERT IGNORE INTO calificacion_unidad
                 (no_control,id_unidad,id_grupo,promedio_ponderado,calificacion_unidad_final,estatus_unidad)
               VALUES (?,?,?,?,?,?)`,
        [nc, idu, idg, Math.round(prom * 10) / 10, Math.round(prom), est],
      );

    // U37 MAT G10: 25%+25%+50%
    const cu37 = [
      ["26000003", 37, 10, 80 * 0.25 + 75 * 0.25 + 85 * 0.5, "Aprobada"],
      ["26000005", 37, 10, 90 * 0.25 + 88 * 0.25 + 92 * 0.5, "Aprobada"],
      ["26000007", 37, 10, 72 * 0.25 + 78 * 0.25 + 70 * 0.5, "Aprobada"],
      ["26000010", 37, 10, 85 * 0.25 + 80 * 0.25 + 88 * 0.5, "Aprobada"],
      ["26000012", 37, 10, 60 * 0.25 + 65 * 0.25 + 58 * 0.5, "Reprobada"],
      ["26000016", 37, 10, 78 * 0.25 + 82 * 0.25 + 80 * 0.5, "Aprobada"],
      ["26000019", 37, 10, 88 * 0.25 + 90 * 0.25 + 92 * 0.5, "Aprobada"],
    ];
    for (const [nc, idu, idg, prom, est] of cu37)
      await q(
        `INSERT IGNORE INTO calificacion_unidad
                 (no_control,id_unidad,id_grupo,promedio_ponderado,calificacion_unidad_final,estatus_unidad)
               VALUES (?,?,?,?,?,?)`,
        [nc, idu, idg, Math.round(prom * 10) / 10, Math.round(prom), est],
      );

    console.log(
      "✓ Actividades→ G1-FBD (U1,U2 cerradas; U3 pendiente) + G10-MAT",
    );
    console.log("✓ Califs     → U1,U2 validadas; U3,U38 pendientes de guardar");

    // ══════════════════════════════════════════════════════════════════════
    // 13. ACTIVIDADES Y CALIFICACIONES — G17/G18 (ADM001) y G19/G20 (FIN001)
    //     IGE alumnos: 26000015-26000020
    // ══════════════════════════════════════════════════════════════════════

    // G17 ADM001 (M4) — Unidad 25 y 26 cerradas, Unidad 27 abierta
    // G18 ADM001 (M4) — mismas unidades
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (13,17,25,'Examen Teoría Adm',    60,'Sumativa', 1),
               (14,17,25,'Tarea Estructuras Org', 40,'Formativa',1),
               (15,17,26,'Examen Planeación',     70,'Sumativa', 1),
               (16,17,26,'Caso Práctico',         30,'Formativa',1),
               (17,17,27,'Proyecto Final Adm',    60,'Sumativa', 0),
               (18,17,27,'Reporte Escrito',       40,'Formativa',0),
               (19,18,25,'Examen Teoría Adm',    60,'Sumativa', 1),
               (20,18,25,'Tarea Estructuras Org', 40,'Formativa',1),
               (21,18,26,'Examen Planeación',     70,'Sumativa', 1),
               (22,18,26,'Caso Práctico',         30,'Formativa',1),
               (23,18,27,'Proyecto Final Adm',    60,'Sumativa', 0),
               (24,18,27,'Reporte Escrito',       40,'Formativa',0)`);

    // G19 FIN001 (M4) — Unidad 28 y 29 cerradas, Unidad 30 abierta
    // G20 FIN001 (M5) — mismas unidades
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (25,19,28,'Examen Fund Financieros',60,'Sumativa', 1),
               (26,19,28,'Tarea Análisis',          40,'Formativa',1),
               (27,19,29,'Examen Estados Fin',      70,'Sumativa', 1),
               (28,19,29,'Práctica Contable',        30,'Formativa',1),
               (29,19,30,'Examen Presupuestos',      60,'Sumativa', 0),
               (30,19,30,'Proyecto Presupuestal',    40,'Formativa',0),
               (31,20,28,'Examen Fund Financieros',60,'Sumativa', 1),
               (32,20,28,'Tarea Análisis',          40,'Formativa',1),
               (33,20,29,'Examen Estados Fin',      70,'Sumativa', 1),
               (34,20,29,'Práctica Contable',        30,'Formativa',1),
               (35,20,30,'Examen Presupuestos',      60,'Sumativa', 0),
               (36,20,30,'Proyecto Presupuestal',    40,'Formativa',0)`);

    // ── Calificaciones G17 ADM001 U25 y U26 (alumnos: 15,16,17,18,19,20) ─
    const calsG17 = [
      // U25: act13(60%) + act14(40%)
      ["26000015",13,82], ["26000015",14,88],
      ["26000016",13,75], ["26000016",14,70],
      ["26000017",13,90], ["26000017",14,85],
      ["26000018",13,65], ["26000018",14,72],
      ["26000019",13,88], ["26000019",14,92],
      ["26000020",13,78], ["26000020",14,80],
      // U26: act15(70%) + act16(30%)
      ["26000015",15,80], ["26000015",16,85],
      ["26000016",15,68], ["26000016",16,75],
      ["26000017",15,92], ["26000017",16,88],
      ["26000018",15,60], ["26000018",16,65],
      ["26000019",15,85], ["26000019",16,90],
      ["26000020",15,77], ["26000020",16,82],
    ];
    for (const [nc,ia,cal] of calsG17)
      await q(`INSERT IGNORE INTO resultado_actividad
               (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,'Validada',?)`, [nc,ia,cal,M4]);

    // ── Calificaciones G18 ADM001 U25 y U26 (alumnos: 15,17,19 en G18) ──
    // G18: 26000015,26000017,26000019 también + otros según inscripciones
    // Revisando: 15→18, 17→18, 19→18 del array de inscripciones
    const calsG18 = [
      ["26000015",19,79], ["26000015",20,84],
      ["26000017",19,88], ["26000017",20,82],
      ["26000019",19,85], ["26000019",20,90],
      ["26000015",21,77], ["26000015",22,80],
      ["26000017",21,90], ["26000017",22,86],
      ["26000019",21,83], ["26000019",22,88],
    ];
    for (const [nc,ia,cal] of calsG18)
      await q(`INSERT IGNORE INTO resultado_actividad
               (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,'Validada',?)`, [nc,ia,cal,M4]);

    // ── Calificaciones G19 FIN001 U28 y U29 ───────────────────────────────
    // G19: 26000015,26000016,26000017,26000018,26000019,26000020
    const calsG19 = [
      ["26000015",25,84], ["26000015",26,80],
      ["26000016",25,72], ["26000016",26,68],
      ["26000017",25,91], ["26000017",26,88],
      ["26000018",25,63], ["26000018",26,70],
      ["26000019",25,87], ["26000019",26,92],
      ["26000020",25,76], ["26000020",26,79],
      ["26000015",27,82], ["26000015",28,86],
      ["26000016",27,65], ["26000016",28,70],
      ["26000017",27,93], ["26000017",28,89],
      ["26000018",27,58], ["26000018",28,65],
      ["26000019",27,88], ["26000019",28,90],
      ["26000020",27,75], ["26000020",28,80],
    ];
    for (const [nc,ia,cal] of calsG19)
      await q(`INSERT IGNORE INTO resultado_actividad
               (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,'Validada',?)`, [nc,ia,cal,M4]);

    // ── Calificaciones G20 FIN001 U28 y U29 ───────────────────────────────
    // G20: 26000016,26000018,26000020
    const calsG20 = [
      ["26000016",31,70], ["26000016",32,74],
      ["26000018",31,62], ["26000018",32,68],
      ["26000020",31,78], ["26000020",32,82],
      ["26000016",33,67], ["26000016",34,72],
      ["26000018",33,60], ["26000018",34,65],
      ["26000020",33,80], ["26000020",34,78],
    ];
    for (const [nc,ia,cal] of calsG20)
      await q(`INSERT IGNORE INTO resultado_actividad
               (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,'Validada',?)`, [nc,ia,cal,M5]);

    // ── Calificaciones de unidad para G17, G18, G19, G20 ─────────────────
    const cuIGE = [
      // G17 ADM U25: 60%ex + 40%tarea
      ["26000015",25,17, 82*0.6+88*0.4,"Aprobada"],
      ["26000016",25,17, 75*0.6+70*0.4,"Aprobada"],
      ["26000017",25,17, 90*0.6+85*0.4,"Aprobada"],
      ["26000018",25,17, 65*0.6+72*0.4,"Reprobada"],
      ["26000019",25,17, 88*0.6+92*0.4,"Aprobada"],
      ["26000020",25,17, 78*0.6+80*0.4,"Aprobada"],
      // G17 ADM U26: 70%ex + 30%caso
      ["26000015",26,17, 80*0.7+85*0.3,"Aprobada"],
      ["26000016",26,17, 68*0.7+75*0.3,"Aprobada"],
      ["26000017",26,17, 92*0.7+88*0.3,"Aprobada"],
      ["26000018",26,17, 60*0.7+65*0.3,"Reprobada"],
      ["26000019",26,17, 85*0.7+90*0.3,"Aprobada"],
      ["26000020",26,17, 77*0.7+82*0.3,"Aprobada"],
      // G18 ADM U25
      ["26000015",25,18, 79*0.6+84*0.4,"Aprobada"],
      ["26000017",25,18, 88*0.6+82*0.4,"Aprobada"],
      ["26000019",25,18, 85*0.6+90*0.4,"Aprobada"],
      // G18 ADM U26
      ["26000015",26,18, 77*0.7+80*0.3,"Aprobada"],
      ["26000017",26,18, 90*0.7+86*0.3,"Aprobada"],
      ["26000019",26,18, 83*0.7+88*0.3,"Aprobada"],
      // G19 FIN U28: 60%ex+40%tarea
      ["26000015",28,19, 84*0.6+80*0.4,"Aprobada"],
      ["26000016",28,19, 72*0.6+68*0.4,"Aprobada"],
      ["26000017",28,19, 91*0.6+88*0.4,"Aprobada"],
      ["26000018",28,19, 63*0.6+70*0.4,"Reprobada"],
      ["26000019",28,19, 87*0.6+92*0.4,"Aprobada"],
      ["26000020",28,19, 76*0.6+79*0.4,"Aprobada"],
      // G19 FIN U29: 70%ex+30%prac
      ["26000015",29,19, 82*0.7+86*0.3,"Aprobada"],
      ["26000016",29,19, 65*0.7+70*0.3,"Reprobada"],
      ["26000017",29,19, 93*0.7+89*0.3,"Aprobada"],
      ["26000018",29,19, 58*0.7+65*0.3,"Reprobada"],
      ["26000019",29,19, 88*0.7+90*0.3,"Aprobada"],
      ["26000020",29,19, 75*0.7+80*0.3,"Aprobada"],
      // G20 FIN U28
      ["26000016",28,20, 70*0.6+74*0.4,"Aprobada"],
      ["26000018",28,20, 62*0.6+68*0.4,"Reprobada"],
      ["26000020",28,20, 78*0.6+82*0.4,"Aprobada"],
      // G20 FIN U29
      ["26000016",29,20, 67*0.7+72*0.3,"Reprobada"],
      ["26000018",29,20, 60*0.7+65*0.3,"Reprobada"],
      ["26000020",29,20, 80*0.7+78*0.3,"Aprobada"],
    ];
    for (const [nc,idu,idg,prom,est] of cuIGE)
      await q(`INSERT IGNORE INTO calificacion_unidad
               (no_control,id_unidad,id_grupo,promedio_ponderado,calificacion_unidad_final,estatus_unidad)
               VALUES (?,?,?,?,?,?)`,
        [nc,idu,idg, Math.round(prom*10)/10, Math.round(prom), est]);

    console.log("✓ Califs IGE → G17,G18 ADM001 + G19,G20 FIN001 (U1,U2 validadas; U3 pendiente)");


    // ══════════════════════════════════════════════════════════════════════
    // RESUMEN
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n✅ Seed v3 completado.");
    console.log(
      "─────────────────────────────────────────────────────────────",
    );
    console.log("  CREDENCIALES:");
    console.log(`  ${rfcAdmin}  / admin123`);
    console.log("  PELJ800101HVZ  / maestro123   (Juan Pérez)");
    console.log("  GASM850215MVZ  / maestro456   (María García)");
    console.log("  RORH790320HVZ  / maestro789   (Roberto Rodríguez)");
    console.log("  FUMA880510MVZ  / maestro000   (Laura Fuentes)");
    console.log("  CAGR760112HVZ  / maestro111   (Carlos Castro)");
    console.log("  2026001..2026020 / alumno001..alumno020");
    console.log(
      "─────────────────────────────────────────────────────────────",
    );
    console.log("  Periodos: EJ2026=Vigente, V2026 y AD2026=Próximos");
    console.log("  FBD001 G1: U1,U2 cerradas; U3 act.6 pendiente de guardar");
    console.log("  MAT001 G10: U37 cerrada; U38 act.11 pendiente de guardar");
  } catch (err) {
    console.error("❌ Error en seed:", err.message, err);
  } finally {
    db.end();
  }
}

seed();

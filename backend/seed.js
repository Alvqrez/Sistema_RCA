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
                    'lealvarez@itver.edu.mx','leonardo.alvarez@gmail.com','2291000001',1)`,
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
               (clave_materia,nombre_materia,creditos_totales,horas_teoricas,horas_practicas,no_unidades)
             VALUES
               ('FBD001','Fundamentos de Bases de Datos',      5,3,2,3),
               ('POO001','Programación Orientada a Objetos',   5,2,3,3),
               ('ADS001','Análisis y Diseño de Sistemas',      4,3,1,2),
               ('RED001','Redes de Computadoras',              5,2,3,4),
               ('APM001','Aprendizaje Automático',             5,2,3,3),
               ('VIS001','Visión por Computadora',             5,1,4,2),
               ('NLP001','Procesamiento de Lenguaje Natural',  4,2,2,3),
               ('EST001','Estadística para IA',                4,3,1,4),
               ('ADM001','Administración de Empresas',         5,4,1,3),
               ('FIN001','Finanzas Empresariales',             5,3,2,4),
               ('MKT001','Mercadotecnia',                      4,3,1,2),
               ('LOG001','Logística y Cadena de Suministro',   4,2,2,3),
               ('MAT001','Matemáticas Aplicadas',              5,4,1,5),
               ('ETI001','Ética Profesional',                  3,2,1,2),
               ('ING001','Inglés Técnico',                     3,2,1,2)`);
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
        nc: "2026001",
        car: "ISC",
        nom: "Carlos",
        ap: "Ramírez",
        am: "Vega",
        curp: "RAVC030512HVZMRL01",
        fn: "2003-05-12",
        gen: "M",
        ci: "cramirz@itver.edu.mx",
        cp: "c.ramirez@gmail.com",
        cel: "2291201001",
        tel: "2291301001",
        dir: "Calle Pino 10, Col. Las Flores, Veracruz",
        pwd: "alumno001",
      },
      {
        nc: "2026002",
        car: "ISC",
        nom: "Diana",
        ap: "López",
        am: "Cruz",
        curp: "LOCD040820MVZPRA02",
        fn: "2004-08-20",
        gen: "F",
        ci: "dlopez@itver.edu.mx",
        cp: "diana.lopez@gmail.com",
        cel: "2291201002",
        tel: "2291301002",
        dir: "Blvd. Ruiz Cortines 55, Col. Centro, Veracruz",
        pwd: "alumno002",
      },
      {
        nc: "2026003",
        car: "ISC",
        nom: "Ernesto",
        ap: "Martínez",
        am: "Ruiz",
        curp: "MARE030115HVZRNA03",
        fn: "2003-01-15",
        gen: "M",
        ci: "emartinez@itver.edu.mx",
        cp: "e.mtz@gmail.com",
        cel: "2291201003",
        tel: "2291301003",
        dir: "Av. 20 de Noviembre 8, Col. Reforma, Veracruz",
        pwd: "alumno003",
      },
      {
        nc: "2026004",
        car: "ISC",
        nom: "Fernanda",
        ap: "Torres",
        am: "Díaz",
        curp: "TODF040930MVZRZA04",
        fn: "2004-09-30",
        gen: "F",
        ci: "ftorres@itver.edu.mx",
        cp: "fer.torres@gmail.com",
        cel: "2291201004",
        tel: "2291301004",
        dir: "Calle Morelos 33, Col. Jardines, Veracruz",
        pwd: "alumno004",
      },
      {
        nc: "2026005",
        car: "ISC",
        nom: "Rodrigo",
        ap: "Sánchez",
        am: "Luna",
        curp: "SALR031201HVZNCH05",
        fn: "2003-12-01",
        gen: "M",
        ci: "rsanchez@itver.edu.mx",
        cp: "r.sanchez@gmail.com",
        cel: "2291201005",
        tel: "2291301005",
        dir: "Calle Cedro 5, Col. Las Flores, Veracruz",
        pwd: "alumno005",
      },
      {
        nc: "2026006",
        car: "ISC",
        nom: "Alejandra",
        ap: "Morales",
        am: "Jiménez",
        curp: "MOJA040315MVZRLA06",
        fn: "2004-03-15",
        gen: "F",
        ci: "amorales@itver.edu.mx",
        cp: "ale.morales@gmail.com",
        cel: "2291201006",
        tel: "2291301006",
        dir: "Av. Cuauhtémoc 14, Col. Centro, Veracruz",
        pwd: "alumno006",
      },
      {
        nc: "2026007",
        car: "ISC",
        nom: "Brandon",
        ap: "Castillo",
        am: "Reyes",
        curp: "CARB030628HVZRST07",
        fn: "2003-06-28",
        gen: "M",
        ci: "bcastillo@itver.edu.mx",
        cp: "brandon.c@gmail.com",
        cel: "2291201007",
        tel: "2291301007",
        dir: "Calle Roble 22, Col. Framboyanes, Veracruz",
        pwd: "alumno007",
      },
      {
        nc: "2026008",
        car: "ISC",
        nom: "Itzel",
        ap: "Flores",
        am: "Espinoza",
        curp: "FEEI040507MVZRLA08",
        fn: "2004-05-07",
        gen: "F",
        ci: "iflores@itver.edu.mx",
        cp: "itzel.f@gmail.com",
        cel: "2291201008",
        tel: "2291301008",
        dir: "Calle Nogal 9, Col. Reforma, Veracruz",
        pwd: "alumno008",
      },
      // IIA
      {
        nc: "2026009",
        car: "IIA",
        nom: "Sofía",
        ap: "Mendoza",
        am: "Ríos",
        curp: "MERS031205MVZRFA09",
        fn: "2003-12-05",
        gen: "F",
        ci: "smendoza@itver.edu.mx",
        cp: "sofia.mnd@gmail.com",
        cel: "2291201009",
        tel: "2291301009",
        dir: "Calle Roble 7, Col. Framboyanes, Veracruz",
        pwd: "alumno009",
      },
      {
        nc: "2026010",
        car: "IIA",
        nom: "Adrián",
        ap: "Guzmán",
        am: "Flores",
        curp: "GUFA030818HVZRMN10",
        fn: "2003-08-18",
        gen: "M",
        ci: "aguzman@itver.edu.mx",
        cp: "adrian.gz@gmail.com",
        cel: "2291201010",
        tel: "2291301010",
        dir: "Av. Cuauhtémoc 22, Col. Centro, Veracruz",
        pwd: "alumno010",
      },
      {
        nc: "2026011",
        car: "IIA",
        nom: "Valeria",
        ap: "Castillo",
        am: "Mora",
        curp: "CAMV040301MVZRLA11",
        fn: "2004-03-01",
        gen: "F",
        ci: "vcastillo@itver.edu.mx",
        cp: "vale.cast@gmail.com",
        cel: "2291201011",
        tel: "2291301011",
        dir: "Calle Cedro 15, Col. Las Flores, Veracruz",
        pwd: "alumno011",
      },
      {
        nc: "2026012",
        car: "IIA",
        nom: "Daniel",
        ap: "Vargas",
        am: "Peña",
        curp: "VAPD031025HVZRNA12",
        fn: "2003-10-25",
        gen: "M",
        ci: "dvargas@itver.edu.mx",
        cp: "daniel.vg@gmail.com",
        cel: "2291201012",
        tel: "2291301012",
        dir: "Blvd. Adolfo Ruiz 33, Col. Jardines, Veracruz",
        pwd: "alumno012",
      },
      {
        nc: "2026013",
        car: "IIA",
        nom: "Camila",
        ap: "Ortega",
        am: "Nava",
        curp: "ONCA040614MVZRRT13",
        fn: "2004-06-14",
        gen: "F",
        ci: "cortega@itver.edu.mx",
        cp: "camila.og@gmail.com",
        cel: "2291201013",
        tel: "2291301013",
        dir: "Calle Palma 11, Col. Centro, Veracruz",
        pwd: "alumno013",
      },
      {
        nc: "2026014",
        car: "IIA",
        nom: "Javier",
        ap: "Herrera",
        am: "Campos",
        curp: "HECJ031118HVZRCA14",
        fn: "2003-11-18",
        gen: "M",
        ci: "jherrera@itver.edu.mx",
        cp: "javier.hr@gmail.com",
        cel: "2291201014",
        tel: "2291301014",
        dir: "Av. 5 de Mayo 44, Col. Reforma, Veracruz",
        pwd: "alumno014",
      },
      // IGE
      {
        nc: "2026015",
        car: "IGE",
        nom: "Miguel",
        ap: "Herrera",
        am: "Santos",
        curp: "HESM030625HVZRGH15",
        fn: "2003-06-25",
        gen: "M",
        ci: "mherrera@itver.edu.mx",
        cp: "miguel.hr@gmail.com",
        cel: "2291201015",
        tel: "2291301015",
        dir: "Calle Nogal 9, Col. Reforma, Veracruz",
        pwd: "alumno015",
      },
      {
        nc: "2026016",
        car: "IGE",
        nom: "Paola",
        ap: "Ramos",
        am: "Vázquez",
        curp: "RAVP040714MVZRMA16",
        fn: "2004-07-14",
        gen: "F",
        ci: "pramos@itver.edu.mx",
        cp: "paola.rm@gmail.com",
        cel: "2291201016",
        tel: "2291301016",
        dir: "Blvd. Adolfo Ruiz 44, Col. Jardines, Veracruz",
        pwd: "alumno016",
      },
      {
        nc: "2026017",
        car: "IGE",
        nom: "Héctor",
        ap: "Vargas",
        am: "Luna",
        curp: "VALH031109HVZRCA17",
        fn: "2003-11-09",
        gen: "M",
        ci: "hvargas@itver.edu.mx",
        cp: "hector.vg@gmail.com",
        cel: "2291201017",
        tel: "2291301017",
        dir: "Calle Palma 3, Col. Centro, Veracruz",
        pwd: "alumno017",
      },
      {
        nc: "2026018",
        car: "IGE",
        nom: "Mariana",
        ap: "Cruz",
        am: "Ibarra",
        curp: "CRIM040222MVZRNA18",
        fn: "2004-02-22",
        gen: "F",
        ci: "mcruz@itver.edu.mx",
        cp: "mari.cruz@gmail.com",
        cel: "2291201018",
        tel: "2291301018",
        dir: "Calle Fresno 17, Col. Las Flores, Veracruz",
        pwd: "alumno018",
      },
      {
        nc: "2026019",
        car: "IGE",
        nom: "Omar",
        ap: "Delgado",
        am: "Suárez",
        curp: "DESO031004HVZRLA19",
        fn: "2003-10-04",
        gen: "M",
        ci: "odelgado@itver.edu.mx",
        cp: "omar.del@gmail.com",
        cel: "2291201019",
        tel: "2291301019",
        dir: "Av. Independencia 28, Col. Centro, Veracruz",
        pwd: "alumno019",
      },
      {
        nc: "2026020",
        car: "IGE",
        nom: "Lucía",
        ap: "Peña",
        am: "Mora",
        curp: "PEML040809MVZRLA20",
        fn: "2004-08-09",
        gen: "F",
        ci: "lpena@itver.edu.mx",
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
      ["2026001", 1],
      ["2026001", 4],
      ["2026001", 5],
      ["2026001", 8],
      ["2026001", 12],
      ["2026002", 2],
      ["2026002", 4],
      ["2026002", 5],
      ["2026002", 8],
      ["2026002", 12],
      ["2026003", 1],
      ["2026003", 4],
      ["2026003", 10],
      ["2026003", 8],
      ["2026003", 3],
      ["2026004", 2],
      ["2026004", 9],
      ["2026004", 5],
      ["2026004", 11],
      ["2026004", 3],
      ["2026005", 1],
      ["2026005", 9],
      ["2026005", 10],
      ["2026005", 11],
      ["2026005", 12],
      ["2026006", 3],
      ["2026006", 4],
      ["2026006", 5],
      ["2026006", 8],
      ["2026006", 6],
      ["2026007", 2],
      ["2026007", 9],
      ["2026007", 10],
      ["2026007", 8],
      ["2026007", 12],
      ["2026008", 1],
      ["2026008", 4],
      ["2026008", 5],
      ["2026008", 11],
      ["2026008", 3],
      // IIA alumnos
      ["2026009", 13],
      ["2026009", 14],
      ["2026009", 16],
      ["2026009", 11],
      ["2026010", 15],
      ["2026010", 14],
      ["2026010", 10],
      ["2026010", 11],
      ["2026011", 13],
      ["2026011", 14],
      ["2026011", 16],
      ["2026012", 15],
      ["2026012", 14],
      ["2026012", 10],
      ["2026012", 8],
      ["2026013", 13],
      ["2026013", 14],
      ["2026013", 16],
      ["2026013", 11],
      ["2026014", 15],
      ["2026014", 14],
      ["2026014", 16],
      ["2026014", 11],
      // IGE alumnos
      ["2026015", 18],
      ["2026015", 17],
      ["2026015", 19],
      ["2026015", 11],
      ["2026016", 20],
      ["2026016", 17],
      ["2026016", 19],
      ["2026016", 10],
      ["2026017", 18],
      ["2026017", 17],
      ["2026017", 19],
      ["2026017", 16],
      ["2026018", 20],
      ["2026018", 17],
      ["2026018", 19],
      ["2026018", 11],
      ["2026019", 18],
      ["2026019", 17],
      ["2026019", 19],
      ["2026019", 10],
      ["2026020", 20],
      ["2026020", 17],
      ["2026020", 19],
      ["2026020", 16],
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
      ["2026001", 1, 85],
      ["2026001", 2, 72],
      ["2026001", 3, 90],
      ["2026002", 1, 60],
      ["2026002", 2, 58],
      ["2026002", 3, 70],
      ["2026003", 1, 95],
      ["2026003", 2, 88],
      ["2026003", 3, 80],
      ["2026004", 1, 75],
      ["2026004", 2, 80],
      ["2026004", 3, 85],
      ["2026005", 1, 90],
      ["2026005", 2, 92],
      ["2026005", 3, 88],
      ["2026006", 1, 50],
      ["2026006", 2, 55],
      ["2026006", 3, 60],
      ["2026007", 1, 78],
      ["2026007", 2, 82],
      ["2026007", 3, 75],
      ["2026008", 1, 88],
      ["2026008", 2, 70],
      ["2026008", 3, 95],
      // act 4 (pond 30), act 5 (pond 70) — U2 cerrada
      ["2026001", 4, 78],
      ["2026001", 5, 81],
      ["2026002", 4, 65],
      ["2026002", 5, 68],
      ["2026003", 4, 92],
      ["2026003", 5, 95],
      ["2026004", 4, 80],
      ["2026004", 5, 77],
      ["2026005", 4, 88],
      ["2026005", 5, 90],
      ["2026006", 4, 52],
      ["2026006", 5, 58],
      ["2026007", 4, 75],
      ["2026007", 5, 79],
      ["2026008", 4, 85],
      ["2026008", 5, 88],
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
      ["2026001", 6, 88],
      ["2026002", 6, 71],
      ["2026003", 6, 96],
      ["2026004", 6, 78],
      ["2026005", 6, 92],
      ["2026006", 6, 55],
      ["2026007", 6, 80],
      ["2026008", 6, 85],
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
      ["2026003", 8, 80],
      ["2026003", 9, 75],
      ["2026003", 10, 85],
      ["2026005", 8, 90],
      ["2026005", 9, 88],
      ["2026005", 10, 92],
      ["2026007", 8, 72],
      ["2026007", 9, 78],
      ["2026007", 10, 70],
      ["2026010", 8, 85],
      ["2026010", 9, 80],
      ["2026010", 10, 88],
      ["2026012", 8, 60],
      ["2026012", 9, 65],
      ["2026012", 10, 58],
      ["2026016", 8, 78],
      ["2026016", 9, 82],
      ["2026016", 10, 80],
      ["2026019", 8, 88],
      ["2026019", 9, 90],
      ["2026019", 10, 92],
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
      ["2026003", 11, 78],
      ["2026005", 11, 88],
      ["2026007", 11, 65],
      ["2026010", 11, 82],
      ["2026012", 11, 55],
      ["2026016", 11, 75],
      ["2026019", 11, 85],
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
      ["2026001", 1, 1, 85 * 0.2 + 72 * 0.6 + 90 * 0.2, "Aprobada"], // 77.2
      ["2026002", 1, 1, 60 * 0.2 + 58 * 0.6 + 70 * 0.2, "Reprobada"], // 61.8
      ["2026003", 1, 1, 95 * 0.2 + 88 * 0.6 + 80 * 0.2, "Aprobada"], // 87.8
      ["2026004", 1, 1, 75 * 0.2 + 80 * 0.6 + 85 * 0.2, "Aprobada"], // 80.0
      ["2026005", 1, 1, 90 * 0.2 + 92 * 0.6 + 88 * 0.2, "Aprobada"], // 91.2
      ["2026006", 1, 1, 50 * 0.2 + 55 * 0.6 + 60 * 0.2, "Reprobada"], // 55.0
      ["2026007", 1, 1, 78 * 0.2 + 82 * 0.6 + 75 * 0.2, "Aprobada"], // 80.4
      ["2026008", 1, 1, 88 * 0.2 + 70 * 0.6 + 95 * 0.2, "Aprobada"], // 78.6
    ];
    // U2: 30% tarea + 70% examen
    const cu2 = [
      ["2026001", 2, 1, 78 * 0.3 + 81 * 0.7, "Aprobada"], // 79.8
      ["2026002", 2, 1, 65 * 0.3 + 68 * 0.7, "Reprobada"], // 67.1
      ["2026003", 2, 1, 92 * 0.3 + 95 * 0.7, "Aprobada"], // 94.1
      ["2026004", 2, 1, 80 * 0.3 + 77 * 0.7, "Aprobada"], // 77.9
      ["2026005", 2, 1, 88 * 0.3 + 90 * 0.7, "Aprobada"], // 89.4
      ["2026006", 2, 1, 52 * 0.3 + 58 * 0.7, "Reprobada"], // 56.2
      ["2026007", 2, 1, 75 * 0.3 + 79 * 0.7, "Aprobada"], // 77.8
      ["2026008", 2, 1, 85 * 0.3 + 88 * 0.7, "Aprobada"], // 87.1
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
      ["2026003", 37, 10, 80 * 0.25 + 75 * 0.25 + 85 * 0.5, "Aprobada"],
      ["2026005", 37, 10, 90 * 0.25 + 88 * 0.25 + 92 * 0.5, "Aprobada"],
      ["2026007", 37, 10, 72 * 0.25 + 78 * 0.25 + 70 * 0.5, "Aprobada"],
      ["2026010", 37, 10, 85 * 0.25 + 80 * 0.25 + 88 * 0.5, "Aprobada"],
      ["2026012", 37, 10, 60 * 0.25 + 65 * 0.25 + 58 * 0.5, "Reprobada"],
      ["2026016", 37, 10, 78 * 0.25 + 82 * 0.25 + 80 * 0.5, "Aprobada"],
      ["2026019", 37, 10, 88 * 0.25 + 90 * 0.25 + 92 * 0.5, "Aprobada"],
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

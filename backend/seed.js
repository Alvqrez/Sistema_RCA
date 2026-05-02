// backend/seed.js — Seed completo de demostración para Sistema RCA
// Cubre: carreras, periodos, maestros, materias, retícula, unidades, grupos,
//        actividades (bloqueadas), inscripciones, calificaciones, promedios,
//        bonus de unidad, calificacion_final, bonus final y modificación final.
const bcrypt = require("bcrypt");
const db = require("./src/db");

async function seed() {
  try {
    console.log("Iniciando seed completo...\n");

    // ── Carrera ──────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO carrera
               (id_carrera, nombre_carrera, siglas, total_semestres, total_creditos)
             VALUES ('ISC','Ingeniería en Sistemas Computacionales','ISC',9,345),
                    ('IIA','Ingeniería en Inteligencia Artificial','IIA',9,370)`);
    console.log("✓ Carreras   → ISC, IIA");

    // ── Periodo ───────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO periodo_escolar
           (id_periodo, descripcion, fecha_inicio, fecha_fin, estatus)
         VALUES (1,'Enero-Junio 2025','2025-01-13','2025-06-20','Vigente')`);
    console.log("✓ Periodo    → Enero-Junio 2025 (Vigente)");

    // ── Administrador ─────────────────────────────────────────────────────
    const rfcAdmin = "ADMN800101ITV";
    await q(
      `INSERT IGNORE INTO administrador
               (rfc, nombre, apellido_paterno, correo_institucional)
             VALUES (?,'Admin','Sistema','admin@itver.edu.mx')`,
      [rfcAdmin],
    );
    const hashAdmin = await bcrypt.hash("admin123", 10);
    await q(
      `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia)
             VALUES ('admin',?,'administrador',?)`,
      [hashAdmin, rfcAdmin],
    );
    console.log("✓ Admin      → admin / admin123");

    // ── Maestros ──────────────────────────────────────────────────────────
    const rfc1 = "PELJ800101HVZ";
    const rfc2 = "GASM850215MVZ";
    await q(
      `INSERT IGNORE INTO maestro
               (rfc,nombre,apellido_paterno,apellido_materno,curp,correo_institucional,departamento)
             VALUES
               (?,'Juan','Pérez','López','PELJ800101HVZRPN01','jperez@itver.edu.mx','Sistemas Computacionales'),
               (?,'María','García','Soto','GASM850215MVZRTN02','mgarcia@itver.edu.mx','Sistemas Computacionales')`,
      [rfc1, rfc2],
    );
    const hM1 = await bcrypt.hash("maestro123", 10);
    const hM2 = await bcrypt.hash("maestro456", 10);
    await q(
      `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia) VALUES ('profe01',?,'maestro',?)`,
      [hM1, rfc1],
    );
    await q(
      `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia) VALUES ('profe02',?,'maestro',?)`,
      [hM2, rfc2],
    );
    console.log(`✓ Maestros   → profe01/maestro123  |  profe02/maestro456`);

    // ── Materias ──────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO materia
               (clave_materia,nombre_materia,creditos_totales,horas_teoricas,horas_practicas,no_unidades)
             VALUES
               ('FBD001','Fundamentos de Bases de Datos',5,3,2,3),
               ('POO001','Programación Orientada a Objetos',5,2,3,3)`);
    console.log("✓ Materias   → FBD001, POO001");

    // ── Retícula ──────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO reticula (clave_materia,id_carrera,semestre,creditos)
             VALUES ('FBD001','ISC',4,5),('POO001','ISC',3,5),
                    ('FBD001','IIA',4,5),('POO001','IIA',3,5)`);

    // ── Unidades ──────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO unidad (id_unidad,clave_materia,nombre_unidad,estatus) VALUES
             (1,'FBD001','Modelo Entidad-Relación','Cerrada'),
             (2,'FBD001','Modelo Relacional','Cerrada'),
             (3,'FBD001','SQL y Consultas','En curso'),
             (4,'POO001','Clases y Objetos','Cerrada'),
             (5,'POO001','Herencia y Polimorfismo','Cerrada'),
             (6,'POO001','Patrones de Diseño','En curso')`);
    console.log("✓ Unidades   → 6 unidades (3 por materia)");

    // ── Grupos ────────────────────────────────────────────────────────────
    await q(
      `INSERT IGNORE INTO grupo
               (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario)
             VALUES
               (1,'FBD001',?  ,1,35,'Aula 101','Lun-Mié-Vie 07:00-08:00'),
               (2,'FBD001',?  ,1,35,'Aula 102','Mar-Jue 10:00-12:00'),
               (3,'POO001',?  ,1,30,'Lab 201', 'Lun-Mié 09:00-11:00'),
               (4,'POO001',?  ,1,30,'Lab 202', 'Mar-Jue-Vie 13:00-14:00')`,
      [rfc1, rfc2, rfc1, rfc2],
    );
    console.log("✓ Grupos     → 4 grupos (2 por materia)");

    // ── grupo_unidad (ponderaciones por unidad) ───────────────────────────
    await q(`INSERT IGNORE INTO grupo_unidad (id_grupo,id_unidad,ponderacion) VALUES
             (1,1,30),(1,2,40),(1,3,30),
             (2,1,25),(2,2,35),(2,3,40),
             (3,4,33),(3,5,33),(3,6,34),
             (4,4,40),(4,5,40),(4,6,20)`);
    console.log("✓ Pesos/uni  → distintos entre grupos (RN3)");

    // ── Actividades (bloqueadas = cerradas) ───────────────────────────────
    // Grupo 1 FBD — Unidad 1 (Σ=100%, bloqueadas)
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (1, 1,1,'Tarea — ER básico',20,'Formativa',1),
               (2, 1,1,'Examen parcial U1',60,'Sumativa',1),
               (3, 1,1,'Participación',20,'Formativa',1)`);
    // Grupo 1 FBD — Unidad 2 (Σ=100%, bloqueadas)
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (6, 1,2,'Tarea Normalización',30,'Formativa',1),
               (7, 1,2,'Examen Modelo Relacional',70,'Sumativa',1)`);
    // Grupo 1 FBD — Unidad 3 (en curso, Σ=100%)
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (8, 1,3,'Lab SQL Básico',40,'Sumativa',0),
               (9, 1,3,'Proyecto Consultas',60,'Sumativa',0)`);
    // Grupo 2 FBD — Unidad 1 (estructura diferente, Σ=100%, bloqueadas)
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (4, 2,1,'Proyecto ER',50,'Sumativa',1),
               (5, 2,1,'Examen U1',50,'Sumativa',1)`);
    // Grupo 3 POO — Unidad 4 (Σ=100%, bloqueadas)
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (10,3,4,'Práctica Clases',40,'Sumativa',1),
               (11,3,4,'Examen Objetos',40,'Sumativa',1),
               (12,3,4,'Tarea UML',20,'Formativa',1)`);
    // Grupo 3 POO — Unidad 5 (Σ=100%, bloqueadas)
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (13,3,5,'Práctica Herencia',50,'Sumativa',1),
               (14,3,5,'Examen Polimorfismo',50,'Sumativa',1)`);
    // Grupo 3 POO — Unidad 6 (en curso, Σ=100%)
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (15,3,6,'Patrón Singleton',30,'Sumativa',0),
               (16,3,6,'Patrón Factory',30,'Sumativa',0),
               (17,3,6,'Proyecto Patrones',40,'Sumativa',0)`);
    console.log("✓ Actividades → creadas con estructuras distintas por grupo");

    // ── Tipos de actividad en materia (catálogo admin) ────────────────────
    await q(`INSERT IGNORE INTO materia_actividad
               (clave_materia,id_unidad,nombre_actividad,id_tipo)
             VALUES
               ('FBD001',1,'Tarea',2),('FBD001',1,'Examen Parcial',1),
               ('FBD001',2,'Normalización',2),('FBD001',2,'Examen Relacional',1),
               ('POO001',4,'Práctica POO',3),('POO001',4,'Examen POO',1),
               ('POO001',5,'Práctica Herencia',3),('POO001',5,'Examen Final',1)`);

    // ── Alumnos ───────────────────────────────────────────────────────────
    const alumnos = [
      [
        "2023001",
        "Carlos",
        "Ramírez",
        "Vega",
        "cramirz@itver.edu.mx",
        "alumno1",
        "alumno123",
      ],
      [
        "2023002",
        "Diana",
        "López",
        "Cruz",
        "dlopez@itver.edu.mx",
        "alumno2",
        "alumno456",
      ],
      [
        "2023003",
        "Ernesto",
        "Martínez",
        "Ruiz",
        "emartinez@itver.edu.mx",
        "alumno3",
        "alumno789",
      ],
      [
        "2023004",
        "Fernanda",
        "Torres",
        "Díaz",
        "ftorres@itver.edu.mx",
        "alumno4",
        "alumno000",
      ],
    ];
    for (const [mat, nom, ap, am, correo, usr, pwd] of alumnos) {
      await q(
        `INSERT IGNORE INTO alumno
                 (no_control,id_carrera,nombre,apellido_paterno,apellido_materno,correo_institucional)
               VALUES (?,'ISC',?,?,?,?)`,
        [mat, nom, ap, am, correo],
      );
      const h = await bcrypt.hash(pwd, 10);
      await q(
        `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia)
               VALUES (?,?,'alumno',?)`,
        [usr, h, mat],
      );
    }
    console.log("✓ Alumnos    → 2023001–2023004 / alumno1..4");

    // ── Inscripciones ─────────────────────────────────────────────────────
    // Los 4 en Grupo 1 (FBD); 2023001 y 2023002 también en Grupo 3 (POO)
    const insc = [
      ["2023001", 1],
      ["2023002", 1],
      ["2023003", 1],
      ["2023004", 1],
      ["2023001", 3],
      ["2023002", 3],
    ];
    for (const [mat, grp] of insc) {
      await q(
        `INSERT IGNORE INTO inscripcion
                 (no_control,id_grupo,fecha_inscripcion,estatus,tipo_curso)
               VALUES (?  ,?,'2025-01-15','Cursando','Ordinario')`,
        [mat, grp],
      );
    }
    console.log("✓ Inscrip.   → 4 en G1-FBD, 2 en G3-POO");

    // ── Calificaciones de actividades ─────────────────────────────────────
    // Grupo 1 FBD — Unidad 1 (actos 1,2,3)
    const calsG1U1 = [
      ["2023001", 1, 85],
      ["2023001", 2, 72],
      ["2023001", 3, 90],
      ["2023002", 1, 60],
      ["2023002", 2, 55],
      ["2023002", 3, 70],
      ["2023003", 1, 95],
      ["2023003", 2, 88],
      ["2023003", 3, 80],
      ["2023004", 1, 45],
      ["2023004", 2, 50],
      ["2023004", 3, 60],
    ];
    // Grupo 1 FBD — Unidad 2 (actos 6,7)
    const calsG1U2 = [
      ["2023001", 6, 78],
      ["2023001", 7, 81],
      ["2023002", 6, 65],
      ["2023002", 7, 68],
      ["2023003", 6, 92],
      ["2023003", 7, 95],
      ["2023004", 6, 50],
      ["2023004", 7, 55],
    ];
    // Grupo 1 FBD — Unidad 3 en curso (actos 8,9) — parcialmente registradas
    const calsG1U3 = [
      ["2023001", 8, 88],
      ["2023001", 9, null], // Proyecto pendiente
      ["2023002", 8, 71],
      ["2023002", 9, null],
      ["2023003", 8, 95],
      ["2023003", 9, null],
      ["2023004", 8, 55],
      ["2023004", 9, null],
    ];
    // Grupo 3 POO — Unidad 4 (actos 10,11,12)
    const calsG3U4 = [
      ["2023001", 10, 80],
      ["2023001", 11, 75],
      ["2023001", 12, 90],
      ["2023002", 10, 65],
      ["2023002", 11, 60],
      ["2023002", 12, 70],
    ];
    // Grupo 3 POO — Unidad 5 (actos 13,14)
    const calsG3U5 = [
      ["2023001", 13, 82],
      ["2023001", 14, 78],
      ["2023002", 13, 70],
      ["2023002", 14, 65],
    ];

    for (const [mat, act, cal] of [
      ...calsG1U1,
      ...calsG1U2,
      ...calsG3U4,
      ...calsG3U5,
    ]) {
      await q(
        `INSERT IGNORE INTO resultado_actividad
                 (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,'Validada',?)`,
        [mat, act, cal, rfc1],
      );
    }
    // Unidad 3 en curso — solo los que tienen calificación
    for (const [mat, act, cal] of calsG1U3) {
      if (cal !== null) {
        await q(
          `INSERT IGNORE INTO resultado_actividad
                   (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
                 VALUES (?,?,?,'Validada',?)`,
          [mat, act, cal, rfc1],
        );
      }
    }
    console.log("✓ Result.act → Unidades 1,2 cerradas; U3 parcial; POO U4,U5");

    // ── Calificaciones de unidad (Σ ponderado real) ───────────────────────
    // Grupo 1 FBD — Unidad 1: ponds 20%/60%/20%
    // Carlos: 85×0.20 + 72×0.60 + 90×0.20 = 17+43.2+18 = 78.2
    // Diana:  60×0.20 + 55×0.60 + 70×0.20 = 12+33+14   = 59.0
    // Ernesto:95×0.20 + 88×0.60 + 80×0.20 = 19+52.8+16 = 87.8
    // Fernanda:45×0.20+50×0.60 +60×0.20   = 9+30+12    = 51.0
    const cu = [
      // [mat, id_unidad, id_grupo, prom, cal_final, est]
      ["2023001", 1, 1, 78.2, 78.2, "Aprobada"],
      ["2023002", 1, 1, 59.0, 59.0, "Reprobada"],
      ["2023003", 1, 1, 87.8, 87.8, "Aprobada"],
      ["2023004", 1, 1, 51.0, 51.0, "Reprobada"],
      // Unidad 2: ponds 30%/70%
      // Carlos: 78×0.30+81×0.70 = 23.4+56.7 = 80.1
      // Diana:  65×0.30+68×0.70 = 19.5+47.6 = 67.1
      // Ernesto:92×0.30+95×0.70 = 27.6+66.5 = 94.1
      // Fernanda:50×0.30+55×0.70= 15+38.5   = 53.5
      ["2023001", 2, 1, 80.1, 80.1, "Aprobada"],
      ["2023002", 2, 1, 67.1, 67.1, "Reprobada"],
      ["2023003", 2, 1, 94.1, 97.1, "Aprobada"], // +3 bonus
      ["2023004", 2, 1, 53.5, 53.5, "Reprobada"],
      // Grupo 3 POO — Unidad 4: ponds 40%/40%/20%
      // Carlos: 80×0.40+75×0.40+90×0.20 = 32+30+18 = 80.0
      // Diana:  65×0.40+60×0.40+70×0.20 = 26+24+14 = 64.0
      ["2023001", 4, 3, 80.0, 80.0, "Aprobada"],
      ["2023002", 4, 3, 64.0, 64.0, "Reprobada"],
      // Unidad 5: ponds 50%/50%
      // Carlos: 82×0.50+78×0.50 = 41+39 = 80.0
      // Diana:  70×0.50+65×0.50 = 35+32.5 = 67.5
      ["2023001", 5, 3, 80.0, 80.0, "Aprobada"],
      ["2023002", 5, 3, 67.5, 67.5, "Reprobada"],
    ];
    for (const [mat, idu, idg, prom, cal, est] of cu) {
      await q(
        `INSERT IGNORE INTO calificacion_unidad
                 (no_control,id_unidad,id_grupo,promedio_ponderado,calificacion_unidad_final,estatus_unidad)
               VALUES (?,?,?,?,?,?)`,
        [mat, idu, idg, prom, cal, est],
      );
    }
    console.log("✓ Cal.unidad → Unidades 1 y 2 G1-FBD; U4,U5 G3-POO");

    // ── Bonus de unidad (2023003 en Unidad 2 del Grupo 1) ────────────────
    await q(
      `INSERT IGNORE INTO bonusunidad
               (no_control,id_unidad,id_grupo,rfc,puntos_otorgados,justificacion,fecha_asignacion,estatus)
             VALUES ('2023003',2,1,?,3.00,'Excelente participación y liderazgo en proyecto','2025-03-15','Activo')`,
      [rfc1],
    );
    console.log("✓ BonusUnidad→ 3 pts a 2023003 en U2-G1");

    // ── Calificación final (promedio de unidades 1 y 2) ───────────────────
    // Peso U1=30%, U2=40% del 70% total (U3 no cerrada, solo 2 unidades)
    // Para fines de demo usamos promedio simple de U1 y U2
    // Carlos:  (78.2+80.1)/2  = 79.15 → 79
    // Diana:   (59.0+67.1)/2  = 63.05 → 63
    // Ernesto: (87.8+97.1)/2  = 92.45 → 92  (U2 incluye bonus)
    // Fernanda:(51.0+53.5)/2  = 52.25 → 52
    const cf = [
      ["2023001", 1, 79.15, 79.0, "Aprobado"],
      ["2023002", 1, 63.05, 63.0, "Reprobado"],
      ["2023003", 1, 92.45, 92.0, "Aprobado"],
      ["2023004", 1, 52.25, 52.0, "Reprobado"],
      // POO Grupo 3 — solo 2 unidades cerradas
      ["2023001", 3, 80.0, 80.0, "Aprobado"],
      ["2023002", 3, 65.75, 65.0, "Reprobado"],
    ];
    for (const [mat, idg, prom, oficial, est] of cf) {
      await q(
        `INSERT IGNORE INTO calificacion_final
                 (no_control,id_grupo,promedio_unidades,calificacion_oficial,estatus_final)
               VALUES (?,?,?,?,?)`,
        [mat, idg, prom, oficial, est],
      );
    }
    console.log("✓ Cal.final  → G1-FBD y G3-POO calculadas");

    // ── Bonus final (2023002 en Grupo 1, +8 pts para aprobar) ────────────
    await q(
      `INSERT IGNORE INTO bonusfinal
               (no_control,id_grupo,rfc,puntos_otorgados,justificacion,fecha_asignacion,estatus)
             VALUES ('2023002',1,?,8.00,'Reconocimiento por mejora continua y asistencia perfecta','2025-05-10','Activo')`,
      [rfc1],
    );
    await q(`UPDATE calificacion_final
             SET calificacion_oficial=71, estatus_final='Aprobado'
             WHERE no_control='2023002' AND id_grupo=1`);
    console.log("✓ BonusFinal → 8 pts a 2023002 G1 (63→71 Aprobado)");

    // ── Modificación final (2023004 en Grupo 1) ──────────────────────────
    await q(
      `INSERT IGNORE INTO modificacionfinal
               (no_control,id_grupo,rfc,calif_original,calif_modificada,justificacion,fecha_modificacion,estatus)
             VALUES ('2023004',1,?,52.00,70.00,'Corrección por error en captura de examen final acordada en academia','2025-05-20 10:30:00','Aplicado')`,
      [rfc1],
    );
    await q(`UPDATE calificacion_final
             SET calificacion_oficial=70, estatus_final='Aprobado'
             WHERE no_control='2023004' AND id_grupo=1`);
    console.log("✓ ModifFinal → 2023004 G1 corregida (52→70 Aprobado)");

    // ── Resumen final ─────────────────────────────────────────────────────
    console.log("\n✅ Seed completado exitosamente.\n");
    console.log("─────────────────────────────────────────────────────");
    console.log("  CREDENCIALES:");
    console.log("  admin              / admin123");
    console.log(`  profe01            / maestro123  (Juan Pérez)`);
    console.log(`  profe02            / maestro456  (María García)`);
    console.log("  alumno1            / alumno123   (Carlos Ramírez  2023001)");
    console.log(
      "  alumno2            / alumno456   (Diana López      2023002)",
    );
    console.log(
      "  alumno3            / alumno789   (Ernesto Martínez 2023003)",
    );
    console.log(
      "  alumno4            / alumno000   (Fernanda Torres  2023004)",
    );
    console.log("─────────────────────────────────────────────────────");
    console.log("  ESCENARIOS DEMOSTRADOS:");
    console.log("  • 2 materias × 2 grupos (actividades distintas = RN1,RN2)");
    console.log("  • Pesos distintos por unidad y grupo (= RN3)");
    console.log("  • U1 y U2 cerradas; U3 y U6 en curso");
    console.log("  • Bonus de unidad: 2023003 +3 pts en U2-G1");
    console.log("  • Bonus final:     2023002 +8 pts en G1 (63→71)");
    console.log("  • Modificación:    2023004 ajuste manual G1 (52→70)");
    console.log("─────────────────────────────────────────────────────");
  } catch (err) {
    console.error("❌ Error en seed:", err.message);
    console.error(err.stack);
  } finally {
    db.end();
  }
}

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

seed();

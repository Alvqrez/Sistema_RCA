// backend/seed.js — Seed completo con todos los campos rellenos
const bcrypt = require("bcrypt");
const db = require("./src/db");

async function seed() {
  try {
    console.log("Iniciando seed completo...\n");

    // ── Carreras ──────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO carrera
               (id_carrera, nombre_carrera, siglas, plan_estudios, total_semestres, total_creditos)
             VALUES
               ('ISC','Ingeniería en Sistemas Computacionales','ISC','ISIC-2010-224',9,345),
               ('IIA','Ingeniería en Inteligencia Artificial','IIA','IAIA-2022-310',9,370)`);
    console.log("✓ Carreras   → ISC, IIA");

    // ── Periodo ───────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO periodo_escolar
               (id_periodo, descripcion, fecha_inicio, fecha_fin, estatus)
             VALUES (1,'Enero-Junio','2025-01-13','2025-06-20','Vigente')`);
    console.log("✓ Periodo    → Enero-Junio 2025 (Vigente)");

    // ── Administrador ─────────────────────────────────────────────────────
    const rfcAdmin = "ADMN800101ITV";
    await q(
      `INSERT IGNORE INTO administrador
               (rfc, nombre, apellido_paterno, apellido_materno,
                correo_institucional, correo_personal, tel_celular, activo)
             VALUES (?,  'Admin','Sistema','TecNM',
                    'admin@itver.edu.mx','admin.sistema@gmail.com','2291000001',1)`,
      [rfcAdmin]
    );
    const hashAdmin = await bcrypt.hash("admin123", 10);
    await q(
      `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia)
             VALUES (?,?,'administrador',?)`,
      [rfcAdmin, hashAdmin, rfcAdmin]
    );
    console.log(`✓ Admin      → ${rfcAdmin} / admin123`);

    // ── Maestros ──────────────────────────────────────────────────────────
    const rfc1 = "PELJ800101HVZ";
    const rfc2 = "GASM850215MVZ";
    await q(
      `INSERT IGNORE INTO maestro
               (rfc, nombre, apellido_paterno, apellido_materno,
                curp, fecha_nacimiento, genero,
                correo_institucional, correo_personal,
                tel_celular, tel_oficina, direccion,
                tipo_contrato, estatus, fecha_ingreso,
                grado_academico, especialidad, departamento)
             VALUES
               (?, 'Juan','Pérez','López',
                'PELJ800101HVZRPN01','1980-01-01','M',
                'jperez@itver.edu.mx','juan.perez@gmail.com',
                '2291100001','2291000100','Av. Orizaba 45, Col. Centro, Veracruz',
                'Tiempo completo','Activo','2010-08-15',
                'Maestría','Bases de Datos y Sistemas Distribuidos','Sistemas Computacionales'),
               (?, 'María','García','Soto',
                'GASM850215MVZRTN02','1985-02-15','F',
                'mgarcia@itver.edu.mx','maria.garcia@gmail.com',
                '2291100002','2291000101','Calle Magnolia 12, Col. Jardines, Veracruz',
                'Tiempo completo','Activo','2012-01-10',
                'Maestría','Inteligencia Artificial y Aprendizaje Automático','Sistemas Computacionales')`,
      [rfc1, rfc2]
    );
    const hM1 = await bcrypt.hash("maestro123", 10);
    const hM2 = await bcrypt.hash("maestro456", 10);
    await q(
      `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia) VALUES (?,?,'maestro',?)`,
      [rfc1, hM1, rfc1]
    );
    await q(
      `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia) VALUES (?,?,'maestro',?)`,
      [rfc2, hM2, rfc2]
    );
    console.log(`✓ Maestros   → ${rfc1}/maestro123  |  ${rfc2}/maestro456`);

    // ── Materias ──────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO materia
               (clave_materia, nombre_materia, creditos_totales,
                horas_teoricas, horas_practicas, no_unidades)
             VALUES
               ('FBD001','Fundamentos de Bases de Datos',5,3,2,3),
               ('POO001','Programación Orientada a Objetos',5,2,3,3)`);
    console.log("✓ Materias   → FBD001, POO001");

    // ── Retícula ──────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO reticula (clave_materia,id_carrera,semestre,creditos)
             VALUES
               ('FBD001','ISC',4,5),('POO001','ISC',3,5),
               ('FBD001','IIA',4,5),('POO001','IIA',3,5)`);
    console.log("✓ Retícula   → FBD y POO en ISC e IIA");

    // ── Unidades ──────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO unidad (id_unidad,clave_materia,nombre_unidad) VALUES
             (1,'FBD001','Modelo Entidad-Relación'),
             (2,'FBD001','Modelo Relacional'),
             (3,'FBD001','SQL y Consultas'),
             (4,'POO001','Clases y Objetos'),
             (5,'POO001','Herencia y Polimorfismo'),
             (6,'POO001','Patrones de Diseño')`);
    console.log("✓ Unidades   → 6 unidades (3 por materia)");

    // ── Grupos ────────────────────────────────────────────────────────────
    await q(
      `INSERT IGNORE INTO grupo
               (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario,estatus)
             VALUES
               (1,'FBD001',?,1,35,'Aula 101','Lun-Mié-Vie 07:00-08:00','Activo'),
               (2,'FBD001',?,1,35,'Aula 102','Mar-Jue 10:00-12:00','Activo'),
               (3,'POO001',?,1,30,'Lab 201','Lun-Mié 09:00-11:00','Activo'),
               (4,'POO001',?,1,30,'Lab 202','Mar-Jue-Vie 13:00-14:00','Activo')`,
      [rfc1, rfc2, rfc1, rfc2]
    );
    console.log("✓ Grupos     → 4 grupos (2 por materia)");

    // ── grupo_unidad ──────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO grupo_unidad (id_grupo,id_unidad,ponderacion) VALUES
             (1,1,30),(1,2,40),(1,3,30),
             (2,1,25),(2,2,35),(2,3,40),
             (3,4,33),(3,5,33),(3,6,34),
             (4,4,40),(4,5,40),(4,6,20)`);
    console.log("✓ Pesos/uni  → distintos entre grupos (RN3)");

    // ── Actividades ───────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO actividad
               (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES
               (1, 1,1,'Tarea — ER básico',20,'Formativa',1),
               (2, 1,1,'Examen parcial U1',60,'Sumativa',1),
               (3, 1,1,'Participación',20,'Formativa',1),
               (6, 1,2,'Tarea Normalización',30,'Formativa',1),
               (7, 1,2,'Examen Modelo Relacional',70,'Sumativa',1),
               (8, 1,3,'Lab SQL Básico',40,'Sumativa',0),
               (9, 1,3,'Proyecto Consultas',60,'Sumativa',0),
               (4, 2,1,'Proyecto ER',50,'Sumativa',1),
               (5, 2,1,'Examen U1',50,'Sumativa',1),
               (10,3,4,'Práctica Clases',40,'Sumativa',1),
               (11,3,4,'Examen Objetos',40,'Sumativa',1),
               (12,3,4,'Tarea UML',20,'Formativa',1),
               (13,3,5,'Práctica Herencia',50,'Sumativa',1),
               (14,3,5,'Examen Polimorfismo',50,'Sumativa',1),
               (15,3,6,'Patrón Singleton',30,'Sumativa',0),
               (16,3,6,'Patrón Factory',30,'Sumativa',0),
               (17,3,6,'Proyecto Patrones',40,'Sumativa',0)`);
    console.log("✓ Actividades → estructuras distintas por grupo");

    // ── Catálogo admin materia_actividad ──────────────────────────────────
    await q(`INSERT IGNORE INTO materia_actividad
               (clave_materia,id_unidad,nombre_actividad,id_tipo)
             VALUES
               ('FBD001',1,'Tarea ER',2),('FBD001',1,'Examen Parcial',1),
               ('FBD001',2,'Tarea Normalización',2),('FBD001',2,'Examen Relacional',1),
               ('POO001',4,'Práctica POO',3),('POO001',4,'Examen POO',1),
               ('POO001',5,'Práctica Herencia',3),('POO001',5,'Examen Final',1)`);

    // ── Alumnos ───────────────────────────────────────────────────────────
    const alumnos = [
      { mat:"2023001", nom:"Carlos",   ap:"Ramírez",   am:"Vega",  curp:"RAVC030512HVZMRLA8", fn:"2003-05-12", gen:"M", correo:"cramirz@itver.edu.mx",    cp:"cramirz@gmail.com",      cel:"2291200001", tel:"2291300001", dir:"Calle Pino 10, Col. Las Flores, Veracruz",   usr:"2023001", pwd:"alumno123" },
      { mat:"2023002", nom:"Diana",    ap:"López",     am:"Cruz",  curp:"LOCD040820MVZPRA5", fn:"2004-08-20", gen:"F", correo:"dlopez@itver.edu.mx",     cp:"diana.lopez@gmail.com",  cel:"2291200002", tel:"2291300002", dir:"Blvd. Ruiz Cortines 55, Col. Centro, Veracruz", usr:"2023002", pwd:"alumno456" },
      { mat:"2023003", nom:"Ernesto",  ap:"Martínez",  am:"Ruiz",  curp:"MARE030115HVZRNA3", fn:"2003-01-15", gen:"M", correo:"emartinez@itver.edu.mx",  cp:"ernesto.mtz@gmail.com",  cel:"2291200003", tel:"2291300003", dir:"Av. 20 de Noviembre 8, Col. Reforma, Veracruz", usr:"2023003", pwd:"alumno789" },
      { mat:"2023004", nom:"Fernanda", ap:"Torres",    am:"Díaz",  curp:"TODF040930MVZRZA1", fn:"2004-09-30", gen:"F", correo:"ftorres@itver.edu.mx",    cp:"fer.torres@gmail.com",   cel:"2291200004", tel:"2291300004", dir:"Calle Morelos 33, Col. Jardines, Veracruz",  usr:"2023004", pwd:"alumno000" },
    ];
    for (const a of alumnos) {
      await q(
        `INSERT IGNORE INTO alumno
                 (no_control, id_carrera, nombre, apellido_paterno, apellido_materno,
                  curp, fecha_nacimiento, genero,
                  correo_institucional, correo_personal,
                  tel_celular, tel_casa, direccion)
               VALUES (?, 'ISC', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.mat, a.nom, a.ap, a.am, a.curp, a.fn, a.gen,
         a.correo, a.cp, a.cel, a.tel, a.dir]
      );
      const h = await bcrypt.hash(a.pwd, 10);
      await q(
        `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia)
               VALUES (?,?,'alumno',?)`,
        [a.mat, h, a.mat]
      );
    }
    console.log("✓ Alumnos    → 2023001–2023004 con todos los campos");

    // ── Inscripciones ─────────────────────────────────────────────────────
    const insc = [
      ["2023001",1],["2023002",1],["2023003",1],["2023004",1],
      ["2023001",3],["2023002",3],
    ];
    for (const [mat,grp] of insc) {
      await q(
        `INSERT IGNORE INTO inscripcion
                 (no_control,id_grupo,fecha_inscripcion,estatus,tipo_curso)
               VALUES (?,?,'2025-01-15','Cursando','Ordinario')`,
        [mat, grp]
      );
    }
    console.log("✓ Inscrip.   → 4 en G1-FBD, 2 en G3-POO");

    // ── Calificaciones de actividades ─────────────────────────────────────
    const cals = [
      // G1 FBD — U1 (acts 1,2,3)
      ["2023001",1,85],["2023001",2,72],["2023001",3,90],
      ["2023002",1,60],["2023002",2,55],["2023002",3,70],
      ["2023003",1,95],["2023003",2,88],["2023003",3,80],
      ["2023004",1,45],["2023004",2,50],["2023004",3,60],
      // G1 FBD — U2 (acts 6,7)
      ["2023001",6,78],["2023001",7,81],
      ["2023002",6,65],["2023002",7,68],
      ["2023003",6,92],["2023003",7,95],
      ["2023004",6,50],["2023004",7,55],
      // G1 FBD — U3 parcial (solo act 8)
      ["2023001",8,88],["2023002",8,71],["2023003",8,95],["2023004",8,55],
      // G3 POO — U4 (acts 10,11,12)
      ["2023001",10,80],["2023001",11,75],["2023001",12,90],
      ["2023002",10,65],["2023002",11,60],["2023002",12,70],
      // G3 POO — U5 (acts 13,14)
      ["2023001",13,82],["2023001",14,78],
      ["2023002",13,70],["2023002",14,65],
    ];
    for (const [mat,act,cal] of cals) {
      await q(
        `INSERT IGNORE INTO resultado_actividad
                 (no_control,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,'Validada',?)`,
        [mat, act, cal, rfc1]
      );
    }
    console.log("✓ Result.act → U1,U2 cerradas; U3 parcial; POO U4,U5");

    // ── Calificaciones de unidad ──────────────────────────────────────────
    // G1 U1: ponds 20/60/20
    // Carlos:   85×.20+72×.60+90×.20 = 78.2   Diana: 59.0   Ernesto: 87.8   Fer: 51.0
    // G1 U2: ponds 30/70
    // Carlos:   78×.30+81×.70 = 80.1  Diana: 67.1  Ernesto: 94.1  Fer: 53.5
    // G3 U4: ponds 40/40/20
    // Carlos: 80×.40+75×.40+90×.20=80.0  Diana: 64.0
    // G3 U5: ponds 50/50
    // Carlos: 82×.50+78×.50=80.0  Diana: 67.5
    const cu = [
      ["2023001",1,1, 78.2, 78.2,"Aprobada"],
      ["2023002",1,1, 59.0, 59.0,"Reprobada"],
      ["2023003",1,1, 87.8, 87.8,"Aprobada"],
      ["2023004",1,1, 51.0, 51.0,"Reprobada"],
      ["2023001",2,1, 80.1, 80.1,"Aprobada"],
      ["2023002",2,1, 67.1, 67.1,"Reprobada"],
      ["2023003",2,1, 94.1, 97.1,"Aprobada"], // +3 bonus
      ["2023004",2,1, 53.5, 53.5,"Reprobada"],
      ["2023001",4,3, 80.0, 80.0,"Aprobada"],
      ["2023002",4,3, 64.0, 64.0,"Reprobada"],
      ["2023001",5,3, 80.0, 80.0,"Aprobada"],
      ["2023002",5,3, 67.5, 67.5,"Reprobada"],
    ];
    for (const [mat,idu,idg,prom,cal,est] of cu) {
      await q(
        `INSERT IGNORE INTO calificacion_unidad
                 (no_control,id_unidad,id_grupo,promedio_ponderado,calificacion_unidad_final,estatus_unidad)
               VALUES (?,?,?,?,?,?)`,
        [mat, idu, idg, prom, cal, est]
      );
    }
    console.log("✓ Cal.unidad → U1 y U2 G1-FBD; U4,U5 G3-POO");

    // ── Bonus de unidad ───────────────────────────────────────────────────
    await q(
      `INSERT IGNORE INTO bonusunidad
               (no_control,id_unidad,id_grupo,rfc,puntos_otorgados,
                justificacion,fecha_asignacion,estatus)
             VALUES ('2023003',2,1,?,3.00,
                    'Excelente participación y liderazgo en proyecto colaborativo',
                    '2025-03-15','Activo')`,
      [rfc1]
    );
    console.log("✓ BonusUnidad→ 3 pts a 2023003 en U2-G1");

    // ── Calificación final ────────────────────────────────────────────────
    // Promedio simple U1 y U2 (demo)
    // Carlos: 79.15→79  Diana: 63.05→63  Ernesto: 92.45→92  Fernanda: 52.25→52
    const cf = [
      ["2023001",1, 79.15, 79.0,"Aprobado"],
      ["2023002",1, 63.05, 63.0,"Reprobado"],
      ["2023003",1, 92.45, 92.0,"Aprobado"],
      ["2023004",1, 52.25, 52.0,"Reprobado"],
      ["2023001",3, 80.0,  80.0,"Aprobado"],
      ["2023002",3, 65.75, 65.0,"Reprobado"],
    ];
    for (const [mat,idg,prom,oficial,est] of cf) {
      await q(
        `INSERT IGNORE INTO calificacion_final
                 (no_control,id_grupo,promedio_unidades,calificacion_oficial,estatus_final)
               VALUES (?,?,?,?,?)`,
        [mat, idg, prom, oficial, est]
      );
    }
    console.log("✓ Cal.final  → G1-FBD y G3-POO calculadas");

    // ── Bonus final ───────────────────────────────────────────────────────
    await q(
      `INSERT IGNORE INTO bonusfinal
               (no_control,id_grupo,rfc,puntos_otorgados,
                justificacion,fecha_asignacion,estatus)
             VALUES ('2023002',1,?,8.00,
                    'Reconocimiento por mejora continua y asistencia perfecta durante el semestre',
                    '2025-05-10','Activo')`,
      [rfc1]
    );
    await q(`UPDATE calificacion_final
             SET calificacion_oficial=71, estatus_final='Aprobado'
             WHERE no_control='2023002' AND id_grupo=1`);
    console.log("✓ BonusFinal → 8 pts a 2023002 G1 (63→71 Aprobado)");

    // ── Modificación final ────────────────────────────────────────────────
    await q(
      `INSERT IGNORE INTO modificacionfinal
               (no_control,id_grupo,rfc,calif_original,calif_modificada,
                justificacion,fecha_modificacion,estatus)
             VALUES ('2023004',1,?,52.00,70.00,
                    'Corrección por error en captura de examen final acordada en academia',
                    '2025-05-20 10:30:00','Aplicado')`,
      [rfc1]
    );
    await q(`UPDATE calificacion_final
             SET calificacion_oficial=70, estatus_final='Aprobado'
             WHERE no_control='2023004' AND id_grupo=1`);
    console.log("✓ ModifFinal → 2023004 G1 corregida (52→70 Aprobado)");

    // ── Resumen ───────────────────────────────────────────────────────────
    console.log("\n✅ Seed completado exitosamente.\n");
    console.log("─────────────────────────────────────────────────────");
    console.log("  CREDENCIALES:");
    console.log(`  ${rfcAdmin}   / admin123    (Admin Sistema)`);
    console.log(`  ${rfc1}  / maestro123  (Juan Pérez)`);
    console.log(`  ${rfc2}  / maestro456  (María García)`);
    console.log("  2023001  / alumno123   (Carlos Ramírez)");
    console.log("  2023002  / alumno456   (Diana López)");
    console.log("  2023003  / alumno789   (Ernesto Martínez)");
    console.log("  2023004  / alumno000   (Fernanda Torres)");
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

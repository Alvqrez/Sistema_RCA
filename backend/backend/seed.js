// backend/seed.js
const bcrypt = require("bcrypt");
const db = require("./src/db");

async function seed() {
  try {
    console.log("Iniciando seed...\n");

    // ── Carrera ───────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO carrera (id_carrera, nombre_carrera, siglas, total_semestres, total_creditos)
             VALUES ('ISC','Ingeniería en Sistemas Computacionales','ISC',9,345)`);

    // ── Periodo escolar ─────────────────────────────────────────────
    await q(`INSERT IGNORE INTO periodo_escolar (id_periodo, descripcion, anio, fecha_inicio, fecha_fin, estatus)
             VALUES (1,'Enero-Junio 2025',2025,'2025-01-13','2025-06-20','Vigente')`);
    console.log("✓ Periodo  →  Enero-Junio 2025 (Vigente)");

    // ── Administrador ─────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO administrador (id_admin, nombre, apellido_paterno, correo_institucional)
             VALUES (1,'Admin','Sistema','admin@itver.edu.mx')`);
    const hashAdmin = await bcrypt.hash("admin123", 10);
    await q(
      `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia) VALUES (?,?,'administrador',1)`,
      ["admin", hashAdmin],
    );
    console.log("✓ Admin    →  admin / admin123");

    // ── 2 Maestros ────────────────────────────────────────────────────────
    // RFC actúa como PK y como username automático
    const rfc1 = "PELJ800101HVZ";
    const rfc2 = "GASM850215MVZ";

    await q(`INSERT IGNORE INTO maestro (rfc, nombre, apellido_paterno, apellido_materno, curp, correo_institucional, departamento)
             VALUES (?,  'Juan','Pérez','López','PELJ800101HVZRPN01','jperez@itver.edu.mx','Sistemas Computacionales')`,
      [rfc1]);
    await q(`INSERT IGNORE INTO maestro (rfc, nombre, apellido_paterno, apellido_materno, curp, correo_institucional, departamento)
             VALUES (?, 'María','García','Soto','GASM850215MVZRTN02','mgarcia@itver.edu.mx','Sistemas Computacionales')`,
      [rfc2]);

    const hM1 = await bcrypt.hash("maestro123", 10);
    const hM2 = await bcrypt.hash("maestro456", 10);
    // username = RFC, id_referencia = RFC
    await q(
      `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia) VALUES (?,?,'maestro',?)`,
      [rfc1, hM1, rfc1],
    );
    await q(
      `INSERT IGNORE INTO usuario (username, pwd, rol, id_referencia) VALUES (?,?,'maestro',?)`,
      [rfc2, hM2, rfc2],
    );
    console.log(`✓ Maestro1 →  ${rfc1} / maestro123`);
    console.log(`✓ Maestro2 →  ${rfc2} / maestro456`);

    // ── 2 Materias ────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO materia (clave_materia,nombre_materia,creditos_totales,horas_teoricas,horas_practicas,no_unidades)
             VALUES ('FBD001','Fundamentos de Bases de Datos',5,3,2,3)`);
    await q(`INSERT IGNORE INTO materia (clave_materia,nombre_materia,creditos_totales,horas_teoricas,horas_practicas,no_unidades)
             VALUES ('POO001','Programación Orientada a Objetos',5,2,3,3)`);
    console.log("✓ Materias →  FBD001, POO001");

    // ── Retícula ──────────────────────────────────────────────────────────
    await q(`INSERT IGNORE INTO reticula (clave_materia,id_carrera,semestre,creditos) VALUES ('FBD001','ISC',4,5)`);
    await q(`INSERT IGNORE INTO reticula (clave_materia,id_carrera,semestre,creditos) VALUES ('POO001','ISC',3,5)`);

    // ── Unidades ─────────────────────────────────────────────────────────
    // FBD001 → 3 unidades
    await q(`INSERT IGNORE INTO unidad (id_unidad,clave_materia,nombre_unidad,estatus) VALUES (1,'FBD001','Modelo Entidad-Relación','Cerrada')`);
    await q(`INSERT IGNORE INTO unidad (id_unidad,clave_materia,nombre_unidad,estatus) VALUES (2,'FBD001','Modelo Relacional','Cerrada')`);
    await q(`INSERT IGNORE INTO unidad (id_unidad,clave_materia,nombre_unidad,estatus) VALUES (3,'FBD001','SQL y Consultas','En curso')`);
    // POO001 → 3 unidades
    await q(`INSERT IGNORE INTO unidad (id_unidad,clave_materia,nombre_unidad,estatus) VALUES (4,'POO001','Clases y Objetos','Cerrada')`);
    await q(`INSERT IGNORE INTO unidad (id_unidad,clave_materia,nombre_unidad,estatus) VALUES (5,'POO001','Herencia y Polimorfismo','En curso')`);
    await q(`INSERT IGNORE INTO unidad (id_unidad,clave_materia,nombre_unidad,estatus) VALUES (6,'POO001','Patrones de Diseño','Pendiente')`);
    console.log("✓ Unidades →  6 unidades (3 por materia)");

    // ── 4 Grupos (2 por materia) ──────────────────────────────────────────
    // FBD Grupo A (rfc1), FBD Grupo B (rfc2)
    await q(`INSERT IGNORE INTO grupo (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario)
             VALUES (1,'FBD001',?,1,35,'Aula 101','Lun-Mié-Vie 07:00-08:00')`, [rfc1]);
    await q(`INSERT IGNORE INTO grupo (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario)
             VALUES (2,'FBD001',?,1,35,'Aula 102','Mar-Jue 10:00-12:00')`, [rfc2]);
    // POO Grupo A (rfc1), POO Grupo B (rfc2)
    await q(`INSERT IGNORE INTO grupo (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario)
             VALUES (3,'POO001',?,1,30,'Lab 201','Lun-Mié 09:00-11:00')`, [rfc1]);
    await q(`INSERT IGNORE INTO grupo (id_grupo,clave_materia,rfc,id_periodo,limite_alumnos,aula,horario)
             VALUES (4,'POO001',?,1,30,'Lab 202','Mar-Jue-Vie 13:00-14:00')`, [rfc2]);
    console.log("✓ Grupos   →  4 grupos creados");

    // ── grupo_unidad (ponderaciones distintas entre grupos) ───────────────
    // Grupo 1 FBD: U1=30%, U2=40%, U3=30%
    await q(`INSERT IGNORE INTO grupo_unidad (id_grupo, id_unidad, ponderacion) VALUES (1,1,30),(1,2,40),(1,3,30)`);
    // Grupo 2 FBD: U1=25%, U2=35%, U3=40%
    await q(`INSERT IGNORE INTO grupo_unidad (id_grupo, id_unidad, ponderacion) VALUES (2,1,25),(2,2,35),(2,3,40)`);
    // Grupo 3 POO: U4=33%, U5=33%, U6=34%
    await q(`INSERT IGNORE INTO grupo_unidad (id_grupo, id_unidad, ponderacion) VALUES (3,4,33),(3,5,33),(3,6,34)`);
    // Grupo 4 POO: U4=40%, U5=40%, U6=20%
    await q(`INSERT IGNORE INTO grupo_unidad (id_grupo, id_unidad, ponderacion) VALUES (4,4,40),(4,5,40),(4,6,20)`);
    console.log("✓ Pesos    →  distintos entre grupos (demostración RN3)");

    // ── Actividades (distintas entre grupos del mismo materia) ─────────────
    // Grupo 1 FBD — Unidad 1
    await q(`INSERT IGNORE INTO actividad (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES (1,1,1,'Tarea 1 — ER básico',20,'Formativa',1),(2,1,1,'Examen parcial U1',60,'Sumativa',1),(3,1,1,'Participación',20,'Formativa',1)`);
    // Grupo 2 FBD — Unidad 1 (estructura diferente)
    await q(`INSERT IGNORE INTO actividad (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES (4,2,1,'Proyecto ER',50,'Sumativa',1),(5,2,1,'Examen U1',50,'Sumativa',1)`);
    // Grupo 1 FBD — Unidad 2
    await q(`INSERT IGNORE INTO actividad (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES (6,1,2,'Tarea Normalización',30,'Formativa',1),(7,1,2,'Examen Modelo Relacional',70,'Sumativa',1)`);
    // Grupo 1 FBD — Unidad 3 (sin bloquear — en curso)
    await q(`INSERT IGNORE INTO actividad (id_actividad,id_grupo,id_unidad,nombre_actividad,ponderacion,tipo_evaluacion,bloqueado)
             VALUES (8,1,3,'Lab SQL Básico',40,'Sumativa',0),(9,1,3,'Proyecto Consultas',60,'Sumativa',0)`);
    console.log("✓ Actividades creadas (estructuras distintas por grupo)");

    // ── 4 Alumnos ─────────────────────────────────────────────────────────
    const alumnos = [
      ["2023001", "Carlos",   "Ramírez",  "Vega",  "alumno@itver.edu.mx",   "alumno1", "alumno123"],
      ["2023002", "Diana",    "López",    "Cruz",  "diana@itver.edu.mx",    "alumno2", "alumno456"],
      ["2023003", "Ernesto",  "Martínez", "Ruiz",  "ernesto@itver.edu.mx",  "alumno3", "alumno789"],
      ["2023004", "Fernanda", "Torres",   "Díaz",  "fernanda@itver.edu.mx", "alumno4", "alumno000"],
    ];
    for (const [mat, nom, ap, am, correo, usr, pwd] of alumnos) {
      await q(
        `INSERT IGNORE INTO alumno (matricula,id_carrera,nombre,apellido_paterno,apellido_materno,correo_institucional)
               VALUES (?,'ISC',?,?,?,?)`,
        [mat, nom, ap, am, correo],
      );
      const h = await bcrypt.hash(pwd, 10);
      await q(
        `INSERT IGNORE INTO usuario (username,pwd,rol,id_referencia) VALUES (?,?,'alumno',?)`,
        [usr, h, mat],
      );
    }
    console.log("✓ Alumnos  →  2023001–2023004 / alumno1..4 / alumno123..000");

    // ── Inscripciones ─────────────────────────────────────────────────────
    const inscripciones = [
      ["2023001", 1], ["2023002", 1], ["2023003", 1], ["2023004", 1],
      ["2023001", 3], ["2023002", 3],
    ];
    for (const [mat, grp] of inscripciones) {
      await q(
        `INSERT IGNORE INTO inscripcion (matricula,id_grupo,fecha_inscripcion,estatus,tipo_curso)
               VALUES (?,?,'2025-01-15','Cursando','Ordinario')`,
        [mat, grp],
      );
    }
    console.log("✓ Inscripciones → 4 alumnos en Grupo 1, 2 también en Grupo 3");

    // ── Calificaciones de actividades (Unidades 1 y 2 cerradas) ──────────
    const cals = [
      // [matricula, id_actividad, calificacion, estatus, rfc_maestro]
      ["2023001", 1, 85, "Validada", rfc1],
      ["2023001", 2, 72, "Validada", rfc1],
      ["2023001", 3, 90, "Validada", rfc1],
      ["2023002", 1, 60, "Validada", rfc1],
      ["2023002", 2, 55, "Validada", rfc1],
      ["2023002", 3, 70, "Validada", rfc1],
      ["2023003", 1, 95, "Validada", rfc1],
      ["2023003", 2, 88, "Validada", rfc1],
      ["2023003", 3, 80, "Validada", rfc1],
      ["2023004", 1, 45, "Validada", rfc1],
      ["2023004", 2, 50, "Validada", rfc1],
      ["2023004", 3, 60, "Validada", rfc1],
      // Unidad 2
      ["2023001", 6, 78, "Validada", rfc1],
      ["2023001", 7, 81, "Validada", rfc1],
      ["2023002", 6, 65, "Validada", rfc1],
      ["2023002", 7, 68, "Validada", rfc1],
      ["2023003", 6, 92, "Validada", rfc1],
      ["2023003", 7, 95, "Validada", rfc1],
      ["2023004", 6, 50, "Validada", rfc1],
      ["2023004", 7, 55, "Validada", rfc1],
    ];
    for (const [mat, act, cal, est, rfc] of cals) {
      await q(
        `INSERT IGNORE INTO resultado_actividad (matricula,id_actividad,calificacion_obtenida,estatus,rfc)
               VALUES (?,?,?,?,?)`,
        [mat, act, cal, est, rfc],
      );
    }
    console.log("✓ Resultados de actividades → Unidades 1 y 2 del Grupo 1");

    // ── Calificaciones de unidad (cerradas) ───────────────────────────────
    const cuData = [
      // [mat, id_unidad, id_grupo, prom, cal_final, estatus]
      ["2023001", 1, 1, 80.2, 80.2, "Aprobada"],
      ["2023002", 1, 1, 59.0, 59.0, "Reprobada"],
      ["2023003", 1, 1, 90.4, 90.4, "Aprobada"],
      ["2023004", 1, 1, 49.0, 49.0, "Reprobada"],
      ["2023001", 2, 1, 80.2, 80.2, "Aprobada"],
      ["2023002", 2, 1, 67.1, 67.1, "Reprobada"],
      ["2023003", 2, 1, 94.1, 94.1, "Aprobada"],
      ["2023004", 2, 1, 53.5, 53.5, "Reprobada"],
    ];
    for (const [mat, idu, idg, prom, cal, est] of cuData) {
      await q(
        `INSERT IGNORE INTO calificacion_unidad (matricula,id_unidad,id_grupo,promedio_ponderado,calificacion_unidad_final,estatus_unidad)
               VALUES (?,?,?,?,?,?)`,
        [mat, idu, idg, prom, cal, est],
      );
    }
    console.log("✓ Calificaciones de unidad → Unidades 1 y 2 cerradas");

    // ── Bonus de unidad (ejemplo para 2023003 en Unidad 2) ───────────────
    await q(
      `INSERT IGNORE INTO bonusunidad (matricula,id_unidad,id_grupo,rfc,puntos_otorgados,justificacion,fecha_asignacion,estatus)
       VALUES ('2023003',2,1,?,3.00,'Excelente participación en proyectos','2025-03-15','Activo')`,
      [rfc1]
    );
    await q(`UPDATE calificacion_unidad
             SET calificacion_unidad_final = LEAST(100, calificacion_unidad_final + 3), estatus_unidad = 'Aprobada'
             WHERE matricula = '2023003' AND id_unidad = 2 AND id_grupo = 1`);
    console.log("✓ Bonus unidad → 3 pts a alumno 2023003 (U2, G1)");

    console.log("\n✅ Seed completado exitosamente.\n");
    console.log("─────────────────────────────────────────");
    console.log("  USUARIOS DE DEMOSTRACIÓN:");
    console.log("  admin              / admin123");
    console.log(`  ${rfc1}  / maestro123  (Maestro 1)`);
    console.log(`  ${rfc2}  / maestro456  (Maestro 2)`);
    console.log("  alumno1            / alumno123   (2023001)");
    console.log("  alumno2            / alumno456   (2023002)");
    console.log("  alumno3            / alumno789   (2023003)");
    console.log("  alumno4            / alumno000   (2023004)");
    console.log("─────────────────────────────────────────");
  } catch (err) {
    console.error("❌ Error en seed:", err.message);
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

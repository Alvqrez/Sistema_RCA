// src/services/calculo.js
const db = require("../db");

const CALIFICACION_APROBATORIA = 70; // sección 1.3.1

/**
 * Calcula el promedio ponderado de un alumno en una unidad de un grupo.
 * NP equivale a 0. Si las ponderaciones no suman 100, normaliza.
 */
/**
 * Calcula el promedio ponderado de un alumno en una unidad.
 * NUEVO SISTEMA: cada actividad del maestro tiene su propia ponderación.
 * Fórmula: Σ(calificacion_i × ponderacion_i / 100)
 * Si las ponderaciones no suman 100 se normaliza.
 * NP equivale a 0.
 */
async function calcularPromedioUnidad(matricula, id_unidad, id_grupo) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        CASE WHEN ra.estatus = 'NP' THEN 0
             ELSE COALESCE(ra.calificacion_obtenida, 0)
        END AS calificacion,
        a.ponderacion
      FROM actividad a
      LEFT JOIN resultado_actividad ra
        ON ra.id_actividad = a.id_actividad AND ra.matricula = ?
      WHERE a.id_unidad = ? AND a.id_grupo = ?
    `;
    db.query(sql, [matricula, id_unidad, id_grupo], (err, results) => {
      if (err) return reject(err);
      if (!results.length) return resolve(0);

      const sumaPond = results.reduce((acc, r) => acc + parseFloat(r.ponderacion), 0);
      let promedio   = results.reduce(
        (acc, r) => acc + parseFloat(r.calificacion) * (parseFloat(r.ponderacion) / 100),
        0
      );

      // Normalizar si las ponderaciones no suman exactamente 100
      if (sumaPond > 0 && Math.abs(sumaPond - 100) > 0.01) {
        promedio = (promedio / sumaPond) * 100;
      }
      resolve(Math.round(promedio * 100) / 100);
    });
  });
}

/**
 * Cierra una unidad: calcula promedio, aplica bonus, guarda calificacion_unidad.
 * FIX 1: umbral 70
 */
async function cerrarUnidad(matricula, id_unidad, id_grupo, overrides = {}) {
  const promedio = await calcularPromedioUnidad(matricula, id_unidad, id_grupo);

  return new Promise((resolve, reject) => {
    const sqlBonus = `
      SELECT COALESCE(SUM(puntos_otorgados), 0) AS bonus
      FROM bonusunidad
      WHERE matricula = ? AND id_unidad = ? AND id_grupo = ? AND estatus = 'Activo'
    `;
    db.query(sqlBonus, [matricula, id_unidad, id_grupo], (err, bonus) => {
      if (err) return reject(err);

      const puntos = parseFloat(bonus[0].bonus);
      const calificacionFinal = Math.min(
        100,
        Math.round((promedio + puntos) * 100) / 100,
      );
      // FIX 1: 70
      const estatus =
        calificacionFinal >= CALIFICACION_APROBATORIA
          ? "Aprobada"
          : "Reprobada";

      db.query(
        `INSERT INTO calificacion_unidad
          (matricula, id_unidad, id_grupo, promedio_ponderado, calificacion_unidad_final, estatus_unidad)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          promedio_ponderado        = VALUES(promedio_ponderado),
          calificacion_unidad_final = VALUES(calificacion_unidad_final),
          estatus_unidad            = VALUES(estatus_unidad)`,
        [matricula, id_unidad, id_grupo, promedio, calificacionFinal, estatus],
        (err2) => {
          if (err2) return reject(err2);
          resolve({ promedio, calificacionFinal, estatus });
        },
      );
    });
  });
}

/**
 * Calcula calificación final con ponderaciones de grupo_unidad.
 * Aplica redondeo institucional (≥0.5 sube) DESPUÉS del cálculo.
 * FIX 1: umbral 70
 */
async function calcularCalificacionFinal(matricula, id_grupo) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        cu.calificacion_unidad_final,
        COALESCE(gu.ponderacion, 0) AS ponderacion
      FROM calificacion_unidad cu
      LEFT JOIN grupo_unidad gu
          ON gu.id_grupo = cu.id_grupo AND gu.id_unidad = cu.id_unidad
      WHERE cu.matricula = ? AND cu.id_grupo = ?
    `;
    db.query(sql, [matricula, id_grupo], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0)
        return resolve({ promedio: 0, estatus: "Pendiente" });

      const sumaPonderaciones = results.reduce(
        (acc, r) => acc + parseFloat(r.ponderacion),
        0,
      );
      let promedio;

      if (sumaPonderaciones > 0.01) {
        promedio = results.reduce(
          (acc, r) =>
            acc +
            parseFloat(r.calificacion_unidad_final ?? 0) *
              (parseFloat(r.ponderacion) / 100),
          0,
        );
      } else {
        // Fallback: promedio simple si no se definieron ponderaciones
        const suma = results.reduce(
          (acc, r) => acc + parseFloat(r.calificacion_unidad_final ?? 0),
          0,
        );
        promedio = suma / results.length;
      }

      // Redondeo institucional TecNM: ≥ 0.5 → sube
      const promedioBase = Math.floor(promedio) + (promedio % 1 >= 0.5 ? 1 : 0);

      // Sumar bonus_final si existe
      db.query(
        `SELECT COALESCE(puntos_otorgados, 0) AS bonus
           FROM bonusfinal
          WHERE matricula = ? AND id_grupo = ? AND estatus = 'Activo'
          LIMIT 1`,
        [matricula, id_grupo],
        (errB, bonusRows) => {
          if (errB) return reject(errB);
          const bonusPts = parseFloat(bonusRows[0]?.bonus ?? 0);
          const conBonus = Math.min(100, promedioBase + bonusPts);

          // Verificar si existe modificacion_final (sobreescribe todo)
          db.query(
            `SELECT calif_modificada FROM modificacionfinal
              WHERE matricula = ? AND id_grupo = ? AND estatus = 'Aplicado'
              LIMIT 1`,
            [matricula, id_grupo],
            (errM, modRows) => {
              if (errM) return reject(errM);

              const calOficial = modRows.length
                ? parseFloat(modRows[0].calif_modificada)
                : conBonus;

              const redondeado = Math.floor(calOficial) + (calOficial % 1 >= 0.5 ? 1 : 0);
              const estatus = redondeado >= CALIFICACION_APROBATORIA ? "Aprobado" : "Reprobado";

              db.query(
                `INSERT INTO calificacion_final (matricula, id_grupo, promedio_unidades, calificacion_oficial, estatus_final)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                  promedio_unidades    = VALUES(promedio_unidades),
                  calificacion_oficial = VALUES(calificacion_oficial),
                  estatus_final        = VALUES(estatus_final)`,
                [matricula, id_grupo, promedioBase, redondeado, estatus],
                (err2) => {
                  if (err2) return reject(err2);
                  resolve({ promedio: redondeado, estatus });
                },
              );
            },
          );
        },
      );
    });
  });
}

/**
 * Cierra todas las unidades del grupo para un alumno y calcula el final.
 */
async function calcularTodo(matricula, id_grupo) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT id_unidad FROM grupo_unidad WHERE id_grupo = ?",
      [id_grupo],
      async (err, unidades) => {
        if (err) return reject(err);
        try {
          const resultadosUnidades = await Promise.all(
            unidades.map((u) => cerrarUnidad(matricula, u.id_unidad, id_grupo)),
          );
          const final = await calcularCalificacionFinal(matricula, id_grupo);
          resolve({ unidades: resultadosUnidades, final });
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

module.exports = {
  calcularPromedioUnidad,
  cerrarUnidad,
  calcularCalificacionFinal,
  calcularTodo,
};

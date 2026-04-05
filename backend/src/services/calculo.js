// src/services/calculo.js — versión corregida
const db = require("../db");

/**
 * Calcula el promedio ponderado de un alumno en una unidad de un grupo.
 * Suma: calificacion_obtenida × (ponderacion / 100) por cada actividad.
 * Si el alumno tiene NP, esa actividad vale 0.
 */
function calcularPromedioUnidad(matricula, id_unidad, id_grupo) {
  return new Promise((resolve, reject) => {
    const sql = `
            SELECT
                CASE WHEN ra.estatus = 'NP' THEN 0
                     ELSE COALESCE(ra.calificacion_obtenida, 0)
                END AS calificacion,
                a.ponderacion
            FROM actividad a
            LEFT JOIN resultado_actividad ra
                ON ra.id_actividad = a.id_actividad
                AND ra.matricula = ?
            WHERE a.id_unidad = ?
              AND a.id_grupo  = ?
        `;

    db.query(sql, [matricula, id_unidad, id_grupo], (err, results) => {
      if (err) return reject(err);

      if (results.length === 0) {
        return resolve(0); // Sin actividades definidas
      }

      // Verifica que las ponderaciones sumen 100
      const sumaPonderaciones = results.reduce(
        (acc, r) => acc + parseFloat(r.ponderacion),
        0,
      );

      let promedio = 0;
      results.forEach((r) => {
        promedio +=
          parseFloat(r.calificacion) * (parseFloat(r.ponderacion) / 100);
      });

      // Si las ponderaciones no suman exactamente 100, normaliza
      if (sumaPonderaciones > 0 && Math.abs(sumaPonderaciones - 100) > 0.01) {
        promedio = (promedio / sumaPonderaciones) * 100;
      }

      resolve(Math.round(promedio * 100) / 100);
    });
  });
}

/**
 * Aplica bonus de unidad y guarda calificación_unidad.
 */
async function cerrarUnidad(matricula, id_unidad, id_grupo) {
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
      const calificacionFinal = Math.min(100, promedio + puntos);
      const estatus = calificacionFinal >= 60 ? "Aprobada" : "Reprobada";

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
 * Calcula la calificación final de un alumno en un grupo.
 * Usa las ponderaciones definidas en grupo_unidad.
 * Si no hay ponderaciones definidas, usa promedio simple como fallback.
 */
async function calcularCalificacionFinal(matricula, id_grupo) {
  return new Promise((resolve, reject) => {
    // Trae calificaciones de unidad CON su ponderación en el grupo
    const sql = `
            SELECT
                cu.calificacion_unidad_final,
                COALESCE(gu.ponderacion, 0) AS ponderacion
            FROM calificacion_unidad cu
            LEFT JOIN grupo_unidad gu
                ON gu.id_grupo  = cu.id_grupo
                AND gu.id_unidad = cu.id_unidad
            WHERE cu.matricula = ? AND cu.id_grupo = ?
        `;

    db.query(sql, [matricula, id_grupo], (err, results) => {
      if (err) return reject(err);

      if (results.length === 0) {
        return resolve({ promedio: 0, estatus: "Pendiente" });
      }

      const sumaPonderaciones = results.reduce(
        (acc, r) => acc + parseFloat(r.ponderacion),
        0,
      );

      let promedio;

      if (sumaPonderaciones > 0.01) {
        // Promedio PONDERADO — cada unidad con su peso
        promedio = results.reduce((acc, r) => {
          return (
            acc +
            parseFloat(r.calificacion_unidad_final ?? 0) *
              (parseFloat(r.ponderacion) / 100)
          );
        }, 0);
      } else {
        // Fallback: promedio simple si no se definieron ponderaciones
        const suma = results.reduce(
          (acc, r) => acc + parseFloat(r.calificacion_unidad_final ?? 0),
          0,
        );
        promedio = suma / results.length;
      }

      const redondeado = Math.round(promedio * 100) / 100;
      const estatus = redondeado >= 60 ? "Aprobado" : "Reprobado";

      db.query(
        `INSERT INTO calificacion_final (matricula, id_grupo, promedio_unidades, estatus_final)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    promedio_unidades = VALUES(promedio_unidades),
                    estatus_final     = VALUES(estatus_final)`,
        [matricula, id_grupo, redondeado, estatus],
        (err2) => {
          if (err2) return reject(err2);
          resolve({ promedio: redondeado, estatus });
        },
      );
    });
  });
}

/**
 * Cierra todas las unidades de un grupo para un alumno y luego calcula el final.
 * Útil para procesar al alumno completo de una sola llamada.
 */
async function calcularTodo(matricula, id_grupo) {
  return new Promise((resolve, reject) => {
    // Obtiene todas las unidades del grupo
    db.query(
      "SELECT id_unidad FROM grupo_unidad WHERE id_grupo = ?",
      [id_grupo],
      async (err, unidades) => {
        if (err) return reject(err);

        try {
          // Cierra cada unidad en paralelo
          const resultadosUnidades = await Promise.all(
            unidades.map((u) => cerrarUnidad(matricula, u.id_unidad, id_grupo)),
          );

          // Luego calcula el final
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

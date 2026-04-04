// src/services/calculo.js
const db = require("../db");

/**
 * Calcula el promedio ponderado de un alumno en una unidad específica.
 * Suma: calificacion_obtenida * (ponderacion / 100) de cada actividad.
 */
function calcularPromedioUnidad(matricula, id_unidad, id_grupo) {

    return new Promise((resolve, reject) => {

        const sql = `
            SELECT 
                ra.calificacion_obtenida,
                a.ponderacion
            FROM resultado_actividad ra
            JOIN Actividad a ON ra.id_actividad = a.id_actividad
            WHERE ra.matricula = ?
              AND a.id_unidad  = ?
              AND a.id_grupo   = ?
              AND ra.estatus  != 'Pendiente'
        `;

        db.query(sql, [matricula, id_unidad, id_grupo], (err, results) => {

            if (err) return reject(err);

            let promedio = 0;

            results.forEach(r => {
                const calif = r.estatus === "NP" ? 0 : (r.calificacion_obtenida ?? 0);
                promedio += calif * (r.ponderacion / 100);
            });

            resolve(Math.round(promedio * 100) / 100);

        });

    });

}

/**
 * Aplica el bonus de unidad y guarda la calificación final de la unidad.
 */
async function cerrarUnidad(matricula, id_unidad, id_grupo) {

    const promedio = await calcularPromedioUnidad(matricula, id_unidad, id_grupo);

    return new Promise((resolve, reject) => {

        // Busca si hay bonus para esta unidad
        const sqlBonus = `
            SELECT puntos_otorgados FROM bonus_unidad
            WHERE matricula = ? AND id_unidad = ? AND id_grupo = ? AND estatus = 'Activo'
        `;

        db.query(sqlBonus, [matricula, id_unidad, id_grupo], (err, bonus) => {

            if (err) return reject(err);

            const puntos = bonus.length > 0 ? bonus[0].puntos_otorgados : 0;
            const calificacionFinal = Math.min(100, promedio + puntos);
            const estatus = calificacionFinal >= 60 ? "Aprobada" : "Reprobada";

            const sqlUpsert = `
                INSERT INTO calificacion_unidad (matricula, id_unidad, id_grupo, promedio_ponderado, calificacion_unidad_final, estatus_unidad)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    promedio_ponderado        = VALUES(promedio_ponderado),
                    calificacion_unidad_final = VALUES(calificacion_unidad_final),
                    estatus_unidad            = VALUES(estatus_unidad)
            `;

            db.query(sqlUpsert, [matricula, id_unidad, id_grupo, promedio, calificacionFinal, estatus], (err) => {
                if (err) return reject(err);
                resolve({ promedio, calificacionFinal, estatus });
            });

        });

    });

}

/**
 * Calcula y guarda la calificación final de una materia (promedio de unidades).
 */
async function calcularCalificacionFinal(matricula, id_grupo) {

    return new Promise((resolve, reject) => {

        const sql = `
            SELECT AVG(calificacion_unidad_final) AS promedio
            FROM calificacion_unidad
            WHERE matricula = ? AND id_grupo = ?
        `;

        db.query(sql, [matricula, id_grupo], (err, result) => {

            if (err) return reject(err);

            const promedio = result[0].promedio ?? 0;
            const redondeado = Math.round(promedio * 100) / 100;
            const estatus = redondeado >= 60 ? "Aprobado" : "Reprobado";

            const sqlUpsert = `
                INSERT INTO calificacion_final (matricula, id_grupo, promedio_unidades, estatus_final)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    promedio_unidades = VALUES(promedio_unidades),
                    estatus_final     = VALUES(estatus_final)
            `;

            db.query(sqlUpsert, [matricula, id_grupo, redondeado, estatus], (err) => {
                if (err) return reject(err);
                resolve({ promedio: redondeado, estatus });
            });

        });

    });

}

module.exports = { calcularPromedioUnidad, cerrarUnidad, calcularCalificacionFinal };
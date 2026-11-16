/*
 * motor.js — Réplica en el navegador del motor de cálculo de RCA.
 * Fuente de verdad: backend/src/services/calculo.js
 * Si cambian las reglas en el backend, este archivo debe actualizarse igual.
 */
(function (global) {
  "use strict";

  var APROBATORIA = 70;

  function r2(n) {
    return Math.round(n * 100) / 100;
  }

  /**
   * Promedio ponderado de una unidad.
   * actividades: [{ cal: number, pond: number, np: boolean }]
   * NP equivale a 0. Si las ponderaciones no suman 100, se normaliza.
   */
  function promedioUnidad(actividades) {
    if (!actividades.length) return { promedio: 0, sumaPond: 0, normalizado: false };
    var sumaPond = actividades.reduce(function (a, x) { return a + (+x.pond || 0); }, 0);
    var promedio = actividades.reduce(function (a, x) {
      var cal = x.np ? 0 : (+x.cal || 0);
      return a + cal * ((+x.pond || 0) / 100);
    }, 0);
    var normalizado = sumaPond > 0 && Math.abs(sumaPond - 100) > 0.01;
    if (normalizado) promedio = (promedio / sumaPond) * 100;
    return { promedio: r2(promedio), sumaPond: sumaPond, normalizado: normalizado };
  }

  /** Cierre de unidad: promedio + bonus de unidad, con tope de 100. */
  function cerrarUnidad(promedio, bonus) {
    var final = Math.min(100, r2(promedio + (+bonus || 0)));
    return { calificacion: final, aprobada: final >= APROBATORIA };
  }

  /**
   * Calificación final de la materia (orden TecNM):
   * 1) promedio aritmético de unidades, 2) + bonus final (tope 100),
   * 3) redondeo institucional: fracción >= 0.5 sube.
   */
  function calificacionFinal(unidades, bonusFinal) {
    if (!unidades.length) return { promedio: 0, conBonus: 0, oficial: 0, aprobada: false };
    var promedio = unidades.reduce(function (a, u) { return a + u; }, 0) / unidades.length;
    var conBonus = Math.min(100, promedio + (+bonusFinal || 0));
    var oficial = Math.floor(conBonus) + (conBonus % 1 >= 0.5 ? 1 : 0);
    return {
      promedio: r2(promedio),
      conBonus: r2(conBonus),
      oficial: oficial,
      aprobada: oficial >= APROBATORIA,
    };
  }

  global.RCAMotor = {
    APROBATORIA: APROBATORIA,
    promedioUnidad: promedioUnidad,
    cerrarUnidad: cerrarUnidad,
    calificacionFinal: calificacionFinal,
  };
})(window);

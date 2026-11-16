/*
 * simulador.js — Simulador del cálculo de una unidad y de la final.
 * Renderiza dentro de cada [data-simulador] y usa window.RCAMotor.
 * Los datos son de ejemplo; las reglas son las del backend real (src/services/calculo.js).
 */
(function () {
  "use strict";

  var ACTIVIDADES = [
    { id: "examen", nombre: "Examen escrito", pond: 40, cal: 78 },
    { id: "practicas", nombre: "Prácticas de laboratorio", pond: 30, cal: 92 },
    { id: "proyecto", nombre: "Proyecto de unidad", pond: 20, cal: 85 },
    { id: "tareas", nombre: "Tareas", pond: 10, cal: 70 },
  ];
  var UNIDADES_FIJAS = [
    { nombre: "Unidad 1", cal: 72.4 },
    { nombre: "Unidad 3", cal: 68.9 },
  ];

  function fmt(n, dec) {
    return Number(n).toLocaleString("es-MX", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
  }

  function plantilla(uid) {
    var filas = ACTIVIDADES.map(function (a, i) {
      var p = uid + "-" + a.id;
      return (
        '<li class="sim-act" data-act="' + i + '" style="--i:' + i + '">' +
        '<div class="sim-act-head">' +
        '<span class="sim-act-name" id="' + p + '-n">' + a.nombre + "</span>" +
        '<span class="sim-aporte">Aporta <strong class="sim-num" data-out-aporte>0</strong> pts</span>' +
        "</div>" +
        '<div class="sim-act-ctrl">' +
        '<label class="sim-field sim-field-pond" for="' + p + '-p">' +
        '<span class="sim-field-label">Ponderación</span>' +
        '<span class="sim-range-wrap"><input id="' + p + '-p" type="range" min="0" max="60" step="5" value="' + a.pond + '" data-pond>' +
        '<output class="sim-num" data-out-pond for="' + p + '-p">' + a.pond + " %</output></span>" +
        "</label>" +
        '<label class="sim-field sim-field-cal" for="' + p + '-c">' +
        '<span class="sim-field-label">Calificación</span>' +
        '<input id="' + p + '-c" class="sim-input sim-num" type="number" inputmode="numeric" min="0" max="100" step="1" value="' + a.cal + '" data-cal>' +
        "</label>" +
        '<label class="sim-np"><input type="checkbox" data-np aria-describedby="' + p + '-n"> NP</label>' +
        "</div>" +
        "</li>"
      );
    }).join("");

    var segmentos = ACTIVIDADES.map(function (_, i) {
      return '<span class="sim-seg" data-seg="' + i + '" style="--i:' + i + '"></span>';
    }).join("");

    return (
      '<div class="sim">' +
      '<div class="sim-config">' +
      '<div class="sim-config-head">' +
      '<p class="sim-kicker">Unidad 2 · Fundamentos de Bases de Datos</p>' +
      '<div class="sim-suma" data-suma-wrap>' +
      '<div class="sim-bar" aria-hidden="true">' + segmentos + "</div>" +
      '<p class="sim-suma-txt"><span>Suma de ponderaciones</span> <strong class="sim-num" data-out-suma>100 %</strong></p>' +
      '<p class="sim-aviso" data-out-aviso hidden>La suma debe llegar a 100 % para guardar la unidad. Mientras tanto, RCA normaliza el cálculo.</p>' +
      "</div>" +
      "</div>" +
      '<ul class="sim-acts">' + filas + "</ul>" +
      '<label class="sim-bonus" for="' + uid + '-b"><span>Puntos extra de la unidad</span>' +
      '<input id="' + uid + '-b" class="sim-input sim-num" type="number" inputmode="numeric" min="0" max="20" step="1" value="0" data-bonus></label>' +
      "</div>" +
      '<div class="sim-result" aria-live="polite">' +
      '<div class="sim-res-block">' +
      '<p class="sim-res-label">Calificación de la unidad 2</p>' +
      '<p class="sim-res-big sim-num" data-out-unidad>0</p>' +
      '<p class="sim-estatus" data-out-unidad-estatus>Aprobada</p>' +
      "</div>" +
      '<dl class="sim-final">' +
      '<div><dt>' + UNIDADES_FIJAS[0].nombre + '</dt><dd class="sim-num">' + fmt(UNIDADES_FIJAS[0].cal, 1) + "</dd></div>" +
      '<div class="sim-final-live"><dt>Unidad 2</dt><dd class="sim-num" data-out-u2>0</dd></div>' +
      '<div><dt>' + UNIDADES_FIJAS[1].nombre + '</dt><dd class="sim-num">' + fmt(UNIDADES_FIJAS[1].cal, 1) + "</dd></div>" +
      '<div class="sim-final-prom"><dt>Promedio de unidades</dt><dd class="sim-num" data-out-prom>0</dd></div>' +
      "</dl>" +
      '<div class="sim-res-block sim-res-final">' +
      '<p class="sim-res-label">Calificación final de la materia</p>' +
      '<p class="sim-res-big sim-num" data-out-final>0</p>' +
      '<p class="sim-redondeo" data-out-redondeo></p>' +
      '<p class="sim-estatus" data-out-final-estatus>Aprobado</p>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function montar(raiz, n) {
    var M = window.RCAMotor;
    if (!M) return;
    raiz.innerHTML = plantilla("sim" + n);
    raiz.classList.add("is-ready");

    var filas = Array.prototype.slice.call(raiz.querySelectorAll("[data-act]"));
    var bonus = raiz.querySelector("[data-bonus]");
    var q = function (s) { return raiz.querySelector(s); };

    function limitar(input) {
      var v = parseFloat(input.value);
      if (isNaN(v)) return 0;
      var max = parseFloat(input.max);
      var min = parseFloat(input.min);
      return Math.max(min, Math.min(max, v));
    }

    function calcular() {
      var acts = filas.map(function (f) {
        return {
          pond: parseFloat(f.querySelector("[data-pond]").value) || 0,
          cal: limitar(f.querySelector("[data-cal]")),
          np: f.querySelector("[data-np]").checked,
        };
      });

      var u = M.promedioUnidad(acts);
      var cierre = M.cerrarUnidad(u.promedio, limitar(bonus));
      var fin = M.calificacionFinal(
        [UNIDADES_FIJAS[0].cal, cierre.calificacion, UNIDADES_FIJAS[1].cal],
        0
      );

      filas.forEach(function (f, i) {
        var a = acts[i];
        var aporte = (a.np ? 0 : a.cal) * (a.pond / 100);
        if (u.normalizado && u.sumaPond > 0) aporte = (aporte / u.sumaPond) * 100;
        f.querySelector("[data-out-pond]").textContent = a.pond + " %";
        f.querySelector("[data-out-aporte]").textContent = fmt(aporte, 1);
        f.classList.toggle("is-np", a.np);
        f.querySelector("[data-cal]").disabled = a.np;
      });

      // La barra se reparte en segmentos acumulados (solo transform)
      var acumulado = 0;
      filas.forEach(function (_, i) {
        var seg = raiz.querySelector('[data-seg="' + i + '"]');
        var ancho = Math.max(0, Math.min(acts[i].pond, 100 - acumulado));
        seg.style.setProperty("--start", Math.min(acumulado, 100) + "%");
        seg.style.setProperty("--k", ancho / 100);
        acumulado += acts[i].pond;
      });

      var completa = Math.abs(u.sumaPond - 100) < 0.01;
      q("[data-out-suma]").textContent = u.sumaPond + " %";
      q("[data-suma-wrap]").classList.toggle("is-incompleta", !completa);
      q("[data-out-aviso]").hidden = completa;

      q("[data-out-unidad]").textContent = fmt(cierre.calificacion, 1);
      var eu = q("[data-out-unidad-estatus]");
      eu.textContent = cierre.aprobada ? "Aprobada" : "Reprobada";
      eu.classList.toggle("is-baja", !cierre.aprobada);

      q("[data-out-u2]").textContent = fmt(cierre.calificacion, 1);
      q("[data-out-prom]").textContent = fmt(fin.promedio, 2);
      q("[data-out-final]").textContent = fin.oficial;
      q("[data-out-redondeo]").textContent =
        fmt(fin.conBonus, 2) + " se redondea a " + fin.oficial +
        (fin.conBonus % 1 >= 0.5 ? " (la fracción es de 0.5 o más, sube)" : " (la fracción es menor a 0.5, se queda)");
      var ef = q("[data-out-final-estatus]");
      ef.textContent = fin.aprobada ? "Aprobado" : "Reprobado";
      ef.classList.toggle("is-baja", !fin.aprobada);
    }

    raiz.addEventListener("input", calcular);
    raiz.addEventListener("change", function (e) {
      var t = e.target;
      if (t.matches("[data-cal], [data-bonus]")) {
        t.value = limitar(t);
        calcular();
      }
    });
    calcular();
  }

  function iniciar() {
    var raices = document.querySelectorAll("[data-simulador]");
    Array.prototype.forEach.call(raices, montar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();

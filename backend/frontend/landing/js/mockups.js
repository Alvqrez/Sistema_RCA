/*
 * mockups.js — Fragmentos fieles de la interfaz real de RCA (datos de ejemplo).
 * Se basan en el HTML/CSS de backend/frontend y en capturas del sistema en producción.
 * Si cambia la interfaz real, actualizar aquí para que la landing siga siendo fiel.
 * Uso: <div data-mockup="captura" data-min-scale="0.6" data-tema="oscuro"></div>
 * data-tema="oscuro" usa los colores reales del modo oscuro de la app.
 * Cada fragmento se dibuja a su ancho de diseño y se escala al contenedor.
 */
(function () {
  "use strict";
  var I = function (n, c) { return window.RCAIconos.icono(n, c); };

  /* ── Datos de ejemplo coherentes (Unidad 2: 40/30/20/10) ───────────── */
  var ALUMNOS = [
    { nom: "Arellano Murillo, Diego", nc: "25000143", c: [86, 90, 88, 100], p: 89.0 },
    { nom: "Cházaro Lara, Ximena", nc: "25000151", c: [72, 85, 80, 90], p: 79.3 },
    { nom: "Cruz Barradas, Emiliano", nc: "25000158", c: ["NP", 80, 75, 90], p: 48.0 },
    { nom: "Domínguez Huerta, Ángel", nc: "25000162", c: [64, 78, 70, 80], p: 71.0 },
    { nom: "Ortiz Mendoza, Valeria", nc: "25000170", c: [95, 92, 96, 100], p: 94.8 },
    { nom: "Solís Peña, Renata", nc: "25000177", c: [58, 70, 65, 60], p: 63.2 },
  ];
  var ACTS = [
    ["Examen escrito", 40],
    ["Prácticas", 30],
    ["Proyecto", 20],
    ["Tareas", 10],
  ];

  function iniciales(nom) {
    var partes = nom.replace(",", "").split(" ");
    return (partes[0][0] + (partes[2] ? partes[2][0] : partes[1][0])).toUpperCase();
  }
  function f1(n) { return Number(n).toFixed(1); }

  /* ── Piezas comunes ─────────────────────────────────────────────────── */
  function ventana(ruta, cuerpo) {
    return (
      '<div class="ui-win">' +
      '<div class="ui-win-bar"><span class="ui-url">' + I("candado") + "rca.elprofecoss.tech" + ruta + "</span></div>" +
      '<div class="ui-win-body">' + cuerpo + "</div>" +
      "</div>"
    );
  }

  // Barra lateral isla, como shared/js/sidebar.js: grupos abiertos con su título
  function sidebar(rol, nombre, grupos, activo) {
    var nav = grupos.map(function (g) {
      return (g[0] ? '<span class="ui-side-t">' + g[0] + "</span>" : "") +
        g[1].map(function (it) {
          return '<span class="ui-nav' + (it[1] === activo ? " is-on" : "") + '">' + I(it[0]) + "<span>" + it[1] + "</span></span>";
        }).join("");
    }).join("");
    var ini2 = nombre.replace(/^(Mtra?.|Mtro.)s*/, "").split(" ").slice(0, 2).map(function (p) { return p[0]; }).join("");
    return (
      '<aside class="ui-side">' +
      '<div class="ui-side-top"><span class="ui-side-logo">R</span><span><b>Sistema RCA</b><small>Tecnológico de Veracruz</small></span></div>' +
      '<nav class="ui-side-nav">' + nav + "</nav>" +
      '<div class="ui-side-foot"><span class="ui-user"><span class="ui-ini ui-ini-sm">' + ini2 + "</span><span><b>" + nombre + "</b><small>" + rol + "</small></span></span>" +
      '<span class="ui-logout">' + I("luna") + "Modo oscuro</span>" +
      '<span class="ui-logout">' + I("salir") + "Cerrar sesión</span></div>" +
      "</aside>"
    );
  }

  var NAV_MAESTRO = [
    ["", [["panel", "Inicio"]]],
    ["Catálogo", [["usuarios", "Mis alumnos"], ["biblioteca", "Mis grupos"]]],
    ["Asignar y calificar", [["ajustes", "Configurar evaluación"], ["lapiz", "Capturar calificaciones"]]],
    ["Utilerías", [["ajustes", "Utilerías"], ["grafica", "Estadísticas"], ["lista", "Reportes"]]],
  ];
  var NAV_ADMIN = [
    ["", [["panel", "Panel"]]],
    ["Catálogo", [["birrete", "Carreras"], ["libro", "Materias"], ["capas", "Unidades"], ["birrete", "Maestros"], ["persona", "Alumnos"], ["biblioteca", "Grupos"], ["usuarioMas", "Inscripciones"]]],
    ["Utilerías", [["calendario", "Periodos escolares"], ["grafica", "Reportes"], ["ajustes", "Utilerías del sistema"]]],
  ];
  var NAV_ALUMNO = [["", [["panel", "Mis calificaciones"], ["ajustes", "Utilerías"]]]];

  /* ── Fragmentos ─────────────────────────────────────────────────────── */
  var F = {};

  F.captura = function () {
    var cab = ACTS.map(function (a) {
      return '<th class="num">' + a[0] + '<small>' + a[1] + " %</small></th>";
    }).join("");
    var filas = ALUMNOS.map(function (a) {
      var celdas = a.c.map(function (v) {
        return v === "NP" ? '<td class="num"><span class="ui-np">NP</span></td>' : '<td class="num">' + v + "</td>";
      }).join("");
      var ok = a.p >= 70;
      return (
        "<tr><td><span class=\"ui-person\"><span class=\"ui-ini\">" + iniciales(a.nom) + "</span><span><b>" + a.nom + "</b><small>" + a.nc + "</small></span></span></td>" +
        celdas +
        '<td class="num"><b class="' + (ok ? "ui-ok" : "ui-bad") + '">' + f1(a.p) + "</b></td></tr>"
      );
    }).join("");
    var cuerpo =
      sidebar("Docente", "Mtra. Inés Barradas", NAV_MAESTRO, "Capturar calificaciones") +
      '<main class="ui-main">' +
      '<header class="ui-head"><div><h3>Captura de Calificaciones</h3><p>Fundamentos de Bases de Datos · Agosto–Diciembre 2026</p></div>' +
      '<span class="ui-btn ui-btn-ghost">' + I("subir") + "Importar CSV</span></header>" +
      '<div class="ui-filters"><span class="ui-select"><small>Grupo</small>Fundamentos de Bases de Datos · 3B</span>' +
      '<span class="ui-select"><small>Unidad</small>Unidad 2 · Modelo relacional</span>' +
      '<span class="ui-pond">' + I("check") + "Ponderación completa: 100 %</span></div>" +
      '<div class="ui-card ui-card-flush"><table class="ui-table"><thead><tr><th>Alumno</th>' + cab + '<th class="num">Promedio<small>ponderado</small></th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
      "</main>";
    return ventana("/maestro/pages/captura_calificaciones.html", '<div class="ui-app">' + cuerpo + "</div>");
  };

  F.alumno = function () {
    var materias = [
      ["Fundamentos de Bases de Datos", "U2 cerrada · 94.8", "Cursando"],
      ["Programación Orientada a Objetos", "U3 cerrada · 88.0", "Cursando"],
      ["Cálculo Vectorial", "U1 cerrada · 91.5", "Cursando"],
    ].map(function (m) {
      return '<div class="ui-mat"><b>' + m[0] + "</b><small>" + m[1] + '</small><span class="ui-badge ui-badge-blue">' + m[2] + "</span></div>";
    }).join("");
    var hist = [
      ["Cálculo Integral", "Ene–Jun 2026", "Mtro. Raúl Echeverría", "Ordinario", "93"],
      ["Estructura de Datos", "Ene–Jun 2026", "Mtra. Inés Barradas", "Ordinario", "90"],
      ["Contabilidad Financiera", "Ene–Jun 2026", "Mtra. Sofía Landa", "Ordinario", "86"],
      ["Probabilidad y Estadística", "Ago–Dic 2025", "Mtro. Joel Tiburcio", "Ordinario", "95"],
    ].map(function (h) {
      return "<tr><td><b>" + h[0] + "</b></td><td>" + h[1] + "</td><td>" + h[2] + '</td><td><span class="ui-badge ui-badge-green">' + h[3] + "</span></td>" + '<td class="num"><b>' + h[4] + '</b></td><td><span class="ui-badge ui-badge-green">Aprobada</span></td></tr>';
    }).join("");
    var cuerpo =
      sidebar("Alumno", "Valeria Ortiz", NAV_ALUMNO, "Mis calificaciones") +
      '<main class="ui-main">' +
      '<section class="ui-hero-al"><div><small>¡Bienvenida de nuevo!</small><h3>Valeria Ortiz Mendoza</h3><p><span>No. Control: 25000170</span><span>ISC</span></p></div>' +
      '<div class="ui-al-stats"><span><b>12</b>Aprobadas</span><span><b>0</b>Reprobadas</span><span><b>3</b>Cursando</span><span class="ui-al-prom"><b>91.4</b>Promedio general</span></div></section>' +
      '<div class="ui-sub"><h4>Materias del periodo</h4><span class="ui-badge">Agosto–Diciembre 2026</span></div>' +
      '<div class="ui-mats">' + materias + "</div>" +
      '<div class="ui-sub"><h4>Historial académico</h4><span class="ui-select ui-select-sm">Todos los periodos</span></div>' +
      '<div class="ui-card ui-card-flush"><table class="ui-table"><thead><tr><th>Materia</th><th>Periodo</th><th>Maestro</th><th>Tipo</th><th class="num">Calificación</th><th>Estatus</th></tr></thead><tbody>' + hist + "</tbody></table></div>" +
      "</main>";
    return ventana("/alumno/pages/portalAlumno.html", '<div class="ui-app">' + cuerpo + "</div>");
  };

  F.admin = function () {
    var stats = [
      ["usuarios", "Alumnos registrados", "184", "blue"],
      ["birrete", "Maestros activos", "11", "green"],
      ["capas", "Grupos activos", "16", "violet"],
      ["libro", "Materias", "23", "amber"],
      ["lista", "Inscripciones activas", "402", "rose"],
    ].map(function (s) {
      return '<div class="ui-stat ui-stat-' + s[3] + '"><span class="ui-stat-ico">' + I(s[0]) + "</span><span><b>" + s[2] + "</b><small>" + s[1] + "</small></span></div>";
    }).join("");
    var accesos = [
      ["usuarios", "Gestionar alumnos", "Registro, edición e importación CSV"],
      ["birrete", "Gestionar maestros", "Alta, baja y modificación de docentes"],
      ["usuarios", "Inscripciones", "Asignar alumnos a grupos"],
      ["calendario", "Periodos escolares", "Gestionar ciclos académicos y su estatus"],
    ].map(function (a) {
      return '<div class="ui-quick"><span class="ui-quick-ico">' + I(a[0]) + "</span><span><b>" + a[1] + "</b><small>" + a[2] + "</small></span>" + I("chevron", "ui-chev") + "</div>";
    }).join("");
    var users = [
      ["A", "ADMN800101ITV", "Admin", "slate", "15/11/2026"],
      ["B", "BAIM810314KP2", "Maestro", "green", "14/11/2026"],
      ["2", "25000170", "Alumno", "slate", "14/11/2026"],
      ["2", "25000158", "Alumno", "slate", "Nunca"],
    ].map(function (u) {
      return '<tr><td><span class="ui-person"><span class="ui-ini ui-ini-sm">' + u[0] + "</span>" + u[1] + '</span></td><td><span class="ui-badge ui-badge-' + u[3] + '">' + u[2] + "</span></td><td>" + u[4] + '</td><td><span class="ui-badge ui-badge-green">Activo</span></td><td class="ui-acts"><span>' + I("llave") + "</span><span>" + I("usuarioX") + "</span></td></tr>";
    }).join("");
    var cuerpo =
      sidebar("Administrador", "Leonardo Álvarez", NAV_ADMIN, "Panel") +
      '<main class="ui-main">' +
      '<header class="ui-head ui-head-line"><div><h3>Panel de Administración</h3><p>Vista general del sistema RCA</p></div></header>' +
      '<div class="ui-stats">' + stats + "</div>" +
      '<div class="ui-cols"><div class="ui-card"><h4 class="ui-card-t">' + I("rayo") + "Accesos rápidos</h4>" + accesos + "</div>" +
      '<div class="ui-card ui-card-flush"><div class="ui-card-tb"><h4>Usuarios del sistema</h4><span class="ui-search">' + I("buscar") + "Buscar…</span></div>" +
      '<table class="ui-table"><thead><tr><th>Usuario</th><th>Rol</th><th>Último acceso</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' + users + "</tbody></table></div></div>" +
      "</main>";
    return ventana("/admin/pages/admin.html", '<div class="ui-app">' + cuerpo + "</div>");
  };

  F.estadisticas = function () {
    var max = 100;
    var barras = ALUMNOS.map(function (a) {
      var ok = a.p >= 70;
      return '<span class="ui-col' + (ok ? "" : " is-bad") + '" style="--h:' + a.p / max + '"><i></i><b>' + f1(a.p) + "</b><small>" + a.nom.split(",")[1].trim().split(" ")[0] + "</small></span>";
    }).join("");
    var cuerpo =
      '<main class="ui-main ui-main-solo">' +
      '<header class="ui-head ui-head-line"><div><h3>Estadísticas</h3><p>Fundamentos de Bases de Datos · Agosto–Diciembre 2026 · Unidad 2</p></div><span class="ui-btn ui-btn-ghost">' + I("exportar") + "Exportar CSV</span></header>" +
      '<div class="ui-kpis">' +
      '<div class="ui-kpi k-navy"><small>Total alumnos</small><b>6</b><span>inscritos en el grupo</span></div>' +
      '<div class="ui-kpi k-green"><small>Aprobados</small><b>4</b><span>67 % del grupo</span></div>' +
      '<div class="ui-kpi k-red"><small>Reprobados</small><b>2</b><span>33 % del grupo</span></div>' +
      '<div class="ui-kpi k-navy"><small>Promedio grupo</small><b>74.2</b><span>de calificaciones registradas</span></div>' +
      '<div class="ui-kpi k-amber"><small>Calific. más alta</small><b>94.8</b><span>Ortiz Mendoza</span></div>' +
      '<div class="ui-kpi k-slate"><small>Calific. más baja</small><b>48.0</b><span>Cruz Barradas</span></div>' +
      "</div>" +
      '<div class="ui-card"><h4 class="ui-card-t">' + I("grafica") + 'Distribución de calificaciones por alumno</h4><div class="ui-chart"><span class="ui-line70"><small>70</small></span>' + barras + "</div></div>" +
      "</main>";
    return ventana("/shared/pages/estadisticas.html", '<div class="ui-app ui-app-solo">' + cuerpo + "</div>");
  };

  F.ponderacion = function () {
    var filas = ACTS.map(function (a, i) {
      return '<div class="ui-prow"><span class="ui-prow-n"><b>' + a[0] + '</b><small>Unidad 2</small></span><span class="ui-prow-bar"><i style="--w:' + a[1] / 100 + ";--i:" + i + '"></i></span><b class="ui-prow-v">' + a[1] + " %</b></div>";
    }).join("");
    return (
      '<div class="ui-panel">' +
      '<div class="ui-panel-h"><h4>Configurar actividades</h4><span class="ui-badge">Unidad 2 · Modelo relacional</span></div>' +
      filas +
      '<div class="ui-total"><span class="ui-total-track"><i></i></span><span>Total: <b>100 %</b></span></div>' +
      '<p class="ui-okmsg">' + I("check") + "100 %. Ya puedes guardar la unidad.</p>" +
      "</div>"
    );
  };

  F.modificacion = function () {
    return (
      '<div class="ui-modal">' +
      '<div class="ui-modal-h"><h4>Modificar calificación final</h4>' + I("cerrar") + "</div>" +
      '<div class="ui-modal-who"><span class="ui-ini">SP</span><span><b>Solís Peña, Renata</b><small>25000177 · Fundamentos de Bases de Datos</small></span></div>' +
      '<div class="ui-modal-nums"><span><small>Cal. con bonus</small><b>68</b></span>' + I("chevron") + '<span><small>Modificada</small><b class="ui-ok">71</b></span></div>' +
      '<label class="ui-label">Justificación <em>obligatoria</em></label>' +
      '<div class="ui-textarea">Se integra la práctica 4, entregada en tiempo y revisada en clase; no se registró en el sistema por falla de conexión del laboratorio.<small>148 / 500</small></div>' +
      '<div class="ui-modal-f"><span class="ui-btn ui-btn-ghost">Cancelar</span><span class="ui-btn">Aplicar modificación</span></div>' +
      "</div>"
    );
  };

  F.importar = function () {
    var filas = [
      ["25000184", "Paredes Ruiz, Andrea", "ISC"],
      ["25000185", "Quintero Sosa, Mateo", "ISC"],
      ["25000186", "Rivas Lagunes, Camila", "IGE"],
    ].map(function (r) {
      return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td>" + r[2] + '</td><td><span class="ui-badge ui-badge-green">Válido</span></td></tr>';
    }).join("");
    return (
      '<div class="ui-modal">' +
      '<div class="ui-modal-h"><h4>Importar alumnos desde CSV</h4>' + I("cerrar") + "</div>" +
      '<div class="ui-drop">' + I("archivo") + '<span><b>alumnos_nuevo_ingreso.csv</b><small>Archivo CSV con encabezados</small></span></div>' +
      '<table class="ui-table ui-table-sm"><thead><tr><th>No. control</th><th>Nombre</th><th>Carrera</th><th>Estado</th></tr></thead><tbody>' + filas + "</tbody></table>" +
      '<div class="ui-modal-f"><small class="ui-muted">36 registros listos · 0 con errores</small><span class="ui-btn">' + I("subir") + "Importar 36 alumnos</span></div>" +
      "</div>"
    );
  };

  F.tarjeta = function () {
    return (
      '<div class="ui-float">' +
      '<span class="ui-float-k">Portal del alumno · Unidad 2</span>' +
      "<b>Fundamentos de Bases de Datos</b>" +
      '<span class="ui-float-row"><span class="ui-float-n">94.8</span><span class="ui-badge ui-badge-green">Aprobada</span></span>' +
      "</div>"
    );
  };

  /* ── Montaje y escalado ─────────────────────────────────────────────── */
  var ANCHOS = { captura: 1180, alumno: 1180, admin: 1240, estadisticas: 1100, ponderacion: 460, modificacion: 470, importar: 500, tarjeta: 300 };

  function montar(el) {
    var tipo = el.getAttribute("data-mockup");
    if (!F[tipo]) return;
    var ancho = ANCHOS[tipo];
    el.classList.add("ui-scale");
    el.setAttribute("role", "img");
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", "Pantalla de Sistema RCA con datos de ejemplo");
    var tema = el.getAttribute("data-tema") === "oscuro" ? " ui-dark" : "";
    el.innerHTML = '<div class="ui' + tema + '" style="width:' + ancho + 'px">' + F[tipo]() + "</div>";
    var interior = el.firstChild;
    var minEscala = parseFloat(el.getAttribute("data-min-scale")) || 0;
    var maxEscala = parseFloat(el.getAttribute("data-max-scale")) || 1;

    function ajustar() {
      var w = el.clientWidth;
      if (!w) return;
      var s = Math.min(maxEscala, Math.max(minEscala, w / ancho));
      interior.style.transform = "scale(" + s + ")";
      el.style.height = Math.ceil(interior.offsetHeight * s) + "px";
    }
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(ajustar);
      ro.observe(el);
      ro.observe(interior);
    }
    window.addEventListener("load", ajustar);
    window.addEventListener("resize", ajustar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);
    ajustar();
  }

  function iniciar() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-mockup]"), montar);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();

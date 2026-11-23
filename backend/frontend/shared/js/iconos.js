/*
 * iconos.js — Familia única de íconos de Sistema RCA (24 px, trazo 1.5, extremos redondos).
 * Sustituye a la mezcla de Lucide + MDI que hoy se carga desde el CDN de Iconify:
 * sin peticiones externas y sin parpadeo al cargar.
 *
 * Dos formas de uso:
 *   · En HTML:   <i data-ico="buscar"></i>            (se pinta solo, también en contenido dinámico)
 *   · En JS:     RCAIconos.icono("buscar", "clase")   (devuelve la cadena <svg>)
 */
(function (global) {
  "use strict";
  var P = {
    panel: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18.2 14.8c1.7.7 2.9 2.4 3.3 5.2"/>',
    persona: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>',
    birrete: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.6 3.4 2.5 5.5 2.5s4-.9 5.5-2.5V11"/><path d="M21.5 9v5"/>',
    libro: '<path d="M4.5 4.5h10a3 3 0 0 1 3 3v12h-10a3 3 0 0 1-3-3z"/><path d="M4.5 16.5a3 3 0 0 1 3-3h10"/>',
    capas: '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>',
    grafica: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
    lista: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4M8.5 10h7M8.5 14h7M8.5 18h4"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    lapiz: '<path d="M15.5 4.5 19.5 8.5 9 19H5v-4z"/><path d="m13.5 6.5 4 4"/>',
    ajustes: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    carpeta: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    chevron: '<path d="m9.5 6 6 6-6 6"/>',
    abajo: '<path d="m6 9.5 6 6 6-6"/>',
    subir: '<path d="M12 15V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
    exportar: '<path d="M12 4.5V15M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
    escudo: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12 2.3 2.3 4.2-4.6"/>',
    candado: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    llave: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5"/>',
    flecha: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
    derecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    archivo: '<path d="M6 3.5h8l4.5 4.5v12.5H6z"/><path d="M13.5 3.5V8.5h5"/>',
    salir: '<path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12h10"/>',
    entrar: '<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14"/><path d="M10 16.5 14.5 12 10 7.5M14.5 12h-10"/>',
    luna: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    basura: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
    imprimir: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    comando: '<path d="M9 6.5A2.5 2.5 0 1 0 6.5 9H9zM15 6.5A2.5 2.5 0 1 1 17.5 9H15zM9 17.5A2.5 2.5 0 1 1 6.5 15H9zM15 17.5a2.5 2.5 0 1 0 2.5-2.5H15z"/><path d="M9 9h6v6H9z"/>',
    ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    ojoNo: '<path d="M4 4l16 16"/><path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/><path d="M10 10.2a3 3 0 0 0 4 4"/>',
    alerta: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tabla: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>',
    porcentaje: '<path d="M18 6 6 18"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    asistencia: '<rect x="4" y="4.5" width="16" height="16" rx="2"/><path d="M8 3v3M16 3v3M4 9.5h16"/><path d="m9 15 2 2 4-4"/>',
    usuarioX: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.3-5.5 6.5-5.5 1.5 0 2.9.4 4 1.2M16.5 15.5l4 4M20.5 15.5l-4 4"/>',
    usuarioOk: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.3-5.5 6.5-5.5 1.5 0 2.9.4 4 1.2"/><path d="m15.5 17.5 2 2 3.5-4"/>',
    respaldo: '<ellipse cx="12" cy="6" rx="7.5" ry="2.5"/><path d="M4.5 6v6c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V6"/><path d="M4.5 12v6c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-6"/>',
    presente: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.6-5"/>',
    falta: '<circle cx="12" cy="12" r="8.5"/><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6"/>',
    justificada: '<path d="M6 3.5h8l4.5 4.5v12.5H6z"/><path d="M13.5 3.5V8.5h5"/><path d="m9 14.2 2 2 3.8-4"/>',
    refrescar: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
    copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
    filtro: '<path d="M4 5.5h16l-6.2 7.3v5.7l-3.6 1.5v-7.2z"/>',
    puntos: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
    estrella: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
    deshacer: '<path d="M9 14.5 4.5 10 9 5.5"/><path d="M4.5 10h10a5 5 0 0 1 0 10H11"/>',
    guardar: '<path d="M5 3.5h11l3.5 3.5v11.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-13a2 2 0 0 1 .5-2z"/><path d="M8 3.5v5h7v-5M8 20.5v-6h8v6"/>',
    cargando: '<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5"/>',
    izquierda: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arriba: '<path d="M12 19.5V5M6.5 10.5 12 5l5.5 5.5"/>',
    atras: '<path d="m14.5 6-6 6 6 6"/>',
    subirChevron: '<path d="m6 14.5 6-6 6 6"/>',
    alertaCirculo: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5M12 16v.2"/>',
    ayuda: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.5M12 17v.2"/>',
    masCirculo: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
    menos: '<path d="M5 12h14"/>',
    circulo: '<circle cx="12" cy="12" r="8.5"/>',
    circuloPunteado: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="2.5 3"/>',
    tendencia: '<path d="m3.5 16.5 6-6 4 4 7-7"/><path d="M15 7.5h5.5V13"/>',
    tendenciaBaja: '<path d="m3.5 7.5 6 6 4-4 7 7"/><path d="M15 16.5h5.5V11"/>',
    enlace: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    telefono: '<path d="M5 4.5h3.5l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.5 1.5A15.5 15.5 0 0 1 3.5 6 1.5 1.5 0 0 1 5 4.5z"/>',
    correo: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
    ubicacion: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
    arroba: '<circle cx="12" cy="12" r="3.5"/><path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.3 6.7"/>',
    credencial: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.6-2.3 3-2.3s2.5.8 3 2.3M14.5 10h3M14.5 13.5h3"/>',
    etiqueta: '<path d="M3.5 12V4.5H11l9.5 9.5-7.5 7.5z"/><circle cx="7.75" cy="8.75" r="1.25"/>',
    numeral: '<path d="M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16"/>',
    calculadora: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
    sigma: '<path d="M17.5 5.5h-11l6 6.5-6 6.5h11"/>',
    balanza: '<path d="M12 4v16.5M7.5 20.5h9M5 7.5h14M5 7.5 2.5 13a2.5 2.5 0 0 0 5 0zM19 7.5 16.5 13a2.5 2.5 0 0 0 5 0z"/>',
    tijeras: '<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M8.6 8 20 18M8.6 16 20 6"/>',
    arrastrar: '<circle cx="9" cy="6" r=".9"/><circle cx="15" cy="6" r=".9"/><circle cx="9" cy="12" r=".9"/><circle cx="15" cy="12" r=".9"/><circle cx="9" cy="18" r=".9"/><circle cx="15" cy="18" r=".9"/>',
    rayo: '<path d="M13 3.5 5.5 13.5H12l-1 7 7.5-10H12z"/>',
    campana: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    prohibido: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
    hoja: '<path d="M6 3.5h8l4.5 4.5v12.5H6z"/><path d="M13.5 3.5V8.5h5M9 12.5h6.5M9 16h6.5M12 12.5V19"/>',
    sinConexion: '<path d="M3.5 8.5a13 13 0 0 1 4-2.4M20.5 8.5a13 13 0 0 0-8.5-3M6.5 12a8.5 8.5 0 0 1 3-1.6M17.5 12a8.5 8.5 0 0 0-2-1.3M10 15.5a3 3 0 0 1 4 0M12 19v.2M4 4l16 16"/>',
    bandeja: '<path d="M3.5 13.5 6 5.5h12l2.5 8V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z"/><path d="M3.5 13.5h5l1 2h5l1-2h5"/>',
    vinetas: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="17.5" r=".9"/>',
    presentacion: '<rect x="3.5" y="4.5" width="17" height="11" rx="1.5"/><path d="M12 15.5v3M8.5 20.5l3.5-2 3.5 2"/>',
    matraz: '<path d="M9.5 3.5h5M10 3.5v6l-5 9a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5-9v-6"/><path d="M7.5 15h9"/>',
    pastel: '<path d="M12 3.5v8.5h8.5A8.5 8.5 0 0 0 12 3.5z"/><path d="M19.5 15.5A8.5 8.5 0 1 1 8.5 4.3"/>',
    libroAbierto: '<path d="M12 6.5c-2-1.5-4.5-2-8-2v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2z"/><path d="M12 6.5v13"/>',
    biblioteca: '<path d="M5 4v16M9 4v16M13 5l4.5 15M17.5 4.5 21 19"/>',
    usuarioMas: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.3-5.5 6.5-5.5 1.5 0 2.9.4 4 1.2"/><path d="M18.5 14v6M15.5 17h6"/>',
    escudoNo: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z"/><path d="M4 4l16 16"/>',
    calendarioX: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M10 13.5l4 4M14 13.5l-4 4"/>',
    calendarioMas: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
    cursor: '<path d="M6 4l13 6.5-5.5 1.5L12 18z"/>',
  };

  /* Equivalencias con los nombres de Lucide/MDI que usaba la app con Iconify */
  var MAPA = {
    "upload": "subir", "upload-cloud": "subir", "file-up": "subir", "file-upload-outline": "subir",
    "download": "exportar", "download-cloud": "exportar", "file-down": "exportar",
    "info": "info", "help-circle-outline": "ayuda",
    "check-circle": "presente", "check-circle-2": "presente", "check-circle-outline": "presente", "check-decagram-outline": "presente", "clipboard-check": "lista",
    "check": "check", "check-all": "check",
    "loader-2": "cargando", "loading": "cargando",
    "chevron-right": "chevron", "chevron-down": "abajo", "chevron-left": "atras", "chevron-up": "subirChevron",
    "arrow-right": "derecha", "arrow-left": "izquierda", "arrow-up": "arriba",
    "users": "usuarios", "account-multiple-outline": "usuarios",
    "user": "persona", "user-circle": "persona", "user-circle-2": "persona", "user-cog": "persona",
    "user-plus": "usuarioMas", "account-plus-outline": "usuarioMas",
    "user-x": "usuarioX", "users-x": "usuarioX", "account-remove-outline": "usuarioX", "account-off-outline": "usuarioX",
    "user-check": "usuarioOk", "account-check-outline": "usuarioOk", "account-multiple-check-outline": "usuarioOk",
    "pencil": "lapiz", "pencil-outline": "lapiz", "pencil-circle-outline": "lapiz", "edit-3": "lapiz", "tag-edit-outline": "lapiz", "clipboard-pen": "lapiz", "file-document-edit-outline": "lapiz",
    "close": "cerrar", "x": "cerrar", "x-circle": "falta", "close-circle-outline": "falta",
    "library": "biblioteca", "layers": "capas", "layers-3": "capas",
    "alert-triangle": "alerta", "triangle-alert": "alerta", "alert-circle": "alertaCirculo", "alert-octagon": "alertaCirculo",
    "trash-2": "basura", "delete-outline": "basura",
    "settings-2": "ajustes", "settings": "ajustes", "sliders-horizontal": "ajustes",
    "lock": "candado", "lock-outline": "candado", "lock-keyhole": "candado", "lock-check-outline": "candado", "key": "llave",
    "graduation-cap": "birrete", "school-outline": "birrete",
    "bar-chart-2": "grafica", "bar-chart-3": "grafica", "chart-bar": "grafica", "pie-chart": "pastel",
    "trending-up": "tendencia", "trending-down": "tendenciaBaja",
    "content-save-outline": "guardar", "save": "guardar", "save-all": "guardar",
    "book-open": "libroAbierto", "book-open-outline": "libroAbierto", "book-open-check": "libroAbierto",
    "book": "libro", "book-outline": "libro", "book-x": "libro", "book-off-outline": "libro",
    "plus": "mas", "plus-circle": "masCirculo", "plus-circle-outline": "masCirculo", "minus": "menos",
    "layout-dashboard": "panel", "layout-grid": "panel",
    "search": "buscar", "magnify": "buscar", "search-x": "buscar", "calendar-search": "buscar",
    "clipboard-list-outline": "lista", "clipboard-list": "lista", "clipboard-text-outline": "lista", "clipboard-off-outline": "lista",
    "inbox": "bandeja", "wifi-off": "sinConexion",
    "rotate-ccw": "refrescar", "refresh-cw": "refrescar", "refresh": "refrescar", "undo-variant": "deshacer",
    "star-plus-outline": "estrella", "star-outline": "estrella", "star": "estrella", "party-popper": "estrella",
    "calendar-range-outline": "calendario", "calendar": "calendario", "calendar-days": "calendario", "calendar-multiple": "calendario",
    "calendar-check": "asistencia", "calendar-check-outline": "asistencia",
    "calendar-x": "calendarioX", "calendar-remove-outline": "calendarioX", "calendar-plus-outline": "calendarioMas", "calendar-clock": "reloj",
    "sun": "sol", "moon": "luna", "log-out": "salir", "bell": "campana",
    "layout-list": "vinetas", "list": "vinetas", "format-list-bulleted": "vinetas",
    "clock": "reloj", "clock-outline": "reloj",
    "circle-dashed": "circuloPunteado", "circle": "circulo",
    "presentation": "presentacion", "flask-outline": "matraz",
    "folder-open-outline": "carpeta", "folder-open": "carpeta", "folder": "carpeta",
    "file-delimited-outline": "hoja", "file-spreadsheet": "hoja",
    "file-document-outline": "archivo", "file-json": "archivo",
    "table-large": "tabla", "table": "tabla", "table-2": "tabla",
    "calculator-variant-outline": "calculadora", "calculator": "calculadora",
    "zap": "rayo", "shield-check": "escudo", "shield-check-outline": "escudo", "shield-off-outline": "escudoNo",
    "scale": "balanza", "percent": "porcentaje", "sigma": "sigma", "numeric": "numeral", "hash": "numeral",
    "tag": "etiqueta", "tag-outline": "etiqueta", "id-card": "credencial", "at-sign": "arroba",
    "link": "enlace", "phone": "telefono", "mail": "correo", "map-pin": "ubicacion",
    "printer": "imprimir", "printer-outline": "imprimir",
    "scissors": "tijeras", "grip-vertical": "arrastrar", "mouse-pointer-click": "cursor",
    "ban": "prohibido", "filter": "filtro", "database-backup": "respaldo", "lock-reset": "llave",
  };

  var ATR = 'viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

  function icono(nombre, clase) {
    return '<svg class="ico' + (clase ? " " + clase : "") + '" ' + ATR + ">" + (P[nombre] || "") + "</svg>";
  }

  function pintar(raiz) {
    var nodos = (raiz || document).querySelectorAll("i[data-ico]");
    for (var i = 0; i < nodos.length; i++) {
      var n = nodos[i];
      var tmp = document.createElement("span");
      tmp.innerHTML = icono(n.getAttribute("data-ico"), n.className);
      n.replaceWith(tmp.firstChild);
    }
  }

  function iniciar() {
    pintar(document);
    new MutationObserver(function (cambios) {
      for (var i = 0; i < cambios.length; i++) {
        if (cambios[i].addedNodes.length) { pintar(document); return; }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  /* <iconify-icon icon="lucide:x"> → dibuja el ícono equivalente de esta familia.
     Permite que las plantillas existentes (HTML y JS) sigan funcionando sin el CDN
     de Iconify; también responde a setAttribute("icon", ...). */
  function nombreDesde(attr) {
    var n = String(attr || "").replace(/^(lucide|mdi):/, "");
    return P[n] ? n : MAPA[n] || "circulo";
  }
  if (global.customElements && !global.customElements.get("iconify-icon")) {
    var IconoCompat = function () { return Reflect.construct(HTMLElement, [], IconoCompat); };
    IconoCompat.prototype = Object.create(HTMLElement.prototype);
    IconoCompat.prototype.constructor = IconoCompat;
    Object.setPrototypeOf(IconoCompat, HTMLElement);
    Object.defineProperty(IconoCompat, "observedAttributes", { get: function () { return ["icon"]; } });
    IconoCompat.prototype.dibujar = function () {
      this.setAttribute("aria-hidden", "true");
      this.innerHTML = '<svg class="ico-i" ' + ATR + ">" + P[nombreDesde(this.getAttribute("icon"))] + "</svg>";
    };
    IconoCompat.prototype.connectedCallback = function () { this.dibujar(); };
    IconoCompat.prototype.attributeChangedCallback = function () { if (this.isConnected) this.dibujar(); };
    global.customElements.define("iconify-icon", IconoCompat);
  }

  global.RCAIconos = { icono: icono, pintar: pintar, nombres: Object.keys(P), equivalente: nombreDesde };
})(window);

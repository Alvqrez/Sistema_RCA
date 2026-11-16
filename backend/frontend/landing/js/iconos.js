/*
 * iconos.js — Conjunto mínimo de iconos de trazo (24px, trazo 1.5).
 * Un solo lenguaje para toda la landing y sus mockups.
 */
(function (global) {
  "use strict";
  var P = {
    panel: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18.2 14.8c1.7.7 2.9 2.4 3.3 5.2"/>',
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
    subir: '<path d="M12 15V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
    escudo: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12 2.3 2.3 4.2-4.6"/>',
    candado: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    llave: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5"/>',
    flecha: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
    archivo: '<path d="M6 3.5h8l4.5 4.5v12.5H6z"/><path d="M13.5 3.5V8.5h5"/>',
    salir: '<path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12h10"/>',
    luna: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    rayo: '<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z"/>',
    exportar: '<path d="M12 4.5V15M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
    usuarioX: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.3-5.5 6.5-5.5 1.5 0 2.9.4 4 1.2M16.5 15.5l4 4M20.5 15.5l-4 4"/>',
  };

  function icono(nombre, clase) {
    return (
      '<svg class="ico ' + (clase || "") + '" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (P[nombre] || "") +
      "</svg>"
    );
  }

  global.RCAIconos = { icono: icono };
})(window);

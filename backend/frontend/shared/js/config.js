// Configuración global del frontend.
//
// API_URL se elige según dónde se abre la página, para que probar en local
// nunca lea ni escriba en la base de datos de producción:
//   · Producción (cualquier dominio que no sea local) → API de producción.
//   · Local servido por el backend (npm start, puerto 3000) → el mismo origen.
//   · Local con Live Server u otro puerto, o abierto como archivo → backend local.
(function () {
  var PRODUCCION = "https://rca.elprofecoss.tech";
  var BACKEND_LOCAL = "http://localhost:3000";

  var host = window.location.hostname;
  var esLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    window.location.protocol === "file:";

  if (!esLocal) {
    window.API_URL = PRODUCCION;
  } else if (window.location.port === "3000") {
    window.API_URL = window.location.origin;
  } else {
    window.API_URL = BACKEND_LOCAL;
  }
})();

// Escapa HTML para evitar XSS en contenido dinámico insertado con innerHTML.
window.esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

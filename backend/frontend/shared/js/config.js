// Configuración global del frontend.
// Edita solo este archivo para apuntar a un entorno diferente.
window.API_URL = "http://localhost:3000";

// Escapa HTML para evitar XSS en contenido dinámico insertado con innerHTML.
window.esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

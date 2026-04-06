// frontend/js/sidebar.js
// Se incluye en TODAS las páginas del sistema (excepto login y portalAlumno)

(function () {
  const rol = localStorage.getItem("rol");
  const nombre = localStorage.getItem("nombre");
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // ─── LINKS POR ROL ─────────────────────────────────────────────────────────
  const linksPorRol = {
    maestro: [
      {
        href: "mis_grupos.html",
        texto: "Mis grupos",
        icono: "lucide:users-round",
      },
      {
        href: "calificaciones.html",
        texto: "Calificaciones",
        icono: "lucide:bar-chart-3",
      },
      {
        href: "unidades.html",
        texto: "Unidades",
        icono: "lucide:clipboard-list",
      },
      {
        href: "actividades.html",
        texto: "Actividades",
        icono: "lucide:clipboard-pen",
      },
      {
        href: "formulario.html",
        texto: "Formulario de evaluación",
        icono: "mdi:file-document-edit-outline",
      },
      // "Alumnos" ELIMINADO — el maestro ve a sus alumnos desde "Mis grupos"
    ],

    administrador: [
      { href: "admin.html", texto: "Panel", icono: "lucide:layout-dashboard" },
      { href: "alumnos.html", texto: "Alumnos", icono: "lucide:user" },
      {
        href: "maestros.html",
        texto: "Maestros",
        icono: "lucide:graduation-cap",
      },
      { href: "materias.html", texto: "Materias", icono: "lucide:book-open" },
      { href: "grupos.html", texto: "Grupos", icono: "lucide:library" },
      { href: "unidades.html", texto: "Unidades", icono: "lucide:list-checks" },
      { href: "carreras.html", texto: "Carreras", icono: "lucide:briefcase" },
    ],
  };

  const links = linksPorRol[rol] || [];
  const paginaActual = window.location.pathname.split("/").pop();

  const linksHTML = links
    .map((link) => {
      const activo = link.href === paginaActual ? "active" : "";
      return `
        <a href="${link.href}" class="${activo}">
          <iconify-icon icon="${link.icono}"></iconify-icon>
          <span>${link.texto}</span>
        </a>`;
    })
    .join("");

  const sidebarHTML = `
    <div class="sidebar-logo">
      <h2>RCA</h2>
      <span class="sidebar-usuario">${nombre || "Usuario"}</span>
      <span class="sidebar-rol">${rol || ""}</span>
    </div>
    <nav>${linksHTML}</nav>
    <button class="logout-btn" onclick="cerrarSesion()">
      <iconify-icon icon="lucide:log-out"></iconify-icon>
      <span>Cerrar sesión</span>
    </button>
  `;

  const aside = document.querySelector("aside.sidebar");
  if (aside) aside.innerHTML = sidebarHTML;
})();

// ─── GUARDIA DE ROL ────────────────────────────────────────────────────────
// Llama esta función al inicio de cualquier página exclusiva de un rol.
// Ejemplo: soloPermitido("administrador")  → redirige si no es admin
//          soloPermitido("maestro", "administrador") → permite ambos
function soloPermitido(...rolesPermitidos) {
  const rol = localStorage.getItem("rol");
  if (!rolesPermitidos.includes(rol)) {
    // Redirige a la página principal del rol que sí tiene sesión
    const inicio = { maestro: "mis_grupos.html", alumno: "portalAlumno.html" };
    window.location.href = inicio[rol] || "login.html";
  }
}

function cerrarSesion() {
  localStorage.clear();
  window.location.href = "login.html";
}

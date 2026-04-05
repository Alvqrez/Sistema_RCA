// frontend/js/sidebar.js
// Se incluye en TODAS las páginas del sistema (excepto login y portalAlumno)

(function () {
  const rol = localStorage.getItem("rol");
  const nombre = localStorage.getItem("nombre");
  const token = localStorage.getItem("token");

  // Si no hay sesión, redirige al login
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Links según el rol
  const linksPorRol = {
    maestro: [
      { href: "grupos.html", texto: "Mis grupos", icono: "lucide:users-round" },
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
      { href: "alumnos.html", texto: "Alumnos", icono: "lucide:user" },
      {
        href: "formulario.html",
        texto: "Formulario de evaluación",
        icono: "mdi:file-document-edit-outline"
      }
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
    ],
  };

  const links = linksPorRol[rol] || [];
  const paginaActual = window.location.pathname.split("/").pop();

  // Construye el HTML del sidebar
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
        </div>
        <nav>${linksHTML}</nav>
        <button class="logout-btn" onclick="cerrarSesion()">
            <iconify-icon icon="lucide:log-out"></iconify-icon>
            <span>Cerrar sesión</span>
        </button>
    `;

  // Inyecta el sidebar en el aside que ya existe en cada página
  const aside = document.querySelector("aside.sidebar");
  if (aside) {
    aside.innerHTML = sidebarHTML;
  }
})();

function cerrarSesion() {
  localStorage.clear();
  window.location.href = "login.html";
}

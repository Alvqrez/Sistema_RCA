// frontend/js/sidebar.js
(function () {
  const rol = localStorage.getItem("rol");
  const nombre = localStorage.getItem("nombre");
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const etiquetaRol =
    { alumno: "Alumno", maestro: "Docente", administrador: "Administrador" }[
      rol
    ] || rol;
  const iconoRol =
    {
      administrador: "lucide:shield-check",
      maestro: "lucide:graduation-cap",
      alumno: "lucide:user-circle-2",
    }[rol] || "lucide:user";

  const linksPorRol = {
    alumno: [
      {
        href: "portalAlumno.html",
        texto: "Mi portal",
        icono: "lucide:layout-dashboard",
      },
    ],
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
    ],
    administrador: [
      { href: "admin.html", texto: "Panel", icono: "lucide:layout-dashboard" },
      {
        texto: "Alumnos",
        icono: "lucide:user",
        hijos: [
          {
            href: "alumnos.html",
            texto: "Lista de alumnos",
            icono: "lucide:users",
          },
          {
            href: "alumnos.html#registro",
            texto: "Registrar alumno",
            icono: "lucide:user-plus",
          },
          {
            href: "inscripcion.html",
            texto: "Inscripción a grupos",
            icono: "mdi:account-plus-outline",
          },
        ],
      },
      {
        texto: "Maestros",
        icono: "lucide:graduation-cap",
        hijos: [
          {
            href: "maestros.html",
            texto: "Ver maestros",
            icono: "lucide:users",
          },
          {
            href: "maestros.html#registro",
            texto: "Registrar maestro",
            icono: "lucide:user-plus",
          },
        ],
      },
      { href: "materias.html", texto: "Materias", icono: "lucide:book-open" },
      { href: "grupos.html", texto: "Grupos", icono: "lucide:library" },
      { href: "unidades.html", texto: "Unidades", icono: "lucide:list-checks" },
      {
        href: "periodos.html",
        texto: "Periodos",
        icono: "mdi:calendar-range-outline",
      },
    ],
  };

  const links = linksPorRol[rol] || [];
  const paginaActual = window.location.pathname
    .split("/")
    .pop()
    .split("?")[0]
    .split("#")[0];
  const isDark = localStorage.getItem("tema") === "oscuro";

  function buildLink(link) {
    if (link.hijos) {
      const algunoActivo = link.hijos.some(
        (h) => h.href.split("#")[0] === paginaActual,
      );
      const hijosHTML = link.hijos
        .map((h) => {
          const pg = h.href.split("#")[0];
          return `<a href="${h.href}" class="submenu-item ${pg === paginaActual ? "active" : ""}">
          <iconify-icon icon="${h.icono}"></iconify-icon>
          <span>${h.texto}</span>
        </a>`;
        })
        .join("");
      return `<div class="nav-group ${algunoActivo ? "open" : ""}">
        <button class="nav-group-btn" onclick="toggleSubmenu(this)">
          <iconify-icon icon="${link.icono}"></iconify-icon>
          <span>${link.texto}</span>
          <iconify-icon class="chevron" icon="lucide:chevron-right"></iconify-icon>
        </button>
        <div class="submenu">${hijosHTML}</div>
      </div>`;
    }
    return `<a href="${link.href}" class="${link.href === paginaActual ? "active" : ""}">
      <iconify-icon icon="${link.icono}"></iconify-icon>
      <span>${link.texto}</span>
    </a>`;
  }

  const aside = document.querySelector("aside.sidebar");
  if (!aside) return;

  aside.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-avatar"><iconify-icon icon="${iconoRol}"></iconify-icon></div>
      <p class="sidebar-bienvenida">¡Bienvenido!</p>
      <span class="sidebar-nombre">${nombre || "Usuario"}</span>
      <span class="sidebar-rol-badge rol-${rol}">${etiquetaRol}</span>
    </div>
    <nav>${links.map(buildLink).join("")}</nav>
    <button class="theme-icon-btn" id="themeBtnSidebar" onclick="toggleTheme()"
            title="${isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}">
      <iconify-icon id="themeIcon" icon="${isDark ? "lucide:sun" : "lucide:moon"}"></iconify-icon>
      <span id="themeLabel">${isDark ? "Modo claro" : "Modo oscuro"}</span>
    </button>
    <button class="logout-btn" onclick="cerrarSesion()">
      <iconify-icon icon="lucide:log-out"></iconify-icon>
      <span>Cerrar sesión</span>
    </button>
  `;
})();

(function () {
  if (localStorage.getItem("tema") === "oscuro")
    document.documentElement.classList.add("dark-mode");
})();

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark-mode");
  localStorage.setItem("tema", isDark ? "oscuro" : "claro");
  const icon = document.getElementById("themeIcon");
  const label = document.getElementById("themeLabel");
  const btn = document.getElementById("themeBtnSidebar");
  if (icon) icon.setAttribute("icon", isDark ? "lucide:sun" : "lucide:moon");
  if (label) label.textContent = isDark ? "Modo claro" : "Modo oscuro";
  if (btn)
    btn.title = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
}

function toggleSubmenu(btn) {
  btn.closest(".nav-group").classList.toggle("open");
}

function soloPermitido(...roles) {
  const rol = localStorage.getItem("rol");
  if (!roles.includes(rol)) {
    const inicio = { maestro: "mis_grupos.html", alumno: "portalAlumno.html" };
    window.location.href = inicio[rol] || "login.html";
  }
}

function cerrarSesion() {
  localStorage.clear();
  window.location.href = "login.html";
}

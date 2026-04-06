// frontend/js/sidebar.js
(function () {
  const rol = localStorage.getItem("rol");
  const nombre = localStorage.getItem("nombre");
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // ── Etiqueta legible del rol ────────────────────────────────────────
  const etiquetaRol =
    {
      alumno: "Alumno",
      maestro: "Docente",
      administrador: "Administrador",
    }[rol] || rol;

  // ── Definición de links con soporte a submenús ──────────────────────
  // Para un link con hijos: agrega `hijos: [{ href, texto }]`
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
    ],

    administrador: [
      {
        href: "admin.html",
        texto: "Panel",
        icono: "lucide:layout-dashboard",
      },
      {
        // Sin href propio — solo abre el submenú
        texto: "Alumnos",
        icono: "lucide:user",
        hijos: [
          {
            href: "alumnos.html#registro",
            texto: "Registrar alumno",
            icono: "lucide:user-plus",
          },
          {
            href: "alumnos.html",
            texto: "Lista de alumnos",
            icono: "lucide:users",
          },
        ],
      },
      {
        texto: "Maestros",
        icono: "lucide:graduation-cap",
        hijos: [
          {
            href: "maestros.html#registro",
            texto: "Registrar maestro",
            icono: "lucide:user-plus",
          },
          {
            href: "maestros.html",
            texto: "Ver maestros",
            icono: "lucide:users",
          },
        ],
      },
      {
        href: "materias.html",
        texto: "Materias",
        icono: "lucide:book-open",
      },
      {
        href: "grupos.html",
        texto: "Grupos",
        icono: "lucide:library",
      },
      {
        href: "unidades.html",
        texto: "Unidades",
        icono: "lucide:list-checks",
      },
      {
        href: "carreras.html",
        texto: "Carreras",
        icono: "lucide:briefcase",
      },
    ],
  };

  const links = linksPorRol[rol] || [];
  const paginaActual = window.location.pathname.split("/").pop();
  const isDark = localStorage.getItem("tema") === "oscuro";

  // ── Construye HTML de un link (con o sin hijos) ─────────────────────
  function buildLink(link) {
    if (link.hijos) {
      // Determina si algún hijo está activo
      const algunoActivo = link.hijos.some(
        (h) => h.href.split("#")[0] === paginaActual,
      );
      const abierto = algunoActivo ? "open" : "";

      const hijosHTML = link.hijos
        .map((h) => {
          const paginaHijo = h.href.split("#")[0];
          const activo = paginaHijo === paginaActual ? "active" : "";
          return `<a href="${h.href}" class="submenu-item ${activo}">
                    <iconify-icon icon="${h.icono}"></iconify-icon>
                    <span>${h.texto}</span>
                </a>`;
        })
        .join("");

      return `
                <div class="nav-group ${abierto}">
                    <button class="nav-group-btn" onclick="toggleSubmenu(this)">
                        <iconify-icon icon="${link.icono}"></iconify-icon>
                        <span>${link.texto}</span>
                        <iconify-icon class="chevron" icon="lucide:chevron-right"></iconify-icon>
                    </button>
                    <div class="submenu">${hijosHTML}</div>
                </div>
            `;
    }

    const activo = link.href === paginaActual ? "active" : "";
    return `<a href="${link.href}" class="${activo}">
            <iconify-icon icon="${link.icono}"></iconify-icon>
            <span>${link.texto}</span>
        </a>`;
  }

  const linksHTML = links.map(buildLink).join("");

  const aside = document.querySelector("aside.sidebar");
  if (!aside) return;

  aside.innerHTML = `
        <div class="sidebar-logo">
            <div class="sidebar-avatar">
                <iconify-icon icon="${rol === "administrador" ? "lucide:shield-check" : rol === "maestro" ? "lucide:graduation-cap" : "lucide:user"}"></iconify-icon>
            </div>
            <p class="sidebar-bienvenida">¡Bienvenido!</p>
            <span class="sidebar-nombre">${nombre || "Usuario"}</span>
            <span class="sidebar-rol-badge rol-${rol}">${etiquetaRol}</span>
        </div>
        <nav>${linksHTML}</nav>
        <button class="theme-icon-btn" id="themeBtnSidebar" onclick="toggleTheme()" title="${isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}">
            <iconify-icon id="themeIcon" icon="${isDark ? "lucide:sun" : "lucide:moon"}"></iconify-icon>
        </button>
        <button class="logout-btn" onclick="cerrarSesion()">
            <iconify-icon icon="lucide:log-out"></iconify-icon>
            <span>Cerrar sesión</span>
        </button>
    `;
})();

// ── Aplicar tema al cargar ──────────────────────────────────────────────
(function () {
  if (localStorage.getItem("tema") === "oscuro") {
    document.documentElement.classList.add("dark-mode");
  }
})();

// ── Toggle tema ─────────────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle("dark-mode");
  localStorage.setItem("tema", isDark ? "oscuro" : "claro");

  const icon = document.getElementById("themeIcon");
  const btn = document.getElementById("themeBtnSidebar");
  if (icon) icon.setAttribute("icon", isDark ? "lucide:sun" : "lucide:moon");
  if (btn)
    btn.title = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
}

// ── Toggle submenú ──────────────────────────────────────────────────────
function toggleSubmenu(btn) {
  const grupo = btn.closest(".nav-group");
  grupo.classList.toggle("open");
}

// ── Guardia de rol ──────────────────────────────────────────────────────
function soloPermitido(...rolesPermitidos) {
  const rol = localStorage.getItem("rol");
  if (!rolesPermitidos.includes(rol)) {
    const inicio = { maestro: "mis_grupos.html", alumno: "portalAlumno.html" };
    window.location.href = inicio[rol] || "login.html";
  }
}

function cerrarSesion() {
  localStorage.clear();
  window.location.href = "login.html";
}

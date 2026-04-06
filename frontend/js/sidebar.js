// frontend/js/sidebar.js
(function () {
  const rol = localStorage.getItem("rol");
  const nombre = localStorage.getItem("nombre");
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

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
  const isDark = localStorage.getItem("tema") === "oscuro";

  const linksHTML = links
    .map((link) => {
      const activo = link.href === paginaActual ? "active" : "";
      return `<a href="${link.href}" class="${activo}">
      <iconify-icon icon="${link.icono}"></iconify-icon>
      <span>${link.texto}</span>
    </a>`;
    })
    .join("");

  const aside = document.querySelector("aside.sidebar");
  if (!aside) return;

  aside.innerHTML = `
    <div class="sidebar-logo">
      <h2>RCA</h2>
      <span class="sidebar-usuario">${nombre || "Usuario"}</span>
      <span class="sidebar-rol">${rol || ""}</span>
    </div>
    <nav>${linksHTML}</nav>
    <button class="theme-btn" id="themeBtnSidebar" onclick="toggleTheme()">
      <iconify-icon id="themeIcon" icon="${isDark ? "lucide:sun" : "lucide:moon"}"></iconify-icon>
      <span id="themeLabel">${isDark ? "Modo claro" : "Modo oscuro"}</span>
    </button>
    <button class="logout-btn" onclick="cerrarSesion()">
      <iconify-icon icon="lucide:log-out"></iconify-icon>
      <span>Cerrar sesión</span>
    </button>
  `;
})();

// ── Aplicar tema guardado al cargar ──────────────────────────────────
(function () {
  if (localStorage.getItem("tema") === "oscuro") {
    document.documentElement.classList.add("dark-mode");
  }
})();

// ── Toggle ────────────────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle("dark-mode");

  localStorage.setItem("tema", isDark ? "oscuro" : "claro");

  // Actualizar ícono y texto del botón
  const icon = document.getElementById("themeIcon");
  const label = document.getElementById("themeLabel");
  if (icon) icon.setAttribute("icon", isDark ? "lucide:sun" : "lucide:moon");
  if (label) label.textContent = isDark ? "Modo claro" : "Modo oscuro";
}

// ── Guardia de rol ────────────────────────────────────────────────────
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

function toggleTheme() {
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("tema", "oscuro");
  } else {
    localStorage.setItem("tema", "claro");
  }
}

(function () {
  const tema = localStorage.getItem("tema");

  if (tema === "oscuro") {
    document.body.classList.add("dark-mode");
  }
})();
document.addEventListener("click", function (e) {
  if (e.target.closest(".dropdown-btn")) {
    const btn = e.target.closest(".dropdown-btn");
    const submenu = btn.nextElementSibling;

    submenu.classList.toggle("open");
  }
});
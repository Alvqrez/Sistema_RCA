window.API_URL = "http://localhost:3000";

// ── A-1: Shim de seguridad — redirige el token de localStorage a sessionStorage ──
// sessionStorage se borra automáticamente al cerrar la pestaña o el navegador,
// reduciendo la ventana de ataque frente a scripts maliciosos persistentes.
// Este shim es transparente: todos los demás archivos JS siguen llamando a
// localStorage.getItem("token") sin cambiar ninguna línea de código.
(function () {
  const _get = Storage.prototype.getItem.bind(localStorage);
  const _set = Storage.prototype.setItem.bind(localStorage);
  const _remove = Storage.prototype.removeItem.bind(localStorage);

  // Migrar token antiguo (si el usuario ya tenía sesión antes del fix)
  const tokenAntiguo = _get("token");
  if (tokenAntiguo) {
    sessionStorage.setItem("token", tokenAntiguo);
    _remove("token");
  }

  localStorage.getItem = function (key) {
    if (key === "token") return sessionStorage.getItem("token");
    return _get(key);
  };
  localStorage.setItem = function (key, value) {
    if (key === "token") return sessionStorage.setItem("token", value);
    return _set(key, value);
  };
  localStorage.removeItem = function (key) {
    if (key === "token") return sessionStorage.removeItem("token");
    return _remove(key);
  };
})();

(function () {
  const rol = localStorage.getItem("rol");
  const nombre = localStorage.getItem("nombre");
  const token = localStorage.getItem("token"); // → lee de sessionStorage gracias al shim

  if (!token) {
    window.location.href = "../../shared/pages/login.html";
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
        href: "../../alumno/pages/portalAlumno.html",
        texto: "Mis calificaciones",
        icono: "lucide:layout-dashboard",
      },
      {
        href: "../../alumno/pages/utilerias_alumno.html",
        texto: "Utilerías",
        icono: "lucide:settings-2",
      },
    ],

    maestro: [
      {
        href: "../../maestro/pages/mis_grupos.html",
        texto: "Inicio",
        icono: "lucide:layout-dashboard",
      },
      {
        texto: "Directorio",
        icono: "lucide:users",
        hijos: [
          {
            href: "../../maestro/pages/alumnosMaestro.html",
            texto: "Buscar alumnos",
            icono: "lucide:search",
          },
        ],
      },
      {
        texto: "Mis Grupos",
        icono: "lucide:book-open",
        hijos: [
          {
            href: "../../maestro/pages/gruposMaestro.html",
            texto: "Configurar unidad",
            icono: "lucide:sliders-horizontal",
          },
        ],
      },
      {
        texto: "Calificaciones",
        icono: "mdi:file-document-edit-outline",
        hijos: [
          {
            href: "../../maestro/pages/captura_calificaciones.html",
            texto: "Capturar calificaciones",
            icono: "lucide:pencil",
          },
        ],
      },
      {
        href: "../../shared/pages/reportes.html",
        texto: "Reportes",
        icono: "lucide:bar-chart-2",
      },
      {
        href: "../../shared/pages/estadisticas.html",
        texto: "Estadísticas",
        icono: "lucide:chart-bar",
      },
      {
        href: "../../maestro/pages/utilerias_maestro.html",
        texto: "Utilerías",
        icono: "lucide:settings-2",
      },
    ],

    administrador: [
      {
        href: "../../admin/pages/admin.html",
        texto: "Panel",
        icono: "lucide:layout-dashboard",
      },
      {
        texto: "Catálogo",
        icono: "lucide:folder-open",
        hijos: [
          {
            href: "../../admin/pages/carreras.html",
            texto: "Carreras",
            icono: "mdi:school-outline",
          },
          {
            href: "../../admin/pages/materias.html",
            texto: "Materias",
            icono: "lucide:book",
          },
          {
            href: "../../admin/pages/unidades.html",
            texto: "Unidades",
            icono: "lucide:layers",
          },
          {
            href: "../../admin/pages/maestros.html",
            texto: "Maestros",
            icono: "lucide:graduation-cap",
          },
          {
            href: "../../admin/pages/alumnos.html",
            texto: "Alumnos",
            icono: "lucide:user",
          },
          {
            href: "../../admin/pages/grupos.html",
            texto: "Grupos",
            icono: "lucide:library",
          },
          {
            href: "../../admin/pages/inscripcion.html",
            texto: "Inscripciones",
            icono: "mdi:account-plus-outline",
          },
          {
            href: "../../admin/pages/actividadesAdmin.html",
            texto: "Actividades predefinidas",
            icono: "mdi:clipboard-list-outline",
          },
        ],
      },
      {
        texto: "Utilerías",
        icono: "lucide:settings-2",
        hijos: [
          {
            href: "../../admin/pages/periodos.html",
            texto: "Periodos escolares",
            icono: "mdi:calendar-range-outline",
          },
          {
            href: "../../shared/pages/reportes.html",
            texto: "Reportes",
            icono: "lucide:bar-chart-2",
          },
          {
            href: "../../shared/pages/estadisticas.html",
            texto: "Estadísticas",
            icono: "lucide:chart-bar",
          },
          {
            href: "../../admin/pages/utilerias.html",
            texto: "Utilerías del sistema",
            icono: "lucide:settings",
          },
        ],
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
    if (link.separador) {
      return `<div class="nav-group-label">${link.separador}</div>`;
    }
    const getFilename = (href) =>
      href ? href.split("/").pop().split("?")[0].split("#")[0] : "";

    if (link.hijos) {
      const algunoActivo = link.hijos.some(
        (h) => h.href && getFilename(h.href) === paginaActual,
      );
      const hijosHTML = link.hijos
        .map((h) => {
          const pg = getFilename(h.href);
          return `<a href="${h.href}" class="submenu-item ${pg === paginaActual ? "active" : ""}">
          <iconify-icon icon="${h.icono}"></iconify-icon><span>${h.texto}</span>
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
    const linkPage = getFilename(link.href);
    return `<a href="${link.href}" class="${linkPage === paginaActual ? "active" : ""}">
      <iconify-icon icon="${link.icono}"></iconify-icon><span>${link.texto}</span>
    </a>`;
  }

  const aside = document.querySelector("aside.sidebar");
  if (!aside) return;

  const sidebarColapsado =
    localStorage.getItem("sidebar_estado") === "colapsado";
  if (sidebarColapsado) {
    aside.classList.add("collapsed");
    document.body.classList.add("sidebar-collapsed");
  }

  aside.innerHTML = `
    <div class="sidebar-accent-bar"></div>
    <button class="sidebar-toggle-btn" onclick="toggleSidebar()" title="Colapsar / expandir menú">
      <iconify-icon icon="lucide:chevron-left"></iconify-icon>
    </button>
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
      <iconify-icon icon="lucide:log-out"></iconify-icon><span>Cerrar sesión</span>
    </button>
  `;
})();

(function () {
  if (localStorage.getItem("tema") === "oscuro")
    document.documentElement.classList.add("dark-mode");
})();

function toggleSidebar() {
  const aside = document.querySelector("aside.sidebar");
  if (!aside) return;
  const colapsado = aside.classList.toggle("collapsed");
  document.body.classList.toggle("sidebar-collapsed", colapsado);
  localStorage.setItem("sidebar_estado", colapsado ? "colapsado" : "expandido");
}

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
    const inicio = {
      maestro: "../../maestro/pages/mis_grupos.html",
      alumno: "../../alumno/pages/portalAlumno.html",
      administrador: "../../admin/pages/admin.html",
    };
    window.location.href = inicio[rol] || "../../shared/pages/login.html";
  }
}

function cerrarSesion() {
  // A-1: limpiar sessionStorage (donde vive el token gracias al shim)
  sessionStorage.clear();
  // Conservar preferencia de tema del localStorage
  const tema = localStorage.getItem("tema");
  localStorage.clear();
  if (tema) localStorage.setItem("tema", tema);
  window.location.href = "../../shared/pages/login.html";
}

function fmtFecha(f) {
  if (!f) return "—";
  const str = f.toString().split("T")[0];
  const partes = str.split("-");
  if (partes.length !== 3) return str;
  const [anio, mes, dia] = partes;
  return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anio}`;
}

function showToast(msg, tipo = "success") {
  let c = document.getElementById("toast-container");
  if (!c) {
    c = document.createElement("div");
    c.id = "toast-container";
    document.body.appendChild(c);
  }
  const t = document.createElement("div");
  t.className = `toast toast-${tipo}`;
  const icons = {
    success: "lucide:check-circle",
    error: "lucide:x-circle",
    info: "lucide:info",
  };
  t.innerHTML = `<iconify-icon icon="${icons[tipo] || icons.info}"></iconify-icon>${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function toggleCard(btn) {
  const card = btn.closest(".card-collapsible");
  if (!card) return;
  const collapsed = card.classList.toggle("collapsed");
  btn.title = collapsed ? "Expandir" : "Contraer";
}

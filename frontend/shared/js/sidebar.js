// sidebar.js  — navegación mejorada v2
// Cambios respecto a la versión anterior:
//  • Administrador: "Catálogos" dividido en "Personas" y "Configuración Académica"
//    → El admin ya sabe al instante dónde buscar alumnos/maestros vs materias/grupos
//  • Administrador: "Inscripciones" movida a su propia sección "Operación"
//    junto con "Grupos" y "Periodos" (son acciones operativas, no catálogos)
//  • Maestro: "Clases" renombrado a "Mis Grupos" (más descriptivo)
//  • Maestro: "Ponderacion de unidades" → "Peso por unidad" (más claro)
//  • Maestro: "Capturar calificaciones" promovido fuera del sub-menú
//    y renombrado a "Calificaciones" para mayor visibilidad
//  • Maestro: sección de Calificaciones incluye "Bonus" para no esconderlo
//  • Alumno: se agrega enlace explícito a "Mis calificaciones" como alias
//    de portalAlumno para que el nombre sea auto-descriptivo

(function () {
  const rol = localStorage.getItem("rol");
  const nombre = localStorage.getItem("nombre");
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const etiquetaRol =
    {
      alumno: "Alumno",
      maestro: "Docente",
      administrador: "Administrador",
    }[rol] || rol;

  const iconoRol =
    {
      administrador: "lucide:shield-check",
      maestro: "lucide:graduation-cap",
      alumno: "lucide:user-circle-2",
    }[rol] || "lucide:user";

  const linksPorRol = {
    // ─────────────────────────────────────────────────────────────────────
    //  ALUMNO
    // ─────────────────────────────────────────────────────────────────────
    alumno: [
      {
        href: "portalAlumno.html",
        texto: "Mis calificaciones", // antes: "Mi portal" — poco descriptivo
        icono: "lucide:layout-dashboard",
      },
    ],

    // ─────────────────────────────────────────────────────────────────────
    //  MAESTRO
    //  Flujo natural: ver grupos → configurar → capturar calificaciones
    // ─────────────────────────────────────────────────────────────────────
    maestro: [
      {
        href: "mis_grupos.html",
        texto: "Inicio",
        icono: "lucide:layout-dashboard",
      },
      {
        // antes "Alumnos" sólo tenía "Buscar alumnos" — se mantiene pero
        // el nombre del grupo ahora aclara que es para consulta, no gestión
        texto: "Directorio",
        icono: "lucide:users",
        hijos: [
          {
            href: "alumnosMaestro.html",
            texto: "Buscar alumnos",
            icono: "lucide:search",
          },
        ],
      },
      {
        // antes "Clases" — genérico; ahora "Mis Grupos" alinea con la
        // página de inicio y el modelo mental del docente
        texto: "Mis Grupos",
        icono: "lucide:book-open",
        hijos: [
          {
            href: "configurar_actividades.html",
            texto: "Configurar actividades",
            icono: "lucide:sliders-horizontal",
          },
          {
            href: "gruposMaestro.html",
            texto: "Peso por unidad", // antes "Ponderacion de unidades"
            icono: "lucide:scale",
          },
          {
            href: "asistencia.html",
            texto: "Registrar asistencia", // verbo más claro
            icono: "lucide:calendar-check",
          },
          {
            href: "lista_asistencia.html",
            texto: "Historial de asistencia",
            icono: "lucide:calendar-clock",
          },
        ],
      },
      {
        // Calificaciones promovida a sección visible (antes era sub-menú
        // con un solo elemento y estaba escondida)
        texto: "Calificaciones",
        icono: "mdi:file-document-edit-outline",
        hijos: [
          {
            href: "formulario.html",
            texto: "Capturar calificaciones",
            icono: "lucide:pencil",
          },
          {
            href: "bonus.html", // página de bonus si existe
            texto: "Asignar bonus",
            icono: "lucide:star",
          },
        ],
      },
      {
        href: "reportes.html",
        texto: "Reportes",
        icono: "lucide:bar-chart-2",
      },
    ],

    // ─────────────────────────────────────────────────────────────────────
    //  ADMINISTRADOR
    //  Antes: todo en "Catálogos" — confuso porque mezcla entidades base
    //  con operaciones. Ahora dividido en tres grupos lógicos:
    //    1. Personas       — quiénes están en el sistema
    //    2. Plan académico — qué se imparte (catálogos puros)
    //    3. Operación      — cómo se organiza cada semestre
    // ─────────────────────────────────────────────────────────────────────
    administrador: [
      {
        href: "admin.html",
        texto: "Panel",
        icono: "lucide:layout-dashboard",
      },
      {
        // antes mezclado con "Catálogos" — ahora es una sección propia
        texto: "Personas",
        icono: "lucide:users",
        hijos: [
          {
            href: "alumnos.html",
            texto: "Alumnos",
            icono: "lucide:user",
          },
          {
            href: "maestros.html",
            texto: "Maestros",
            icono: "lucide:graduation-cap",
          },
        ],
      },
      {
        // antes todo mezclado en "Catálogos" con Grupos y Periodos
        // Ahora solo contiene los catálogos académicos puros
        texto: "Plan Académico",
        icono: "lucide:folder-open",
        hijos: [
          {
            href: "carreras.html",
            texto: "Carreras",
            icono: "mdi:school-outline",
          },
          {
            href: "materias.html",
            texto: "Materias",
            icono: "lucide:book",
          },
          {
            href: "unidades.html",
            texto: "Unidades",
            icono: "lucide:layers",
          },
          {
            href: "actividadesAdmin.html",
            texto: "Actividades predefinidas", // antes simplemente "Actividades"
            icono: "mdi:clipboard-list-outline",
          },
        ],
      },
      {
        // antes "Grupos" y "Periodos" vivían en "Catálogos" junto con
        // Carreras y Materias — pero son elementos operativos por semestre
        texto: "Operación",
        icono: "lucide:settings",
        hijos: [
          {
            href: "periodos.html",
            texto: "Periodos escolares", // antes solo "Periodos"
            icono: "mdi:calendar-range-outline",
          },
          {
            href: "grupos.html",
            texto: "Grupos",
            icono: "lucide:library",
          },
          {
            href: "inscripcion.html", // antes en "Alumnos"
            texto: "Inscripciones",
            icono: "mdi:account-plus-outline",
          },
        ],
      },
      {
        href: "reportes.html",
        texto: "Reportes",
        icono: "lucide:bar-chart-2",
      },
      {
        href: "utilerias.html",
        texto: "Utilerías",
        icono: "lucide:settings-2",
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
    if (link.hijos) {
      const algunoActivo = link.hijos.some(
        (h) => h.href && h.href.split("#")[0] === paginaActual,
      );
      const hijosHTML = link.hijos
        .map((h) => {
          const pg = h.href.split("#")[0];
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
    return `<a href="${link.href}" class="${link.href === paginaActual ? "active" : ""}">
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
    const inicio = { maestro: "mis_grupos.html", alumno: "portalAlumno.html" };
    window.location.href = inicio[rol] || "login.html";
  }
}

function cerrarSesion() {
  const keysAConservar = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (
      k.startsWith("pcts_") ||
      k.startsWith("rubros_extra_") ||
      k.startsWith("unidades_custom_") ||
      k.startsWith("asist_") ||
      k.startsWith("rubro_") ||
      k === "tema"
    ) {
      keysAConservar.push([k, localStorage.getItem(k)]);
    }
  }
  localStorage.clear();
  keysAConservar.forEach(([k, v]) => localStorage.setItem(k, v));
  window.location.href = "login.html";
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

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll(".card-collapsible:not([data-open])")
    .forEach((card) => {
      card.classList.add("collapsed");
      const btn = card.querySelector(".card-toggle-btn");
      if (btn) btn.title = "Expandir";
    });
});

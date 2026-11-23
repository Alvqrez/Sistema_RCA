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
        href: "../../maestro/pages/panelMaestro.html",
        texto: "Inicio",
        icono: "lucide:layout-dashboard",
      },
      {
        texto: "Catálogo",
        icono: "lucide:folder-open",
        hijos: [
          {
            href: "../../maestro/pages/alumnosMaestro.html",
            texto: "Mis alumnos",
            icono: "lucide:users",
          },
          {
            href: "../../maestro/pages/mis_grupos.html",
            texto: "Mis grupos",
            icono: "lucide:library",
          },
        ],
      },
      {
        texto: "Asignar y calificar",
        icono: "mdi:file-document-edit-outline",
        hijos: [
          {
            href: "../../maestro/pages/gruposMaestro.html",
            texto: "Configurar evaluación",
            icono: "lucide:sliders-horizontal",
          },
          {
            href: "../../maestro/pages/captura_calificaciones.html",
            texto: "Capturar calificaciones",
            icono: "lucide:pencil",
          },
        ],
      },
      {
        texto: "Utilerías",
        icono: "lucide:settings-2",
        hijos: [
          {
            href: "../../maestro/pages/utilerias_maestro.html",
            texto: "Utilerías",
            icono: "lucide:settings",
          },
          {
            href: "../../shared/pages/estadisticas.html",
            texto: "Estadísticas",
            icono: "lucide:bar-chart-2",
          },
          {
            href: "../../shared/pages/reportes.html",
            texto: "Reportes",
            icono: "lucide:clipboard-list",
          },
        ],
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

  const getFilename = (href) =>
    href ? href.split("/").pop().split("?")[0].split("#")[0] : "";
  let tituloActual = "";

  // Un enlace del menú (los grupos se muestran abiertos, con su título)
  function itemNav(link) {
    const activo = getFilename(link.href) === paginaActual;
    if (activo) tituloActual = link.texto;
    return `<a href="${link.href}" class="sb-item ${activo ? "active" : ""}" title="${link.texto}"${activo ? ' aria-current="page"' : ""}>
      <iconify-icon icon="${link.icono}"></iconify-icon><span>${link.texto}</span>
    </a>`;
  }
  function buildLink(link) {
    if (link.separador) {
      return `<p class="sb-titulo">${link.separador}</p>`;
    }
    if (link.hijos) {
      return `<div class="sb-grupo"><p class="sb-titulo">${link.texto}</p>${link.hijos.map(itemNav).join("")}</div>`;
    }
    return `<div class="sb-grupo">${itemNav(link)}</div>`;
  }

  const aside = document.querySelector("aside.sidebar");
  if (!aside) return;

  const sidebarColapsado =
    localStorage.getItem("sidebar_estado") === "colapsado";
  if (sidebarColapsado) {
    aside.classList.add("collapsed");
    document.body.classList.add("sidebar-collapsed");
  }

  const inicioRol =
    {
      maestro: "../../maestro/pages/panelMaestro.html",
      alumno: "../../alumno/pages/portalAlumno.html",
      administrador: "../../admin/pages/admin.html",
    }[rol] || "#";
  const iniciales =
    String(nombre || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0))
      .join("")
      .toUpperCase() || "RCA";
  const navHTML = links.map(buildLink).join("");

  aside.setAttribute("id", "sidebarRCA");
  aside.innerHTML = `
    <div class="sb-cabeza">
      <a class="sb-marca" href="${inicioRol}" title="Inicio">
        <img src="../../assets/images/icons/rca-icon-96.png" width="34" height="34" alt="" />
        <span><b>Sistema RCA</b><small><img src="../../assets/images/icons/escudo-itv.png" width="14" height="13" alt="" />Tecnológico de Veracruz</small></span>
      </a>
      <button type="button" class="sidebar-toggle-btn" id="btnColapsarMenu" title="Contraer o expandir menú" aria-label="Contraer o expandir menú">
        <iconify-icon icon="lucide:chevron-left"></iconify-icon>
      </button>
    </div>
    <div class="sb-nav" role="navigation" aria-label="Menú principal">${navHTML}</div>
    <div class="sb-pie">
      <div class="sb-user" title="${esc(nombre) || "Usuario"}">
        <span class="sb-avatar">${esc(iniciales)}</span>
        <span class="sb-user-txt"><b>${esc(nombre) || "Usuario"}</b><small>${esc(etiquetaRol)}</small></span>
      </div>
      <button type="button" class="sb-accion" id="themeBtnSidebar"
              title="${isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}">
        <iconify-icon id="themeIcon" icon="${isDark ? "lucide:sun" : "lucide:moon"}"></iconify-icon>
        <span id="themeLabel">${isDark ? "Modo claro" : "Modo oscuro"}</span>
      </button>
      <button type="button" class="sb-accion sb-salir" id="btnCerrarSesion" title="Cerrar sesión">
        <iconify-icon icon="lucide:log-out"></iconify-icon><span>Cerrar sesión</span>
      </button>
    </div>
  `;

  // Barra superior y fondo del menú en tablet y celular
  const movil = document.createElement("header");
  movil.className = "sb-movil";
  movil.innerHTML = `
    <button type="button" class="sb-movil-menu" id="btnMenuMovil" aria-label="Abrir menú" aria-controls="sidebarRCA" aria-expanded="false">
      <iconify-icon icon="lucide:list"></iconify-icon>
    </button>
    <span class="sb-movil-titulo">${esc(tituloActual || "Sistema RCA")}</span>
    <span class="sb-avatar" aria-hidden="true">${esc(iniciales)}</span>`;
  const scrim = document.createElement("div");
  scrim.className = "sb-scrim";
  document.body.insertBefore(movil, document.body.firstChild);
  document.body.appendChild(scrim);

  function menuMovil(abrir) {
    document.body.classList.toggle("menu-abierto", abrir);
    document.getElementById("btnMenuMovil").setAttribute("aria-expanded", String(abrir));
  }
  document.getElementById("btnMenuMovil").addEventListener("click", () =>
    menuMovil(!document.body.classList.contains("menu-abierto")),
  );
  scrim.addEventListener("click", () => menuMovil(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-abierto")) menuMovil(false);
  });
  document.getElementById("btnColapsarMenu").addEventListener("click", () => toggleSidebar());
  document.getElementById("themeBtnSidebar").addEventListener("click", () => toggleTheme());
  document.getElementById("btnCerrarSesion").addEventListener("click", () => cerrarSesion());
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

function soloPermitido(...roles) {
  const rol = localStorage.getItem("rol");
  if (!roles.includes(rol)) {
    const inicio = {
      maestro: "../../maestro/pages/panelMaestro.html",
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
  t.innerHTML = `<iconify-icon icon="${icons[tipo] || icons.info}"></iconify-icon>${esc(msg)}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function toggleCard(btn) {
  const card = btn.closest(".card-collapsible");
  if (!card) return;
  const collapsed = card.classList.toggle("collapsed");
  btn.title = collapsed ? "Expandir" : "Contraer";
}

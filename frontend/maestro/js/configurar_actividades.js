// frontend/js/configurar_actividades.js  v3
// Flujo: botón "+ Agregar actividad" en cada unidad → modal con tipos → nombre + % → guardar

const API_URL = "http://localhost:3000";

// ─── Caché de datos ────────────────────────────────────────────────────────
const cacheUnidades = {}; // grupoId  → [unidad]
const cacheActividades = {}; // `gId_uId` → [actividad]
let tiposActividad = []; // catálogo del admin

// ─── Estado del modal ──────────────────────────────────────────────────────
let _modalGrupo = null;
let _modalUnidad = null;
let _modalTipoId = null;
let _modalTipoNom = null;

// ─── localStorage: grupo guardado ─────────────────────────────────────────
const getGrupoGuardado = (id) =>
  localStorage.getItem(`cfg_guardado_${id}`) === "1";
const setGrupoGuardado = (id, v) =>
  localStorage.setItem(`cfg_guardado_${id}`, v ? "1" : "0");

function tk() {
  return localStorage.getItem("token");
}
function rol() {
  return localStorage.getItem("rol");
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function toast(msg, tipo = "success") {
  const tc = document.getElementById("toast-container");
  if (!tc) return;
  const t = document.createElement("div");
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  tc.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, 3500);
}

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  if (rol() !== "maestro") {
    window.location.href = "../../shared/pages/login.html";
    return;
  }
  await cargarTiposActividad();
  await cargarGrupos();
});

// ─── Tipos de actividad (del catálogo admin) ───────────────────────────────
const ICONOS_TIPO = {
  Examen: "mdi:file-document-outline",
  Tarea: "mdi:pencil-outline",
  Práctica: "mdi:flask-outline",
  Exposición: "mdi:presentation",
  Proyecto: "lucide:folder",
  Cuestionario: "mdi:clipboard-list-outline",
  Asistencia: "mdi:calendar-check-outline",
  Investigación: "lucide:search",
};
const ICONO_DEFAULT = "mdi:tag-outline";

async function cargarTiposActividad() {
  try {
    const res = await fetch(`${API_URL}/api/tipo-actividades`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (res.ok) tiposActividad = await res.json();
  } catch (_) {}

  // Fallback si el endpoint no existe o falla
  if (!tiposActividad.length) {
    tiposActividad = [
      { id_tipo: 0, nombre: "Examen" },
      { id_tipo: 0, nombre: "Tarea" },
      { id_tipo: 0, nombre: "Práctica" },
      { id_tipo: 0, nombre: "Exposición" },
      { id_tipo: 0, nombre: "Proyecto" },
      { id_tipo: 0, nombre: "Cuestionario" },
      { id_tipo: 0, nombre: "Asistencia" },
      { id_tipo: 0, nombre: "Investigación" },
    ];
  }

  // Construir el grid de tipos (se reutiliza en cada apertura del modal)
  const grid = document.getElementById("tiposGrid");
  if (!grid) return;
  grid.innerHTML = tiposActividad
    .map((t) => {
      const icono = ICONOS_TIPO[t.nombre] || ICONO_DEFAULT;
      return `
      <div class="tipo-card" id="tipo-card-${t.id_tipo}-${esc(t.nombre)}"
           onclick="seleccionarTipo(${t.id_tipo}, '${esc(t.nombre)}')">
        <iconify-icon icon="${icono}" class="tipo-card-icon"></iconify-icon>
        <span class="tipo-card-nombre">${esc(t.nombre)}</span>
      </div>`;
    })
    .join("");
}

// ─── Tipos habilitados para una unidad ────────────────────────────────────────
// Carga del admin qué tipos puede usar el maestro. Si no hay, usa el catálogo completo.
async function cargarTiposParaUnidad(idUnidad) {
  const grid = document.getElementById("tiposGrid");
  if (!grid) return;

  let tiposUnidad = [];
  try {
    const res = await fetch(`${API_URL}/api/unidades/${idUnidad}/tipos`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (res.ok) tiposUnidad = await res.json();
  } catch (_) {}

  // Si el admin no configuró tipos para esta unidad → mostrar todos
  const tiposAMostrar = tiposUnidad.length > 0 ? tiposUnidad : tiposActividad;

  grid.innerHTML = tiposAMostrar
    .map((t) => {
      const icono = ICONOS_TIPO[t.nombre] || ICONO_DEFAULT;
      return `
      <div class="tipo-card" id="tipo-card-${t.id_tipo}-${esc(t.nombre)}"
           onclick="seleccionarTipo(${t.id_tipo}, '${esc(t.nombre)}')">
        <iconify-icon icon="${icono}" class="tipo-card-icon"></iconify-icon>
        <span class="tipo-card-nombre">${esc(t.nombre)}</span>
      </div>`;
    })
    .join("");

  // Mostrar nota si el admin restringió los tipos
  const hint = document.getElementById("modalHint");
  if (hint && tiposUnidad.length > 0) {
    hint.innerHTML = `
      <iconify-icon icon="mdi:shield-check-outline" style="vertical-align:middle;color:var(--success,#16a34a)"></iconify-icon>
      Selecciona un tipo de actividad para continuar
      <span style="font-size:.7rem;color:var(--text-muted);margin-left:4px">
        (${tiposUnidad.length} tipo(s) habilitados por el administrador)
      </span>`;
  } else if (hint) {
    hint.innerHTML = `
      <iconify-icon icon="lucide:arrow-up" style="vertical-align:middle"></iconify-icon>
      Selecciona un tipo de actividad para continuar`;
  }
}

// ─── Cargar grupos ─────────────────────────────────────────────────────────
async function cargarGrupos() {
  const contenedor = document.getElementById("contenedorGrupos");
  const msgCargando = document.getElementById("msgCargando");

  try {
    const res = await fetch(`${API_URL}/api/grupos/mis-grupos`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (!res.ok) {
      window.location.href = "../../shared/pages/login.html";
      return;
    }
    const grupos = await res.json();

    msgCargando.style.display = "none";

    if (!grupos.length) {
      contenedor.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--text-muted)">
        <iconify-icon icon="lucide:inbox" style="font-size:2.5rem"></iconify-icon>
        <p style="margin-top:10px">No tienes grupos asignados en este periodo.</p>
      </div>`;
      actualizarStats(0, 0, 0);
      return;
    }

    // Pre-cargar datos para stats
    let configuradas = 0,
      pendientes = 0;
    for (const g of grupos) {
      const uns = await fetchUnidades(g.id_grupo, g.clave_materia);
      for (const u of uns) {
        const acts = await fetchActividades(g.id_grupo, u.id_unidad);
        esUnidadGuardada(acts) ? configuradas++ : pendientes++;
      }
    }
    actualizarStats(grupos.length, configuradas, pendientes);
    contenedor.innerHTML = grupos.map((g) => renderGrupoCard(g)).join("");
    // Render resumen de ponderaciones
    await renderResumenActividades(grupos);
  } catch (e) {
    msgCargando.style.display = "none";
    contenedor.innerHTML = `<div class="card" style="text-align:center;padding:30px;color:var(--danger)">
      Error al cargar grupos.
    </div>`;
  }
}

function actualizarStats(grupos, conf, pend) {
  document.getElementById("statGrupos").textContent = grupos;
  document.getElementById("statCompletas").textContent = conf;
  document.getElementById("statPendientes").textContent = pend;
}

function esUnidadGuardada(acts) {
  return (
    acts.length > 0 &&
    acts.every((a) => a.bloqueado === 1 || a.bloqueado === true)
  );
}

// ─── Tarjeta de grupo ──────────────────────────────────────────────────────
function renderGrupoCard(g) {
  const periodo = g.descripcion_periodo || `Periodo ${g.id_periodo}`;
  const guardado = getGrupoGuardado(g.id_grupo);
  return `
  <div class="grupo-card" id="gcard-${g.id_grupo}">
    <div class="grupo-card-header"
         onclick="toggleGrupo(${g.id_grupo}, '${esc(g.clave_materia)}')">
      <div class="grupo-icon">
        <iconify-icon icon="lucide:book-open"></iconify-icon>
      </div>
      <div class="grupo-info">
        <div class="grupo-nombre">
          ${esc(g.nombre_materia)}
          ${
            guardado
              ? `<span class="pct-badge completa" style="margin-left:8px;font-size:.7rem">
            <iconify-icon icon="mdi:lock-outline"></iconify-icon> Configurado</span>`
              : ""
          }
        </div>
        <div class="grupo-meta">Grupo #${g.id_grupo} &middot; ${esc(periodo)} &middot; ${esc(g.horario || "Sin horario")}</div>
      </div>
      <iconify-icon icon="lucide:chevron-down" id="chev-g-${g.id_grupo}"
        style="font-size:1.2rem;color:var(--text-muted);transition:transform .2s"></iconify-icon>
    </div>

    <div class="grupo-body" id="gbody-${g.id_grupo}">
      <div id="gunidades-${g.id_grupo}" class="gunidades-wrap">
        <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:.85rem">
          <iconify-icon icon="lucide:loader-2" style="animation:spin 1s linear infinite"></iconify-icon>
          Cargando unidades...
        </div>
      </div>
      <div id="gfooter-${g.id_grupo}" class="grupo-footer">
        <button class="btn btn-primary" onclick="guardarConfiguracion(${g.id_grupo})">
          <iconify-icon icon="mdi:check-decagram-outline"></iconify-icon>
          Guardar configuración del grupo
        </button>
        <span style="font-size:.78rem;color:var(--text-muted);margin-left:10px">
          Marca este grupo como completamente configurado
        </span>
      </div>
    </div>
  </div>`;
}

// ─── Toggle grupo ──────────────────────────────────────────────────────────
async function toggleGrupo(idGrupo, claveMateria) {
  const body = document.getElementById(`gbody-${idGrupo}`);
  const chev = document.getElementById(`chev-g-${idGrupo}`);
  const open = body.classList.toggle("open");
  chev.style.transform = open ? "rotate(180deg)" : "";
  if (open) {
    await renderUnidades(idGrupo, claveMateria);
    actualizarFooterGrupo(idGrupo);
  }
}

// ─── Fetch unidades ────────────────────────────────────────────────────────
async function fetchUnidades(idGrupo, claveMateria) {
  if (cacheUnidades[idGrupo]) return cacheUnidades[idGrupo];
  try {
    const res = await fetch(
      `${BASE}/api/unidades/materia/${encodeURIComponent(claveMateria)}`,
      {
        headers: { Authorization: `Bearer ${tk()}` },
      },
    );
    const data = res.ok ? await res.json() : [];
    cacheUnidades[idGrupo] = data;
    return data;
  } catch {
    return [];
  }
}

async function renderUnidades(idGrupo, claveMateria) {
  const wrap = document.getElementById(`gunidades-${idGrupo}`);
  const unidades = await fetchUnidades(idGrupo, claveMateria);

  if (!unidades.length) {
    wrap.innerHTML = `<div style="padding:12px 4px;color:var(--text-muted);font-size:.85rem">
      <iconify-icon icon="lucide:alert-triangle" style="color:var(--warning)"></iconify-icon>
      Esta materia no tiene unidades configuradas. El administrador debe registrarlas primero.
    </div>`;
    return;
  }

  for (const u of unidades) await fetchActividades(idGrupo, u.id_unidad);

  wrap.innerHTML = unidades
    .map((u, i) => renderUnidadAccordion(idGrupo, u, i + 1))
    .join("");
}

// ─── Fetch actividades ─────────────────────────────────────────────────────
async function fetchActividades(idGrupo, idUnidad) {
  const key = `${idGrupo}_${idUnidad}`;
  if (cacheActividades[key]) return cacheActividades[key];
  try {
    const res = await fetch(`${BASE}/api/actividades`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (!res.ok) {
      cacheActividades[key] = [];
      return [];
    }
    const todas = await res.json();
    cacheActividades[key] = todas.filter(
      (a) =>
        String(a.id_grupo) === String(idGrupo) &&
        String(a.id_unidad) === String(idUnidad),
    );
    return cacheActividades[key];
  } catch {
    cacheActividades[key] = [];
    return [];
  }
}

function getActs(idGrupo, idUnidad) {
  return cacheActividades[`${idGrupo}_${idUnidad}`] || [];
}

// ─── Render acordeón de unidad ─────────────────────────────────────────────
function renderUnidadAccordion(idGrupo, unidad, numero) {
  const acts = getActs(idGrupo, unidad.id_unidad);
  const total = calcTotal(acts);
  const guardada = esUnidadGuardada(acts);
  const { cls, label } = badgeInfo(total, guardada);

  return `
  <div class="unidad-accordion" id="uacc-${idGrupo}-${unidad.id_unidad}">
    <div class="unidad-header" onclick="toggleUnidad(${idGrupo}, ${unidad.id_unidad})">
      <div class="unidad-num">${numero}</div>
      <div class="unidad-title">${esc(unidad.nombre_unidad)}</div>
      <span class="pct-badge ${cls}" id="badge-${idGrupo}-${unidad.id_unidad}">${label}</span>
      <iconify-icon icon="lucide:chevron-down" class="unidad-chevron"
        id="chev-${idGrupo}-${unidad.id_unidad}"></iconify-icon>
    </div>
    <div class="unidad-body" id="ubody-${idGrupo}-${unidad.id_unidad}">
      ${renderCuerpoUnidad(idGrupo, unidad.id_unidad, acts, total, guardada)}
    </div>
  </div>`;
}

function renderCuerpoUnidad(idGrupo, idUnidad, acts, total, guardada) {
  const pctFill = Math.min(total, 100);
  const disponible = Math.max(0, 100 - total);
  const { cls } = badgeInfo(total, guardada);

  // ── Vista bloqueada (guardada) ──────────────────────────────────────────
  if (guardada) {
    return `
    <div class="act-list">
      ${acts
        .map(
          (a) => `
        <div class="act-item">
          <iconify-icon icon="mdi:lock-outline" style="color:var(--text-muted);flex-shrink:0;font-size:.9rem"></iconify-icon>
          <span class="act-nombre">${esc(a.nombre_actividad)}</span>
          <span class="act-pct">${parseFloat(a.ponderacion).toFixed(0)}%</span>
        </div>`,
        )
        .join("")}
    </div>
    <div class="pct-track"><div class="pct-fill completa" style="width:100%"></div></div>
    <div class="pct-label">
      <span>Total: <strong>100%</strong></span>
      <span style="color:var(--success,#16a34a)">
        <iconify-icon icon="mdi:lock-check-outline"></iconify-icon> Unidad guardada
      </span>
    </div>
    <div style="margin-top:6px;padding:9px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;font-size:.82rem;color:var(--text-muted)">
      <iconify-icon icon="lucide:info" style="vertical-align:middle"></iconify-icon>
      Esta unidad está bloqueada. Contacta al administrador si necesitas modificarla.
    </div>`;
  }

  // ── Vista editable ──────────────────────────────────────────────────────
  const puedeGuardar = Math.round(total) === 100 && acts.length > 0;

  return `
    <div class="act-list" id="actlist-${idGrupo}-${idUnidad}">
      ${
        acts.length
          ? acts
              .map(
                (a) => `
            <div class="act-item" id="act-item-${a.id_actividad}">
              <span class="act-nombre">${esc(a.nombre_actividad)}</span>
              <span class="act-pct">${parseFloat(a.ponderacion).toFixed(0)}%</span>
              <button class="act-del"
                      onclick="eliminarActividad(${idGrupo}, ${idUnidad}, ${a.id_actividad})"
                      title="Eliminar">
                <iconify-icon icon="mdi:close"></iconify-icon>
              </button>
            </div>`,
              )
              .join("")
          : `<div style="color:var(--text-muted);font-size:.83rem;padding:4px 0">
             Sin actividades. Agrega al menos una para completar el 100%.
           </div>`
      }
    </div>

    <div class="pct-track">
      <div class="pct-fill ${cls}" id="pctbar-${idGrupo}-${idUnidad}" style="width:${pctFill}%"></div>
    </div>
    <div class="pct-label">
      <span>Total asignado: <strong id="pctnum-${idGrupo}-${idUnidad}">${total.toFixed(0)}%</strong></span>
      <span id="pctdisp-${idGrupo}-${idUnidad}">
        ${
          disponible > 0
            ? `Disponible: ${disponible.toFixed(0)}%`
            : total > 100
              ? "⚠️ Excede 100%"
              : '<span style="color:var(--success,#16a34a)">✓ Completo</span>'
        }
      </span>
    </div>

    <!-- Botón abrir modal — deshabilitado si ya se llegó al 100% -->
    <button class="btn-agregar-act"
            ${Math.round(total) >= 100 ? 'disabled title="La unidad ya tiene 100% asignado"' : ""}
            onclick="abrirModal(${idGrupo}, ${idUnidad}, '${esc(getUnidadNombre(idGrupo, idUnidad))}')">
      <iconify-icon icon="mdi:plus-circle-outline"></iconify-icon>
      Agregar actividad
    </button>

    <!-- Footer guardar unidad -->
    <div class="unidad-footer">
      <button class="btn ${puedeGuardar ? "btn-success" : "btn-outline"}"
              id="btnGuardarUnidad-${idGrupo}-${idUnidad}"
              onclick="guardarUnidad(${idGrupo}, ${idUnidad})"
              ${puedeGuardar ? "" : "disabled"}>
        <iconify-icon icon="mdi:lock-check-outline"></iconify-icon>
        Guardar unidad
      </button>
      <span style="font-size:.78rem;color:var(--text-muted)">
        ${
          puedeGuardar
            ? "Al guardar, ya no se podrán modificar las actividades de esta unidad."
            : "Completa el 100% para poder guardar la unidad."
        }
      </span>
    </div>`;
}

function getUnidadNombre(idGrupo, idUnidad) {
  const uns = cacheUnidades[idGrupo] || [];
  return (
    uns.find((u) => String(u.id_unidad) === String(idUnidad))?.nombre_unidad ||
    `Unidad ${idUnidad}`
  );
}

function toggleUnidad(idGrupo, idUnidad) {
  document
    .getElementById(`uacc-${idGrupo}-${idUnidad}`)
    ?.classList.toggle("open");
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL — Agregar actividad
// ══════════════════════════════════════════════════════════════════════════════

async function abrirModal(idGrupo, idUnidad, nombreUnidad) {
  _modalGrupo = idGrupo;
  _modalUnidad = idUnidad;
  _modalTipoId = null;
  _modalTipoNom = null;
  _modalActMateriaId = null;

  document.getElementById("modalSubtitulo").textContent = nombreUnidad;
  document.getElementById("modalPct").value = "";
  document.getElementById("modalSeleccion").style.display = "none";
  document.getElementById("modalHint").style.display = "block";
  document.getElementById("modalHint").innerHTML = `
    <iconify-icon icon="lucide:arrow-up" style="vertical-align:middle"></iconify-icon>
    Selecciona el tipo de actividad`;

  // Step 1: show type cards (admin's types for this unit, or all types)
  await mostrarTiposParaModal(idUnidad);

  document.getElementById("modalAgregar").classList.add("active");
}

// Step 1 — show type grid filtered to types admin used in this unit
async function mostrarTiposParaModal(idUnidad) {
  const grid = document.getElementById("tiposGrid");
  if (!grid) return;

  // Load admin activities for this unit to know which types exist
  _actividadesAdminCache = [];
  try {
    const res = await fetch(
      `${BASE}/api/materia-actividades/unidad/${idUnidad}`,
      {
        headers: { Authorization: `Bearer ${tk()}` },
      },
    );
    if (res.ok) _actividadesAdminCache = await res.json();
  } catch (_) {}

  if (!_actividadesAdminCache.length) {
    // Fallback: el admin no pre-configuró actividades para esta unidad.
    // Mostramos el catálogo de tipos completo y el maestro elige directamente.
    const ICONOS_FB = {
      Examen: "mdi:file-document-edit-outline",
      Tarea: "mdi:pencil-outline",
      Práctica: "mdi:flask-outline",
      Exposición: "mdi:presentation",
      Proyecto: "mdi:folder-open-outline",
      Cuestionario: "mdi:help-circle-outline",
      Investigación: "mdi:magnify",
      Asistencia: "mdi:account-check-outline",
    };
    grid.innerHTML = tiposActividad
      .map((t) => {
        const icono = ICONOS_FB[t.nombre] || "mdi:star-outline";
        return `
        <div class="tipo-card"
             onclick="seleccionarActividadAdmin(null,'${esc(t.nombre)}',${t.id_tipo},'${esc(t.nombre)}')">
          <iconify-icon icon="${icono}" class="tipo-card-icon"></iconify-icon>
          <span class="tipo-card-nombre">${esc(t.nombre)}</span>
        </div>`;
      })
      .join("");
    document.getElementById("modalHint").innerHTML = `
      <iconify-icon icon="lucide:arrow-up" style="vertical-align:middle"></iconify-icon>
      Elige el tipo de actividad`;
    return;
  }

  // Get unique types from admin activities (preserve order of tiposActividad catalog)
  const tiposEnUsage = new Set(_actividadesAdminCache.map((a) => a.id_tipo));
  const sinTipo = _actividadesAdminCache.some((a) => !a.id_tipo);

  // Build type cards — only types that have admin activities
  const ICONOS = {
    Examen: "mdi:file-document-edit-outline",
    Tarea: "mdi:pencil-outline",
    Práctica: "mdi:flask-outline",
    Exposición: "mdi:presentation",
    Proyecto: "mdi:folder-open-outline",
    Cuestionario: "mdi:help-circle-outline",
    Investigación: "mdi:magnify",
    Asistencia: "mdi:account-check-outline",
  };

  // Use catalog types that are referenced + "Sin tipo" if needed
  const tiposFiltrados = tiposActividad.filter((t) =>
    tiposEnUsage.has(t.id_tipo),
  );
  if (sinTipo) tiposFiltrados.push({ id_tipo: null, nombre: "Sin tipo" });

  if (!tiposFiltrados.length) {
    // Fallback: show activities directly if they all have no type
    mostrarActividadesDeTipo(null, "");
    return;
  }

  grid.innerHTML = tiposFiltrados
    .map((t) => {
      const icono = ICONOS[t.nombre] || "mdi:star-outline";
      const count = _actividadesAdminCache.filter((a) =>
        t.id_tipo === null ? !a.id_tipo : a.id_tipo === t.id_tipo,
      ).length;
      return `
      <div class="tipo-card" onclick="mostrarActividadesDeTipo(${t.id_tipo === null ? "null" : t.id_tipo},'${esc(t.nombre)}')">
        <iconify-icon icon="${icono}" class="tipo-card-icon"></iconify-icon>
        <span class="tipo-card-nombre">${esc(t.nombre)}</span>
        <span style="font-size:.65rem;color:var(--text-muted)">${count} actividad${count !== 1 ? "es" : ""}</span>
      </div>`;
    })
    .join("");

  document.getElementById("modalHint").innerHTML = `
    <iconify-icon icon="lucide:arrow-up" style="vertical-align:middle"></iconify-icon>
    Elige el tipo de actividad`;
}

// Step 2 — filter admin activities by chosen type
let _actividadesAdminCache = [];

function mostrarActividadesDeTipo(idTipo, nombreTipo) {
  const grid = document.getElementById("tiposGrid");

  const filtered =
    idTipo === null
      ? _actividadesAdminCache.filter((a) => !a.id_tipo)
      : _actividadesAdminCache.filter((a) => a.id_tipo === idTipo);

  // Back button + activity cards
  grid.innerHTML = `
    <div style="grid-column:1/-1;margin-bottom:8px">
      <button type="button" onclick="mostrarTiposParaModal(${_modalUnidad})"
        style="background:none;border:1px solid var(--border);border-radius:6px;
               padding:4px 10px;cursor:pointer;font-size:.78rem;color:var(--text-secondary);
               display:flex;align-items:center;gap:4px;font-family:inherit">
        <iconify-icon icon="mdi:arrow-left"></iconify-icon>
        Volver a tipos
      </button>
    </div>
    ${filtered
      .map(
        (a) => `
      <div class="tipo-card" onclick="seleccionarActividadAdmin(${a.id_mat_act},'${esc(a.nombre_actividad)}',${a.id_tipo || "null"},'${esc(a.nombre_tipo || "")}')">
        <iconify-icon icon="mdi:check-circle-outline" class="tipo-card-icon"></iconify-icon>
        <span class="tipo-card-nombre">${esc(a.nombre_actividad)}</span>
      </div>`,
      )
      .join("")}`;

  document.getElementById("modalHint").innerHTML = `
    <iconify-icon icon="lucide:arrow-up" style="vertical-align:middle"></iconify-icon>
    Selecciona la actividad`;
}

// Step 3 — activity selected, show % input
let _modalActMateriaId = null;

function seleccionarActividadAdmin(idMatAct, nombre, idTipo, nombreTipo) {
  _modalActMateriaId = idMatAct;
  _modalTipoId = idTipo;
  _modalTipoNom = nombre;

  document
    .querySelectorAll(".tipo-card")
    .forEach((c) => c.classList.remove("selected"));
  event.currentTarget.classList.add("selected");

  document.getElementById("modalSeleccion").style.display = "block";
  document.getElementById("modalHint").style.display = "none";
  const lbl = document.getElementById("modalTipoLabel");
  if (lbl) lbl.textContent = nombre;
  // Actualizar disponible
  const dispEl = document.getElementById("disponibleVal");
  if (dispEl) {
    const acts = getActs(_modalGrupo, _modalUnidad);
    dispEl.textContent = `${(100 - calcTotal(acts)).toFixed(0)}%`;
  }
  document.getElementById("modalPct").focus();
}

async function confirmarAgregar() {
  const pct = parseFloat(document.getElementById("modalPct").value);

  if (!_modalTipoNom) {
    toast("Selecciona un tipo de actividad primero", "error");
    return;
  }
  const nombreFinal = _modalTipoNom;

  if (isNaN(pct) || pct <= 0 || pct > 100) {
    toast("El porcentaje debe ser entre 1 y 100", "error");
    document.getElementById("modalPct").focus();
    return;
  }

  const acts = getActs(_modalGrupo, _modalUnidad);
  const totalActual = calcTotal(acts);
  if (totalActual + pct > 100) {
    toast(
      `Solo quedan ${(100 - totalActual).toFixed(0)}% disponibles`,
      "error",
    );
    document.getElementById("modalPct").focus();
    return;
  }

  try {
    const res = await fetch(`${BASE}/api/actividades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tk()}`,
      },
      body: JSON.stringify({
        id_grupo: _modalGrupo,
        id_unidad: _modalUnidad,
        nombre_actividad: nombreFinal,
        ponderacion: pct,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Error al agregar", "error");
      return;
    }

    // Actualizar caché
    const key = `${_modalGrupo}_${_modalUnidad}`;
    cacheActividades[key] = [
      ...acts,
      {
        id_actividad: data.id_actividad,
        nombre_actividad: nombreFinal,
        ponderacion: pct,
        bloqueado: 0,
      },
    ];

    // Capturar IDs ANTES de cerrar (cerrarModal limpia las vars globales)
    const idGr = _modalGrupo,
      idUn = _modalUnidad;
    cerrarModal();
    refrescarUnidad(idGr, idUn);
    actualizarBadge(idGr, idUn);
    actualizarFooterGrupo(idGr);
    recalcularStats();

    const restante = 100 - (totalActual + pct);
    toast(
      restante <= 0
        ? "✓ ¡100%! Ya puedes guardar la unidad."
        : `Actividad agregada. Disponible: ${restante.toFixed(0)}%`,
      "success",
    );
  } catch {
    toast("Error de conexión", "error");
  }
}

// ─── Eliminar actividad ────────────────────────────────────────────────────
async function eliminarActividad(idGrupo, idUnidad, idActividad) {
  const acts = getActs(idGrupo, idUnidad);
  const act = acts.find((a) => a.id_actividad === idActividad);
  if (!act) return;
  if (!confirm(`¿Eliminar "${act.nombre_actividad}"?`)) return;

  try {
    const res = await fetch(`${BASE}/api/actividades/${idActividad}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tk()}` },
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Error al eliminar", "error");
      return;
    }

    cacheActividades[`${idGrupo}_${idUnidad}`] = acts.filter(
      (a) => a.id_actividad !== idActividad,
    );
    refrescarUnidad(idGrupo, idUnidad);
    actualizarBadge(idGrupo, idUnidad);
    toast("Actividad eliminada", "success");
  } catch {
    toast("Error de conexión", "error");
  }
}

// ─── Guardar unidad (bloquear) ─────────────────────────────────────────────
async function guardarUnidad(idGrupo, idUnidad) {
  const acts = getActs(idGrupo, idUnidad);
  if (Math.round(calcTotal(acts)) !== 100) {
    toast("La suma debe ser 100% para guardar la unidad", "error");
    return;
  }
  const ok = confirm(
    "⚠️ ¿Guardar y bloquear esta unidad?\n\n" +
      "Una vez guardada, ya no podrás agregar, eliminar ni modificar actividades.\n\n" +
      "Esta acción no se puede deshacer desde aquí.",
  );
  if (!ok) return;

  try {
    const res = await fetch(`${BASE}/api/actividades/bloquear-unidad`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tk()}`,
      },
      body: JSON.stringify({ id_grupo: idGrupo, id_unidad: idUnidad }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Error al guardar", "error");
      return;
    }

    cacheActividades[`${idGrupo}_${idUnidad}`] = acts.map((a) => ({
      ...a,
      bloqueado: 1,
    }));
    refrescarUnidad(idGrupo, idUnidad);
    actualizarBadge(idGrupo, idUnidad);
    actualizarFooterGrupo(idGrupo);
    recalcularStats();
    toast("✓ Unidad guardada y bloqueada.", "success");
  } catch {
    toast("Error de conexión", "error");
  }
}

// ─── Guardar configuración del grupo ──────────────────────────────────────
async function guardarConfiguracion(idGrupo) {
  const unidades = cacheUnidades[idGrupo] || [];
  const sinGuardar = unidades.filter(
    (u) => !esUnidadGuardada(getActs(idGrupo, u.id_unidad)),
  );

  if (sinGuardar.length > 0) {
    alert(
      "Aún hay unidades sin guardar:\n\n" +
        sinGuardar
          .map((u, i) => `• Unidad ${i + 1}: ${u.nombre_unidad}`)
          .join("\n") +
        "\n\nGuarda cada unidad antes de continuar.",
    );
    return;
  }
  if (
    !confirm(
      "✓ Todas las unidades están guardadas.\n\n" +
        "¿Marcar este grupo como completamente configurado?\n\n" +
        "Indica que el grupo está listo para registrar calificaciones.",
    )
  )
    return;

  setGrupoGuardado(idGrupo, true);
  document.getElementById(`gfooter-${idGrupo}`).style.display = "none";

  // Añadir badge al nombre del grupo
  const nombreEl = document.querySelector(`#gcard-${idGrupo} .grupo-nombre`);
  if (nombreEl && !nombreEl.querySelector(".pct-badge")) {
    const badge = document.createElement("span");
    badge.className = "pct-badge completa";
    badge.style.cssText = "margin-left:8px;font-size:.7rem";
    badge.innerHTML = `<iconify-icon icon="mdi:lock-outline"></iconify-icon> Configurado`;
    nombreEl.appendChild(badge);
  }
  recalcularStats();
  toast("✓ Configuración del grupo guardada.", "success");
}

// ─── Footer del grupo ──────────────────────────────────────────────────────
function actualizarFooterGrupo(idGrupo) {
  const footer = document.getElementById(`gfooter-${idGrupo}`);
  const unidades = cacheUnidades[idGrupo] || [];
  if (!footer || !unidades.length) return;
  const todasGuardadas = unidades.every((u) =>
    esUnidadGuardada(getActs(idGrupo, u.id_unidad)),
  );
  footer.style.display =
    todasGuardadas && !getGrupoGuardado(idGrupo) ? "block" : "none";
}

// ─── Refrescar UI de unidad ────────────────────────────────────────────────
function refrescarUnidad(idGrupo, idUnidad) {
  const body = document.getElementById(`ubody-${idGrupo}-${idUnidad}`);
  if (!body) return;
  const acts = getActs(idGrupo, idUnidad);
  const total = calcTotal(acts);
  const guardada = esUnidadGuardada(acts);
  body.innerHTML = renderCuerpoUnidad(idGrupo, idUnidad, acts, total, guardada);
}

function actualizarBadge(idGrupo, idUnidad) {
  const badge = document.getElementById(`badge-${idGrupo}-${idUnidad}`);
  if (!badge) return;
  const acts = getActs(idGrupo, idUnidad);
  const total = calcTotal(acts);
  const guardada = esUnidadGuardada(acts);
  const { cls, label } = badgeInfo(total, guardada);
  badge.className = `pct-badge ${cls}`;
  badge.innerHTML = label;
}

function recalcularStats() {
  let conf = 0,
    pend = 0;
  for (const idGrupo in cacheUnidades) {
    for (const u of cacheUnidades[idGrupo]) {
      esUnidadGuardada(getActs(idGrupo, u.id_unidad)) ? conf++ : pend++;
    }
  }
  document.getElementById("statCompletas").textContent = conf;
  document.getElementById("statPendientes").textContent = pend;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function calcTotal(acts) {
  return acts.reduce((s, a) => s + parseFloat(a.ponderacion || 0), 0);
}

function badgeInfo(total, guardada = false) {
  if (guardada)
    return {
      cls: "completa",
      label: `<iconify-icon icon="mdi:lock-check-outline" style="vertical-align:middle"></iconify-icon> Guardada`,
    };
  const r = Math.round(total);
  if (r === 100)
    return { cls: "completa", label: "✓ 100% — Listo para guardar" };
  if (r > 100) return { cls: "excedida", label: `⚠ ${r}%` };
  return { cls: "pendiente", label: `${r}% / 100%` };
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Modal: cerrar ─────────────────────────────────────────────────────────
function cerrarModal() {
  const modal = document.getElementById("modalAgregar");
  if (modal) modal.classList.remove("active");
  _modalGrupo = null;
  _modalUnidad = null;
  _modalTipoId = null;
  _modalTipoNom = null;
  _modalActMateriaId = null;
}

function modalClickFuera(event) {
  if (event.target === document.getElementById("modalAgregar")) {
    cerrarModal();
  }
}

// ─── Resumen de ponderaciones (dashboard) ────────────────────────────────────
// Muestra tarjetas compactas por grupo/unidad con el % acumulado de ponderación
async function renderResumenActividades(grupos) {
  const seccion = document.getElementById("resumenPonderacion");
  const cont = document.getElementById("resumenCards");
  if (!seccion || !cont) return;

  // Recopilar actividades de todos los grupos/unidades
  const tarjetas = [];
  for (const g of grupos) {
    const uns = await fetchUnidades(g.id_grupo, g.clave_materia);
    for (const u of uns) {
      const acts = await fetchActividades(g.id_grupo, u.id_unidad);
      if (!acts.length) continue;
      const totalPct = acts.reduce((s, a) => s + parseFloat(a.ponderacion), 0);
      tarjetas.push({
        materia: g.nombre_materia || g.clave_materia,
        unidad: u.nombre_unidad || `Unidad ${u.id_unidad}`,
        numUnidad: u.numero_unidad || u.id_unidad,
        cantidad: acts.length,
        total: Math.round(totalPct * 10) / 10,
      });
    }
  }

  if (!tarjetas.length) {
    seccion.style.display = "none";
    return;
  }

  seccion.style.display = "block";
  cont.innerHTML = tarjetas
    .map((item) => {
      const pct = item.total;
      const completa = pct >= 100;
      const color = completa
        ? "var(--success,#16a34a)"
        : pct > 75
          ? "var(--warning,#d97706)"
          : "var(--primary,#2563eb)";
      const bg = completa ? "rgba(22,163,74,.07)" : "rgba(59,130,246,.05)";

      return `<div style="background:${bg};border:1.5px solid ${color}40;border-radius:12px;
                         padding:14px 18px;min-width:180px;flex:1;max-width:260px">
      <div style="font-size:.72rem;color:var(--text-muted);font-weight:700;
                  text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">
        ${esc(item.materia)} · Unidad ${item.numUnidad}
      </div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:6px">
        ${esc(item.unidad)}
      </div>
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px">
        <span style="font-size:1.5rem;font-weight:700;color:${color}">${pct}%</span>
        <span style="font-size:.75rem;color:var(--text-muted)">${item.cantidad} act.</span>
      </div>
      <div style="height:5px;background:var(--border);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${Math.min(pct, 100)}%;background:${color};border-radius:99px;transition:width .4s"></div>
      </div>
      <div style="font-size:.72rem;margin-top:5px;font-weight:600;color:${color}">
        ${completa ? "✓ Unidad completa" : `Disponible: ${Math.max(0, 100 - pct).toFixed(0)}%`}
      </div>
    </div>`;
    })
    .join("");
}

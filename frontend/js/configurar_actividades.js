// frontend/js/configurar_actividades.js
// Maestro: configura actividades por unidad de sus grupos
// v2: iconify icons, guardar unidad (bloquea), guardar configuración de grupo

const BASE = "http://localhost:3000";

// Presets con iconos Iconify (acordes al resto del sistema)
const PRESETS = [
  { nombre: "Examen",        icono: "mdi:file-document-outline"   },
  { nombre: "Tarea",         icono: "mdi:pencil-outline"          },
  { nombre: "Práctica",      icono: "mdi:flask-outline"           },
  { nombre: "Exposición",    icono: "mdi:presentation"            },
  { nombre: "Proyecto",      icono: "lucide:folder"               },
  { nombre: "Cuestionario",  icono: "mdi:clipboard-list-outline"  },
  { nombre: "Asistencia",    icono: "mdi:calendar-check-outline"  },
  { nombre: "Investigación", icono: "lucide:search"               },
];

// Caché de datos
const cacheUnidades    = {};   // grupoId → [unidad]
const cacheActividades = {};   // `grupoId_unidadId` → [actividad]

// Estado de guardado de grupos (persiste en localStorage)
function getGrupoGuardado(idGrupo)        { return localStorage.getItem(`cfg_guardado_${idGrupo}`) === "1"; }
function setGrupoGuardado(idGrupo, val)   { localStorage.setItem(`cfg_guardado_${idGrupo}`, val ? "1" : "0"); }

function tk()  { return localStorage.getItem("token"); }
function rol() { return localStorage.getItem("rol"); }

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, tipo = "success") {
  const tc = document.getElementById("toast-container");
  if (!tc) return;
  const t = document.createElement("div");
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  tc.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  if (rol() !== "maestro") { window.location.href = "login.html"; return; }
  await cargarGrupos();
});

// ─── Cargar grupos ────────────────────────────────────────────────────────────
async function cargarGrupos() {
  const contenedor  = document.getElementById("contenedorGrupos");
  const msgCargando = document.getElementById("msgCargando");

  try {
    const res = await fetch(`${BASE}/api/grupos/mis-grupos`, {
      headers: { Authorization: `Bearer ${tk()}` }
    });
    if (!res.ok) { window.location.href = "login.html"; return; }
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

    // Pre-cargar unidades y actividades para calcular stats
    let totalConfiguradas = 0, totalPendientes = 0;
    for (const g of grupos) {
      const unidades = await fetchUnidades(g.id_grupo, g.clave_materia);
      for (const u of unidades) {
        const acts = await fetchActividades(g.id_grupo, u.id_unidad);
        if (esUnidadGuardada(acts)) totalConfiguradas++;
        else totalPendientes++;
      }
    }

    actualizarStats(grupos.length, totalConfiguradas, totalPendientes);
    contenedor.innerHTML = grupos.map(g => renderGrupoCard(g)).join("");

  } catch (e) {
    msgCargando.style.display = "none";
    contenedor.innerHTML = `<div class="card" style="text-align:center;padding:30px;color:var(--danger)">
      Error al cargar grupos. Recarga la página.
    </div>`;
  }
}

function actualizarStats(grupos, configuradas, pendientes) {
  document.getElementById("statGrupos").textContent       = grupos;
  document.getElementById("statCompletas").textContent    = configuradas;
  document.getElementById("statPendientes").textContent   = pendientes;
}

// Una unidad está "guardada" si tiene actividades Y todas están bloqueadas
function esUnidadGuardada(acts) {
  return acts.length > 0 && acts.every(a => a.bloqueado === 1 || a.bloqueado === true);
}

// ─── Tarjeta de grupo ─────────────────────────────────────────────────────────
function renderGrupoCard(g) {
  const periodo  = g.descripcion_periodo || `Periodo ${g.id_periodo}`;
  const horario  = g.horario || "Sin horario";
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
          ${guardado
            ? `<span class="pct-badge completa" style="margin-left:8px;font-size:.7rem">
                 <iconify-icon icon="mdi:lock-outline"></iconify-icon> Configurado
               </span>`
            : ""}
        </div>
        <div class="grupo-meta">Grupo #${g.id_grupo} &middot; ${esc(periodo)} &middot; ${esc(horario)}</div>
      </div>
      <iconify-icon icon="lucide:chevron-down" id="chevron-g-${g.id_grupo}"
        style="font-size:1.2rem;color:var(--text-muted);transition:transform .2s"></iconify-icon>
    </div>
    <div class="grupo-body" id="gbody-${g.id_grupo}">
      <div id="gunidades-${g.id_grupo}" style="padding:4px 0">
        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:.85rem">
          <iconify-icon icon="lucide:loader-2" style="animation:spin 1s linear infinite"></iconify-icon>
          Cargando unidades...
        </div>
      </div>
      <!-- Botón guardar configuración del grupo -->
      <div id="gfooter-${g.id_grupo}" style="display:none;padding:12px 20px;border-top:1px solid var(--border);background:var(--bg-secondary)">
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

// ─── Toggle grupo ─────────────────────────────────────────────────────────────
async function toggleGrupo(idGrupo, claveMateria) {
  const body    = document.getElementById(`gbody-${idGrupo}`);
  const chevron = document.getElementById(`chevron-g-${idGrupo}`);
  const isOpen  = body.classList.contains("open");

  body.classList.toggle("open");
  chevron.style.transform = isOpen ? "" : "rotate(180deg)";

  if (!isOpen) {
    await renderUnidades(idGrupo, claveMateria);
    actualizarFooterGrupo(idGrupo);
  }
}

// ─── Fetch unidades ───────────────────────────────────────────────────────────
async function fetchUnidades(idGrupo, claveMateria) {
  if (cacheUnidades[idGrupo]) return cacheUnidades[idGrupo];
  try {
    const res = await fetch(`${BASE}/api/unidades/materia/${encodeURIComponent(claveMateria)}`, {
      headers: { Authorization: `Bearer ${tk()}` }
    });
    const data = res.ok ? await res.json() : [];
    cacheUnidades[idGrupo] = data;
    return data;
  } catch { return []; }
}

async function renderUnidades(idGrupo, claveMateria) {
  const contenedor = document.getElementById(`gunidades-${idGrupo}`);
  const unidades   = await fetchUnidades(idGrupo, claveMateria);

  if (!unidades.length) {
    contenedor.innerHTML = `<div style="padding:20px 24px;color:var(--text-muted);font-size:.85rem">
      <iconify-icon icon="lucide:alert-triangle" style="color:var(--warning)"></iconify-icon>
      Esta materia no tiene unidades configuradas. El administrador debe registrarlas primero.
    </div>`;
    return;
  }

  for (const u of unidades) {
    await fetchActividades(idGrupo, u.id_unidad);
  }

  contenedor.innerHTML = unidades.map((u, i) =>
    renderUnidadAccordion(idGrupo, u, i + 1)
  ).join("");
}

// ─── Fetch actividades ────────────────────────────────────────────────────────
async function fetchActividades(idGrupo, idUnidad) {
  const key = `${idGrupo}_${idUnidad}`;
  if (cacheActividades[key]) return cacheActividades[key];
  try {
    const res = await fetch(`${BASE}/api/actividades`, {
      headers: { Authorization: `Bearer ${tk()}` }
    });
    if (!res.ok) { cacheActividades[key] = []; return []; }
    const todas    = await res.json();
    const filtradas = todas.filter(
      a => String(a.id_grupo) === String(idGrupo) && String(a.id_unidad) === String(idUnidad)
    );
    cacheActividades[key] = filtradas;
    return filtradas;
  } catch { cacheActividades[key] = []; return []; }
}

function getActs(idGrupo, idUnidad) {
  return cacheActividades[`${idGrupo}_${idUnidad}`] || [];
}

// ─── Acordeón de unidad ───────────────────────────────────────────────────────
function renderUnidadAccordion(idGrupo, unidad, numero) {
  const acts     = getActs(idGrupo, unidad.id_unidad);
  const total    = calcTotal(acts);
  const guardada = esUnidadGuardada(acts);
  const { cls, label } = badgeInfo(total, guardada);

  return `
  <div class="unidad-accordion" id="uacc-${idGrupo}-${unidad.id_unidad}">
    <div class="unidad-header"
         onclick="toggleUnidad(${idGrupo}, ${unidad.id_unidad})">
      <div class="unidad-num">${numero}</div>
      <div class="unidad-title">${esc(unidad.nombre_unidad)}</div>
      <span class="pct-badge ${cls}"
            id="badge-${idGrupo}-${unidad.id_unidad}">${label}</span>
      <iconify-icon icon="lucide:chevron-down" class="unidad-chevron"
        id="chev-${idGrupo}-${unidad.id_unidad}"></iconify-icon>
    </div>
    <div class="unidad-body" id="ubody-${idGrupo}-${unidad.id_unidad}">
      ${renderCuerpoUnidad(idGrupo, unidad.id_unidad, acts, total, guardada)}
    </div>
  </div>`;
}

function renderCuerpoUnidad(idGrupo, idUnidad, acts, total, guardada) {
  const pctFill    = Math.min(total, 100);
  const disponible = Math.max(0, 100 - total);
  const { cls }    = badgeInfo(total, guardada);

  // Si la unidad está guardada → vista de solo lectura
  if (guardada) {
    return `
    <div style="padding:0 0 8px">
      <div class="act-list">
        ${acts.map(a => renderActItemLocked(a)).join("")}
      </div>
      <div class="pct-track">
        <div class="pct-fill completa" style="width:100%"></div>
      </div>
      <div class="pct-label">
        <span>Total: <strong>100%</strong></span>
        <span style="color:var(--success,#16a34a)">
          <iconify-icon icon="mdi:lock-outline"></iconify-icon> Unidad guardada
        </span>
      </div>
      <div style="margin-top:8px;padding:10px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;font-size:.82rem;color:var(--text-muted)">
        <iconify-icon icon="lucide:info" style="vertical-align:middle"></iconify-icon>
        Esta unidad está bloqueada. Para modificarla contacta al administrador.
      </div>
    </div>`;
  }

  // Vista editable
  const puedeGuardar = Math.round(total) === 100 && acts.length > 0;

  return `
    <div class="act-list" id="actlist-${idGrupo}-${idUnidad}">
      ${acts.length
        ? acts.map(a => renderActItem(idGrupo, idUnidad, a)).join("")
        : `<div style="color:var(--text-muted);font-size:.83rem;padding:6px 0">
             Sin actividades. Agrega al menos una para completar el 100%.
           </div>`
      }
    </div>

    <div class="pct-track">
      <div class="pct-fill ${cls}" id="pctbar-${idGrupo}-${idUnidad}"
           style="width:${pctFill}%"></div>
    </div>
    <div class="pct-label">
      <span>Total asignado: <strong id="pctnum-${idGrupo}-${idUnidad}">${total.toFixed(0)}%</strong></span>
      <span id="pctdisp-${idGrupo}-${idUnidad}">
        ${disponible > 0 ? `Disponible: ${disponible.toFixed(0)}%`
          : total > 100   ? "⚠️ Excede 100%"
          : '<span style="color:var(--success,#16a34a)">✓ Completo</span>'}
      </span>
    </div>

    <!-- Sección agregar -->
    <div class="add-section">
      <div class="presets-label">Agregar rápido:</div>
      <div class="presets-chips">
        ${PRESETS.map(p => `
          <span class="preset-chip"
                onclick="usarPreset(${idGrupo}, ${idUnidad}, '${esc(p.nombre)}')">
            <iconify-icon icon="${p.icono}" style="font-size:.85rem;vertical-align:middle"></iconify-icon>
            ${p.nombre}
          </span>`).join("")}
      </div>
      <div class="add-act-form">
        <div>
          <div class="field-label">Nombre de la actividad</div>
          <input type="text"
                 id="inpNombre-${idGrupo}-${idUnidad}"
                 placeholder="Ej. Examen parcial 1"
                 maxlength="100"
                 onkeydown="if(event.key==='Enter') agregarActividad(${idGrupo}, ${idUnidad})" />
        </div>
        <div>
          <div class="field-label">% Ponderación</div>
          <input type="number"
                 id="inpPct-${idGrupo}-${idUnidad}"
                 placeholder="0–100"
                 min="1" max="100"
                 onkeydown="if(event.key==='Enter') agregarActividad(${idGrupo}, ${idUnidad})" />
        </div>
        <button class="btn btn-primary btn-sm"
                onclick="agregarActividad(${idGrupo}, ${idUnidad})"
                style="height:38px;margin-top:20px">
          <iconify-icon icon="mdi:plus"></iconify-icon>
          Agregar
        </button>
      </div>
    </div>

    <!-- Botón guardar unidad -->
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <button class="btn ${puedeGuardar ? 'btn-success' : 'btn-outline'}"
              id="btnGuardarUnidad-${idGrupo}-${idUnidad}"
              onclick="guardarUnidad(${idGrupo}, ${idUnidad})"
              ${puedeGuardar ? "" : "disabled"}>
        <iconify-icon icon="mdi:lock-check-outline"></iconify-icon>
        Guardar unidad
      </button>
      ${puedeGuardar
        ? `<span style="font-size:.78rem;color:var(--text-muted)">
             Al guardar, ya no se podrán agregar, eliminar ni modificar actividades en esta unidad.
           </span>`
        : `<span style="font-size:.78rem;color:var(--text-muted)">
             Completa el 100% para poder guardar la unidad.
           </span>`
      }
    </div>`;
}

// Actividad en vista bloqueada (sin botón eliminar)
function renderActItemLocked(a) {
  return `
  <div class="act-item">
    <iconify-icon icon="mdi:lock-outline" style="color:var(--text-muted);font-size:.9rem;flex-shrink:0"></iconify-icon>
    <span class="act-nombre">${esc(a.nombre_actividad)}</span>
    <span class="act-pct">${parseFloat(a.ponderacion).toFixed(0)}%</span>
  </div>`;
}

// Actividad editable
function renderActItem(idGrupo, idUnidad, a) {
  return `
  <div class="act-item" id="act-item-${a.id_actividad}">
    <span class="act-nombre">${esc(a.nombre_actividad)}</span>
    <span class="act-pct">${parseFloat(a.ponderacion).toFixed(0)}%</span>
    <button class="act-del"
            onclick="eliminarActividad(${idGrupo}, ${idUnidad}, ${a.id_actividad})"
            title="Eliminar actividad">
      <iconify-icon icon="mdi:close"></iconify-icon>
    </button>
  </div>`;
}

// ─── Toggle unidad ────────────────────────────────────────────────────────────
function toggleUnidad(idGrupo, idUnidad) {
  document.getElementById(`uacc-${idGrupo}-${idUnidad}`)?.classList.toggle("open");
}

// ─── Preset chip → pre-rellenar nombre ───────────────────────────────────────
function usarPreset(idGrupo, idUnidad, nombre) {
  const inpNombre = document.getElementById(`inpNombre-${idGrupo}-${idUnidad}`);
  const inpPct    = document.getElementById(`inpPct-${idGrupo}-${idUnidad}`);
  if (inpNombre) { inpNombre.value = nombre; }
  inpPct?.focus();
}

// ─── Agregar actividad ────────────────────────────────────────────────────────
async function agregarActividad(idGrupo, idUnidad) {
  const inpNombre = document.getElementById(`inpNombre-${idGrupo}-${idUnidad}`);
  const inpPct    = document.getElementById(`inpPct-${idGrupo}-${idUnidad}`);

  const nombre = inpNombre?.value.trim();
  const pct    = parseFloat(inpPct?.value);

  if (!nombre) { toast("Escribe el nombre de la actividad", "error"); inpNombre?.focus(); return; }
  if (isNaN(pct) || pct <= 0 || pct > 100) { toast("El porcentaje debe ser entre 1 y 100", "error"); inpPct?.focus(); return; }

  const acts       = getActs(idGrupo, idUnidad);
  const totalActual = calcTotal(acts);
  if (totalActual + pct > 100) {
    toast(`Solo quedan ${(100 - totalActual).toFixed(0)}% disponibles en esta unidad`, "error");
    return;
  }

  try {
    const res = await fetch(`${BASE}/api/actividades`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ id_grupo: idGrupo, id_unidad: idUnidad, nombre_actividad: nombre, ponderacion: pct })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Error al agregar", "error"); return; }

    const key = `${idGrupo}_${idUnidad}`;
    cacheActividades[key] = [...acts, {
      id_actividad: data.id_actividad,
      nombre_actividad: nombre,
      ponderacion: pct,
      bloqueado: 0
    }];

    if (inpNombre) inpNombre.value = "";
    if (inpPct)    inpPct.value    = "";

    refrescarUnidad(idGrupo, idUnidad);

    const restante = 100 - (totalActual + pct);
    toast(restante <= 0 ? "✓ ¡100%! Ya puedes guardar la unidad." : `Actividad agregada. Disponible: ${restante.toFixed(0)}%`, "success");
  } catch { toast("Error de conexión", "error"); }
}

// ─── Eliminar actividad ───────────────────────────────────────────────────────
async function eliminarActividad(idGrupo, idUnidad, idActividad) {
  const acts = getActs(idGrupo, idUnidad);
  const act  = acts.find(a => a.id_actividad === idActividad);
  if (!act) return;
  if (!confirm(`¿Eliminar "${act.nombre_actividad}"?`)) return;

  try {
    const res = await fetch(`${BASE}/api/actividades/${idActividad}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tk()}` }
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Error al eliminar", "error"); return; }

    cacheActividades[`${idGrupo}_${idUnidad}`] = acts.filter(a => a.id_actividad !== idActividad);
    refrescarUnidad(idGrupo, idUnidad);
    toast("Actividad eliminada", "success");
  } catch { toast("Error de conexión", "error"); }
}

// ─── Guardar unidad (bloquear) ────────────────────────────────────────────────
async function guardarUnidad(idGrupo, idUnidad) {
  const acts  = getActs(idGrupo, idUnidad);
  const total = calcTotal(acts);

  if (Math.round(total) !== 100) {
    toast(`La suma debe ser 100%. Actualmente: ${total.toFixed(0)}%`, "error");
    return;
  }

  const ok = confirm(
    "⚠️ ¿Guardar y bloquear esta unidad?\n\n" +
    "Una vez guardada, ya NO podrás agregar, eliminar ni modificar las actividades de esta unidad.\n\n" +
    "Esta acción no se puede deshacer desde aquí."
  );
  if (!ok) return;

  try {
    const res = await fetch(`${BASE}/api/actividades/bloquear-unidad`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ id_grupo: idGrupo, id_unidad: idUnidad })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Error al guardar", "error"); return; }

    // Actualizar caché: marcar todas como bloqueadas
    const key = `${idGrupo}_${idUnidad}`;
    cacheActividades[key] = acts.map(a => ({ ...a, bloqueado: 1 }));

    refrescarUnidad(idGrupo, idUnidad);
    actualizarBadge(idGrupo, idUnidad);
    actualizarFooterGrupo(idGrupo);
    recalcularStats();

    toast("✓ Unidad guardada y bloqueada.", "success");
  } catch { toast("Error de conexión", "error"); }
}

// ─── Guardar configuración completa del grupo ─────────────────────────────────
async function guardarConfiguracion(idGrupo) {
  const unidades = cacheUnidades[idGrupo] || [];

  if (!unidades.length) {
    toast("No hay unidades cargadas para este grupo", "error");
    return;
  }

  // Verificar que TODAS las unidades estén guardadas
  const sinGuardar = unidades.filter(u => {
    const acts = getActs(idGrupo, u.id_unidad);
    return !esUnidadGuardada(acts);
  });

  if (sinGuardar.length > 0) {
    const nombres = sinGuardar.map((u, i) => `Unidad ${i + 1}: ${u.nombre_unidad}`).join("\n");
    toast(`Guarda primero todas las unidades:\n${nombres}`, "error");
    alert(
      `Aún hay unidades sin guardar:\n\n${nombres}\n\nGuarda cada unidad antes de guardar la configuración del grupo.`
    );
    return;
  }

  const ok = confirm(
    "✓ Todas las unidades están guardadas.\n\n" +
    "¿Marcar este grupo como completamente configurado?\n\n" +
    "Esto indica que el grupo está listo para comenzar a registrar calificaciones."
  );
  if (!ok) return;

  setGrupoGuardado(idGrupo, true);

  // Actualizar UI del grupo card
  const gcard = document.getElementById(`gcard-${idGrupo}`);
  if (gcard) {
    const nombreEl = gcard.querySelector(".grupo-nombre");
    if (nombreEl && !nombreEl.querySelector(".pct-badge")) {
      const badge = document.createElement("span");
      badge.className = "pct-badge completa";
      badge.style.cssText = "margin-left:8px;font-size:.7rem";
      badge.innerHTML = `<iconify-icon icon="mdi:lock-outline"></iconify-icon> Configurado`;
      nombreEl.appendChild(badge);
    }
  }

  document.getElementById(`gfooter-${idGrupo}`).style.display = "none";
  recalcularStats();
  toast("✓ Configuración del grupo guardada.", "success");
}

// ─── Footer del grupo (botón guardar configuración) ───────────────────────────
function actualizarFooterGrupo(idGrupo) {
  const footer   = document.getElementById(`gfooter-${idGrupo}`);
  const unidades = cacheUnidades[idGrupo] || [];
  if (!footer || !unidades.length) return;

  const todasGuardadas = unidades.every(u => esUnidadGuardada(getActs(idGrupo, u.id_unidad)));
  const grupoGuardado  = getGrupoGuardado(idGrupo);

  footer.style.display = (todasGuardadas && !grupoGuardado) ? "block" : "none";
}

// ─── Refrescar unidad ─────────────────────────────────────────────────────────
function refrescarUnidad(idGrupo, idUnidad) {
  const body = document.getElementById(`ubody-${idGrupo}-${idUnidad}`);
  if (!body) return;
  const acts    = getActs(idGrupo, idUnidad);
  const total   = calcTotal(acts);
  const guardada = esUnidadGuardada(acts);
  body.innerHTML = renderCuerpoUnidad(idGrupo, idUnidad, acts, total, guardada);
  actualizarBadge(idGrupo, idUnidad);
}

function actualizarBadge(idGrupo, idUnidad) {
  const badge   = document.getElementById(`badge-${idGrupo}-${idUnidad}`);
  if (!badge) return;
  const acts    = getActs(idGrupo, idUnidad);
  const total   = calcTotal(acts);
  const guardada = esUnidadGuardada(acts);
  const { cls, label } = badgeInfo(total, guardada);
  badge.className   = `pct-badge ${cls}`;
  badge.innerHTML   = label;
}

// ─── Recalcular stats globales ────────────────────────────────────────────────
function recalcularStats() {
  let configuradas = 0, pendientes = 0;
  for (const idGrupo in cacheUnidades) {
    for (const u of cacheUnidades[idGrupo]) {
      const acts = getActs(idGrupo, u.id_unidad);
      if (esUnidadGuardada(acts)) configuradas++;
      else pendientes++;
    }
  }
  document.getElementById("statCompletas").textContent  = configuradas;
  document.getElementById("statPendientes").textContent = pendientes;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTotal(acts) {
  return acts.reduce((s, a) => s + parseFloat(a.ponderacion || 0), 0);
}

function badgeInfo(total, guardada = false) {
  if (guardada) return {
    cls:   "completa",
    label: `<iconify-icon icon="mdi:lock-check-outline" style="vertical-align:middle"></iconify-icon> Guardada`
  };
  const r = Math.round(total);
  if (r === 100) return { cls: "completa",  label: "✓ 100% — Listo para guardar" };
  if (r > 100)   return { cls: "excedida",  label: `⚠ ${r}%` };
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

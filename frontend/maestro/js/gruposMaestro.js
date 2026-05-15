// gruposMaestro.js — v2
// Gestión de actividades por grupo/unidad.
// Datos: tabla `actividad` (BD). Cero localStorage académico.

const tk = () => localStorage.getItem("token");

// ── Estado global ──────────────────────────────────────────────────────────
let misGrupos        = [];
let unidadesPorGrupo = {};          // { id_grupo: [unidad, …] }
let actividadesPorGrupoUnidad = {}; // { "id_grupo_id_unidad": [actividad, …] }
let tiposActividad   = [];          // catálogo del admin
// unidades custom (dividir/fusionar) siguen en localStorage solo como layout
// Sin localStorage — las unidades efectivas vienen de la BD via layout-unidades
const getUnidadesEfectivas = (g) => unidadesPorGrupo[g] || [];

// ── Utilidades ─────────────────────────────────────────────────────────────
function auFetch(url, opts = {}) {
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk()}`, ...(opts.headers || {}) } })
    .then(async r => { if (r.status === 401) { location.href = "../../shared/pages/login.html"; throw new Error("401"); } const d = await r.json(); if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`); return d; });
}

function showToast(msg, type = "info") {
  const c = document.getElementById("toast-container"); if (!c) return;
  const t = document.createElement("div"); t.className = `toast toast-${type}`; t.textContent = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 3500);
}

function mostrarConfirm({ icono = "lucide:alert-circle", titulo, mensaje, labelOk = "Confirmar", colorOk = "var(--danger)", colorIcono = "var(--danger)" } = {}) {
  return new Promise(resolve => {
    const modal = document.getElementById("modalConfirm");
    document.getElementById("confirmIcon").innerHTML  = `<iconify-icon icon="${icono}" style="font-size:1.4rem;color:${colorIcono}"></iconify-icon>`;
    document.getElementById("confirmTitle").textContent = titulo;
    document.getElementById("confirmMsg").textContent   = mensaje;
    const btnOk  = document.getElementById("confirmOk");
    const btnCan = document.getElementById("confirmCancel");
    btnOk.textContent        = labelOk;
    btnOk.style.background   = colorOk;
    modal.style.display      = "flex";
    const cleanup = r => { modal.style.display = "none"; btnOk.removeEventListener("click", onOk); btnCan.removeEventListener("click", onCan); resolve(r); };
    const onOk  = () => cleanup(true);
    const onCan = () => cleanup(false);
    btnOk.addEventListener("click", onOk); btnCan.addEventListener("click", onCan);
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  soloPermitido("maestro", "administrador");
  await Promise.all([cargarTipos(), cargarGrupos()]);
});

async function cargarTipos() {
  try { tiposActividad = await auFetch(`${API_URL}/api/tipo-actividades`); } catch { tiposActividad = []; }
}

// ── Cargar grupos ──────────────────────────────────────────────────────────
async function cargarGrupos() {
  const loader = document.getElementById("loadingState");
  const lista  = document.getElementById("listaGrupos");
  const empty  = document.getElementById("emptyState");

  try {
    let grupos = [];
    try { grupos = await auFetch(`${API_URL}/api/grupos/mis-grupos`); } catch (_) {
      try {
        const todos = await auFetch(`${API_URL}/api/grupos`);
        const payload = JSON.parse(atob(tk().split(".")[1]));
        grupos = todos.filter(g => String(g.rfc) === String(payload.id_referencia));
      } catch { grupos = []; }
    }
    misGrupos = Array.isArray(grupos) ? grupos : [];

    if (loader) loader.style.display = "none";
    if (!misGrupos.length) { if (empty) empty.style.display = "block"; actualizarStats(); return; }
    if (lista) lista.style.display = "block";

    // Cargar unidades y actividades en paralelo
    await Promise.all(misGrupos.map(async g => {
      unidadesPorGrupo[g.id_grupo] = await cargarUnidades(g);
      await cargarActividades(g.id_grupo);
    }));

    actualizarStats();
    if (lista) { lista.innerHTML = ""; misGrupos.forEach(g => lista.appendChild(buildGrupoCard(g))); }
  } catch (e) {
    console.error(e);
    if (loader) loader.innerHTML = `<p style="color:var(--danger)">Error al conectar. <button onclick="location.reload()">Reintentar</button></p>`;
  }
}

async function cargarUnidades(grupo) {
  try {
    // Auto-vincular para asegurar grupo_unidad si no existe aún
    await fetch(`${API_URL}/api/grupos/${grupo.id_grupo}/unidades/auto-vincular`, { method: "POST", headers: { Authorization: `Bearer ${tk()}` } });
  } catch {}
  try {
    // Usar layout-unidades: devuelve unidades efectivas respetando divisiones/fusiones
    const uns = await auFetch(`${API_URL}/api/grupos/${grupo.id_grupo}/layout-unidades`);
    if (Array.isArray(uns) && uns.length) {
      // Obtener todas las unidades originales de la materia para calcular posición real
      let todasOriginales = [];
      try { todasOriginales = await auFetch(`${API_URL}/api/unidades/materia/${encodeURIComponent(grupo.clave_materia)}`); } catch {}
      const posicionOriginal = {}; // { id_unidad: posicion_1_based }
      todasOriginales.forEach((u, i) => { posicionOriginal[u.id_unidad] = i + 1; });

      return uns.map(u => {
        // Para unidades originales: posición directa
        // Para fusiones/divisiones: posición del id de origen más pequeño
        let numero;
        if (u.ids_origen) {
          const minOrigen = Math.min(...u.ids_origen.split(",").map(Number));
          numero = posicionOriginal[minOrigen] ?? u.id_orden_base;
          // División: agregar sufijo a/b según tipo_layout
          if (u.tipo_layout === "division_a") numero = `${numero}a`;
          else if (u.tipo_layout === "division_b") numero = `${numero}b`;
        } else {
          numero = posicionOriginal[u.id_unidad] ?? (u.id_orden_base);
        }
        return { ...u, numero_unidad: numero, _origen: u.ids_origen || String(u.id_unidad) };
      });
    }
  } catch {}
  // Fallback: unidades originales de la materia
  try {
    const uns = await auFetch(`${API_URL}/api/unidades/materia/${encodeURIComponent(grupo.clave_materia)}`);
    return Array.isArray(uns) ? uns.map((u, i) => ({ ...u, numero_unidad: i + 1, _origen: String(u.id_unidad) })) : [];
  } catch { return []; }
}

async function cargarActividades(id_grupo) {
  try {
    const todas = await auFetch(`${API_URL}/api/actividades`);
    const delGrupo = todas.filter(a => String(a.id_grupo) === String(id_grupo));
    actividadesPorGrupoUnidad[id_grupo] = {};
    delGrupo.forEach(a => {
      const k = String(a.id_unidad);
      if (!actividadesPorGrupoUnidad[id_grupo][k]) actividadesPorGrupoUnidad[id_grupo][k] = [];
      actividadesPorGrupoUnidad[id_grupo][k].push(a);
    });
  } catch { actividadesPorGrupoUnidad[id_grupo] = {}; }
}

function getActsUnidad(id_grupo, id_unidad) {
  return (actividadesPorGrupoUnidad[id_grupo] || {})[String(id_unidad)] || [];
}

// ── Stats ──────────────────────────────────────────────────────────────────
function actualizarStats() {
  const total = misGrupos.length;
  const configurados = misGrupos.filter(g => {
    const uns = getUnidadesEfectivas(g.id_grupo);
    return uns.length > 0 && uns.every(u => {
      const acts = getActsUnidad(g.id_grupo, u.id_unidad);
      return acts.length > 0 && acts.every(a => a.bloqueado);
    });
  }).length;
  const el = id => document.getElementById(id);
  if (el("statGrupos"))       el("statGrupos").textContent       = total;
  if (el("statConfigurados")) el("statConfigurados").textContent = configurados;
  if (el("statPendientes"))   el("statPendientes").textContent   = total - configurados;
}

// ── Build tarjeta de grupo ─────────────────────────────────────────────────
function buildGrupoCard(grupo) {
  const uns       = getUnidadesEfectivas(grupo.id_grupo);
  const configurado = uns.length > 0 && uns.every(u => {
    const acts = getActsUnidad(grupo.id_grupo, u.id_unidad);
    return acts.length > 0 && acts.every(a => a.bloqueado);
  });

  const badge = configurado
    ? `<span class="cfg-badge cfg-badge-ok"><iconify-icon icon="lucide:lock" style="font-size:.7rem"></iconify-icon> Configurado</span>`
    : `<span class="cfg-badge cfg-badge-pending"><iconify-icon icon="lucide:alert-circle" style="font-size:.7rem"></iconify-icon> Pendiente</span>`;

  const periodo = grupo.descripcion_periodo || `Periodo ${grupo.id_periodo}`;

  const card = document.createElement("div");
  card.className = "grupo-card";
  card.id = `grupo-card-${grupo.id_grupo}`;
  card.innerHTML = `
    <div class="grupo-card-header" onclick="toggleGrupoCard(${grupo.id_grupo})">
      <div class="grupo-icon"><iconify-icon icon="lucide:book-open"></iconify-icon></div>
      <div class="grupo-info">
        <h3>${grupo.nombre_materia || "Materia"} ${badge}</h3>
        <p>Grupo #${grupo.id_grupo} · ${periodo} · ${uns.length} unidad${uns.length !== 1 ? "es" : ""}</p>
      </div>
      <iconify-icon class="grupo-chevron" icon="lucide:chevron-down"></iconify-icon>
    </div>
    <div class="grupo-card-body">
      <div class="grupo-card-body-inner" id="body-${grupo.id_grupo}">
        ${buildGrupoBody(grupo)}
      </div>
    </div>`;
  return card;
}

function buildGrupoBody(grupo) {
  const unidades = getUnidadesEfectivas(grupo.id_grupo);
  if (!unidades.length) {
    return `<div style="text-align:center;padding:28px;color:var(--text-muted);font-size:.85rem">
      <iconify-icon icon="lucide:inbox" style="font-size:1.8rem;display:block;margin:0 auto 8px"></iconify-icon>
      No hay unidades definidas para esta materia.
    </div>`;
  }

  let html = `
    <div class="rubros-toolbar">
      <div class="rubros-toolbar-info">
        <iconify-icon icon="lucide:layers" style="color:var(--primary)"></iconify-icon>
        <span style="font-size:.82rem;color:var(--text-muted)">Las actividades se definen por cada unidad de forma independiente</span>
      </div>
      <button class="btn btn-outline btn-sm" onclick="abrirModalUnidades(${grupo.id_grupo})" style="border-color:var(--bonus,#7c3aed);color:var(--bonus,#7c3aed)">
        <iconify-icon icon="lucide:layout-list"></iconify-icon> Gestionar unidades
      </button>
    </div>`;

  unidades.forEach(u => { html += buildUnidadConfig(grupo.id_grupo, u); });

  html += `
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
      <button class="btn btn-primary" onclick="guardarTodasUnidades(${grupo.id_grupo})">
        <iconify-icon icon="lucide:save-all"></iconify-icon> Guardar todas las unidades
      </button>
    </div>`;
  return html;
}

function buildUnidadConfig(id_grupo, unidad) {
  const blockId = `uc-${id_grupo}-${unidad.id_unidad}`;
  const acts    = getActsUnidad(id_grupo, unidad.id_unidad);
  const suma    = acts.reduce((s, a) => s + parseFloat(a.ponderacion || 0), 0);
  const sumaOk  = Math.abs(suma - 100) < 0.01;
  const bloqueada = acts.length > 0 && acts.every(a => a.bloqueado);

  const sumaBadge = bloqueada
    ? `<span class="cfg-badge cfg-badge-ok" style="font-size:.7rem">✓ 100%</span>`
    : sumaOk
      ? `<span class="cfg-badge cfg-badge-ok" style="font-size:.7rem">✓ 100%</span>`
      : `<span class="cfg-badge cfg-badge-pending" style="font-size:.7rem">${suma.toFixed(0)}% / 100%</span>`;

  const lockNotice = bloqueada
    ? `<div style="font-size:.78rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;padding:6px 0">
        <iconify-icon icon="lucide:lock" style="color:var(--success)"></iconify-icon>
        Unidad guardada — no se puede modificar
       </div>`
    : "";

  const actsList = acts.length
    ? acts.map(a => buildActRow(id_grupo, unidad.id_unidad, a, bloqueada)).join("")
    : `<div style="font-size:.83rem;color:var(--text-muted);padding:10px 0">Sin actividades. Agrega al menos una para completar el 100%.</div>`;

  const agregarBtn = bloqueada ? "" : `
    <button class="btn-agregar-act" onclick="abrirModalAgregarAct(${id_grupo},'${unidad.id_unidad}')">
      <iconify-icon icon="lucide:plus-circle"></iconify-icon> Agregar actividad
    </button>`;

  const guardarBtn = bloqueada ? "" : `
    <button class="btn btn-primary btn-sm" onclick="guardarUnidad(${id_grupo},'${unidad.id_unidad}')" ${sumaOk ? "" : "disabled"}>
      <iconify-icon icon="lucide:lock"></iconify-icon> Guardar unidad
    </button>`;

  const sumaLabel = bloqueada ? "" : `
    <div class="suma-row">
      <span style="font-size:.8rem;color:var(--text-muted)">Total asignado: <strong>${suma.toFixed(0)}%</strong></span>
      <span style="font-size:.8rem;color:var(--text-muted)">Disponible: <strong>${Math.max(0, 100 - suma).toFixed(0)}%</strong></span>
    </div>`;

  return `
    <div class="unidad-config-block" id="${blockId}">
      <div class="unidad-config-header" onclick="toggleUnidadBlock('${blockId}')">
        <iconify-icon icon="lucide:layers" style="color:var(--primary);font-size:.9rem"></iconify-icon>
        <span>Unidad ${unidad.numero_unidad}: ${unidad.nombre_unidad}</span>
        ${sumaBadge}
        <iconify-icon class="unidad-config-chevron" icon="lucide:chevron-down"></iconify-icon>
      </div>
      <div class="unidad-config-body">
        <div class="unidad-config-body-inner">
          ${lockNotice}
          <div class="rubros-list" id="acts-list-${id_grupo}-${unidad.id_unidad}">
            ${actsList}
          </div>
          ${sumaLabel}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center">
            ${agregarBtn}
            ${guardarBtn}
            ${sumaOk && !bloqueada ? `<span style="font-size:.78rem;color:var(--text-muted)">Al guardar, ya no se podrán modificar las actividades de esta unidad.</span>` : ""}
          </div>
        </div>
      </div>
    </div>`;
}

function buildActRow(id_grupo, id_unidad, act, bloqueada) {
  const nombre = act.nombre_tipo || `Tipo #${act.id_tipo_actividad}`;
  if (bloqueada) {
    return `
      <div class="rubro-row">
        <iconify-icon class="rubro-icon" icon="lucide:tag"></iconify-icon>
        <span class="rubro-nombre">${nombre}</span>
        <span style="font-size:.88rem;font-weight:700;color:var(--text-main)">${parseFloat(act.ponderacion).toFixed(0)}</span>
        <span class="rubro-pct-label">%</span>
      </div>`;
  }
  return `
    <div class="rubro-row" id="act-row-${act.id_actividad}">
      <iconify-icon class="rubro-icon" icon="lucide:tag"></iconify-icon>
      <span class="rubro-nombre">${nombre}</span>
      <input class="rubro-pct-input" type="number" min="1" max="100" step="1"
             value="${parseFloat(act.ponderacion).toFixed(0)}"
             data-id="${act.id_actividad}" data-grupo="${id_grupo}" data-unidad="${id_unidad}"
             oninput="actualizarSuma(${id_grupo},'${id_unidad}')"
             onchange="editarPonderacion(${act.id_actividad},this.value,${id_grupo},'${id_unidad}')" />
      <span class="rubro-pct-label">%</span>
      <button class="btn-del-rubro" onclick="eliminarActividad(${act.id_actividad},${id_grupo},'${id_unidad}')">
        <iconify-icon icon="lucide:x"></iconify-icon>
      </button>
    </div>`;
}

// ── Actualizar suma en tiempo real ─────────────────────────────────────────
function actualizarSuma(id_grupo, id_unidad) {
  const inputs = document.querySelectorAll(`.rubro-pct-input[data-grupo="${id_grupo}"][data-unidad="${id_unidad}"]`);
  let suma = 0;
  inputs.forEach(inp => { let v = parseFloat(inp.value); if (isNaN(v) || v < 0) v = 0; if (v > 100) { v = 100; inp.value = 100; } suma += v; });
  const blockId = `uc-${id_grupo}-${id_unidad}`;
  const block   = document.getElementById(blockId);
  if (!block) return;
  const badge = block.querySelector(".cfg-badge");
  const sumaOk = Math.abs(suma - 100) < 0.01;
  if (badge) { badge.className = `cfg-badge ${sumaOk ? "cfg-badge-ok" : "cfg-badge-pending"}`; badge.style.fontSize = ".7rem"; badge.textContent = `${suma.toFixed(0)}% / 100%`; if (sumaOk) badge.textContent = "✓ 100%"; }
  const sumaRow = block.querySelector(".suma-row");
  if (sumaRow) sumaRow.innerHTML = `<span style="font-size:.8rem;color:var(--text-muted)">Total asignado: <strong>${suma.toFixed(0)}%</strong></span><span style="font-size:.8rem;color:var(--text-muted)">Disponible: <strong>${Math.max(0, 100 - suma).toFixed(0)}%</strong></span>`;
  const btnGuardar = block.querySelector(".btn.btn-primary.btn-sm");
  if (btnGuardar) btnGuardar.disabled = !sumaOk;
}

// ── Editar ponderación (PUT) ───────────────────────────────────────────────
async function editarPonderacion(id_actividad, valor, id_grupo, id_unidad) {
  try {
    await auFetch(`${API_URL}/api/actividades/${id_actividad}`, { method: "PUT", body: JSON.stringify({ ponderacion: parseFloat(valor) }) });
    // Actualizar caché local
    const acts = getActsUnidad(id_grupo, id_unidad);
    const act  = acts.find(a => a.id_actividad === id_actividad);
    if (act) act.ponderacion = parseFloat(valor);
  } catch (e) { showToast(e.message, "error"); }
}

// ── Eliminar actividad ─────────────────────────────────────────────────────
async function eliminarActividad(id_actividad, id_grupo, id_unidad) {
  const acts   = getActsUnidad(id_grupo, id_unidad);
  const act    = acts.find(a => a.id_actividad === id_actividad);
  const nombre = act?.nombre_tipo || "esta actividad";
  const ok = await mostrarConfirm({ icono: "lucide:trash-2", colorIcono: "var(--danger)", titulo: "Eliminar actividad", mensaje: `¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`, labelOk: "Eliminar", colorOk: "var(--danger)" });
  if (!ok) return;
  try {
    await auFetch(`${API_URL}/api/actividades/${id_actividad}`, { method: "DELETE" });
    actividadesPorGrupoUnidad[id_grupo][String(id_unidad)] = acts.filter(a => a.id_actividad !== id_actividad);
    rerenderUnidad(id_grupo, id_unidad);
    actualizarStats();
    showToast("Actividad eliminada", "info");
  } catch (e) { showToast(e.message, "error"); }
}

// ── Modal Agregar Actividad ────────────────────────────────────────────────
let _modalGrupo  = null;
let _modalUnidad = null;
let _tipoSeleccionado = null;

function abrirModalAgregarAct(id_grupo, id_unidad) {
  _modalGrupo  = id_grupo;
  _modalUnidad = id_unidad;
  _tipoSeleccionado = null;

  const acts = getActsUnidad(id_grupo, id_unidad);
  const usados = new Set(acts.map(a => a.id_tipo_actividad));
  const disponible = 100 - acts.reduce((s, a) => s + parseFloat(a.ponderacion || 0), 0);

  const grid = document.getElementById("tiposGrid");
  if (!tiposActividad.length) {
    grid.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;grid-column:1/-1">
      El administrador aún no ha cargado tipos de actividad. Pídele que los agregue desde Catálogos.
    </p>`;
  } else {
    grid.innerHTML = tiposActividad.map(t => {
      const yaUsado = usados.has(t.id_tipo);
      return `
        <div class="tipo-card ${yaUsado ? "tipo-card-usada" : ""}"
             id="tipo-card-${t.id_tipo}"
             onclick="${yaUsado ? "" : `seleccionarTipoAct(${t.id_tipo},'${t.nombre.replace(/'/g,"\\'")}','${(t.descripcion||"").replace(/'/g,"\\'").replace(/\n/g," ")}')` }"
             title="${yaUsado ? "Ya está en esta unidad" : t.nombre}">
          <iconify-icon icon="lucide:tag" class="tipo-card-icon"></iconify-icon>
          <span class="tipo-card-nombre">${t.nombre}</span>
          ${yaUsado ? `<span style="font-size:.65rem;color:var(--text-muted)">Ya agregada</span>` : ""}
        </div>`;
    }).join("");
  }

  document.getElementById("actPct").value = disponible > 0 ? Math.min(disponible, 100) : "";
  document.getElementById("tipoSelLabel").textContent = "Selecciona un tipo";
  document.getElementById("pctDisponible").textContent = `Disponible en esta unidad: ${disponible.toFixed(0)}%`;
  document.getElementById("btnAgregarAct").disabled = true;
  document.getElementById("descActBox").style.display = "none";
  document.getElementById("modalAgregarAct").style.display = "flex";
}

function seleccionarTipoAct(id_tipo, nombre, descripcion) {
  _tipoSeleccionado = { id_tipo, nombre };
  document.querySelectorAll(".tipo-card").forEach(c => c.classList.remove("tipo-card-sel"));
  const card = document.getElementById(`tipo-card-${id_tipo}`);
  if (card) card.classList.add("tipo-card-sel");
  document.getElementById("tipoSelLabel").textContent = nombre;
  document.getElementById("btnAgregarAct").disabled = false;
  // Mostrar descripción
  const box = document.getElementById("descActBox");
  if (descripcion && descripcion.trim()) {
    document.getElementById("descActTitulo").textContent = nombre;
    document.getElementById("descActTexto").textContent  = descripcion;
    box.style.display = "block";
  } else {
    box.style.display = "none";
  }
  document.getElementById("actPct").focus();
}

function cerrarModalAgregarAct() {
  document.getElementById("modalAgregarAct").style.display = "none";
  _modalGrupo = _modalUnidad = _tipoSeleccionado = null;
}

async function confirmarAgregarAct() {
  if (!_tipoSeleccionado) { showToast("Selecciona un tipo de actividad", "error"); return; }
  const pct = parseFloat(document.getElementById("actPct").value);
  if (isNaN(pct) || pct <= 0 || pct > 100) { showToast("El porcentaje debe ser entre 1 y 100", "error"); return; }
  const acts = getActsUnidad(_modalGrupo, _modalUnidad);
  if (acts.reduce((s, a) => s + parseFloat(a.ponderacion || 0), 0) + pct > 100) {
    showToast(`Solo quedan ${(100 - acts.reduce((s, a) => s + parseFloat(a.ponderacion || 0), 0)).toFixed(0)}% disponibles`, "error"); return;
  }
  try {
    const data = await auFetch(`${API_URL}/api/actividades`, { method: "POST", body: JSON.stringify({ id_grupo: _modalGrupo, id_unidad: _modalUnidad, id_tipo_actividad: _tipoSeleccionado.id_tipo, ponderacion: pct }) });
    const nuevaAct = { id_actividad: data.id_actividad, id_grupo: _modalGrupo, id_unidad: _modalUnidad, id_tipo_actividad: _tipoSeleccionado.id_tipo, nombre_tipo: _tipoSeleccionado.nombre, ponderacion: pct, bloqueado: 0 };
    if (!actividadesPorGrupoUnidad[_modalGrupo]) actividadesPorGrupoUnidad[_modalGrupo] = {};
    if (!actividadesPorGrupoUnidad[_modalGrupo][String(_modalUnidad)]) actividadesPorGrupoUnidad[_modalGrupo][String(_modalUnidad)] = [];
    actividadesPorGrupoUnidad[_modalGrupo][String(_modalUnidad)].push(nuevaAct);
    const idGr = _modalGrupo, idUn = _modalUnidad;
    cerrarModalAgregarAct();
    rerenderUnidad(idGr, idUn);
    actualizarStats();
    showToast("Actividad agregada", "success");
  } catch (e) { showToast(e.message, "error"); }
}

// ── Guardar unidad (bloquear) ──────────────────────────────────────────────
async function guardarUnidad(id_grupo, id_unidad) {
  const ok = await mostrarConfirm({ icono: "lucide:lock", colorIcono: "var(--primary)", titulo: "Guardar unidad", mensaje: "Al guardar, las actividades de esta unidad quedarán bloqueadas. No se podrán agregar, eliminar ni modificar.", labelOk: "Guardar y bloquear", colorOk: "var(--primary)" });
  if (!ok) return;
  try {
    await auFetch(`${API_URL}/api/actividades/bloquear-unidad`, { method: "POST", body: JSON.stringify({ id_grupo, id_unidad }) });
    const acts = getActsUnidad(id_grupo, id_unidad);
    acts.forEach(a => { a.bloqueado = 1; });
    rerenderUnidad(id_grupo, id_unidad);
    actualizarBadgeGrupo(id_grupo);
    actualizarStats();
    showToast("Unidad guardada y bloqueada", "success");
  } catch (e) { showToast(e.message, "error"); }
}

async function guardarTodasUnidades(id_grupo) {
  const ok = await mostrarConfirm({ icono: "lucide:save-all", colorIcono: "var(--primary)", titulo: "Guardar todas las unidades", mensaje: "Se bloquearán todas las unidades que ya tienen el 100% configurado. Esta acción no se puede deshacer.", labelOk: "Guardar todas", colorOk: "var(--primary)" });
  if (!ok) return;
  const unidades = getUnidadesEfectivas(id_grupo);
  let guardadas = 0, errores = 0;
  for (const u of unidades) {
    const acts = getActsUnidad(id_grupo, u.id_unidad);
    if (acts.every(a => a.bloqueado)) continue; // ya bloqueada
    const suma = acts.reduce((s, a) => s + parseFloat(a.ponderacion || 0), 0);
    if (Math.abs(suma - 100) > 0.01) { errores++; continue; }
    try {
      await auFetch(`${API_URL}/api/actividades/bloquear-unidad`, { method: "POST", body: JSON.stringify({ id_grupo, id_unidad: u.id_unidad }) });
      acts.forEach(a => { a.bloqueado = 1; });
      rerenderUnidad(id_grupo, u.id_unidad);
      guardadas++;
    } catch { errores++; }
  }
  actualizarBadgeGrupo(id_grupo);
  actualizarStats();
  if (errores === 0) showToast(`${guardadas} unidad${guardadas !== 1 ? "es" : ""} guardada${guardadas !== 1 ? "s" : ""}`, "success");
  else showToast(`${guardadas} guardadas, ${errores} con error (suma ≠ 100%)`, "error");
}

// ── Re-render parcial ──────────────────────────────────────────────────────
function rerenderUnidad(id_grupo, id_unidad) {
  const unidades = getUnidadesEfectivas(id_grupo);
  const u = unidades.find(x => String(x.id_unidad) === String(id_unidad));
  if (!u) return;
  const blockId  = `uc-${id_grupo}-${id_unidad}`;
  const block    = document.getElementById(blockId);
  if (!block) return;
  const wasOpen  = block.classList.contains("open");
  const newHtml  = buildUnidadConfig(id_grupo, u);
  const tmp      = document.createElement("div");
  tmp.innerHTML  = newHtml;
  const newBlock = tmp.firstElementChild;
  if (wasOpen) newBlock.classList.add("open");
  block.replaceWith(newBlock);
}

async function rerenderGrupoBody(id_grupo) {
  const bodyEl = document.getElementById(`body-${id_grupo}`);
  const grupo  = misGrupos.find(g => g.id_grupo === id_grupo);
  if (!bodyEl || !grupo) return;
  bodyEl.innerHTML = buildGrupoBody(grupo);
}

function actualizarBadgeGrupo(id_grupo) {
  const card = document.getElementById(`grupo-card-${id_grupo}`);
  if (!card) return;
  const badge = card.querySelector(".grupo-info .cfg-badge");
  if (!badge) return;
  const uns = getUnidadesEfectivas(id_grupo);
  const ok  = uns.length > 0 && uns.every(u => { const acts = getActsUnidad(id_grupo, u.id_unidad); return acts.length > 0 && acts.every(a => a.bloqueado); });
  badge.className = `cfg-badge ${ok ? "cfg-badge-ok" : "cfg-badge-pending"}`;
  badge.innerHTML = ok
    ? `<iconify-icon icon="lucide:lock" style="font-size:.7rem"></iconify-icon> Configurado`
    : `<iconify-icon icon="lucide:alert-circle" style="font-size:.7rem"></iconify-icon> Pendiente`;
}

// ── Toggle helpers ─────────────────────────────────────────────────────────
function toggleGrupoCard(id_grupo)  { document.getElementById(`grupo-card-${id_grupo}`)?.classList.toggle("open"); }
function toggleUnidadBlock(blockId) { document.getElementById(blockId)?.classList.toggle("open"); }

// ── Modal gestionar unidades (dividir / fusionar) ─────────────────────────
let _mGrupoId   = null;
let _mUnidades  = [];


// ── Estado de unidad para modal gestionar ─────────────────────────────────
// Retorna: "bloqueada" | "sin_guardar" | "libre"
function estadoUnidadParaModal(id_grupo, id_unidad) {
  // id_unidad puede ser compuesto ("1_2") — revisamos todos los ids reales
  const idsReales = String(id_unidad).includes("_")
    ? String(id_unidad).replace(/_[ab]$/, "").split("_").filter(x => x && !isNaN(x))
    : [String(id_unidad)];

  for (const rid of idsReales) {
    const acts = getActsUnidad(id_grupo, rid);
    if (acts.length > 0 && acts.every(a => a.bloqueado)) return "bloqueada";
    if (acts.length > 0 && acts.some(a => !a.bloqueado))  return "sin_guardar";
  }
  return "libre"; // sin actividades — se puede operar
}

function abrirModalUnidades(id_grupo) {
  _mGrupoId  = id_grupo;
  const base = getUnidadesEfectivas(id_grupo);
  _mUnidades = base.map((u, i) => ({
    id_unidad: u.id_unidad, nombre_unidad: u.nombre_unidad,
    numero_unidad: u.numero_unidad ?? i + 1,
    _origen: u._origen || String(u.id_unidad),
    tipo_layout: u.tipo_layout || null
  }));
  renderModalUnidades();
  document.getElementById("modalUnidades").classList.add("visible");
}

function cerrarModalUnidades() { document.getElementById("modalUnidades").classList.remove("visible"); _mGrupoId = null; _mUnidades = []; }

function renderModalUnidades() {
  const lista = document.getElementById("modalUnidadesLista"); if (!lista) return;
  lista.innerHTML = _mUnidades.map((u, idx) => {
    const esCustom  = String(u.id_unidad).includes("_");
    const estado    = estadoUnidadParaModal(_mGrupoId, u.id_unidad);
    const bloqueada = estado === "bloqueada";
    const sinGuardar = estado === "sin_guardar";

    // Estado de la unidad siguiente (para botón fusionar)
    const siguienteEstado = idx < _mUnidades.length - 1
      ? estadoUnidadParaModal(_mGrupoId, _mUnidades[idx + 1].id_unidad)
      : null;
    const fusionBloqueada = siguienteEstado === "bloqueada" || siguienteEstado === "sin_guardar" || bloqueada || sinGuardar;

    // Badge de estado
    const badgeEstado = bloqueada
      ? `<span style="font-size:.7rem;padding:2px 8px;border-radius:999px;background:var(--success-light);color:var(--success);font-weight:600;white-space:nowrap;display:inline-flex;align-items:center;gap:3px">
           <iconify-icon icon="lucide:lock" style="font-size:.65rem"></iconify-icon> Guardada
         </span>`
      : sinGuardar
        ? `<span style="font-size:.7rem;padding:2px 8px;border-radius:999px;background:var(--warning-light);color:var(--warning);font-weight:600;white-space:nowrap;display:inline-flex;align-items:center;gap:3px">
             <iconify-icon icon="lucide:alert-circle" style="font-size:.65rem"></iconify-icon> Sin guardar
           </span>`
        : "";

    // Motivo de bloqueo de botones
    const motivoDividir = bloqueada
      ? "Esta unidad ya está guardada"
      : sinGuardar
        ? "Guarda las actividades antes de dividir"
        : "";
    const motivoFusionar = fusionBloqueada
      ? (bloqueada || siguienteEstado === "bloqueada")
          ? "No se puede fusionar una unidad guardada"
          : "Guarda las actividades antes de fusionar"
      : "";

    const canDividir  = !bloqueada && !sinGuardar;
    const canFusionar = !fusionBloqueada && idx < _mUnidades.length - 1;

    return `
      <div class="rubro-row" style="flex-direction:column;align-items:stretch;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <iconify-icon icon="lucide:grip-vertical" style="color:var(--text-muted);flex-shrink:0"></iconify-icon>
          <span style="font-size:.75rem;color:var(--text-muted);flex-shrink:0;min-width:22px">U${u.numero_unidad}</span>
          <input type="text" value="${u.nombre_unidad}" onchange="_mUnidades[${idx}].nombre_unidad=this.value"
                 ${bloqueada ? "disabled" : ""}
                 style="flex:1;padding:5px 8px;border:1.5px solid var(--border);border-radius:6px;background:var(--bg-app);color:var(--text-main);font-size:.85rem;font-family:inherit;${bloqueada ? "opacity:.6;cursor:not-allowed" : ""}"/>
          ${badgeEstado}
          ${esCustom && !bloqueada ? `<button onclick="eliminarUnidadModal(${idx})" style="background:none;border:none;cursor:pointer;color:var(--danger);font-size:1rem;padding:4px;border-radius:6px;flex-shrink:0"><iconify-icon icon="lucide:x"></iconify-icon></button>` : ""}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button onclick="${canDividir ? `dividirUnidad(${idx})` : ""}"
                  ${canDividir ? "" : "disabled"}
                  title="${motivoDividir}"
                  class="btn btn-sm"
                  style="background:${canDividir ? "var(--primary-light)" : "var(--bg-app)"};color:${canDividir ? "var(--primary)" : "var(--text-muted)"};border:none;font-size:.78rem;cursor:${canDividir ? "pointer" : "not-allowed"};opacity:${canDividir ? "1" : ".5"}">
            <iconify-icon icon="lucide:scissors"></iconify-icon> Dividir en dos
          </button>
          ${idx < _mUnidades.length - 1 ? `
          <button onclick="${canFusionar ? `fusionarUnidades(${idx})` : ""}"
                  ${canFusionar ? "" : "disabled"}
                  title="${motivoFusionar}"
                  class="btn btn-sm"
                  style="background:${canFusionar ? "var(--success-light)" : "var(--bg-app)"};color:${canFusionar ? "var(--success)" : "var(--text-muted)"};border:none;font-size:.78rem;cursor:${canFusionar ? "pointer" : "not-allowed"};opacity:${canFusionar ? "1" : ".5"}">
            <iconify-icon icon="lucide:link"></iconify-icon> Fusionar con siguiente
          </button>` : ""}
          ${!canDividir && motivoDividir ? `<span style="font-size:.72rem;color:var(--text-muted);font-style:italic">${motivoDividir}</span>` : ""}
        </div>
      </div>`;
  }).join("");
}

async function dividirUnidad(idx) {
  const u = _mUnidades[idx];
  const nombre_a = `${u.nombre_unidad} — Parte A`;
  const nombre_b = `${u.nombre_unidad} — Parte B`;
  try {
    const data = await auFetch(`${API_URL}/api/grupos/${_mGrupoId}/dividir-unidad`, {
      method: "POST",
      body: JSON.stringify({ id_unidad: u.id_unidad, nombre_a, nombre_b })
    });
    // Reemplazar en _mUnidades con los IDs reales devueltos por el backend
    _mUnidades.splice(idx, 1,
      { id_unidad: data.id_a, nombre_unidad: data.nombre_a, numero_unidad: `${u.numero_unidad}a`, _origen: String(u.id_unidad), tipo_layout: "division_a" },
      { id_unidad: data.id_b, nombre_unidad: data.nombre_b, numero_unidad: `${u.numero_unidad}b`, _origen: String(u.id_unidad), tipo_layout: "division_b" }
    );
    // Recargar unidades del grupo desde BD
    const grupo = misGrupos.find(g => g.id_grupo === _mGrupoId);
    if (grupo) unidadesPorGrupo[_mGrupoId] = await cargarUnidades(grupo);
    renderModalUnidades();
    showToast(`Unidad dividida en "${data.nombre_a}" y "${data.nombre_b}"`, "success");
  } catch(e) { showToast(e.message, "error"); }
}

async function fusionarUnidades(idx) {
  const a = _mUnidades[idx], b = _mUnidades[idx + 1];
  const nombre_fusion = `${a.nombre_unidad} + ${b.nombre_unidad}`;
  try {
    const data = await auFetch(`${API_URL}/api/grupos/${_mGrupoId}/fusionar-unidades`, {
      method: "POST",
      body: JSON.stringify({ id_unidad_a: a.id_unidad, id_unidad_b: b.id_unidad, nombre_fusion })
    });
    // numero_unidad = el menor de los dos (la fusión ocupa la posición de la unidad menor)
    const numMenor = Math.min(
      parseInt(a.numero_unidad) || 999,
      parseInt(b.numero_unidad) || 999
    );
    _mUnidades.splice(idx, 2, {
      id_unidad: data.id_fusion,
      nombre_unidad: data.nombre_fusion,
      numero_unidad: numMenor,
      _origen: `${a.id_unidad},${b.id_unidad}`,
      tipo_layout: "fusion"
    });
    // Recargar unidades del grupo desde BD
    const grupo = misGrupos.find(g => g.id_grupo === _mGrupoId);
    if (grupo) unidadesPorGrupo[_mGrupoId] = await cargarUnidades(grupo);
    renderModalUnidades();
    showToast(`Unidades fusionadas en "${data.nombre_fusion}"`, "success");
  } catch(e) { showToast(e.message, "error"); }
}

async function eliminarUnidadModal(idx) {
  const u = _mUnidades[idx];
  try {
    await auFetch(`${API_URL}/api/grupos/${_mGrupoId}/revertir-unidad`, {
      method: "POST",
      body: JSON.stringify({ id_unidad_real: u.id_unidad })
    });
    // Recargar unidades desde BD
    const grupo = misGrupos.find(g => g.id_grupo === _mGrupoId);
    if (grupo) unidadesPorGrupo[_mGrupoId] = await cargarUnidades(grupo);
    // Reconstruir _mUnidades desde la BD
    _mUnidades = unidadesPorGrupo[_mGrupoId].map((u2, i) => ({
      id_unidad: u2.id_unidad, nombre_unidad: u2.nombre_unidad,
      numero_unidad: u2.numero_unidad ?? i + 1, _origen: u2._origen || String(u2.id_unidad),
      tipo_layout: u2.tipo_layout || null
    }));
    renderModalUnidades();
    showToast("División/fusión revertida", "info");
  } catch(e) { showToast(e.message, "error"); }
}

async function restaurarUnidadesOriginal() {
  const hayBloqueadas = _mUnidades.some(u => estadoUnidadParaModal(_mGrupoId, u.id_unidad) === "bloqueada");
  const haySinGuardar = _mUnidades.some(u => estadoUnidadParaModal(_mGrupoId, u.id_unidad) === "sin_guardar");
  if (hayBloqueadas) { showToast("No se puede restaurar: hay unidades ya guardadas", "error"); return; }
  if (haySinGuardar) { showToast("Guarda o elimina las actividades pendientes antes de restaurar", "error"); return; }
  if (!confirm("¿Restaurar las unidades originales? Se perderán todas las divisiones y fusiones.")) return;

  // Revertir todas las unidades custom (divisiones y fusiones)
  const custom = _mUnidades.filter(u => u.tipo_layout);
  for (const u of custom) {
    try {
      await auFetch(`${API_URL}/api/grupos/${_mGrupoId}/revertir-unidad`, {
        method: "POST",
        body: JSON.stringify({ id_unidad_real: u.id_unidad })
      });
    } catch(e) { showToast(`Error al revertir ${u.nombre_unidad}: ${e.message}`, "error"); return; }
  }

  // Recargar desde BD
  const grupo = misGrupos.find(g => g.id_grupo === _mGrupoId);
  if (grupo) unidadesPorGrupo[_mGrupoId] = await cargarUnidades(grupo);
  _mUnidades = unidadesPorGrupo[_mGrupoId].map((u, i) => ({
    id_unidad: u.id_unidad, nombre_unidad: u.nombre_unidad,
    numero_unidad: u.numero_unidad ?? i + 1, _origen: u._origen || String(u.id_unidad),
    tipo_layout: u.tipo_layout || null
  }));
  renderModalUnidades();
  showToast("Unidades restablecidas al original", "info");
}

async function guardarUnidadesModal() {
  if (!_mGrupoId || !_mUnidades.length) return;
  // Las divisiones/fusiones ya se guardaron en BD al ejecutarlas.
  // Solo cerramos el modal y re-renderizamos.
  const idGrupo = _mGrupoId;
  cerrarModalUnidades();
  await rerenderGrupoBody(idGrupo);
  actualizarBadgeGrupo(idGrupo);
  showToast("Configuración de unidades guardada", "success");
}

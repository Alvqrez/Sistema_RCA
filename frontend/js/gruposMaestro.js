// frontend/js/gruposMaestro.js — v2 (corregido)
const BASE_URL_GM = "http://localhost:3000";
const tokenGM = () => localStorage.getItem("token");

const RUBROS_DEFAULT = [
  {
    key: "pct_actividades",
    nombre: "Actividades",
    icono: "lucide:clipboard-list",
    bloqueado: true,
  },
  {
    key: "pct_examen",
    nombre: "Examen",
    icono: "lucide:file-text",
    bloqueado: true,
  },
  {
    key: "pct_asistencia",
    nombre: "Asistencia",
    icono: "lucide:user-check",
    bloqueado: true,
  },
];

let misGrupos = [];
let unidadesPorGrupo = {}; // cache: id_grupo → [unidades]

// ── localStorage helpers ──────────────────────────────────────────────
function getRubrosExtra(id_grupo) {
  try {
    return JSON.parse(localStorage.getItem(`rubros_extra_${id_grupo}`)) || [];
  } catch {
    return [];
  }
}
function setRubrosExtra(id_grupo, arr) {
  localStorage.setItem(`rubros_extra_${id_grupo}`, JSON.stringify(arr));
}
function getRubrosGrupo(id_grupo) {
  return [...RUBROS_DEFAULT, ...getRubrosExtra(id_grupo)];
}
function getPcts(id_grupo, id_unidad) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(`pcts_${id_grupo}_${id_unidad}`),
    );
    if (saved && Object.keys(saved).length) return saved;
  } catch (_) {}
  return { pct_actividades: 60, pct_examen: 30, pct_asistencia: 10 };
}

// ── Init ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  soloPermitido("maestro", "administrador");
  await cargarGruposGM();
});

// ── Fetch helper ──────────────────────────────────────────────────────
async function fetchAuthGM(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tokenGM()}` },
  });
  if (res.status === 401) {
    window.location.href = "login.html";
    throw new Error("401");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Cargar grupos ─────────────────────────────────────────────────────
async function cargarGruposGM() {
  try {
    const rol = localStorage.getItem("rol");

    // Try /mis-grupos first (for maestro), fallback to filtered /grupos
    let grupos = [];
    try {
      const data = await fetchAuthGM(`${BASE_URL_GM}/api/grupos/mis-grupos`);
      grupos = Array.isArray(data) ? data : [];
    } catch (_) {
      // fallback: filter all grupos by numero_empleado from token
      try {
        const todos = await fetchAuthGM(`${BASE_URL_GM}/api/grupos`);
        let id_ref = null;
        try {
          id_ref = JSON.parse(atob(tokenGM().split(".")[1])).id_referencia;
        } catch (__) {}
        grupos = id_ref
          ? todos.filter((g) => String(g.numero_empleado) === String(id_ref))
          : rol === "administrador"
            ? todos
            : [];
      } catch (__) {
        grupos = [];
      }
    }

    misGrupos = grupos;
    actualizarStats();

    const loader = document.getElementById("loadingState");
    const lista = document.getElementById("listaGrupos");
    const empty = document.getElementById("emptyState");

    if (loader) loader.style.display = "none";

    if (!misGrupos.length) {
      if (empty) empty.style.display = "block";
      return;
    }
    if (lista) lista.style.display = "block";

    // Load units for each group in parallel
    await Promise.all(
      misGrupos.map(async (g) => {
        unidadesPorGrupo[g.id_grupo] = await cargarUnidadesDeGrupo(g);
      }),
    );

    // Render cards
    if (lista) lista.innerHTML = "";
    for (const g of misGrupos) {
      const card = buildGrupoCard(g, unidadesPorGrupo[g.id_grupo] || []);
      if (lista) lista.appendChild(card);
    }
  } catch (e) {
    console.error("Error cargando grupos:", e);
    const loader = document.getElementById("loadingState");
    if (loader) {
      loader.innerHTML = `<iconify-icon icon="lucide:wifi-off" style="font-size:2rem;display:block;margin:0 auto 10px;color:var(--danger)"></iconify-icon>
        <p style="color:var(--danger)">Error al conectar con el servidor.</p>
        <button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-top:10px">
          <iconify-icon icon="lucide:refresh-cw"></iconify-icon> Reintentar
        </button>`;
    }
  }
}

async function cargarUnidadesDeGrupo(grupo) {
  try {
    let unidades = [];
    try {
      unidades = await fetchAuthGM(
        `${BASE_URL_GM}/api/grupos/${grupo.id_grupo}/unidades`,
      );
    } catch (_) {}

    if (!Array.isArray(unidades) || !unidades.length) {
      const clave = grupo.clave_materia;
      if (clave) {
        try {
          unidades = await fetchAuthGM(
            `${BASE_URL_GM}/api/unidades/materia/${encodeURIComponent(clave)}`,
          );
        } catch (_) {}
      }
    }
    return Array.isArray(unidades)
      ? unidades.map((u, i) => ({
          ...u,
          numero_unidad: u.numero_unidad ?? i + 1,
        }))
      : [];
  } catch {
    return [];
  }
}

// ── Stats ─────────────────────────────────────────────────────────────
function actualizarStats() {
  const total = misGrupos.length;
  // A group is "configured" if any unit has saved pcts in localStorage
  const configurados = misGrupos.filter((g) => {
    const us = unidadesPorGrupo[g.id_grupo] || [];
    return (
      us.some((u) => {
        try {
          return !!JSON.parse(
            localStorage.getItem(`pcts_${g.id_grupo}_${u.id_unidad}`),
          );
        } catch {
          return false;
        }
      }) || getRubrosExtra(g.id_grupo).length > 0
    );
  }).length;

  const el = (id) => document.getElementById(id);
  if (el("statGrupos")) el("statGrupos").textContent = total;
  if (el("statConfigurados")) el("statConfigurados").textContent = configurados;
  if (el("statPendientes"))
    el("statPendientes").textContent = total - configurados;
}

// ── Build group card ──────────────────────────────────────────────────
function buildGrupoCard(grupo, unidades) {
  const card = document.createElement("div");
  card.className = "grupo-card";
  card.id = `grupo-card-${grupo.id_grupo}`;

  const tieneConfig =
    getRubrosExtra(grupo.id_grupo).length > 0 ||
    unidades.some((u) => {
      try {
        return !!JSON.parse(
          localStorage.getItem(`pcts_${grupo.id_grupo}_${u.id_unidad}`),
        );
      } catch {
        return false;
      }
    });

  const cfgBadge = tieneConfig
    ? `<span class="cfg-badge cfg-badge-ok"><iconify-icon icon="lucide:check-circle" style="font-size:0.75rem"></iconify-icon> Configurado</span>`
    : `<span class="cfg-badge cfg-badge-pending"><iconify-icon icon="lucide:alert-circle" style="font-size:0.75rem"></iconify-icon> Pendiente</span>`;

  card.innerHTML = `
    <div class="grupo-card-header" onclick="toggleGrupoCard(${grupo.id_grupo})">
      <div class="grupo-icon">
        <iconify-icon icon="lucide:book-open"></iconify-icon>
      </div>
      <div class="grupo-info">
        <h3>${grupo.nombre_materia || "Materia"} ${cfgBadge}</h3>
        <p>
          Grupo #${grupo.id_grupo}
          ${grupo.descripcion_periodo ? ` · ${grupo.descripcion_periodo}` : ""}
          ${grupo.horario ? ` · ${grupo.horario}` : ""}
          · ${unidades.length} unidad${unidades.length !== 1 ? "es" : ""}
        </p>
      </div>
      <iconify-icon class="grupo-chevron" icon="lucide:chevron-down"></iconify-icon>
    </div>
    <div class="grupo-card-body">
      <div class="grupo-card-body-inner" id="body-${grupo.id_grupo}">
        ${buildGrupoBody(grupo, unidades)}
      </div>
    </div>`;
  return card;
}

function buildGrupoBody(grupo, unidades) {
  if (!unidades.length) {
    return `<div style="text-align:center;padding:28px;color:var(--text-muted);font-size:0.85rem">
      <iconify-icon icon="lucide:inbox" style="font-size:1.8rem;display:block;margin:0 auto 8px"></iconify-icon>
      No hay unidades definidas. Agrégalas en la sección <strong>Materias → Unidades</strong>.
    </div>`;
  }

  const extras = getRubrosExtra(grupo.id_grupo);
  let html = `
    <div class="rubros-toolbar">
      <div class="rubros-toolbar-info">
        <iconify-icon icon="lucide:layers" style="color:var(--primary)"></iconify-icon>
        <span>Rubros del grupo: <strong id="rubros-count-${grupo.id_grupo}">${getRubrosGrupo(grupo.id_grupo).length}</strong></span>
        ${extras.map((r) => `<span class="rubro-chip">${r.nombre} <button onclick="eliminarRubroGrupo(${grupo.id_grupo},'${r.key}')" title="Eliminar">×</button></span>`).join("")}
      </div>
      <button class="btn btn-outline btn-sm" onclick="agregarRubroGrupo(${grupo.id_grupo})">
        <iconify-icon icon="lucide:plus"></iconify-icon> Agregar rubro
      </button>
    </div>`;

  unidades.forEach((u) => {
    html += buildUnidadConfig(grupo.id_grupo, u);
  });

  // "Guardar todo" convenience button
  html += `
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
      <button class="btn btn-primary" onclick="guardarTodasUnidades(${grupo.id_grupo})">
        <iconify-icon icon="lucide:save-all"></iconify-icon> Guardar todas las unidades
      </button>
    </div>`;

  return html;
}

// ── Unidad config block ───────────────────────────────────────────────
function buildUnidadConfig(id_grupo, unidad) {
  const blockId = `uc-${id_grupo}-${unidad.id_unidad}`;
  const pcts = getPcts(id_grupo, unidad.id_unidad);
  const rubros = getRubrosGrupo(id_grupo);
  const suma = rubros.reduce((s, r) => s + (parseFloat(pcts[r.key]) || 0), 0);
  const sumaOk = Math.abs(suma - 100) < 0.01;

  const sumaBadge = sumaOk
    ? `<span class="cfg-badge cfg-badge-ok" style="font-size:0.7rem">✓ 100%</span>`
    : `<span class="cfg-badge cfg-badge-pending" style="font-size:0.7rem">${suma.toFixed(0)}%</span>`;

  return `
    <div class="unidad-config-block" id="${blockId}">
      <div class="unidad-config-header" onclick="toggleUnidadBlock('${blockId}')">
        <iconify-icon icon="lucide:layers" style="color:var(--primary);font-size:0.9rem"></iconify-icon>
        Unidad ${unidad.numero_unidad}: ${unidad.nombre_unidad}
        ${sumaBadge}
        <iconify-icon class="unidad-config-chevron" icon="lucide:chevron-down"></iconify-icon>
      </div>
      <div class="unidad-config-body">
        <div class="unidad-config-body-inner">
          <div class="rubros-list" id="rubros-list-${id_grupo}-${unidad.id_unidad}">
            ${buildRubrosRows(id_grupo, unidad.id_unidad)}
          </div>
          <div class="suma-row">
            <span style="font-size:0.8rem;color:var(--text-muted)">Total</span>
            <span class="suma-badge ${sumaOk ? "suma-ok" : "suma-err"}" id="suma-badge-${id_grupo}-${unidad.id_unidad}">
              ${suma.toFixed(0)}% ${sumaOk ? "✓" : "— debe ser 100%"}
            </span>
          </div>
          <div class="unidad-actions">
            <button class="btn btn-primary btn-sm" onclick="guardarConfigUnidad(${id_grupo}, ${unidad.id_unidad})">
              <iconify-icon icon="lucide:save"></iconify-icon> Guardar
            </button>
            <button class="btn btn-outline btn-sm" onclick="resetConfigUnidad(${id_grupo}, ${unidad.id_unidad})">
              <iconify-icon icon="lucide:rotate-ccw"></iconify-icon> Restablecer (60/30/10)
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function buildRubrosRows(id_grupo, id_unidad) {
  const rubros = getRubrosGrupo(id_grupo);
  const pcts = getPcts(id_grupo, id_unidad);

  return rubros
    .map((r) => {
      const val = pcts[r.key] ?? 0;
      return `
      <div class="rubro-row">
        <iconify-icon class="rubro-icon" icon="${r.icono || "lucide:tag"}"></iconify-icon>
        <span class="rubro-nombre">${r.nombre}</span>
        <input class="rubro-pct-input"
               type="number" min="0" max="100" step="1"
               data-grupo="${id_grupo}" data-unidad="${id_unidad}" data-key="${r.key}"
               value="${val}"
               oninput="actualizarSumaRubros(${id_grupo},${id_unidad})"
               placeholder="0" />
        <span class="rubro-pct-label">%</span>
        <button class="btn-del-rubro" ${r.bloqueado ? "disabled title='Rubro predeterminado'" : `onclick="eliminarRubroGrupo(${id_grupo},'${r.key}')"`}>
          <iconify-icon icon="lucide:x"></iconify-icon>
        </button>
      </div>`;
    })
    .join("");
}

// ── Suma en tiempo real ───────────────────────────────────────────────
function actualizarSumaRubros(id_grupo, id_unidad) {
  let suma = 0;
  document
    .querySelectorAll(
      `.rubro-pct-input[data-grupo="${id_grupo}"][data-unidad="${id_unidad}"]`,
    )
    .forEach((inp) => (suma += parseFloat(inp.value) || 0));
  const badge = document.getElementById(`suma-badge-${id_grupo}-${id_unidad}`);
  if (!badge) return;
  const ok = Math.abs(suma - 100) < 0.01;
  badge.textContent = `${suma.toFixed(0)}% ${ok ? "✓" : "— debe ser 100%"}`;
  badge.className = `suma-badge ${ok ? "suma-ok" : "suma-err"}`;
}

// ── Guardar una unidad ────────────────────────────────────────────────
async function guardarConfigUnidad(id_grupo, id_unidad) {
  const inputs = document.querySelectorAll(
    `.rubro-pct-input[data-grupo="${id_grupo}"][data-unidad="${id_unidad}"]`,
  );
  let suma = 0;
  const pcts = {};
  inputs.forEach((inp) => {
    const v = parseFloat(inp.value) || 0;
    pcts[inp.dataset.key] = v;
    suma += v;
  });

  if (Math.abs(suma - 100) > 0.01) {
    showToast(
      `La suma debe ser 100%. Actualmente: ${suma.toFixed(1)}%`,
      "error",
    );
    return false;
  }
  localStorage.setItem(`pcts_${id_grupo}_${id_unidad}`, JSON.stringify(pcts));

  const body = {
    id_grupo,
    id_unidad,
    pct_actividades: pcts.pct_actividades ?? 0,
    pct_examen: pcts.pct_examen ?? 0,
    pct_asistencia: pcts.pct_asistencia ?? 0,
    nota: JSON.stringify(pcts),
  };
  try {
    const res = await fetch(`${BASE_URL_GM}/api/config-evaluacion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenGM()}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error);
  } catch (_) {
    // silently saved to localStorage already; server fail is non-blocking
  }

  // Update the badge in the unit header
  const blockId = `uc-${id_grupo}-${id_unidad}`;
  const block = document.getElementById(blockId);
  if (block) {
    const existing = block.querySelector(".cfg-badge");
    if (existing) {
      existing.className = "cfg-badge cfg-badge-ok";
      existing.style.fontSize = "0.7rem";
      existing.textContent = "✓ 100%";
    }
  }
  actualizarBadgeGrupo(id_grupo);
  actualizarStats();
  return true;
}

// ── Guardar todas las unidades de un grupo ────────────────────────────
async function guardarTodasUnidades(id_grupo) {
  const unidades = unidadesPorGrupo[id_grupo] || [];
  if (!unidades.length) {
    showToast("No hay unidades para guardar", "info");
    return;
  }

  let ok = 0,
    fail = 0;
  for (const u of unidades) {
    const res = await guardarConfigUnidad(id_grupo, u.id_unidad);
    res ? ok++ : fail++;
  }

  if (fail === 0)
    showToast(
      `✓ ${ok} unidad${ok > 1 ? "es" : ""} guardada${ok > 1 ? "s" : ""}`,
      "success",
    );
  else showToast(`${ok} guardadas, ${fail} con error (suma ≠ 100%)`, "error");
}

// ── Restablecer ───────────────────────────────────────────────────────
function resetConfigUnidad(id_grupo, id_unidad) {
  if (
    !confirm(
      "¿Restablecer a los valores predeterminados: Actividades 60% · Examen 30% · Asistencia 10%?",
    )
  )
    return;
  const defaults = { pct_actividades: 60, pct_examen: 30, pct_asistencia: 10 };
  localStorage.setItem(
    `pcts_${id_grupo}_${id_unidad}`,
    JSON.stringify(defaults),
  );
  document
    .querySelectorAll(
      `.rubro-pct-input[data-grupo="${id_grupo}"][data-unidad="${id_unidad}"]`,
    )
    .forEach((inp) => {
      inp.value = defaults[inp.dataset.key] ?? 0;
    });
  actualizarSumaRubros(id_grupo, id_unidad);
  showToast("Valores restablecidos", "info");
}

// ── Rubros personalizados ─────────────────────────────────────────────
function agregarRubroGrupo(id_grupo) {
  const nombre = prompt(
    "Nombre del nuevo rubro\n(ej: Participación, Proyecto, Práctica, etc.):",
  );
  if (!nombre || !nombre.trim()) return;

  const key =
    "custom_" +
    nombre
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  const extras = getRubrosExtra(id_grupo);

  if (
    extras.find((r) => r.key === key) ||
    RUBROS_DEFAULT.find((r) => r.key === key)
  ) {
    showToast("Ya existe un rubro con ese nombre", "error");
    return;
  }
  extras.push({
    key,
    nombre: nombre.trim(),
    icono: "lucide:star",
    bloqueado: false,
  });
  setRubrosExtra(id_grupo, extras);
  rerenderGrupoBody(id_grupo);
  showToast(`Rubro "${nombre.trim()}" agregado`, "success");
}

function eliminarRubroGrupo(id_grupo, key) {
  if (RUBROS_DEFAULT.find((r) => r.key === key)) {
    showToast("No se puede eliminar un rubro predeterminado", "error");
    return;
  }
  if (!confirm("¿Eliminar este rubro de todas las unidades del grupo?")) return;
  setRubrosExtra(
    id_grupo,
    getRubrosExtra(id_grupo).filter((r) => r.key !== key),
  );
  rerenderGrupoBody(id_grupo);
  showToast("Rubro eliminado", "info");
}

async function rerenderGrupoBody(id_grupo) {
  const bodyEl = document.getElementById(`body-${id_grupo}`);
  if (!bodyEl) return;
  const grupo = misGrupos.find((g) => g.id_grupo === id_grupo);
  const unidades =
    unidadesPorGrupo[id_grupo] ||
    (grupo ? await cargarUnidadesDeGrupo(grupo) : []);
  bodyEl.innerHTML = buildGrupoBody(
    grupo || { id_grupo, nombre_materia: "" },
    unidades,
  );
  const cnt = document.getElementById(`rubros-count-${id_grupo}`);
  if (cnt) cnt.textContent = getRubrosGrupo(id_grupo).length;
}

// ── Badge helpers ─────────────────────────────────────────────────────
function actualizarBadgeGrupo(id_grupo) {
  const card = document.getElementById(`grupo-card-${id_grupo}`);
  if (!card) return;
  const badge = card.querySelector(".grupo-info .cfg-badge");
  if (!badge) return;
  const tieneConfig =
    getRubrosExtra(id_grupo).length > 0 ||
    (unidadesPorGrupo[id_grupo] || []).some((u) => {
      try {
        return !!JSON.parse(
          localStorage.getItem(`pcts_${id_grupo}_${u.id_unidad}`),
        );
      } catch {
        return false;
      }
    });
  badge.className = `cfg-badge ${tieneConfig ? "cfg-badge-ok" : "cfg-badge-pending"}`;
  badge.innerHTML = tieneConfig
    ? `<iconify-icon icon="lucide:check-circle" style="font-size:0.75rem"></iconify-icon> Configurado`
    : `<iconify-icon icon="lucide:alert-circle" style="font-size:0.75rem"></iconify-icon> Pendiente`;
}

// ── Toggle ────────────────────────────────────────────────────────────
function toggleGrupoCard(id_grupo) {
  document.getElementById(`grupo-card-${id_grupo}`)?.classList.toggle("open");
}
function toggleUnidadBlock(blockId) {
  document.getElementById(blockId)?.classList.toggle("open");
}

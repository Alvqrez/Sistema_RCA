// frontend/js/gruposMaestro.js
const BASE_URL_GM = "http://localhost:3000";
const tokenGM = () => localStorage.getItem("token");

// Rubros por defecto (no se pueden eliminar)
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

// Estado global
let misGrupos = [];

// ── localStorage helpers para rubros personalizados ───────────────────
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

// Rubros completos de un grupo = defaults + extras
function getRubrosGrupo(id_grupo) {
  return [...RUBROS_DEFAULT, ...getRubrosExtra(id_grupo)];
}

// ── Init ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  soloPermitido("maestro", "administrador");
  await cargarGrupos();
});

// ── Cargar grupos del maestro ─────────────────────────────────────────
async function cargarGrupos() {
  const rol = localStorage.getItem("rol");
  const url =
    rol === "maestro"
      ? `${BASE_URL_GM}/api/grupos/mis-grupos`
      : `${BASE_URL_GM}/api/grupos`;

  try {
    let grupos = await fetchAuth(url);

    if (!Array.isArray(grupos)) {
      // Fallback: filtrar por numero_empleado del token
      const todos = await fetchAuth(`${BASE_URL_GM}/api/grupos`);
      let id_ref = null;
      try {
        id_ref = JSON.parse(atob(tokenGM().split(".")[1])).id_referencia;
      } catch (_) {}
      grupos = id_ref
        ? todos.filter((g) => String(g.numero_empleado) === String(id_ref))
        : todos;
    }

    misGrupos = grupos.filter((g) => g.estatus === "Activo" || !g.estatus);
    renderEstadisticas();
    await renderGrupos();
  } catch (e) {
    console.error("Error cargando grupos:", e);
    mostrarEstado("error");
  }
}

async function fetchAuth(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tokenGM()}` },
  });
  if (res.status === 401) {
    window.location.href = "login.html";
    throw new Error("401");
  }
  return res.json();
}

// ── Estadísticas en cards ─────────────────────────────────────────────
function renderEstadisticas() {
  document.getElementById("statGrupos").textContent = misGrupos.length;
  // Configurados = los que tienen alguna config guardada en backend o localStorage
  const conConfig = misGrupos.filter(
    (g) => getRubrosExtra(g.id_grupo).length > 0,
  ).length;
  document.getElementById("statConfigurados").textContent = conConfig;
  document.getElementById("statPendientes").textContent =
    misGrupos.length - conConfig;
}

// ── Render lista de grupos ────────────────────────────────────────────
async function renderGrupos() {
  const loader = document.getElementById("loadingState");
  const lista = document.getElementById("listaGrupos");
  const empty = document.getElementById("emptyState");

  loader.style.display = "none";

  if (!misGrupos.length) {
    empty.style.display = "block";
    return;
  }

  lista.style.display = "block";
  lista.innerHTML = "";

  for (const g of misGrupos) {
    const unidades = await cargarUnidadesGrupo(g);
    lista.appendChild(buildGrupoCard(g, unidades));
  }
}

async function cargarUnidadesGrupo(grupo) {
  try {
    let unidades = await fetchAuth(
      `${BASE_URL_GM}/api/grupos/${grupo.id_grupo}/unidades`,
    );
    if (!Array.isArray(unidades) || unidades.length === 0) {
      const info = await fetchAuth(
        `${BASE_URL_GM}/api/grupos/${grupo.id_grupo}`,
      );
      const clave = info?.clave_materia || grupo.clave_materia;
      if (clave) {
        unidades = await fetchAuth(
          `${BASE_URL_GM}/api/unidades/materia/${encodeURIComponent(clave)}`,
        );
      }
    }
    return Array.isArray(unidades) ? unidades : [];
  } catch {
    return [];
  }
}

// ── Construir card de grupo ───────────────────────────────────────────
function buildGrupoCard(grupo, unidades) {
  const card = document.createElement("div");
  card.className = "grupo-card";
  card.id = `grupo-card-${grupo.id_grupo}`;

  const rubrosExtra = getRubrosExtra(grupo.id_grupo);
  const cfgBadge =
    rubrosExtra.length > 0
      ? `<span class="cfg-badge cfg-badge-ok">Personalizado</span>`
      : `<span class="cfg-badge cfg-badge-pending">Por defecto</span>`;

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
          · ${unidades.length} unidad${unidades.length !== 1 ? "es" : ""}
        </p>
      </div>
      <iconify-icon class="grupo-chevron" icon="lucide:chevron-down"></iconify-icon>
    </div>
    <div class="grupo-card-body">
      <div class="grupo-card-body-inner" id="body-${grupo.id_grupo}">
        ${buildGrupoBody(grupo, unidades)}
      </div>
    </div>
  `;
  return card;
}

function buildGrupoBody(grupo, unidades) {
  if (!unidades.length) {
    return `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.85rem">
      <iconify-icon icon="lucide:inbox" style="font-size:1.8rem;display:block;margin:0 auto 8px"></iconify-icon>
      No hay unidades definidas para este grupo.
    </div>`;
  }

  let html = `
    <!-- Agregar rubro personalizado al grupo -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:10px 14px;
                background:var(--bg-app);border-radius:8px;border:1px dashed var(--border)">
      <iconify-icon icon="lucide:plus-circle" style="color:var(--primary);font-size:1.1rem"></iconify-icon>
      <span style="font-size:0.82rem;color:var(--text-muted);flex:1">
        Rubros activos:
        <strong style="color:var(--text-main)" id="rubros-count-${grupo.id_grupo}">
          ${getRubrosGrupo(grupo.id_grupo).length}
        </strong>
        (3 predeterminados + personalizados)
      </span>
      <button class="btn btn-outline btn-sm" onclick="agregarRubroGrupo(${grupo.id_grupo})">
        <iconify-icon icon="lucide:plus"></iconify-icon> Agregar rubro
      </button>
    </div>
  `;

  unidades.forEach((u, i) => {
    const numU = u.numero_unidad ?? i + 1;
    html += buildUnidadConfig(grupo.id_grupo, u, numU);
  });

  return html;
}

// ── Construir config de una unidad ────────────────────────────────────
function buildUnidadConfig(id_grupo, unidad, numero) {
  const blockId = `uc-${id_grupo}-${unidad.id_unidad}`;
  return `
    <div class="unidad-config-block" id="${blockId}">
      <div class="unidad-config-header" onclick="toggleUnidadBlock('${blockId}')">
        <iconify-icon icon="lucide:layers"></iconify-icon>
        Unidad ${numero}: ${unidad.nombre_unidad}
        <span class="unidad-config-chevron"><iconify-icon icon="lucide:chevron-down"></iconify-icon></span>
      </div>
      <div class="unidad-config-body">
        <div class="unidad-config-body-inner" id="${blockId}-inner">
          ${buildRubrosForm(id_grupo, unidad.id_unidad)}
        </div>
      </div>
    </div>
  `;
}

// ── Form de rubros para una unidad ────────────────────────────────────
function buildRubrosForm(id_grupo, id_unidad) {
  const rubros = getRubrosGrupo(id_grupo);
  const storageKey = `pcts_${id_grupo}_${id_unidad}`;
  let pcts = {};
  try {
    pcts = JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch (_) {}

  // Valores por defecto si no hay nada guardado
  if (!Object.keys(pcts).length) {
    pcts = { pct_actividades: 60, pct_examen: 30, pct_asistencia: 10 };
  }

  let rowsHTML = rubros
    .map((r) => {
      const val = pcts[r.key] ?? 0;
      return `
      <div class="rubro-row" id="rubro-row-${id_grupo}-${id_unidad}-${r.key}">
        <iconify-icon class="rubro-icon" icon="${r.icono || "lucide:tag"}"></iconify-icon>
        <span class="rubro-nombre">${r.nombre}</span>
        <input class="rubro-pct-input"
               type="number" min="0" max="100" step="1"
               data-grupo="${id_grupo}" data-unidad="${id_unidad}" data-key="${r.key}"
               value="${val}"
               oninput="actualizarSumaRubros(${id_grupo}, ${id_unidad})"
               placeholder="0" />
        <span class="rubro-pct-label">%</span>
        <button class="btn-del-rubro" title="Eliminar rubro"
                ${r.bloqueado ? "disabled" : ""}
                onclick="eliminarRubroGrupo(${id_grupo}, '${r.key}', ${id_unidad})">
          <iconify-icon icon="lucide:x"></iconify-icon>
        </button>
      </div>`;
    })
    .join("");

  const suma = rubros.reduce((s, r) => s + (parseFloat(pcts[r.key]) || 0), 0);
  const sumaOk = Math.abs(suma - 100) < 0.01;

  return `
    <div class="rubros-list" id="rubros-list-${id_grupo}-${id_unidad}">
      ${rowsHTML}
    </div>
    <div class="suma-row">
      <span style="font-size:0.8rem;color:var(--text-muted)">Suma de porcentajes</span>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="suma-badge ${sumaOk ? "suma-ok" : "suma-err"}" id="suma-badge-${id_grupo}-${id_unidad}">
          ${suma}% ${sumaOk ? "✓" : "≠ 100%"}
        </span>
      </div>
    </div>
    <div class="unidad-actions">
      <button class="btn btn-primary btn-sm"
              onclick="guardarConfigUnidad(${id_grupo}, ${id_unidad})">
        <iconify-icon icon="lucide:save"></iconify-icon> Guardar unidad
      </button>
      <button class="btn btn-outline btn-sm"
              onclick="resetConfigUnidad(${id_grupo}, ${id_unidad})">
        <iconify-icon icon="lucide:rotate-ccw"></iconify-icon> Restablecer
      </button>
    </div>
  `;
}

// ── Suma en tiempo real ───────────────────────────────────────────────
function actualizarSumaRubros(id_grupo, id_unidad) {
  const inputs = document.querySelectorAll(
    `.rubro-pct-input[data-grupo="${id_grupo}"][data-unidad="${id_unidad}"]`,
  );
  let suma = 0;
  inputs.forEach((inp) => {
    suma += parseFloat(inp.value) || 0;
  });
  const badge = document.getElementById(`suma-badge-${id_grupo}-${id_unidad}`);
  if (!badge) return;
  const ok = Math.abs(suma - 100) < 0.01;
  badge.textContent = `${parseFloat(suma.toFixed(2))}% ${ok ? "✓" : "≠ 100%"}`;
  badge.className = `suma-badge ${ok ? "suma-ok" : "suma-err"}`;
}

// ── Guardar config de una unidad ──────────────────────────────────────
async function guardarConfigUnidad(id_grupo, id_unidad) {
  const inputs = document.querySelectorAll(
    `.rubro-pct-input[data-grupo="${id_grupo}"][data-unidad="${id_unidad}"]`,
  );
  const rubros = getRubrosGrupo(id_grupo);
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
    return;
  }

  // Guardar en localStorage (cache local)
  localStorage.setItem(`pcts_${id_grupo}_${id_unidad}`, JSON.stringify(pcts));

  // Enviar al backend (rubros fijos + nota con rubros extra)
  const body = {
    id_grupo,
    id_unidad,
    pct_actividades: pcts["pct_actividades"] ?? 0,
    pct_examen: pcts["pct_examen"] ?? 0,
    pct_asistencia: pcts["pct_asistencia"] ?? 0,
    nota: JSON.stringify(pcts), // guardamos el JSON completo en nota para preservar rubros extra
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
    if (res.ok && data.success) {
      showToast("Configuración guardada correctamente", "success");
    } else {
      showToast(data.error || "Error al guardar en el servidor", "error");
    }
  } catch (e) {
    // Falló el backend pero ya guardamos en localStorage
    showToast("Guardado localmente (sin conexión al servidor)", "info");
  }

  // Actualizar badge del grupo
  renderEstadisticas();
  actualizarBadgeGrupo(id_grupo);
}

// ── Reset config de una unidad ────────────────────────────────────────
function resetConfigUnidad(id_grupo, id_unidad) {
  if (!confirm("¿Restablecer a los valores por defecto (60/30/10)?")) return;
  const defaults = { pct_actividades: 60, pct_examen: 30, pct_asistencia: 10 };
  localStorage.setItem(
    `pcts_${id_grupo}_${id_unidad}`,
    JSON.stringify(defaults),
  );

  // Re-renderizar los inputs de esa unidad
  const inputs = document.querySelectorAll(
    `.rubro-pct-input[data-grupo="${id_grupo}"][data-unidad="${id_unidad}"]`,
  );
  inputs.forEach((inp) => {
    inp.value = defaults[inp.dataset.key] ?? 0;
  });
  actualizarSumaRubros(id_grupo, id_unidad);
  showToast("Valores restablecidos", "info");
}

// ── Agregar rubro personalizado al grupo ──────────────────────────────
function agregarRubroGrupo(id_grupo) {
  const nombre = prompt(
    "Nombre del nuevo rubro (ej: Participación, Proyecto, etc.):",
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

  // Actualizar contador
  const cnt = document.getElementById(`rubros-count-${id_grupo}`);
  if (cnt) cnt.textContent = getRubrosGrupo(id_grupo).length;

  // Rerenderizar TODAS las unidades del grupo para que aparezca el rubro
  rerenderGrupo(id_grupo);
  showToast(`Rubro "${nombre.trim()}" agregado`, "success");
}

// ── Eliminar rubro personalizado ──────────────────────────────────────
function eliminarRubroGrupo(id_grupo, key, id_unidad) {
  if (RUBROS_DEFAULT.find((r) => r.key === key)) return; // no se puede
  if (!confirm("¿Eliminar este rubro de todas las unidades de este grupo?"))
    return;

  const extras = getRubrosExtra(id_grupo).filter((r) => r.key !== key);
  setRubrosExtra(id_grupo, extras);

  const cnt = document.getElementById(`rubros-count-${id_grupo}`);
  if (cnt) cnt.textContent = getRubrosGrupo(id_grupo).length;

  rerenderGrupo(id_grupo);
  showToast("Rubro eliminado", "info");
}

// ── Re-renderizar el body de un grupo ─────────────────────────────────
async function rerenderGrupo(id_grupo) {
  const bodyInner = document.getElementById(`body-${id_grupo}`);
  if (!bodyInner) return;
  const grupo = misGrupos.find((g) => g.id_grupo === id_grupo);
  if (!grupo) return;
  const unidades = await cargarUnidadesGrupo(grupo);
  bodyInner.innerHTML = buildGrupoBody(grupo, unidades);
}

// ── Badge del grupo ───────────────────────────────────────────────────
function actualizarBadgeGrupo(id_grupo) {
  const card = document.getElementById(`grupo-card-${id_grupo}`);
  if (!card) return;
  const extras = getRubrosExtra(id_grupo);
  const badge = card.querySelector(".cfg-badge");
  if (!badge) return;
  if (extras.length > 0) {
    badge.className = "cfg-badge cfg-badge-ok";
    badge.textContent = "Personalizado";
  } else {
    badge.className = "cfg-badge cfg-badge-pending";
    badge.textContent = "Por defecto";
  }
}

// ── Toggle helpers ────────────────────────────────────────────────────
function toggleGrupoCard(id_grupo) {
  const card = document.getElementById(`grupo-card-${id_grupo}`);
  if (card) card.classList.toggle("open");
}

function toggleUnidadBlock(blockId) {
  const block = document.getElementById(blockId);
  if (block) block.classList.toggle("open");
}

function mostrarEstado(tipo) {
  document.getElementById("loadingState").style.display = "none";
  if (tipo === "error") {
    document.getElementById("emptyState").style.display = "block";
  }
}

// frontend/js/formulario.js — v3 (rediseño completo)
const BASE_URL_FORM = "http://localhost:3000";
const token = () => localStorage.getItem("token");

// ── Estado global ─────────────────────────────────────────────────────
let estado = {
  grupoId: null,
  unidadId: null,
  actividades: [], // actividades de la unidad actual
  alumnos: [], // [{ matricula, nombre }]
  resultados: {}, // matricula → { id_actividad → { cal, estatus } }
  unidadesGrupo: [], // [{ id_unidad, nombre_unidad, numero_unidad, ponderacion }]
  rubros: [], // config activa: [{ key, nombre, pct, tipo }]
  rubrosState: {}, // matricula → { key → grade }  (examen, asistencia, custom)
};
let bonusState = {}; // matricula → { puntos, justificacion }
let _modalMatricula = null; // alumno activo en modal de actividades

// ── Helpers localStorage ──────────────────────────────────────────────
function getRubrosConfig(id_grupo, id_unidad) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(`pcts_${id_grupo}_${id_unidad}`),
    );
    if (saved && Object.keys(saved).length) return saved;
  } catch (_) {}
  return { pct_actividades: 60, pct_examen: 30, pct_asistencia: 10 };
}

function getRubroEstado(matricula, key) {
  return estado.rubrosState[matricula]?.[key] ?? "";
}
function setRubroEstado(matricula, key, val) {
  if (!estado.rubrosState[matricula]) estado.rubrosState[matricula] = {};
  estado.rubrosState[matricula][key] = val;
}

function getBonus(matricula) {
  return bonusState[matricula] ?? { puntos: "", justificacion: "" };
}

// ── Rubro list from localStorage pcts ────────────────────────────────
function buildRubros(id_grupo, id_unidad) {
  const pcts = getRubrosConfig(id_grupo, id_unidad);
  const extras = [];
  try {
    const ex =
      JSON.parse(localStorage.getItem(`rubros_extra_${id_grupo}`)) || [];
    ex.forEach((r) => {
      if (pcts[r.key] !== undefined) extras.push(r);
    });
  } catch (_) {}

  const list = [];
  if (pcts.pct_actividades > 0)
    list.push({
      key: "pct_actividades",
      nombre: "Actividades",
      pct: pcts.pct_actividades,
      tipo: "actividades",
    });
  if (pcts.pct_examen > 0)
    list.push({
      key: "pct_examen",
      nombre: "Examen",
      pct: pcts.pct_examen,
      tipo: "directo",
    });
  if (pcts.pct_asistencia > 0)
    list.push({
      key: "pct_asistencia",
      nombre: "Asistencia",
      pct: pcts.pct_asistencia,
      tipo: "directo",
    });
  extras.forEach((r) => {
    const p = pcts[r.key] ?? 0;
    if (p > 0)
      list.push({ key: r.key, nombre: r.nombre, pct: p, tipo: "directo" });
  });
  return list;
}

// ── INIT ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await cargarGruposSelect();
  const params = new URLSearchParams(window.location.search);
  const gParam = params.get("grupo");
  if (gParam) {
    const sel = document.getElementById("selGrupo");
    sel.value = gParam;
    await cargarGrupo();
  }
});

// ── Toggle step cards ─────────────────────────────────────────────────
function toggleStepCard(id) {
  document.getElementById(id)?.classList.toggle("open");
}

// ── Load groups ───────────────────────────────────────────────────────
async function cargarGruposSelect() {
  const sel = document.getElementById("selGrupo");
  const rol = localStorage.getItem("rol");
  const url =
    rol === "maestro"
      ? `${BASE_URL_FORM}/api/grupos/mis-grupos`
      : `${BASE_URL_FORM}/api/grupos`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) {
      await cargarGruposSelectFallback(sel);
      return;
    }
    const grupos = await res.json();
    if (!Array.isArray(grupos) || !grupos.length) {
      sel.innerHTML = `<option value="">— Sin grupos asignados —</option>`;
      return;
    }
    sel.innerHTML = `<option value="">— Selecciona un grupo —</option>`;
    grupos.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id_grupo;
      opt.textContent = `${g.nombre_materia} (${g.descripcion_periodo || "Periodo " + g.id_periodo})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    mostrarToast("Error al cargar grupos", "error");
  }
}

async function cargarGruposSelectFallback(sel) {
  try {
    const res = await fetch(`${BASE_URL_FORM}/api/grupos`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const todos = await res.json();
    let id_ref = null;
    try {
      id_ref = JSON.parse(atob(token().split(".")[1])).id_referencia;
    } catch (_) {}
    const grupos = id_ref
      ? todos.filter((g) => g.numero_empleado === id_ref)
      : todos;
    sel.innerHTML = grupos.length
      ? `<option value="">— Selecciona un grupo —</option>` +
        grupos
          .map(
            (g) =>
              `<option value="${g.id_grupo}">${g.nombre_materia} (${g.descripcion_periodo || "Periodo " + g.id_periodo})</option>`,
          )
          .join("")
      : `<option value="">— Sin grupos asignados —</option>`;
  } catch (_) {}
}

// ── Load group ────────────────────────────────────────────────────────
async function cargarGrupo() {
  const sel = document.getElementById("selGrupo");
  const id = parseInt(sel.value);
  if (!id) return resetVista();

  estado.grupoId = id;
  estado.unidadId = null;
  estado.rubrosState = {};
  bonusState = {};

  document.getElementById("badgeGrupo").textContent =
    sel.options[sel.selectedIndex].text;
  actualizarEstadoBadge(false);

  await Promise.all([cargarUnidadesGrupo(), cargarAlumnos()]);

  // Show paso 3
  const paso3 = document.getElementById("cardPaso3");
  paso3.style.display = "block";
  paso3.classList.add("open");

  // Show hint
  const hint = document.getElementById("hintConfigEval");
  if (hint) hint.style.display = "flex";

  // Mark paso 1 as done
  document.getElementById("numPaso1").classList.add("done");
  document.getElementById("numPaso1").innerHTML =
    `<iconify-icon icon="lucide:check" style="font-size:.8rem"></iconify-icon>`;
}

function resetVista() {
  estado = {
    grupoId: null,
    unidadId: null,
    actividades: [],
    alumnos: [],
    resultados: {},
    unidadesGrupo: [],
    rubros: [],
    rubrosState: {},
  };
  bonusState = {};
  document.getElementById("badgeGrupo").textContent = "Sin grupo seleccionado";
  actualizarEstadoBadge(false);
  document.getElementById("cardPaso3").style.display = "none";
  document.getElementById("cardPaso4").style.display = "none";
  document.getElementById("hintConfigEval").style.display = "none";
  const n = document.getElementById("numPaso1");
  n.classList.remove("done");
  n.textContent = "1";
}

// ── Load units ────────────────────────────────────────────────────────
async function cargarUnidadesGrupo() {
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/grupos/${estado.grupoId}/unidades`,
      { headers: { Authorization: `Bearer ${token()}` } },
    );
    let unidades = await res.json();

    if (!Array.isArray(unidades) || !unidades.length) {
      const info = await (
        await fetch(`${BASE_URL_FORM}/api/grupos/${estado.grupoId}`, {
          headers: { Authorization: `Bearer ${token()}` },
        })
      ).json();
      const r2 = await fetch(
        `${BASE_URL_FORM}/api/unidades/materia/${encodeURIComponent(info.clave_materia)}`,
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      unidades = await r2.json();
      unidades = unidades.map((u, i) => ({
        ...u,
        ponderacion: 0,
        numero_unidad: i + 1,
      }));
    } else {
      unidades = unidades.map((u, i) => ({
        ...u,
        numero_unidad: u.numero_unidad ?? i + 1,
      }));
    }
    estado.unidadesGrupo = unidades;
  } catch (e) {
    console.error("Error cargando unidades:", e);
    estado.unidadesGrupo = [];
  }

  // Render unit tabs
  const tabsEl = document.getElementById("unitTabs");
  tabsEl.innerHTML = estado.unidadesGrupo
    .map((u) => {
      const cerrada = u.estatus === "Cerrada";
      const icon = cerrada
        ? `<iconify-icon icon="mdi:lock-outline" style="font-size:.75rem;margin-right:3px;opacity:.7"></iconify-icon>`
        : "";
      return `<button class="unit-tab ${cerrada ? "unit-tab-cerrada" : ""}" data-uid="${u.id_unidad}" data-estatus="${u.estatus}"
       onclick="seleccionarUnidadTab(${u.id_unidad})">
       ${icon}Unidad ${u.numero_unidad}
       <span class="unit-tab-badge">${u.estatus}</span>
     </button>`;
    })
    .join("");

  // Update "número de unidades" field
  const nu = document.getElementById("numUnidades");
  if (nu) nu.value = estado.unidadesGrupo.length || "";
}

// ── Load students ─────────────────────────────────────────────────────
async function cargarAlumnos() {
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/inscripciones/grupo/${estado.grupoId}`,
      { headers: { Authorization: `Bearer ${token()}` } },
    );
    const data = await res.json();
    estado.alumnos = data.map((a) => ({
      matricula: a.matricula,
      nombre:
        `${a.apellido_paterno} ${a.apellido_materno ?? ""}, ${a.nombre}`.trim(),
    }));
  } catch {
    estado.alumnos = [];
  }
}

// ── Select unit via tab ───────────────────────────────────────────────
async function seleccionarUnidadTab(id_unidad) {
  // Highlight tab
  document.querySelectorAll(".unit-tab").forEach((t) => {
    t.classList.toggle("active", parseInt(t.dataset.uid) === id_unidad);
  });

  estado.unidadId = id_unidad;
  estado.rubros = buildRubros(estado.grupoId, id_unidad);
  estado.rubrosState = {};
  bonusState = {};

  // Check if unit is closed and show/hide banner
  const unidadData = estado.unidadesGrupo.find(
    (u) => u.id_unidad === id_unidad,
  );
  const bannerCerrada = document.getElementById("bannerUnidadCerrada");
  const accionesCaptura = document.getElementById("accionesCaptura");
  if (bannerCerrada) {
    if (unidadData?.estatus === "Cerrada") {
      bannerCerrada.style.display = "flex";
      if (accionesCaptura) accionesCaptura.style.display = "none";
    } else {
      bannerCerrada.style.display = "none";
    }
  }

  await cargarActividades();
  await cargarResultadosExistentes();
  await cargarBonusUnidad();

  renderRubrosBar();
  renderTablaCalificaciones();

  if (unidadData?.estatus !== "Cerrada") {
    if (accionesCaptura) accionesCaptura.style.display = "flex";
  }
  actualizarEstadoBadge(true);
  actualizarSelectCSVActividad();
}

function limpiarUnidad() {
  estado.unidadId = null;
  document
    .querySelectorAll(".unit-tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("rubrosBar").innerHTML =
    `<span style="font-size:0.78rem;color:var(--text-muted)">Selecciona una unidad</span>`;
  document.getElementById("gradeTableWrap").innerHTML =
    `<div class="empty-wrap"><iconify-icon icon="mdi:clipboard-text-outline"></iconify-icon><p>Selecciona una unidad para comenzar</p></div>`;
  document.getElementById("accionesCaptura").style.display = "none";
  actualizarEstadoBadge(false);
}

// ── Load activities ───────────────────────────────────────────────────
async function cargarActividades() {
  const res = await fetch(`${BASE_URL_FORM}/api/actividades`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const todas = await res.json();
  estado.actividades = todas.filter(
    (a) => a.id_grupo === estado.grupoId && a.id_unidad === estado.unidadId,
  );
}

async function actualizarActividades() {
  if (!estado.unidadId) {
    mostrarToast("Selecciona una unidad primero", "info");
    return;
  }
  await cargarActividades();
  renderTablaCalificaciones();
  mostrarToast("Actividades actualizadas", "success");
}

// ── Load results ──────────────────────────────────────────────────────
async function cargarResultadosExistentes() {
  estado.resultados = {};
  for (const act of estado.actividades) {
    try {
      const res = await fetch(
        `${BASE_URL_FORM}/api/resultado-actividad/actividad/${act.id_actividad}`,
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      const filas = await res.json();
      filas.forEach((f) => {
        if (!estado.resultados[f.matricula])
          estado.resultados[f.matricula] = {};
        estado.resultados[f.matricula][act.id_actividad] = {
          cal: f.calificacion_obtenida,
          estatus: f.estatus,
        };
      });
    } catch (_) {}
  }
}

// ── Load bonus ────────────────────────────────────────────────────────
async function cargarBonusUnidad() {
  bonusState = {};
  if (!estado.grupoId || !estado.unidadId) return;
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/bonus/unidad/grupo/${estado.grupoId}`,
      { headers: { Authorization: `Bearer ${token()}` } },
    );
    const bonuses = await res.json();
    if (Array.isArray(bonuses)) {
      bonuses.forEach((b) => {
        if (b.id_unidad === estado.unidadId && b.estatus !== "Cancelado") {
          bonusState[b.matricula] = {
            puntos: b.puntos_otorgados,
            justificacion: b.justificacion,
          };
        }
      });
    }
  } catch (_) {}
}

// ── Render rubro chips bar ────────────────────────────────────────────
function renderRubrosBar() {
  const bar = document.getElementById("rubrosBar");
  const unidad = estado.unidadesGrupo.find(
    (u) => u.id_unidad === estado.unidadId,
  );
  const chipColors = {
    pct_actividades: "rchip-act",
    pct_examen: "rchip-exam",
    pct_asistencia: "rchip-asist",
  };

  let html = "";
  if (unidad) {
    html += `<span class="rchip rchip-label">
      <iconify-icon icon="lucide:layers" style="font-size:.8rem"></iconify-icon>
      Unidad ${unidad.numero_unidad}
    </span><span class="chip-sep"></span>`;
  }

  estado.rubros.forEach((r) => {
    const cls = chipColors[r.key] || "rchip-custom";
    html += `<span class="rchip ${cls}">${r.nombre} ${r.pct}%</span>`;
  });

  html += `<span class="chip-sep"></span>
    <span class="rchip rchip-bonus">
      <iconify-icon icon="lucide:star" style="font-size:.75rem"></iconify-icon>
      Bonus +pts
    </span>`;

  bar.innerHTML = html;
}

// ── Render grade table ────────────────────────────────────────────────
function renderTablaCalificaciones() {
  const wrap = document.getElementById("gradeTableWrap");
  if (!wrap) return;

  if (!estado.alumnos.length) {
    wrap.innerHTML = `<div class="empty-wrap"><iconify-icon icon="mdi:account-off-outline"></iconify-icon><p>No hay alumnos inscritos.</p></div>`;
    return;
  }
  if (!estado.rubros.length) {
    wrap.innerHTML = `<div class="empty-wrap"><iconify-icon icon="lucide:settings-2"></iconify-icon><p>Sin rubros configurados. Ve a <a href="gruposMaestro.html">Configurar grupo</a>.</p></div>`;
    return;
  }

  // ── Header ──
  const chipColors = {
    pct_actividades: "#2563eb",
    pct_examen: "#b45309",
    pct_asistencia: "#065f46",
  };
  let thead = `<tr>
    <th class="th-alumno" style="text-align:left">Alumno</th>
    <th style="text-align:left">Matrícula</th>`;

  estado.rubros.forEach((r) => {
    const color = chipColors[r.key] || "#6d28d9";
    thead += `<th style="min-width:90px">
      <span style="color:${color}">${r.nombre}</span>
      <small>${r.pct}%</small>
    </th>`;
  });

  thead += `<th style="min-width:80px;background:rgba(100,116,139,.06)">
    Base<small>sin bonus</small>
  </th>
  <th style="min-width:76px;background:rgba(245,158,11,.07)">
    Bonus<small>pts extra</small>
  </th>
  <th style="min-width:90px;background:rgba(30,64,175,.06)">
    Cal. Final<small>con bonus</small>
  </th></tr>`;

  // ── Rows ──
  let tbody = "";
  estado.alumnos.forEach((al) => {
    tbody += `<tr data-matricula="${al.matricula}">
      <td>${al.nombre}</td>
      <td style="font-size:0.75rem;color:var(--text-muted)">${al.matricula}</td>`;

    estado.rubros.forEach((r) => {
      if (r.tipo === "actividades") {
        // Auto-calculated from activities + button to see detail
        const avg = calcularPromedioActividades(al.matricula);
        const color =
          avg === null
            ? "var(--text-muted)"
            : avg >= 70
              ? "var(--success)"
              : "var(--danger)";
        tbody += `<td>
          <div class="act-cell">
            <span class="act-val" id="act-val-${al.matricula}"
              style="color:${color}">${avg !== null ? avg.toFixed(1) : "—"}</span>
            <button class="btn-ver" onclick="abrirModalActividades('${al.matricula}')"
              title="Ver actividades individuales">
              <iconify-icon icon="lucide:list" style="font-size:.75rem"></iconify-icon>
            </button>
          </div>
        </td>`;
      } else {
        // Direct input
        const val = getRubroEstado(al.matricula, r.key);
        tbody += `<td>
          <input class="grade-input rubro-direct-input"
            type="number" min="0" max="100"
            data-matricula="${al.matricula}" data-key="${r.key}"
            value="${val}" placeholder="—"
            oninput="onRubroInput('${al.matricula}','${r.key}',this.value)" />
        </td>`;
      }
    });

    // Base (sin bonus)
    const base = calcularBaseScore(al.matricula);
    const baseColor =
      base === null
        ? "var(--text-muted)"
        : base >= 70
          ? "var(--success)"
          : "var(--danger)";
    tbody += `<td style="text-align:center">
      <span id="base-${al.matricula}" style="color:${baseColor};font-weight:500">
        ${base !== null ? base : "—"}
      </span>
    </td>`;

    // Bonus
    const b = getBonus(al.matricula);
    tbody += `<td class="td-bonus">
      <input class="bonus-input bonus-pts-input"
        type="number" min="0" max="10" step="0.5"
        data-matricula="${al.matricula}"
        value="${b.puntos ?? ""}" placeholder="0"
        oninput="onBonusInput('${al.matricula}',this.value)" />
      <input class="bonus-just-input"
        type="text" maxlength="120" placeholder="Justificación (obligatorio)"
        data-matricula="${al.matricula}"
        value="${b.justificacion ?? ""}"
        style="display:${b.puntos ? "block" : "none"};margin-top:4px;font-size:0.72rem;padding:3px 6px;border-radius:6px;border:1px solid var(--border);width:100%"
        oninput="onBonusJustInput('${al.matricula}',this.value)" />
    </td>`;

    // Cal. Final
    const final = calcularCalFinal(al.matricula);
    const fColor =
      final === null
        ? "var(--text-muted)"
        : final >= 70
          ? "var(--success)"
          : "var(--danger)";
    tbody += `<td class="td-final">
      <span id="final-${al.matricula}" style="color:${fColor}">
        ${final !== null ? final : "—"}
      </span>
    </td></tr>`;
  });

  wrap.innerHTML = `<table class="grade-table">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>`;
}

// ── Calculate actividades avg (from resultados) ────────────────────────
function calcularPromedioActividades(matricula) {
  if (!estado.actividades.length) return null;
  const sumaPond = estado.actividades.reduce(
    (s, a) => s + parseFloat(a.ponderacion),
    0,
  );
  if (sumaPond <= 0) return null;
  let suma = 0;
  estado.actividades.forEach((a) => {
    const r = estado.resultados[matricula]?.[a.id_actividad];
    const cal = r?.estatus === "NP" ? 0 : parseFloat(r?.cal) || 0;
    suma += cal * (parseFloat(a.ponderacion) / 100);
  });
  // Normalize if ponderaciones don't sum to 100
  const normalized =
    Math.abs(sumaPond - 100) > 0.5 ? (suma / sumaPond) * 100 : suma;
  return Math.round(normalized * 10) / 10;
}

// ── Calculate final grade for a student ──────────────────────────────
function calcularCalFinal(matricula) {
  if (!estado.rubros.length) return null;
  let total = 0;
  let hasSomeData = false;

  for (const r of estado.rubros) {
    let grade;
    if (r.tipo === "actividades") {
      grade = calcularPromedioActividades(matricula);
    } else {
      const raw = getRubroEstado(matricula, r.key);
      grade = raw !== "" ? parseFloat(raw) : null;
    }
    if (grade === null) continue;
    hasSomeData = true;
    total += grade * (r.pct / 100);
  }
  if (!hasSomeData) return null;

  // Add bonus
  const bonus = parseFloat(getBonus(matricula).puntos) || 0;
  const conBonus = Math.min(100, total + bonus);
  // Institutional rounding
  return Math.floor(conBonus) + (conBonus % 1 >= 0.5 ? 1 : 0);
}

// ── Base score (sin bonus) ──────────────────────────────────────────
function calcularBaseScore(matricula) {
  if (!estado.rubros.length) return null;
  let total = 0;
  let hayAlgo = false;
  for (const r of estado.rubros) {
    let grade = null;
    if (r.tipo === "actividades") {
      grade = calcularPromedioActividades(matricula);
    } else {
      const v = getRubroEstado(matricula, r.key);
      grade = v !== "" && v !== undefined ? parseFloat(v) : null;
    }
    if (grade !== null) {
      total += grade * (r.pct / 100);
      hayAlgo = true;
    }
  }
  if (!hayAlgo) return null;
  return Math.floor(total) + (total % 1 >= 0.5 ? 1 : 0);
}

// ── Recalculate a row ─────────────────────────────────────────────────
function recalcularFila(matricula) {
  const final = calcularCalFinal(matricula);
  const base = calcularBaseScore(matricula);

  const elFinal = document.getElementById(`final-${matricula}`);
  const elBase = document.getElementById(`base-${matricula}`);

  if (elFinal) {
    const color =
      final === null
        ? "var(--text-muted)"
        : final >= 70
          ? "var(--success)"
          : "var(--danger)";
    elFinal.textContent = final !== null ? final : "—";
    elFinal.style.color = color;
  }
  if (elBase) {
    const color =
      base === null
        ? "var(--text-muted)"
        : base >= 70
          ? "var(--success)"
          : "var(--danger)";
    elBase.textContent = base !== null ? base : "—";
    elBase.style.color = color;
  }
}

function onRubroInput(matricula, key, val) {
  setRubroEstado(matricula, key, val);
  recalcularFila(matricula);
}

function onBonusInput(matricula, val) {
  if (!bonusState[matricula])
    bonusState[matricula] = { puntos: "", justificacion: "" };
  bonusState[matricula].puntos = val;
  // Show/hide justification field
  const justEl = document.querySelector(
    `.bonus-just-input[data-matricula="${matricula}"]`,
  );
  if (justEl) justEl.style.display = parseFloat(val) > 0 ? "block" : "none";
  recalcularFila(matricula);
}

function onBonusJustInput(matricula, val) {
  if (!bonusState[matricula])
    bonusState[matricula] = { puntos: "", justificacion: "" };
  bonusState[matricula].justificacion = val;
}

// ── Modal: actividades de un alumno ──────────────────────────────────
function abrirModalActividades(matricula) {
  _modalMatricula = matricula;
  const alumno = estado.alumnos.find((a) => a.matricula === matricula);
  const unidad = estado.unidadesGrupo.find(
    (u) => u.id_unidad === estado.unidadId,
  );

  document.getElementById("modalActTitulo").textContent =
    `${alumno?.nombre ?? matricula} — Unidad ${unidad?.numero_unidad ?? ""}`;

  const content = document.getElementById("modalActContent");

  if (!estado.actividades.length) {
    content.innerHTML = `<div class="empty-wrap"><iconify-icon icon="mdi:clipboard-off-outline"></iconify-icon><p>No hay actividades definidas para esta unidad.</p></div>`;
    document.getElementById("modalActividades").classList.add("visible");
    return;
  }

  const sumaPond = estado.actividades.reduce(
    (s, a) => s + parseFloat(a.ponderacion),
    0,
  );
  let avg = 0;

  let rows = estado.actividades
    .map((a) => {
      const r = estado.resultados[matricula]?.[a.id_actividad];
      const val = r?.estatus === "NP" ? "" : (r?.cal ?? "");
      const numVal = parseFloat(val) || 0;
      avg += numVal * (parseFloat(a.ponderacion) / 100);
      const lock = a.bloqueado
        ? `<iconify-icon icon="mdi:lock-outline" style="font-size:.7rem;color:var(--warning,#f59e0b);margin-left:4px"></iconify-icon>`
        : "";
      return `<tr>
      <td style="font-weight:500">${a.nombre_actividad}${lock}</td>
      <td><span style="font-size:0.78rem;color:var(--text-muted)">${a.ponderacion}%</span></td>
      <td>
        <input class="grade-input modal-act-input" type="number" min="0" max="100"
          data-actividad="${a.id_actividad}" data-ponderacion="${a.ponderacion}"
          value="${val}" placeholder="${r?.estatus === "NP" ? "NP" : "—"}"
          oninput="recalcularModalAvg()" />
      </td>
    </tr>`;
    })
    .join("");

  const avgNorm =
    Math.abs(sumaPond - 100) > 0.5 && sumaPond > 0
      ? (avg / sumaPond) * 100
      : avg;
  const avgColor = avgNorm >= 70 ? "var(--success)" : "var(--danger)";

  content.innerHTML = `
    <table class="act-table">
      <thead><tr>
        <th>Actividad</th>
        <th style="width:80px">Ponderación</th>
        <th style="width:100px;text-align:center">Calificación</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="act-avg-row">
      <span style="color:var(--text-muted)">Promedio ponderado</span>
      <strong id="modalAvgVal" style="font-size:1.1rem;color:${avgColor}">
        ${avgNorm.toFixed(1)}
      </strong>
    </div>`;

  document.getElementById("modalActividades").classList.add("visible");
}

function recalcularModalAvg() {
  let avg = 0;
  let sumaPond = 0;
  document.querySelectorAll(".modal-act-input").forEach((inp) => {
    const pond = parseFloat(inp.dataset.ponderacion) || 0;
    sumaPond += pond;
    avg += (parseFloat(inp.value) || 0) * (pond / 100);
  });
  if (Math.abs(sumaPond - 100) > 0.5 && sumaPond > 0)
    avg = (avg / sumaPond) * 100;

  const el = document.getElementById("modalAvgVal");
  if (!el) return;
  el.textContent = avg.toFixed(1);
  el.style.color = avg >= 70 ? "var(--success)" : "var(--danger)";
}

function cerrarModalActividades() {
  document.getElementById("modalActividades").classList.remove("visible");
  _modalMatricula = null;
}

async function guardarDesdeModal() {
  const inputs = document.querySelectorAll(".modal-act-input");
  if (!inputs.length) {
    cerrarModalActividades();
    return;
  }

  const resultados = [];
  inputs.forEach((inp) => {
    const cal = inp.value.trim() === "" ? null : parseFloat(inp.value);
    resultados.push({
      matricula: _modalMatricula,
      calificacion_obtenida: cal,
      estatus: cal === null ? "NP" : "Validada",
    });
  });

  // Group by actividad
  let guardados = 0;
  for (const inp of inputs) {
    const idAct = parseInt(inp.dataset.actividad);
    const cal = inp.value.trim() === "" ? null : parseFloat(inp.value);
    try {
      const res = await fetch(`${BASE_URL_FORM}/api/resultado-actividad/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          id_actividad: idAct,
          resultados: [
            {
              matricula: _modalMatricula,
              calificacion_obtenida: cal,
              estatus: cal === null ? "NP" : "Validada",
            },
          ],
        }),
      });
      const d = await res.json();
      if (d.success) guardados++;
    } catch (_) {}
  }

  if (guardados > 0) {
    mostrarToast(`Calificaciones guardadas`, "success");
    await cargarResultadosExistentes();
    // Update the actividades cell in the table
    const avg = calcularPromedioActividades(_modalMatricula);
    const el = document.getElementById(`act-val-${_modalMatricula}`);
    if (el) {
      el.textContent = avg !== null ? avg.toFixed(1) : "—";
      el.style.color =
        avg === null
          ? "var(--text-muted)"
          : avg >= 70
            ? "var(--success)"
            : "var(--danger)";
    }
    recalcularFila(_modalMatricula);
  }
  cerrarModalActividades();
}

// ── Save all grades ───────────────────────────────────────────────────
async function guardarCalificaciones() {
  if (!estado.grupoId || !estado.unidadId) {
    mostrarToast("Selecciona grupo y unidad primero", "error");
    return;
  }

  let total = 0;
  // 1. Save activity grades for all alumnos
  for (const act of estado.actividades) {
    const resultados = [];
    document
      .querySelectorAll(`input[data-actividad="${act.id_actividad}"]`)
      .forEach((inp) => {
        const cal = inp.value.trim() === "" ? null : parseFloat(inp.value);
        resultados.push({
          matricula: inp.dataset.matricula,
          calificacion_obtenida: cal,
          estatus: cal === null ? "NP" : "Validada",
        });
      });
    if (!resultados.length) continue;
    const res = await fetch(`${BASE_URL_FORM}/api/resultado-actividad/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({ id_actividad: act.id_actividad, resultados }),
    });
    const d = await res.json();
    if (d.success) total += d.guardados;
    else {
      mostrarToast(`Error en "${act.nombre_actividad}": ${d.error}`, "error");
      return;
    }
  }

  // 2. Save bonus
  await guardarBonusUnidad();

  if (total > 0) mostrarToast(`${total} calificaciones guardadas`, "success");
  await cargarResultadosExistentes();
  renderTablaCalificaciones();
}

// ── Save and close unit ───────────────────────────────────────────────
async function guardarYCerrarUnidad() {
  await guardarCalificaciones();
  if (!confirm("¿Calcular y cerrar la unidad para todos los alumnos?")) return;

  let errores = 0;
  for (const al of estado.alumnos) {
    const res = await fetch(
      `${BASE_URL_FORM}/api/calificaciones/calcular-unidad`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          matricula: al.matricula,
          id_unidad: estado.unidadId,
          id_grupo: estado.grupoId,
        }),
      },
    );
    const d = await res.json();
    if (!d.success) errores++;
  }

  mostrarToast(
    errores === 0
      ? "Unidad calculada y cerrada ✓"
      : `${errores} errores al calcular`,
    errores === 0 ? "success" : "error",
  );

  if (errores === 0) {
    // Mark tab as done
    document.querySelectorAll(".unit-tab").forEach((t) => {
      if (parseInt(t.dataset.uid) === estado.unidadId) {
        t.style.background = "var(--success)";
        t.style.borderColor = "var(--success)";
        t.style.color = "#fff";
      }
    });
    intentarMostrarSeccionFinal();
  }
}

// ── Save bonus ────────────────────────────────────────────────────────
async function guardarBonusUnidad() {
  let saved = 0,
    errs = 0;
  for (const al of estado.alumnos) {
    const b = bonusState[al.matricula];
    const pts = parseFloat(b?.puntos);
    if (!pts || pts <= 0) continue;

    // Require justification
    const justEl = document.querySelector(
      `.bonus-just-input[data-matricula="${al.matricula}"]`,
    );
    const just = justEl?.value?.trim() || b?.justificacion || "";
    if (!just) {
      // Show inline justification request via modal-like approach (we use a simpler method)
      const j = prompt(`Justificación para bonus de ${al.nombre}:`);
      if (!j) continue;
      if (!bonusState[al.matricula]) bonusState[al.matricula] = {};
      bonusState[al.matricula].justificacion = j;
    }

    try {
      const res = await fetch(`${BASE_URL_FORM}/api/bonus/unidad`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          matricula: al.matricula,
          id_unidad: estado.unidadId,
          id_grupo: estado.grupoId,
          puntos_otorgados: pts,
          justificacion: bonusState[al.matricula]?.justificacion || "",
        }),
      });
      const d = await res.json();
      d.success ? saved++ : errs++;
    } catch {
      errs++;
    }
  }
  if (saved > 0)
    mostrarToast(`${saved} bonus guardado${saved > 1 ? "s" : ""}`, "success");
}

// ── CSV ───────────────────────────────────────────────────────────────
function abrirModalCSV() {
  if (!estado.unidadId) {
    mostrarToast("Selecciona una unidad primero", "info");
    return;
  }
  actualizarSelectCSVActividad();
  document.getElementById("modalCSV").classList.add("visible");
}
function cerrarModalCSV() {
  document.getElementById("modalCSV").classList.remove("visible");
  document.getElementById("csvPreview").innerHTML = "";
  const inp = document.getElementById("inputCSV");
  if (inp) inp.value = "";
  window._csvDatos = null;
}
function actualizarSelectCSVActividad() {
  const sel = document.getElementById("selCSVActividad");
  if (!sel) return;
  sel.innerHTML = `<option value="">— Selecciona actividad —</option>`;
  estado.actividades.forEach((a) => {
    sel.innerHTML += `<option value="${a.id_actividad}">${a.nombre_actividad} (${a.ponderacion}%)</option>`;
  });
}
function manejarArchivoCSV(e) {
  e.preventDefault();
  const dz = document.getElementById("csvDropZone");
  if (dz) dz.classList.remove("drag-over");
  const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
  if (file) procesarCSV(file);
}
function procesarCSV(file) {
  const idAct = parseInt(document.getElementById("selCSVActividad").value);
  if (!idAct) {
    mostrarToast("Selecciona la actividad primero", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const lineas = ev.target.result.split("\n").filter(Boolean);
    const datos = [];
    lineas.forEach((linea, i) => {
      if (i === 0 && linea.toLowerCase().includes("matricula")) return;
      const [matricula, calStr] = linea.split(",").map((s) => s.trim());
      if (!matricula) return;
      const cal = parseFloat(calStr);
      datos.push({
        matricula,
        calificacion_obtenida: isNaN(cal) ? null : cal,
        estatus: isNaN(cal) ? "NP" : "Validada",
      });
    });
    if (!datos.length) {
      mostrarToast("El CSV no tiene datos válidos", "error");
      return;
    }
    const act = estado.actividades.find((a) => a.id_actividad === idAct);
    document.getElementById("csvPreview").innerHTML = `
      <div style="margin-top:10px;background:var(--bg-app);border-radius:8px;padding:12px">
        <p style="color:var(--text-muted);margin:0 0 8px;font-size:0.82rem">
          <strong style="color:var(--text-main)">${datos.length}</strong> registros para
          <strong style="color:var(--primary)">${act?.nombre_actividad ?? ""}</strong>
        </p>
        <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="aplicarCSV(${idAct})">
          <iconify-icon icon="mdi:check-circle-outline"></iconify-icon> Confirmar importación
        </button>
      </div>`;
    window._csvDatos = datos;
  };
  reader.readAsText(file);
}
async function aplicarCSV(id_actividad) {
  if (!window._csvDatos?.length) return;
  const res = await fetch(`${BASE_URL_FORM}/api/resultado-actividad/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({ id_actividad, resultados: window._csvDatos }),
  });
  const d = await res.json();
  if (d.success) {
    mostrarToast(`${d.guardados} calificaciones importadas`, "success");
    cerrarModalCSV();
    await cargarResultadosExistentes();
    renderTablaCalificaciones();
  } else mostrarToast(d.error || "Error al importar", "error");
  window._csvDatos = null;
}

// ── Paso 4 — Final grades ─────────────────────────────────────────────
function intentarMostrarSeccionFinal() {
  const sec = document.getElementById("cardPaso4");
  if (!sec || !estado.grupoId) return;
  sec.style.display = "block";
  calcularVistaFinal();
}

async function calcularVistaFinal() {
  const wrap = document.getElementById("tablaFinalWrap");
  if (!wrap || !estado.grupoId) return;

  let reporteData = null;
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/reportes/grupo/${estado.grupoId}`,
      { headers: { Authorization: `Bearer ${token()}` } },
    );
    if (res.ok) reporteData = await res.json();
  } catch (_) {}

  if (!reporteData?.alumnos?.length) {
    wrap.innerHTML = `<div class="empty-wrap">
      <iconify-icon icon="mdi:clipboard-off-outline"></iconify-icon>
      <p>Aún no hay calificaciones de unidad calculadas.<br>
      Usa <strong>Guardar y cerrar unidad</strong> en el Paso 3.</p>
    </div>`;
    return;
  }

  const unidades = reporteData.unidades || [];
  const alumnos = reporteData.alumnos || [];

  let html = `<table class="final-table"><thead><tr>
    <th>Alumno</th><th>Matrícula</th>
    ${unidades.map((u) => `<th>${u.nombre_unidad}</th>`).join("")}
    <th>Promedio Final</th><th>Estado</th>
  </tr></thead><tbody>`;

  let cfgsOk = 0;
  alumnos.forEach((al) => {
    const califsUnidad = al.unidades || {};
    let suma = 0,
      count = 0;

    const celdas = unidades
      .map((u) => {
        const info = califsUnidad[u.id_unidad];
        const cal =
          info?.calificacion != null
            ? parseFloat(info.calificacion)
            : undefined;
        if (cal !== undefined) {
          suma += cal;
          count++;
        }
        const color =
          cal === undefined
            ? "var(--text-muted)"
            : cal >= 70
              ? "var(--success)"
              : "var(--danger)";
        return `<td style="color:${color};font-weight:500">${cal !== undefined ? cal.toFixed(1) : "—"}</td>`;
      })
      .join("");

    let redondeado =
      al.calificacion_oficial != null
        ? parseFloat(al.calificacion_oficial)
        : count > 0
          ? (() => {
              const p = suma / count;
              return p % 1 >= 0.5 ? Math.ceil(p) : Math.floor(p);
            })()
          : null;

    const aprobado = redondeado !== null && redondeado >= 70;
    const colorFinal =
      redondeado === null
        ? "var(--text-muted)"
        : aprobado
          ? "var(--success)"
          : "var(--danger)";
    if (redondeado !== null) cfgsOk++;

    html += `<tr data-matricula="${al.matricula}" data-final="${redondeado ?? ""}">
      <td>${al.nombre_completo}</td>
      <td style="font-size:0.75rem;color:var(--text-muted)">${al.matricula}</td>
      ${celdas}
      <td style="font-weight:700;font-size:.95rem;color:${colorFinal}">${redondeado !== null ? redondeado : "—"}</td>
      <td>${
        redondeado === null
          ? `<span style="font-size:0.78rem;color:var(--text-muted)">Sin datos</span>`
          : aprobado
            ? `<span class="badge badge-success">Aprobado</span>`
            : `<span class="badge badge-danger">Reprobado</span>`
      }
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  wrap.innerHTML = html;
  const badge = document.getElementById("badgeFinalGrupo");
  if (badge)
    badge.textContent = `${cfgsOk} / ${alumnos.length} con calificación`;
}

async function guardarCalificacionesFinal() {
  if (!estado.grupoId) return;
  const filas = document.querySelectorAll("#tablaFinalWrap tr[data-matricula]");
  if (!filas.length) {
    mostrarToast("No hay datos para guardar", "error");
    return;
  }

  let guardados = 0,
    errores = 0;
  for (const fila of filas) {
    const matricula = fila.dataset.matricula;
    if (!fila.dataset.final) continue;
    try {
      const res = await fetch(
        `${BASE_URL_FORM}/api/calificaciones/calcular-final`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({ matricula, id_grupo: estado.grupoId }),
        },
      );
      const d = await res.json();
      d.success ? guardados++ : errores++;
    } catch {
      errores++;
    }
  }

  if (guardados > 0)
    mostrarToast(`${guardados} calificaciones finales guardadas`, "success");
  if (errores > 0) mostrarToast(`${errores} errores al guardar`, "error");
  if (guardados > 0) calcularVistaFinal();
}

// ── Helpers ───────────────────────────────────────────────────────────
function actualizarEstadoBadge(activo) {
  const badge = document.getElementById("estadoBadge");
  if (!badge) return;
  badge.className = `status-pill ${activo ? "ok" : "warn"}`;
  badge.innerHTML = `<span class="dot-pulse"></span> ${activo ? "Configurado" : "Sin configurar"}`;
}

function mostrarToast(msg, tipo = "success") {
  let t = document.getElementById("rca-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "rca-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `rca-toast rca-toast-${tipo} visible`;
  clearTimeout(t._x);
  t._x = setTimeout(() => t.classList.remove("visible"), 3800);
}

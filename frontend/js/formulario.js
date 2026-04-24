const BASE_URL_FORM = "http://localhost:3000";
const token = () => localStorage.getItem("token");

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

function toggleStepCard(id) {
  document.getElementById(id)?.classList.toggle("open");
}

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

  await verificarConfigGrupo(id);

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

  await verificarUnidadesCerradas(id);
}

async function verificarConfigGrupo(id_grupo) {
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/config-evaluacion/grupo/${id_grupo}`,
      { headers: { Authorization: `Bearer ${token()}` } }
    );
    if (res.ok) {
      const configs = await res.json();
      if (Array.isArray(configs) && configs.length > 0) {
        actualizarEstadoBadge(true);
        // Poblar localStorage con los valores de BD para que los rubros
        // aparezcan correctamente al abrir cada unidad
        configs.forEach((c) => {
          const key = `pcts_${id_grupo}_${c.id_unidad}`;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(
              key,
              JSON.stringify({
                pct_actividades: c.pct_actividades,
                pct_examen: c.pct_examen,
                pct_asistencia: c.pct_asistencia,
              })
            );
          }
        });
      }
    }
  } catch (_) {}
}

async function verificarUnidadesCerradas(id_grupo) {
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/reportes/grupo/${id_grupo}`,
      { headers: { Authorization: `Bearer ${token()}` } }
    );
    if (!res.ok) return;
    const data = await res.json();
    const hayCalifs = data?.alumnos?.some(
      (a) => Object.keys(a.unidades || {}).length > 0
    );
    if (hayCalifs) intentarMostrarSeccionFinal();
  } catch (_) {}
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

  // ─── Filtrar solo unidades con actividades guardadas (bloqueado=1) ──────────
  // Cargar todas las actividades del grupo para saber cuáles tienen config
  let actividadesGrupo = [];
  try {
    const resA = await fetch(`${BASE_URL_FORM}/api/actividades`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    if (resA.ok) {
      const todasActs = await resA.json();
      actividadesGrupo = todasActs.filter(a => String(a.id_grupo) === String(estado.grupoId));
    }
  } catch (_) {}

  // Una unidad está "configurada" si tiene al menos 1 actividad con bloqueado=1
  function unidadConfigurada(id_unidad) {
    const acts = actividadesGrupo.filter(a => String(a.id_unidad) === String(id_unidad));
    return acts.length > 0 && acts.some(a => a.bloqueado === 1 || a.bloqueado === true);
  }

  const unidadesConf  = estado.unidadesGrupo.filter(u => unidadConfigurada(u.id_unidad));
  const unidadesSinConf = estado.unidadesGrupo.filter(u => !unidadConfigurada(u.id_unidad));

  // Render unit tabs — solo las configuradas son clickeables
  const tabsEl = document.getElementById("unitTabs");
  const tabsConf = unidadesConf.map(u =>
    `<button class="unit-tab" data-uid="${u.id_unidad}"
       onclick="seleccionarUnidadTab(${u.id_unidad})">
       Unidad ${u.numero_unidad}
     </button>`
  ).join("");

  const tabsSinConf = unidadesSinConf.map(u =>
    `<button class="unit-tab" data-uid="${u.id_unidad}" disabled
       title="Esta unidad aún no tiene actividades configuradas"
       style="opacity:.45;cursor:not-allowed">
       Unidad ${u.numero_unidad}
       <iconify-icon icon="mdi:lock-outline" style="font-size:.7rem;margin-left:3px"></iconify-icon>
     </button>`
  ).join("");

  tabsEl.innerHTML = tabsConf + tabsSinConf;

  if (!unidadesConf.length) {
    // No hay ninguna unidad configurada — mostrar aviso
    tabsEl.innerHTML = `<span style="color:var(--warning,#d97706);font-size:.85rem;padding:6px 0">
      <iconify-icon icon="lucide:alert-triangle"></iconify-icon>
      Ninguna unidad tiene actividades configuradas. Ve a <strong>Clases → Configurar actividades</strong>.
    </span>`;
  }

  // Update "número de unidades" field
  const nu = document.getElementById("numUnidades");
  if (nu) nu.value = estado.unidadesGrupo.length || "";
}

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

async function seleccionarUnidadTab(id_unidad) {
  // Highlight tab
  document.querySelectorAll(".unit-tab").forEach((t) => {
    t.classList.toggle("active", parseInt(t.dataset.uid) === id_unidad);
  });

  estado.unidadId = id_unidad;
  estado.rubros = buildRubros(estado.grupoId, id_unidad);
  estado.rubrosState = {};
  bonusState = {};

  await cargarActividades();
  await cargarResultadosExistentes();
  await cargarBonusUnidad();

  await cargarGradesDirectos();

  // Restaurar valores de examen/asistencia (BD ya los pobló en localStorage vía cargarGradesDirectos)
  estado.alumnos.forEach((al) => {
    estado.rubros
      .filter((r) => r.tipo === "directo")
      .forEach((r) => {
        const guardado = localStorage.getItem(
          `rubro_${estado.grupoId}_${id_unidad}_${al.matricula}_${r.key}`
        );
        if (guardado !== null && guardado !== "") {
          setRubroEstado(al.matricula, r.key, guardado);
        }
      });
  });

  renderRubrosBar();
  renderTablaCalificaciones();

  document.getElementById("accionesCaptura").style.display = "flex";
  actualizarEstadoBadge(true);
  actualizarSelectCSVActividad();

  await verificarEstadoUnidad();
}

async function verificarEstadoUnidad() {
  if (!estado.grupoId || !estado.unidadId) return;
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/calificaciones/estado-unidad/${estado.grupoId}/${estado.unidadId}`,
      { headers: { Authorization: `Bearer ${token()}` } }
    );
    if (!res.ok) return;
    const { cerrada } = await res.json();
    marcarUnidadCerradaUI(cerrada);
  } catch (_) {}
}

function marcarUnidadCerradaUI(cerrada) {
  const banner = document.getElementById("bannerUnidadCerrada");
  const btnCerrar = document.querySelector('.btn-success[onclick="guardarYCerrarUnidad()"]');

  if (cerrada) {
    if (banner) banner.style.display = "flex";
    if (btnCerrar) {
      btnCerrar.textContent = "Unidad Cerrada";
      btnCerrar.style.background = "var(--danger, #ef4444)";
      btnCerrar.style.borderColor = "var(--danger, #ef4444)";
      btnCerrar.disabled = true;
    }
  } else {
    if (banner) banner.style.display = "none";
    if (btnCerrar) {
      btnCerrar.innerHTML = '<iconify-icon icon="mdi:check-decagram-outline"></iconify-icon> Guardar y cerrar unidad';
      btnCerrar.style.background = "";
      btnCerrar.style.borderColor = "";
      btnCerrar.disabled = false;
    }
  }
}

function hayAlumnosSinDatos() {
  const vacios = [];
  estado.alumnos.forEach((al) => {
    const rubrosDirectosFaltantes = estado.rubros
      .filter((r) => r.tipo === "directo")
      .some((r) => {
        const v = getRubroEstado(al.matricula, r.key);
        return v === "" || v === undefined || v === null;
      });
    const actFaltantes =
      estado.rubros.some((r) => r.tipo === "actividades") &&
      calcularPromedioActividades(al.matricula) === null;
    if (rubrosDirectosFaltantes || actFaltantes) vacios.push(al.nombre);
  });
  return vacios;
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

async function cargarActividades() {
  const res = await fetch(`${BASE_URL_FORM}/api/actividades`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const todas = await res.json();
  estado.actividades = todas.filter(
    (a) =>
      parseInt(a.id_grupo) === parseInt(estado.grupoId) &&
      parseInt(a.id_unidad) === parseInt(estado.unidadId),
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

  thead += `<th style="min-width:82px;background:rgba(100,116,139,.06)">
    Base<small>sin bonus</small>
  </th>
  <th style="min-width:76px;background:rgba(245,158,11,.07)">
    Bonus<small>pts extra</small>
  </th>
  <th style="min-width:90px;background:rgba(30,64,175,.06)">
    Cal. Final<small>con bonus</small>
  </th></tr>`;

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
            oninput="onCalInput(this);onRubroInput('${al.matricula}','${r.key}',this.value)" />
        </td>`;
      }
    });

    // Base (sin bonus) — req. Etapa 2 §3.2: mostrar diferencia antes/después del bonus
    const base = calcularBaseScore(al.matricula);
    const baseColor =
      base === null
        ? "var(--text-muted)"
        : base >= 70
          ? "var(--success)"
          : "var(--danger)";
    tbody += `<td style="text-align:center">
      <span id="base-${al.matricula}" style="color:${baseColor};font-weight:600">
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

function clampCal(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return Math.min(100, Math.max(0, n));
}

// Llama desde oninput en cada input de calificación
function onCalInput(inp) {
  const val = parseFloat(inp.value);
  if (!isNaN(val)) {
    if (val > 100) inp.value = 100;
    if (val < 0) inp.value = 0;
  }
}

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
    const cal = r?.estatus === "NP" ? 0 : (clampCal(r?.cal) ?? 0);
    suma += cal * (parseFloat(a.ponderacion) / 100);
  });
  // Normalize if ponderaciones don't sum to 100
  const normalized =
    Math.abs(sumaPond - 100) > 0.5 ? (suma / sumaPond) * 100 : suma;
  return Math.round(normalized * 10) / 10;
}

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

function calcularBaseScore(matricula) {
  if (!estado.rubros.length) return null;
  let total = 0;
  let haySomething = false;
  for (const r of estado.rubros) {
    let grade =
      r.tipo === "actividades"
        ? calcularPromedioActividades(matricula)
        : (() => {
            const v = getRubroEstado(matricula, r.key);
            return v !== "" ? parseFloat(v) : null;
          })();
    if (grade === null) continue;
    haySomething = true;
    total += grade * (r.pct / 100);
  }
  if (!haySomething) return null;
  return Math.floor(total) + (total % 1 >= 0.5 ? 1 : 0);
}

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
  if (estado.grupoId && estado.unidadId) {
    localStorage.setItem(
      `rubro_${estado.grupoId}_${estado.unidadId}_${matricula}_${key}`,
      val
    );
  }
  recalcularFila(matricula);
}

function onBonusInput(matricula, val) {
  if (!bonusState[matricula])
    bonusState[matricula] = { puntos: "", justificacion: "" };
  bonusState[matricula].puntos = val;
  recalcularFila(matricula);
}

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
          data-matricula="${matricula}"
          value="${val}" placeholder="${r?.estatus === "NP" ? "NP" : "—"}"
          oninput="onCalInput(this);recalcularModalAvg()" />
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
    avg +=
      (Math.min(100, Math.max(0, parseFloat(inp.value) || 0)) || 0) *
      (pond / 100);
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
    const cal = inp.value.trim() === "" ? null : clampCal(inp.value);
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
    const cal = inp.value.trim() === "" ? null : clampCal(inp.value);
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

async function guardarGradesDirectos() {
  if (!estado.grupoId || !estado.unidadId) return;
  const grades = {};
  let hayGrades = false;
  estado.alumnos.forEach((al) => {
    const entry = {};
    estado.rubros
      .filter((r) => r.tipo === "directo")
      .forEach((r) => {
        const val = getRubroEstado(al.matricula, r.key);
        if (val !== "" && val !== undefined && val !== null) {
          if (r.key === "pct_examen")     entry.cal_examen     = parseFloat(val);
          if (r.key === "pct_asistencia") entry.cal_asistencia = parseFloat(val);
        }
      });
    if (Object.keys(entry).length) {
      grades[al.matricula] = entry;
      hayGrades = true;
    }
  });

  if (!hayGrades) return;

  try {
    await fetch(`${BASE_URL_FORM}/api/calificaciones/guardar-directos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ id_grupo: estado.grupoId, id_unidad: estado.unidadId, grades }),
    });
  } catch (_) {
    // No bloquear el flujo si falla — los valores están en localStorage como respaldo
  }
}

async function cargarGradesDirectos() {
  if (!estado.grupoId || !estado.unidadId) return;
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/calificaciones/directos/${estado.grupoId}/${estado.unidadId}`,
      { headers: { Authorization: `Bearer ${token()}` } }
    );
    if (!res.ok) return;
    const grades = await res.json();
    // Poblar estado y localStorage
    Object.entries(grades).forEach(([mat, vals]) => {
      if (vals.cal_examen !== undefined) {
        setRubroEstado(mat, "pct_examen", vals.cal_examen);
        localStorage.setItem(
          `rubro_${estado.grupoId}_${estado.unidadId}_${mat}_pct_examen`,
          vals.cal_examen
        );
      }
      if (vals.cal_asistencia !== undefined) {
        setRubroEstado(mat, "pct_asistencia", vals.cal_asistencia);
        localStorage.setItem(
          `rubro_${estado.grupoId}_${estado.unidadId}_${mat}_pct_asistencia`,
          vals.cal_asistencia
        );
      }
    });
  } catch (_) {}
}

async function guardarCalificaciones() {
  if (!estado.grupoId || !estado.unidadId) {
    mostrarToast("Selecciona grupo y unidad primero", "error");
    return;
  }

  const vacios = hayAlumnosSinDatos();
  if (vacios.length > 0) {
    const nombres = vacios.slice(0, 3).join(", ") + (vacios.length > 3 ? ` y ${vacios.length - 3} más` : "");
    const continuar = confirm(
      `⚠️ Los siguientes alumnos tienen campos sin calificar: ${nombres}.

` +
      `Los campos vacíos se guardarán como "sin dato" y usarán el valor 0 al calcular la unidad.

` +
      `¿Deseas continuar de todas formas?`
    );
    if (!continuar) return;
  }

  let total = 0;
  // 1. Save activity grades for all alumnos
  for (const act of estado.actividades) {
    const resultados = [];
    document
      .querySelectorAll(`input[data-actividad="${act.id_actividad}"]`)
      .forEach((inp) => {
        const rawVal = inp.value.trim();
        const cal = rawVal === "" ? null : clampCal(rawVal);
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

  await guardarGradesDirectos();

  if (total > 0) mostrarToast(`${total} calificaciones guardadas`, "success");
  await cargarResultadosExistentes();
  renderTablaCalificaciones();
}

async function guardarYCerrarUnidad() {
  const vacios = hayAlumnosSinDatos();
  if (vacios.length > 0) {
    const nombres = vacios.slice(0, 3).join(", ") + (vacios.length > 3 ? ` y ${vacios.length - 3} más` : "");
    const continuar = confirm(
      `⚠️ ATENCIÓN: Los siguientes alumnos tienen campos sin calificar: ${nombres}.

` +
      `Al cerrar la unidad, los campos vacíos se calcularán con valor 0 y NO podrán modificarse fácilmente.

` +
      `¿Deseas cerrar la unidad de todas formas?`
    );
    if (!continuar) return;
  }

  await guardarCalificaciones();
  if (!confirm("¿Confirmar cierre de la unidad para todos los alumnos? Esta acción calculará el promedio final de la unidad.")) return;

  let errores = 0;
  for (const al of estado.alumnos) {
    // Leer los rubros directos (examen, asistencia y custom) del estado en memoria
    const rubrosDirectos = {};
    estado.rubros
      .filter((r) => r.tipo === "directo")
      .forEach((r) => {
        const val = getRubroEstado(al.matricula, r.key);
        if (val !== "" && val !== undefined) {
          if (r.key === "pct_examen")     rubrosDirectos.cal_examen     = parseFloat(val);
          if (r.key === "pct_asistencia") rubrosDirectos.cal_asistencia  = parseFloat(val);
        }
      });

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
          ...rubrosDirectos,
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
    document.querySelectorAll(".unit-tab").forEach((t) => {
      if (parseInt(t.dataset.uid) === estado.unidadId) {
        t.style.background = "var(--success)";
        t.style.borderColor = "var(--success)";
        t.style.color = "#fff";
        t.dataset.cerrada = "1"; // marcar el data attribute
      }
    });

    marcarUnidadCerradaUI(true);

    intentarMostrarSeccionFinal();
  }
}

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
  // que ahora sí se guarda en BD (fix en calculo.js)
  await calcularVistaFinal();
  // Renderizar tablas de bonus final y modificación final
  await renderBonusFinalTabla();
  await renderModificacionFinalTabla();
}

// ══════════════════════════════════════════════════════════════════════
// BONUS FINAL — UI
// ══════════════════════════════════════════════════════════════════════

// Cache de calificaciones finales para los modales
let _cfCache = {}; // matricula → { nombre_alumno, calificacion_oficial }

async function renderBonusFinalTabla() {
  const wrap = document.getElementById("tablaBonusFinalWrap");
  if (!wrap || !estado.grupoId) return;

  // Cargar calificaciones finales y bonuses existentes en paralelo
  const [resCF, resBF] = await Promise.all([
    fetch(`${BASE_URL_FORM}/api/calificaciones/grupo/${estado.grupoId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    }),
    fetch(`${BASE_URL_FORM}/api/bonus/final/grupo/${estado.grupoId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    }),
  ]);

  const calFinales = resCF.ok ? await resCF.json() : [];
  const bonuses    = resBF.ok ? await resBF.json() : [];

  // Agrupar: una fila por alumno (la calificación final viene de calificacion_final, no de calificacion_unidad)
  // Reusamos el endpoint /calificaciones/grupo que devuelve calificacion_unidad; necesitamos el final
  // Hacemos fetch de /calificaciones/final por alumno — más simple: usamos tablaFinalWrap filas
  const filasFinal = [...document.querySelectorAll("#tablaFinalWrap tr[data-matricula]")];

  if (!filasFinal.length) {
    wrap.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">Guarda las calificaciones finales primero.</p>`;
    return;
  }

  // Mapa de bonuses existentes por matricula
  const bonusMap = {};
  bonuses.forEach(b => { bonusMap[b.matricula] = b; });

  // Construir cache de calificaciones
  filasFinal.forEach(f => {
    _cfCache[f.dataset.matricula] = {
      nombre_alumno: f.querySelector("td:first-child")?.textContent || f.dataset.matricula,
      calificacion_oficial: parseFloat(f.dataset.final ?? 0),
    };
  });

  let html = `
    <table class="final-table" style="width:100%;">
      <thead><tr>
        <th>Alumno</th>
        <th style="text-align:center;">Cal. Final</th>
        <th style="text-align:center;">Bonus</th>
        <th style="text-align:center;">Acción</th>
      </tr></thead><tbody>`;

  filasFinal.forEach(f => {
    const mat  = f.dataset.matricula;
    const cal  = parseFloat(f.dataset.final ?? 0);
    const nom  = f.querySelector("td:first-child")?.textContent || mat;
    const bon  = bonusMap[mat];
    html += `<tr>
      <td>${nom}</td>
      <td style="text-align:center; font-weight:700;">${cal.toFixed(2)}</td>
      <td style="text-align:center;">
        ${bon ? `<span style="color:#7c3aed; font-weight:600;">+${parseFloat(bon.puntos_otorgados).toFixed(2)} pts</span>` : `<span style="color:var(--text-muted); font-size:0.8rem;">—</span>`}
      </td>
      <td style="text-align:center;">
        <button class="btn btn-sm" style="background:#7c3aed; color:#fff; padding:4px 10px; font-size:0.78rem;"
                onclick="abrirModalBonusFinal('${mat}', '${nom.replace(/'/g,"\\'")}', ${cal})">
          <iconify-icon icon="mdi:star-plus-outline"></iconify-icon>
          ${bon ? "Editar" : "Asignar"}
        </button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

function abrirModalBonusFinal(matricula, nombre, calActual) {
  const maxBonus = Math.max(0, parseFloat((100 - calActual).toFixed(2)));
  document.getElementById("bonusFinalMatricula").value  = matricula;
  document.getElementById("bonusFinalNombreAlumno").textContent = nombre;
  document.getElementById("bonusFinalCalActual").textContent    = `${calActual.toFixed(2)} / 100`;
  document.getElementById("bonusFinalPuntos").value       = "";
  document.getElementById("bonusFinalPuntos").max         = maxBonus;
  document.getElementById("bonusFinalPuntos").placeholder = `Máx: ${maxBonus} pts`;
  document.getElementById("bonusFinalJustificacion").value = "";
  document.getElementById("modalBonusFinal").style.display = "flex";
}

function cerrarModalBonusFinal() {
  document.getElementById("modalBonusFinal").style.display = "none";
}

async function guardarBonusFinal() {
  const matricula     = document.getElementById("bonusFinalMatricula").value;
  const inputPuntos   = document.getElementById("bonusFinalPuntos");
  const puntos        = parseFloat(inputPuntos.value);
  const maxBonus      = parseFloat(inputPuntos.max) || 100;
  const justificacion = document.getElementById("bonusFinalJustificacion").value.trim();

  if (!puntos || puntos <= 0) return mostrarToast("Ingresa puntos válidos", "error");
  if (puntos > maxBonus)      return mostrarToast(`El máximo de puntos disponible es ${maxBonus}`, "error");
  if (!justificacion)         return mostrarToast("La justificación es obligatoria", "error");

  try {
    const res = await fetch(`${BASE_URL_FORM}/api/bonus/final`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ matricula, id_grupo: estado.grupoId, puntos_otorgados: puntos, justificacion }),
    });
    const d = await res.json();
    if (!res.ok) return mostrarToast(d.error || "Error al asignar bonus", "error");

    mostrarToast(`Bonus final asignado: +${d.puntos_aplicados} pts${d.advertencia ? " (ajustado al máximo)" : ""}`, "success");
    cerrarModalBonusFinal();
    await renderBonusFinalTabla();
    await calcularVistaFinal();
  } catch {
    mostrarToast("Error de conexión", "error");
  }
}

// ══════════════════════════════════════════════════════════════════════
// MODIFICACIÓN FINAL — UI
// ══════════════════════════════════════════════════════════════════════

async function renderModificacionFinalTabla() {
  const wrap = document.getElementById("tablaModificacionFinalWrap");
  if (!wrap || !estado.grupoId) return;

  const filasFinal = [...document.querySelectorAll("#tablaFinalWrap tr[data-matricula]")];
  if (!filasFinal.length) {
    wrap.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">Guarda las calificaciones finales primero.</p>`;
    return;
  }

  // Cargar modificaciones existentes del grupo
  const resModif = await fetch(
    `${BASE_URL_FORM}/api/modificacion-final/grupo/${estado.grupoId}`,
    { headers: { Authorization: `Bearer ${token()}` } }
  ).catch(() => null);
  const modifs = (resModif && resModif.ok) ? await resModif.json() : [];
  const modifMap = {};
  modifs.forEach(m => { modifMap[m.matricula] = m; });

  let html = `
    <table class="final-table" style="width:100%;">
      <thead><tr>
        <th>Alumno</th>
        <th style="text-align:center;">Cal. Actual</th>
        <th style="text-align:center;">Modificada</th>
        <th style="text-align:center;">Acción</th>
      </tr></thead><tbody>`;

  filasFinal.forEach(f => {
    const mat  = f.dataset.matricula;
    const cal  = parseFloat(f.dataset.final ?? 0);
    const nom  = f.querySelector("td:first-child")?.textContent || mat;
    const mod  = modifMap[mat];
    html += `<tr>
      <td>${nom}</td>
      <td style="text-align:center; font-weight:700;">${cal.toFixed(2)}</td>
      <td style="text-align:center;">
        ${mod ? `<span style="color:#dc2626; font-weight:600;">${parseFloat(mod.calif_modificada).toFixed(2)}</span>` : `<span style="color:var(--text-muted); font-size:0.8rem;">—</span>`}
      </td>
      <td style="text-align:center;">
        <button class="btn btn-sm" style="background:#dc2626; color:#fff; padding:4px 10px; font-size:0.78rem;"
                onclick="abrirModalModificacionFinal('${mat}', '${nom.replace(/'/g,"\\'")}', ${cal})">
          <iconify-icon icon="mdi:pencil-outline"></iconify-icon>
          ${mod ? "Editar" : "Modificar"}
        </button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

function abrirModalModificacionFinal(matricula, nombre, calActual) {
  document.getElementById("modifFinalMatricula").value      = matricula;
  document.getElementById("modifFinalNombreAlumno").textContent = nombre;
  document.getElementById("modifFinalCalActual").textContent    = `${calActual.toFixed(2)} / 100`;
  document.getElementById("modifFinalNuevaCal").value       = "";
  document.getElementById("modifFinalJustificacion").value  = "";
  document.getElementById("modalModificacionFinal").style.display = "flex";
}

function cerrarModalModificacionFinal() {
  document.getElementById("modalModificacionFinal").style.display = "none";
}

async function guardarModificacionFinal() {
  const matricula      = document.getElementById("modifFinalMatricula").value;
  const nuevaCal       = parseFloat(document.getElementById("modifFinalNuevaCal").value);
  const justificacion  = document.getElementById("modifFinalJustificacion").value.trim();

  if (isNaN(nuevaCal) || nuevaCal < 0 || nuevaCal > 100)
    return mostrarToast("Calificación debe estar entre 0 y 100", "error");
  if (!justificacion)
    return mostrarToast("La justificación es obligatoria", "error");

  try {
    const res = await fetch(`${BASE_URL_FORM}/api/modificacion-final`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ matricula, id_grupo: estado.grupoId, calif_modificada: nuevaCal, justificacion }),
    });
    const d = await res.json();
    if (!res.ok) return mostrarToast(d.error || "Error al modificar", "error");

    mostrarToast(`Modificación aplicada: ${d.calif_original} → ${d.calif_modificada}`, "success");
    cerrarModalModificacionFinal();
    await renderModificacionFinalTabla();
    await calcularVistaFinal();
  } catch {
    mostrarToast("Error de conexión", "error");
  }
}

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

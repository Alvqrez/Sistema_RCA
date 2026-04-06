// =====================================================================
//  formulario.js — Formulario de Evaluación con bloqueo + gear modal
// =====================================================================

const BASE_URL_FORM = "http://localhost:3000";

const RUBROS = ["actividad", "examen", "asistencia", "participacion"];
const LABELS = {
  actividad: "Actividades",
  examen: "Examen",
  asistencia: "Asistencia",
  participacion: "Participación",
};
const COLORES = {
  actividad: "#3b82f6",
  examen: "#f59e0b",
  asistencia: "#10b981",
  participacion: "#8b5cf6",
};

// ── ESTADO GLOBAL ─────────────────────────────────────────────────────
let estado = {
  grupoId: null,
  nombreGrupo: "",
  numUnidades: 3,
  configurado: false,
  modoEdicion: false,
  cambiosPendientes: false,
  unidadActiva: 0,
  ponderaciones: [], // ponderaciones[u] = { actividad, examen, asistencia, participacion }
  alumnos: [], // [{ matricula, nombre }]
  calificaciones: [], // calificaciones[u][matricula] = { actividad, examen, asistencia, participacion, bonus }
  unidadesGuardadas: new Set(), // índices de unidades ya guardadas (bloqueadas)
};

// ═══════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", cargarGruposSelect);

async function cargarGruposSelect() {
  const token = localStorage.getItem("token");
  const sel = document.getElementById("selGrupo");
  try {
    const res = await fetch(`${BASE_URL_FORM}/api/grupos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const grupos = await res.json();
    grupos.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id_grupo;
      opt.textContent = `${g.nombre_materia} — ${g.nombre_maestro}`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("No se pudo cargar grupos:", e);
  }
}

// ── Selección de grupo ────────────────────────────────────────────────
function cargarGrupo() {
  const sel = document.getElementById("selGrupo");
  const id = sel.value;

  if (!id) {
    document.getElementById("emptyConfig").style.display = "block";
    document.getElementById("seccionPonderaciones").style.display = "none";
    document.getElementById("seccionCalificaciones").style.display = "none";
    document.getElementById("badgeGrupo").textContent =
      "Sin grupo seleccionado";
    document.getElementById("btnGear").style.display = "none";
    actualizarEstadoBadge("sin-config", "Sin configurar");
    return;
  }

  estado.grupoId = parseInt(id);
  estado.nombreGrupo = sel.options[sel.selectedIndex].text;
  estado.unidadesGuardadas = new Set();

  document.getElementById("badgeGrupo").textContent = estado.nombreGrupo;
  document.getElementById("emptyConfig").style.display = "none";
  document.getElementById("seccionPonderaciones").style.display = "block";
  document.getElementById("btnGear").style.display = "inline-flex";

  cargarAlumnos();
  generarPonderaciones();
}

// ── Cargar alumnos del grupo ──────────────────────────────────────────
async function cargarAlumnos() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${BASE_URL_FORM}/api/alumnos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const todos = await res.json();
    estado.alumnos = todos.map((a) => ({
      matricula: a.matricula,
      nombre:
        `${a.apellido_paterno} ${a.apellido_materno ?? ""}, ${a.nombre}`.trim(),
    }));
  } catch (e) {
    console.error("No se pudo cargar alumnos:", e);
    estado.alumnos = [];
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  PONDERACIONES
// ═══════════════════════════════════════════════════════════════════════
function generarPonderaciones() {
  const n = parseInt(document.getElementById("numUnidades").value) || 3;
  estado.numUnidades = n;

  if (!estado.configurado) {
    estado.ponderaciones = Array.from({ length: n }, () => ({
      actividad: 25,
      examen: 50,
      asistencia: 15,
      participacion: 10,
    }));
  }

  renderTabsConfig(n);
  renderPanelesConfig(n);
  activarTabConfig(0);
}

function renderTabsConfig(n) {
  const cont = document.getElementById("tabsConfig");
  cont.innerHTML = "";
  for (let u = 0; u < n; u++) {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = `Unidad ${u + 1}`;
    btn.id = `tabCfg_${u}`;
    btn.onclick = () => activarTabConfig(u);
    cont.appendChild(btn);
  }
}

function renderPanelesConfig(n) {
  const cont = document.getElementById("panelesConfig");
  cont.innerHTML = "";

  for (let u = 0; u < n; u++) {
    const pond = estado.ponderaciones[u] || {
      actividad: 25,
      examen: 50,
      asistencia: 15,
      participacion: 10,
    };
    const panel = document.createElement("div");
    panel.className = "ponderacion-panel";
    panel.id = `panelCfg_${u}`;

    panel.innerHTML = `
      <div class="ponderacion-grid">
        ${RUBROS.map(
          (r) => `
          <div class="pond-item">
            <div class="pond-item-label">
              <span class="pond-dot" style="background:${COLORES[r]}"></span>
              ${LABELS[r]}
            </div>
            <div style="display:flex;align-items:baseline;gap:4px">
              <input type="number" class="pond-input" min="0" max="100"
                     value="${pond[r]}" data-unidad="${u}" data-rubro="${r}"
                     oninput="actualizarSuma(${u})" />
              <span class="pond-suffix">%</span>
            </div>
          </div>
        `,
        ).join("")}
      </div>
      <div class="suma-bar warn" id="sumaBar_${u}">
        <iconify-icon icon="mdi:sigma"></iconify-icon>
        <span>Total: <strong id="sumaVal_${u}">100</strong>%</span>
        <span id="sumaMensaje_${u}" style="margin-left:auto;font-size:0.82rem"></span>
      </div>
    `;
    cont.appendChild(panel);
    actualizarSuma(u);
  }
}

function activarTabConfig(idx) {
  estado.unidadActiva = idx;
  document
    .querySelectorAll(".tab-btn")
    .forEach((b, i) => b.classList.toggle("active", i === idx));
  document
    .querySelectorAll(".ponderacion-panel")
    .forEach((p, i) => p.classList.toggle("active", i === idx));
}

function actualizarSuma(u) {
  let suma = 0;
  document
    .querySelectorAll(`.pond-input[data-unidad="${u}"]`)
    .forEach((inp) => {
      const val = parseFloat(inp.value) || 0;
      estado.ponderaciones[u][inp.dataset.rubro] = val;
      suma += val;
    });

  const bar = document.getElementById(`sumaBar_${u}`);
  const val = document.getElementById(`sumaVal_${u}`);
  const msg = document.getElementById(`sumaMensaje_${u}`);
  val.textContent = suma.toFixed(1);

  if (Math.abs(suma - 100) < 0.01) {
    bar.className = "suma-bar ok";
    bar.querySelector("iconify-icon").setAttribute("icon", "mdi:check-circle");
    msg.textContent = "✓ Correcto";
  } else if (suma < 100) {
    bar.className = "suma-bar warn";
    bar.querySelector("iconify-icon").setAttribute("icon", "mdi:alert");
    msg.textContent = `Faltan ${(100 - suma).toFixed(1)}%`;
  } else {
    bar.className = "suma-bar error";
    bar.querySelector("iconify-icon").setAttribute("icon", "mdi:close-circle");
    msg.textContent = `Excede ${(suma - 100).toFixed(1)}%`;
  }
  estado.cambiosPendientes = true;
}

function validarTodasPonderaciones() {
  for (let u = 0; u < estado.numUnidades; u++) {
    const suma = RUBROS.reduce(
      (s, r) => s + (estado.ponderaciones[u][r] || 0),
      0,
    );
    if (Math.abs(suma - 100) > 0.01) return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════
//  TABLA DE CALIFICACIONES
// ═══════════════════════════════════════════════════════════════════════
function inicializarCalificaciones() {
  estado.calificaciones = [];
  for (let u = 0; u < estado.numUnidades; u++) {
    const mapa = {};
    estado.alumnos.forEach((a) => {
      mapa[a.matricula] = {
        actividad: "",
        examen: "",
        asistencia: "",
        participacion: "",
        bonus: "",
      };
    });
    estado.calificaciones.push(mapa);
  }
}

function renderTabsTabla() {
  const cont = document.getElementById("tabsTabla");
  cont.innerHTML = "";
  for (let u = 0; u < estado.numUnidades; u++) {
    const btn = document.createElement("button");
    const locked = estado.unidadesGuardadas.has(u);
    btn.className = `tab-unidad ${locked ? "locked" : ""}`;
    btn.id = `tabTabla_${u}`;
    btn.onclick = () => cambiarUnidadTabla(u);
    btn.innerHTML = `
      ${locked ? '<iconify-icon icon="mdi:lock" style="font-size:0.85rem"></iconify-icon>' : ""}
      Unidad ${u + 1}
      ${locked ? '<iconify-icon icon="mdi:check-circle" style="color:#10b981;font-size:0.85rem"></iconify-icon>' : ""}
    `;
    cont.appendChild(btn);
  }
}

function cambiarUnidadTabla(u) {
  guardarDatosTablaActual();
  estado.unidadActiva = u;
  document
    .querySelectorAll(".tab-unidad")
    .forEach((b, i) => b.classList.toggle("active", i === u));
  renderTabla(u);
  actualizarResumenPond(u);
  actualizarBannerBloqueo(u);
}

function actualizarBannerBloqueo(u) {
  const banner = document.getElementById("bannerBloqueado");
  const btnGuardar = document.getElementById("btnGuardarCal");
  const locked = estado.unidadesGuardadas.has(u);
  banner.style.display = locked ? "flex" : "none";
  btnGuardar.style.display = locked ? "none" : "inline-flex";
}

function guardarDatosTablaActual() {
  const u = estado.unidadActiva;
  const tbody = document.getElementById("tbodyCalificaciones");
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach((tr) => {
    const mat = tr.dataset.matricula;
    if (!mat) return;
    RUBROS.forEach((r) => {
      const inp = tr.querySelector(`.cal-input[data-rubro="${r}"]`);
      if (inp) estado.calificaciones[u][mat][r] = inp.value;
    });
    const bonusInp = tr.querySelector(".bonus-input");
    if (bonusInp) estado.calificaciones[u][mat].bonus = bonusInp.value;
  });
}

function renderTabla(u) {
  const pond = estado.ponderaciones[u];
  const locked = estado.unidadesGuardadas.has(u);
  const thead = document.getElementById("theadCalificaciones");
  const tbody = document.getElementById("tbodyCalificaciones");

  thead.innerHTML = `
    <tr>
      <th class="col-alumno">Alumno / Matrícula</th>
      ${RUBROS.map(
        (r) => `
        <th class="col-${r}">
          ${LABELS[r]}
          <span class="th-pond">${pond[r]}%</span>
        </th>
      `,
      ).join("")}
      <th class="col-bonus">Bonus<span class="th-pond">pts extra</span></th>
      <th class="col-final">Cal. Final<span class="th-pond">calculada</span></th>
      ${locked ? "<th>Estado</th>" : ""}
    </tr>
  `;

  tbody.innerHTML = "";
  estado.alumnos.forEach((a) => {
    const cal = estado.calificaciones[u]?.[a.matricula] || {
      actividad: "",
      examen: "",
      asistencia: "",
      participacion: "",
      bonus: "",
    };
    const tr = document.createElement("tr");
    tr.dataset.matricula = a.matricula;

    tr.innerHTML = `
      <td class="td-alumno">
        <div style="font-weight:600">${a.nombre}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${a.matricula}</div>
      </td>
      ${RUBROS.map(
        (r) => `
        <td>
          <input class="cal-input ${locked ? "cal-locked" : ""}" type="number"
                 min="0" max="100" placeholder="—"
                 data-rubro="${r}" value="${cal[r]}"
                 ${locked ? "disabled" : 'oninput="calcularFila(this)"'}
                 ${r === "actividad" && !locked ? 'title="También puedes registrar esto desde Actividades"' : ""} />
        </td>
      `,
      ).join("")}
      <td>
        <input class="bonus-input ${locked ? "cal-locked" : ""}" type="number"
               min="0" max="30" placeholder="0"
               value="${cal.bonus}"
               ${locked ? "disabled" : 'oninput="calcularFila(this)"'} />
      </td>
      <td>
        <div class="cal-final pendiente" id="final_${a.matricula}_${u}">—</div>
      </td>
      ${locked ? `<td><span class="badge-estatus badge-guardado"><iconify-icon icon="mdi:lock"></iconify-icon> Guardado</span></td>` : ""}
    `;
    tbody.appendChild(tr);

    if (RUBROS.some((r) => cal[r] !== ""))
      calcularFilaPorMatricula(a.matricula, u);
  });
}

// ── Cálculo en tiempo real ────────────────────────────────────────────
function calcularFila(inputEl) {
  const mat = inputEl.closest("tr").dataset.matricula;
  estado.cambiosPendientes = true;
  if (inputEl.classList.contains("cal-input")) {
    const v = parseFloat(inputEl.value);
    inputEl.classList.toggle("invalid", !isNaN(v) && (v < 0 || v > 100));
  }
  calcularFilaPorMatricula(mat, estado.unidadActiva);
}

function calcularFilaPorMatricula(mat, u) {
  const tr = document.querySelector(`tr[data-matricula="${mat}"]`);
  if (!tr) return;
  const pond = estado.ponderaciones[u];
  let allEmpty = true;
  let calFinal = 0;

  RUBROS.forEach((r) => {
    const inp = tr.querySelector(`.cal-input[data-rubro="${r}"]`);
    const v = parseFloat(inp?.value) || 0;
    if (inp?.value !== "") allEmpty = false;
    calFinal += v * (pond[r] / 100);
  });

  const bonusInp = tr.querySelector(".bonus-input");
  const bonus = parseFloat(bonusInp?.value) || 0;
  if (bonusInp?.value !== "") allEmpty = false;
  calFinal = Math.min(100, Math.round((calFinal + bonus) * 100) / 100);

  const celda = document.getElementById(`final_${mat}_${u}`);
  if (!celda) return;

  if (allEmpty) {
    celda.className = "cal-final pendiente";
    celda.textContent = "—";
  } else {
    celda.className = `cal-final ${calFinal >= 60 ? "aprobado" : "reprobado"}`;
    celda.textContent = calFinal.toFixed(1);
  }
}

// ── Auto-cargar calificaciones de actividades desde la API ────────────
async function autoCargarActividades(u) {
  if (!estado.grupoId) return;
  const token = localStorage.getItem("token");

  for (const a of estado.alumnos) {
    try {
      const res = await fetch(
        `${BASE_URL_FORM}/api/resultado-actividad/promedio/${a.matricula}/${estado.grupoId}/${u + 1}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.promedio !== undefined && data.promedio !== null) {
        estado.calificaciones[u][a.matricula].actividad =
          data.promedio.toFixed(1);
      }
    } catch (_) {}
  }
  renderTabla(u);
}

function actualizarResumenPond(u) {
  const pond = estado.ponderaciones[u];
  const cont = document.getElementById("resumenPond");
  cont.innerHTML = `
    <span class="info-chip">
      <iconify-icon icon="mdi:school-outline"></iconify-icon>Unidad ${u + 1}
    </span>
    ${RUBROS.map(
      (r) =>
        `<span class="pond-chip chip-${r.substring(0, 3)}">${LABELS[r]} ${pond[r]}%</span>`,
    ).join("")}
    <span class="pond-chip chip-bon">
      <iconify-icon icon="mdi:star-outline"></iconify-icon>Bonus +pts
    </span>
    <button class="btn btn-sm btn-outline" style="margin-left:auto;font-size:0.75rem" onclick="autoCargarActividades(${u})" title="Recalcular actividades desde calificaciones registradas">
      <iconify-icon icon="mdi:sync"></iconify-icon> Actualizar actividades
    </button>
  `;
}

// ═══════════════════════════════════════════════════════════════════════
//  MODALES PRINCIPALES
// ═══════════════════════════════════════════════════════════════════════
function pedirGuardarConfig() {
  if (!validarTodasPonderaciones()) {
    mostrarToast(
      "Todas las unidades deben sumar 100% antes de guardar.",
      "error",
    );
    return;
  }
  abrirModal(
    estado.configurado ? "modalModificarConfig" : "modalGuardarConfig",
  );
}

function confirmarGuardarConfig() {
  cerrarModal("modalGuardarConfig");
  guardarConfiguracion();
}

function activarModoEdicionConfig() {
  cerrarModal("modalModificarConfig");
  document.getElementById("cardConfig").style.display = "block";
  document.getElementById("seccionPonderaciones").style.display = "block";
  estado.modoEdicion = true;
}

function pedirGuardarCalificaciones() {
  guardarDatosTablaActual();
  const u = estado.unidadActiva;
  document.getElementById("nombreUnidadGuardar").textContent =
    `Unidad ${u + 1}`;
  abrirModal("modalGuardarCal");
}

function confirmarGuardarCalificaciones() {
  cerrarModal("modalGuardarCal");
  const u = estado.unidadActiva;

  // Marcar unidad como guardada
  estado.unidadesGuardadas.add(u);
  estado.cambiosPendientes = false;

  mostrarToast(`Unidad ${u + 1} guardada y bloqueada ✓`, "success");

  // Actualizar tabs y re-renderizar
  renderTabsTabla();
  cambiarUnidadTabla(u);

  // TODO en producción: enviar al API
  console.log("Guardando calificaciones unidad", u, estado.calificaciones[u]);
}

function pedirDesbloquear() {
  const u = estado.unidadActiva;
  document.getElementById("nombreUnidadDesbloquear").textContent =
    `Unidad ${u + 1}`;
  abrirModal("modalDesbloquear");
}

function confirmarDesbloquear() {
  cerrarModal("modalDesbloquear");
  const u = estado.unidadActiva;
  estado.unidadesGuardadas.delete(u);
  mostrarToast(`Unidad ${u + 1} desbloqueada`, "success");
  renderTabsTabla();
  cambiarUnidadTabla(u);
}

function pedirSalir() {
  if (estado.cambiosPendientes) abrirModal("modalSalir");
  else confirmarSalir();
}

function confirmarSalir() {
  cerrarModal("modalSalir");
  window.location.href = "grupos.html";
}

function abrirModal(id) {
  document.getElementById(id).classList.add("visible");
}
function cerrarModal(id) {
  document.getElementById(id).classList.remove("visible");
}

document.querySelectorAll(".modal-overlay").forEach((o) => {
  o.addEventListener("click", (e) => {
    if (e.target === o) o.classList.remove("visible");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  GUARDAR CONFIGURACIÓN → ACTIVAR TABLA
// ═══════════════════════════════════════════════════════════════════════
function guardarConfiguracion() {
  estado.configurado = true;
  estado.cambiosPendientes = false;
  estado.modoEdicion = false;

  actualizarEstadoBadge("configurado", "Configurado");
  inicializarCalificaciones();

  document.getElementById("seccionPonderaciones").style.display = "none";
  document.getElementById("emptyConfig").style.display = "none";
  document.getElementById("seccionCalificaciones").style.display = "block";
  document.getElementById("selGrupo").disabled = true;
  document.getElementById("numUnidades").disabled = true;

  renderTabsTabla();
  cambiarUnidadTabla(0);
}

function actualizarEstadoBadge(cls, texto) {
  const badge = document.getElementById("estadoBadge");
  badge.className = `estado-badge ${cls}`;
  badge.innerHTML = `<span class="dot-live"></span>${texto}`;
}

window.addEventListener("beforeunload", (e) => {
  if (estado.cambiosPendientes) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  MODAL GEAR — CONFIGURACIÓN AVANZADA
// ═══════════════════════════════════════════════════════════════════════
function abrirModalGear() {
  if (!estado.grupoId) {
    mostrarToast("Primero selecciona un grupo", "error");
    return;
  }
  poblarSelectoresGear();
  abrirModal("modalGear");
}

function poblarSelectoresGear() {
  const n = estado.numUnidades;

  // Dividir
  const selDiv = document.getElementById("selDividirUnidad");
  selDiv.innerHTML = "";
  for (let u = 0; u < n; u++)
    selDiv.innerHTML += `<option value="${u}">Unidad ${u + 1}</option>`;

  // Unir
  const sel1 = document.getElementById("selUnirUnidad1");
  sel1.innerHTML = "";
  for (let u = 0; u < n - 1; u++)
    sel1.innerHTML += `<option value="${u}">Unidad ${u + 1}</option>`;
  actualizarSelUnir2();

  // CSV
  const selCSV = document.getElementById("selCSVUnidad");
  selCSV.innerHTML = "";
  for (let u = 0; u < n; u++)
    selCSV.innerHTML += `<option value="${u}">Unidad ${u + 1}</option>`;

  // Reset
  const selReset = document.getElementById("selResetUnidad");
  selReset.innerHTML = `<option value="todas">Todas las unidades</option>`;
  for (let u = 0; u < n; u++)
    selReset.innerHTML += `<option value="${u}">Unidad ${u + 1}</option>`;
}

function actualizarSelUnir2() {
  const u1 = parseInt(document.getElementById("selUnirUnidad1").value);
  const sel2 = document.getElementById("selUnirUnidad2");
  sel2.innerHTML = `<option value="${u1 + 1}">Unidad ${u1 + 2}</option>`;
}

function cambiarTabGear(tab, btn) {
  document
    .querySelectorAll(".gear-tab")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".gear-panel")
    .forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(`gearPanel-${tab}`).classList.add("active");
}

// ── DIVIDIR ───────────────────────────────────────────────────────────
function ejecutarDividir() {
  if (estado.numUnidades >= 6) {
    mostrarToast("Máximo 6 unidades permitidas", "error");
    return;
  }
  const u = parseInt(document.getElementById("selDividirUnidad").value);
  const pondOr = { ...estado.ponderaciones[u] };

  // Insertar copia después de u
  estado.ponderaciones.splice(u + 1, 0, { ...pondOr });
  estado.numUnidades++;
  document.getElementById("numUnidades").value = estado.numUnidades;

  if (estado.configurado) {
    // Insertar calificaciones vacías para la nueva unidad
    const mapa = {};
    estado.alumnos.forEach((a) => {
      mapa[a.matricula] = {
        actividad: "",
        examen: "",
        asistencia: "",
        participacion: "",
        bonus: "",
      };
    });
    estado.calificaciones.splice(u + 1, 0, mapa);
    renderTabsTabla();
    cambiarUnidadTabla(u + 1);
  } else {
    renderTabsConfig(estado.numUnidades);
    renderPanelesConfig(estado.numUnidades);
    activarTabConfig(u + 1);
  }

  cerrarModal("modalGear");
  mostrarToast(
    `Unidad ${u + 1} dividida. Ajusta las ponderaciones.`,
    "success",
  );
}

// ── UNIR ──────────────────────────────────────────────────────────────
function ejecutarUnir() {
  if (estado.numUnidades <= 1) {
    mostrarToast("Se necesitan al menos 2 unidades para unir", "error");
    return;
  }
  const u1 = parseInt(document.getElementById("selUnirUnidad1").value);
  const u2 = u1 + 1;
  const p1 = estado.ponderaciones[u1];
  const p2 = estado.ponderaciones[u2];

  // Promedio de ponderaciones
  const merged = {};
  RUBROS.forEach((r) => {
    merged[r] = Math.round((p1[r] + p2[r]) / 2);
  });

  // Ajustar para que sume 100
  const sumMerged = RUBROS.reduce((s, r) => s + merged[r], 0);
  merged.examen += 100 - sumMerged; // ajustar examen

  estado.ponderaciones.splice(u1, 2, merged);
  estado.numUnidades--;
  document.getElementById("numUnidades").value = estado.numUnidades;

  if (estado.configurado) {
    // Merge calificaciones (mantiene las de u1)
    estado.calificaciones.splice(u2, 1);
    estado.unidadesGuardadas = new Set(
      [...estado.unidadesGuardadas]
        .map((u) => (u > u2 ? u - 1 : u))
        .filter((u) => u !== u2),
    );
    renderTabsTabla();
    cambiarUnidadTabla(u1);
  } else {
    renderTabsConfig(estado.numUnidades);
    renderPanelesConfig(estado.numUnidades);
    activarTabConfig(u1);
  }

  cerrarModal("modalGear");
  mostrarToast(`Unidades ${u1 + 1} y ${u2 + 1} unidas.`, "success");
}

// ── CSV ───────────────────────────────────────────────────────────────
function manejarDropCSV(e) {
  e.preventDefault();
  document.getElementById("csvDropZone").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) procesarCSV(file);
}

function procesarCSV(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const texto = e.target.result;
    const lineas = texto.trim().split("\n");
    const header = lineas[0]
      .toLowerCase()
      .split(",")
      .map((h) => h.trim());
    const datos = [];

    for (let i = 1; i < lineas.length; i++) {
      const vals = lineas[i].split(",").map((v) => v.trim());
      const row = {};
      header.forEach((h, idx) => {
        row[h] = vals[idx] || "";
      });
      if (row.matricula) datos.push(row);
    }

    mostrarPreviewCSV(datos, file.name);
  };
  reader.readAsText(file);
}

function mostrarPreviewCSV(datos, nombre) {
  const preview = document.getElementById("csvPreview");
  if (datos.length === 0) {
    preview.innerHTML = `<p style="color:var(--danger);font-size:0.85rem">No se encontraron datos válidos en ${nombre}</p>`;
    return;
  }

  const filas = datos
    .map(
      (d) => `
    <tr>
      <td>${d.matricula}</td>
      <td>${d.actividad || "—"}</td>
      <td>${d.examen || "—"}</td>
      <td>${d.asistencia || "—"}</td>
      <td>${d.participacion || "—"}</td>
      <td>${d.bonus || "0"}</td>
    </tr>
  `,
    )
    .join("");

  preview.innerHTML = `
    <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:8px">
      Vista previa: ${datos.length} alumnos encontrados en <em>${nombre}</em>
    </div>
    <div style="overflow-x:auto;max-height:180px">
      <table style="font-size:0.8rem">
        <thead><tr>
          <th>Matrícula</th><th>Actividad</th><th>Examen</th>
          <th>Asistencia</th><th>Participación</th><th>Bonus</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <button class="btn btn-primary" style="margin-top:10px;width:100%" onclick="aplicarCSV(window._csvDatos)">
      <iconify-icon icon="mdi:check"></iconify-icon> Aplicar al formulario
    </button>
  `;
  window._csvDatos = datos;
}

function aplicarCSV(datos) {
  if (!datos || !estado.configurado) {
    mostrarToast("Primero guarda la configuración antes de importar", "error");
    return;
  }
  const u = parseInt(document.getElementById("selCSVUnidad").value);

  let aplicados = 0;
  datos.forEach((d) => {
    const mat = d.matricula;
    if (!estado.calificaciones[u][mat]) return;
    RUBROS.forEach((r) => {
      if (d[r] !== undefined && d[r] !== "") {
        estado.calificaciones[u][mat][r] = d[r];
      }
    });
    if (d.bonus !== undefined && d.bonus !== "") {
      estado.calificaciones[u][mat].bonus = d.bonus;
    }
    aplicados++;
  });

  cerrarModal("modalGear");
  cambiarUnidadTabla(u);
  mostrarToast(
    `${aplicados} calificaciones importadas para Unidad ${u + 1}`,
    "success",
  );
  window._csvDatos = null;
}

// ── RESET ─────────────────────────────────────────────────────────────
function ejecutarReset() {
  const val = document.getElementById("selResetUnidad").value;
  const defaultPond = {
    actividad: 25,
    examen: 50,
    asistencia: 15,
    participacion: 10,
  };

  if (val === "todas") {
    for (let u = 0; u < estado.numUnidades; u++) {
      estado.ponderaciones[u] = { ...defaultPond };
    }
    if (!estado.configurado) renderPanelesConfig(estado.numUnidades);
    mostrarToast(
      "Ponderaciones restablecidas para todas las unidades",
      "success",
    );
  } else {
    const u = parseInt(val);
    estado.ponderaciones[u] = { ...defaultPond };
    if (!estado.configurado) {
      renderPanelesConfig(estado.numUnidades);
      activarTabConfig(u);
    }
    mostrarToast(`Ponderaciones de Unidad ${u + 1} restablecidas`, "success");
  }
  cerrarModal("modalGear");
}

// ── Toast ─────────────────────────────────────────────────────────────
function mostrarToast(msg, tipo = "success") {
  let t = document.getElementById("rca-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "rca-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `rca-toast rca-toast-${tipo} visible`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("visible"), 3200);
}

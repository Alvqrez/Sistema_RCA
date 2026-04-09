// frontend/js/formulario.js
const BASE_URL_FORM = "http://localhost:3000";
const token = () => localStorage.getItem("token");

let estado = {
  grupoId: null,
  unidadId: null,
  actividades: [],
  alumnos: [],
  resultados: {},
  unidadesGrupo: [], // [{ id_unidad, nombre_unidad, ponderacion, numero_unidad }]
};

let bonusUnidadActual = {}; // matricula → { puntos_otorgados, justificacion }

// ─────────────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await cargarGruposSelect();

  // Issue 5 FIX: auto-selección robusta del grupo desde URL
  const params = new URLSearchParams(window.location.search);
  const grupoParam = params.get("grupo");
  if (grupoParam) {
    const sel = document.getElementById("selGrupo");
    sel.value = grupoParam;
    // Llama cargarGrupo() directamente; la función maneja valores vacíos de forma segura
    await cargarGrupo();
  }
});

// ── Carga grupos en el select ─────────────────────────────────────────
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
      if (url.includes("mis-grupos")) {
        await cargarGruposSelectFallback(sel);
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const grupos = await res.json();
    if (!Array.isArray(grupos) || grupos.length === 0) {
      sel.innerHTML = `<option value="">-- Sin grupos asignados --</option>`;
      return;
    }
    sel.innerHTML = `<option value="">-- Selecciona un grupo --</option>`;
    grupos.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id_grupo;
      opt.textContent = `${g.nombre_materia} (${g.descripcion_periodo || "Periodo " + g.id_periodo})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("No se pudo cargar grupos:", e);
    mostrarToast("Error al cargar grupos: " + e.message, "error");
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
      ? `<option value="">-- Selecciona un grupo --</option>` +
        grupos
          .map(
            (g) =>
              `<option value="${g.id_grupo}">${g.nombre_materia} (${g.descripcion_periodo || "Periodo " + g.id_periodo})</option>`,
          )
          .join("")
      : `<option value="">-- Sin grupos asignados --</option>`;
  } catch (e) {
    console.error("Fallback grupos falló:", e);
  }
}

// ── Cuando el maestro selecciona un grupo ─────────────────────────────
async function cargarGrupo() {
  const sel = document.getElementById("selGrupo");
  const id = parseInt(sel.value);
  if (!id) return resetVista();

  estado.grupoId = id;
  document.getElementById("badgeGrupo").textContent =
    sel.options[sel.selectedIndex].text;
  document.getElementById("emptyConfig").style.display = "none";

  await Promise.all([cargarUnidadesGrupo(), cargarAlumnos()]);
  // Show config hint
  const hint = document.getElementById("hintConfigEval");
  if (hint) hint.style.display = "block";

  document.getElementById("seccionUnidades").style.display = "block";
}

function resetVista() {
  estado = {
    grupoId: null,
    unidadId: null,
    actividades: [],
    alumnos: [],
    resultados: {},
    unidadesGrupo: [],
  };
  bonusUnidadActual = {};
  const hintEl = document.getElementById("hintConfigEval");
  if (hintEl) hintEl.style.display = "none";
  document.getElementById("emptyConfig").style.display = "block";
  document.getElementById("seccionUnidades").style.display = "none";
  document.getElementById("seccionActividades").style.display = "none";
  document.getElementById("badgeGrupo").textContent = "Sin grupo seleccionado";
  actualizarEstadoBadge(false);
}

// ── Cargar unidades del grupo (grupo_unidad → fallback materia) ───────
async function cargarUnidadesGrupo() {
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/grupos/${estado.grupoId}/unidades`,
      {
        headers: { Authorization: `Bearer ${token()}` },
      },
    );
    let unidades = await res.json();

    if (!Array.isArray(unidades) || unidades.length === 0) {
      // fallback: traer de la materia
      const grupoInfo = await (
        await fetch(`${BASE_URL_FORM}/api/grupos/${estado.grupoId}`, {
          headers: { Authorization: `Bearer ${token()}` },
        })
      ).json();
      const res2 = await fetch(
        `${BASE_URL_FORM}/api/unidades/materia/${encodeURIComponent(grupoInfo.clave_materia)}`,
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      unidades = await res2.json();
      // En fallback, ponderacion por defecto = 0 (aún no asignada)
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

  // Poblar selector de unidad — Issue 6: muestra "(Unidad X) nombre"
  const sel = document.getElementById("selUnidad");
  sel.innerHTML = `<option value="">-- Selecciona una unidad --</option>`;
  estado.unidadesGrupo.forEach((u) => {
    sel.innerHTML += `<option value="${u.id_unidad}">(Unidad ${u.numero_unidad}) ${u.nombre_unidad}${u.ponderacion > 0 ? " — " + u.ponderacion + "%" : ""}</option>`;
  });

  const total = estado.unidadesGrupo.reduce(
    (s, u) => s + parseFloat(u.ponderacion || 0),
    0,
  );
  const badge = document.getElementById("badgePesoTotal");
  if (badge) {
    badge.textContent = total > 0 ? `${total}% total` : "";
    badge.style.color =
      Math.abs(total - 100) < 0.01
        ? "var(--success)"
        : "var(--warning, #f59e0b)";
  }
}

// ── Cargar alumnos inscritos ──────────────────────────────────────────
async function cargarAlumnos() {
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/inscripciones/grupo/${estado.grupoId}`,
      {
        headers: { Authorization: `Bearer ${token()}` },
      },
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

// ── Cargar unidad seleccionada ────────────────────────────────────────
async function cargarUnidad() {
  const idUnidad = parseInt(document.getElementById("selUnidad").value);
  if (!idUnidad) {
    document.getElementById("seccionActividades").style.display = "none";
    actualizarEstadoBadge(false);
    return;
  }
  estado.unidadId = idUnidad;
  await cargarActividades();
  await cargarResultadosExistentes();
  await cargarBonusUnidad();
  renderBonusSection();
  document.getElementById("seccionActividades").style.display = "block";
  document
    .getElementById("seccionActividades")
    .scrollIntoView({ behavior: "smooth" });
  actualizarEstadoBadge(true);
  actualizarSelectCSVActividad();
}

// ── Cargar actividades de la unidad ───────────────────────────────────
async function cargarActividades() {
  const res = await fetch(`${BASE_URL_FORM}/api/actividades`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const todas = await res.json();
  estado.actividades = todas.filter(
    (a) => a.id_grupo === estado.grupoId && a.id_unidad === estado.unidadId,
  );

  const sumaP = estado.actividades.reduce(
    (s, a) => s + parseFloat(a.ponderacion),
    0,
  );
  const colorSuma =
    Math.abs(sumaP - 100) < 0.01 ? "var(--success)" : "var(--warning, #f59e0b)";
  const resumen = document.getElementById("resumenActividades");
  if (resumen) {
    resumen.innerHTML =
      estado.actividades.length === 0
        ? `<span style="color:var(--text-muted)">No hay actividades definidas. Agrégalas en la sección <strong>Actividades</strong>.</span>`
        : `<span style="color:${colorSuma}">${estado.actividades.length} actividades — suma ponderaciones: <strong>${sumaP}%</strong></span>`;
  }
  renderTablaCalificaciones();
}

// ── Cargar resultados existentes ──────────────────────────────────────
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
  renderTablaCalificaciones();
}

// ── Renderizar tabla principal de calificaciones ──────────────────────
function renderTablaCalificaciones() {
  const wrap = document.getElementById("tablaCalWrap");
  if (!wrap) return;

  if (estado.actividades.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted)"><iconify-icon icon="mdi:clipboard-off-outline" style="font-size:2rem;display:block;margin:0 auto 8px"></iconify-icon>No hay actividades para esta unidad.</div>`;
    return;
  }
  if (estado.alumnos.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted)"><iconify-icon icon="mdi:account-off-outline" style="font-size:2rem;display:block;margin:0 auto 8px"></iconify-icon>No hay alumnos inscritos.</div>`;
    return;
  }

  let html = `<div class="tabla-wrapper"><table class="tabla-calificaciones"><thead><tr><th>Alumno</th><th>Matrícula</th>`;
  estado.actividades.forEach((a) => {
    const lock = a.bloqueado
      ? `<iconify-icon icon="mdi:lock-outline" style="font-size:0.7rem;color:var(--warning,#f59e0b);margin-left:4px"></iconify-icon>`
      : "";
    html += `<th>${a.nombre_actividad}${lock}<br><small style="color:var(--text-muted);font-weight:400">${a.ponderacion}%</small></th>`;
  });
  html += `<th>Promedio</th></tr></thead><tbody>`;

  estado.alumnos.forEach((al) => {
    let prom = 0;
    html += `<tr data-matricula="${al.matricula}"><td style="font-weight:500">${al.nombre}</td><td style="font-size:0.78rem;color:var(--text-muted)">${al.matricula}</td>`;
    estado.actividades.forEach((a) => {
      const r = estado.resultados[al.matricula]?.[a.id_actividad];
      const val = r?.cal ?? "";
      prom += (parseFloat(val) || 0) * (parseFloat(a.ponderacion) / 100);
      html += `<td><input class="cal-input" type="number" min="0" max="100"
                  data-matricula="${al.matricula}" data-actividad="${a.id_actividad}" data-ponderacion="${a.ponderacion}"
                  value="${val}" placeholder="${r?.estatus === "NP" ? "NP" : "—"}"
                  oninput="recalcularFila('${al.matricula}')" /></td>`;
    });
    const color =
      prom >= 70
        ? "var(--success)"
        : prom > 0
          ? "var(--warning, #f59e0b)"
          : "var(--text-muted)";
    html += `<td id="prom-${al.matricula}" style="font-weight:700;color:${color}">${prom.toFixed(1)}</td></tr>`;
  });

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;
}

function recalcularFila(matricula) {
  let suma = 0;
  document
    .querySelectorAll(
      `input.cal-input[data-matricula="${matricula}"][data-ponderacion]`,
    )
    .forEach((inp) => {
      suma +=
        (parseFloat(inp.value) || 0) *
        (parseFloat(inp.dataset.ponderacion) / 100);
    });
  const el = document.getElementById(`prom-${matricula}`);
  if (el) {
    el.textContent = suma.toFixed(1);
    el.style.color =
      suma >= 70
        ? "var(--success)"
        : suma > 0
          ? "var(--warning, #f59e0b)"
          : "var(--text-muted)";
  }
}

// ─────────────────────────────────────────────────────────────────────
//  PUNTOS EXTRA — Bonus por unidad
// ─────────────────────────────────────────────────────────────────────
async function cargarBonusUnidad() {
  bonusUnidadActual = {};
  if (!estado.grupoId || !estado.unidadId) return;
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/bonus/unidad/grupo/${estado.grupoId}`,
      {
        headers: { Authorization: `Bearer ${token()}` },
      },
    );
    const bonuses = await res.json();
    if (Array.isArray(bonuses)) {
      bonuses.forEach((b) => {
        if (b.id_unidad === estado.unidadId && b.estatus !== "Cancelado") {
          bonusUnidadActual[b.matricula] = {
            puntos: b.puntos_otorgados,
            justificacion: b.justificacion,
          };
        }
      });
    }
  } catch (_) {}
}

function renderBonusSection() {
  const seccion = document.getElementById("seccionBonus");
  const wrap = document.getElementById("bonusWrap");
  if (!seccion || !wrap) return;

  if (estado.alumnos.length === 0) {
    seccion.style.display = "none";
    return;
  }
  seccion.style.display = "block";

  let html = `<table class="tabla-calificaciones">
    <thead><tr>
      <th>Alumno</th>
      <th style="width:100px">Puntos extra</th>
      <th>Justificación (obligatoria si hay puntos)</th>
      <th style="width:80px">Estado</th>
    </tr></thead><tbody>`;

  estado.alumnos.forEach((al) => {
    const b = bonusUnidadActual[al.matricula];
    html += `<tr>
      <td style="font-weight:500;font-size:0.85rem">${al.nombre}</td>
      <td>
        <input class="cal-input bonus-pts-input" type="number"
               min="0" max="10" step="0.5"
               data-matricula="${al.matricula}"
               value="${b?.puntos ?? ""}"
               placeholder="0"
               style="width:68px" />
      </td>
      <td>
        <input class="inline-input bonus-just-input" type="text"
               data-matricula="${al.matricula}"
               value="${b?.justificacion ?? ""}"
               placeholder="Motivo del bonus…" />
      </td>
      <td>
        ${b ? `<span class="badge badge-success" style="font-size:0.72rem">Activo</span>` : `<span style="font-size:0.77rem;color:var(--text-muted)">—</span>`}
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

async function guardarBonusUnidad() {
  if (!estado.grupoId || !estado.unidadId) return;

  const inputs = document.querySelectorAll(".bonus-pts-input");
  let guardados = 0,
    errores = 0;

  for (const inp of inputs) {
    const mat = inp.dataset.matricula;
    const pts = parseFloat(inp.value);
    if (!pts || pts <= 0) continue;

    const justEl = document.querySelector(
      `.bonus-just-input[data-matricula="${mat}"]`,
    );
    const just = justEl?.value?.trim();

    if (!just) {
      mostrarToast(
        `Escribe la justificación para el alumno con matrícula ${mat}`,
        "error",
      );
      justEl?.focus();
      return;
    }

    try {
      const res = await fetch(`${BASE_URL_FORM}/api/bonus/unidad`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          matricula: mat,
          id_unidad: estado.unidadId,
          id_grupo: estado.grupoId,
          puntos_otorgados: pts,
          justificacion: just,
        }),
      });
      const data = await res.json();
      if (data.success) {
        guardados++;
        if (data.advertencia) mostrarToast(data.advertencia, "info");
      } else {
        errores++;
        mostrarToast(data.error || "Error al guardar bonus", "error");
      }
    } catch {
      errores++;
    }
  }

  if (guardados > 0) {
    mostrarToast(
      `${guardados} bonus guardado${guardados > 1 ? "s" : ""} correctamente`,
      "success",
    );
    await cargarBonusUnidad();
    renderBonusSection();
  } else if (errores === 0) {
    mostrarToast(
      "No hay puntos extra para guardar (ingresa un valor > 0)",
      "info",
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
//  CONFIGURAR PESOS DE UNIDADES (maestro puede editarlos)

// ─────────────────────────────────────────────────────────────────────
//  GUARDAR CALIFICACIONES
// ─────────────────────────────────────────────────────────────────────
async function guardarCalificaciones() {
  if (!estado.grupoId || !estado.unidadId) {
    mostrarToast("Selecciona grupo y unidad primero", "error");
    return;
  }
  let totalGuardados = 0;
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
    const data = await res.json();
    if (!data.success) {
      mostrarToast(
        `Error en "${act.nombre_actividad}": ${data.error}`,
        "error",
      );
      return;
    }
    totalGuardados += data.guardados;
  }
  mostrarToast(`${totalGuardados} calificaciones guardadas`, "success");
  await cargarResultadosExistentes();
}

// ── Calcular y cerrar unidad ──────────────────────────────────────────
async function calcularUnidad() {
  if (!estado.grupoId || !estado.unidadId) {
    mostrarToast("Selecciona grupo y unidad", "error");
    return;
  }
  if (
    !confirm("¿Calcular y cerrar la unidad para todos los alumnos del grupo?")
  )
    return;
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
    const data = await res.json();
    if (!data.success) errores++;
  }
  mostrarToast(
    errores === 0
      ? "Unidad calculada y cerrada"
      : `${errores} errores al calcular`,
    errores === 0 ? "success" : "error",
  );
  if (errores === 0) intentarMostrarSeccionFinal();
}

// ── CSV Modal ──────────────────────────────────────────────────────────
function abrirModalCSV() {
  if (!estado.unidadId) {
    mostrarToast("Selecciona una unidad primero", "error");
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
  sel.innerHTML = `<option value="">-- Selecciona la actividad --</option>`;
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
      <div style="margin-top:12px;background:var(--bg-app);border-radius:8px;padding:14px">
        <p style="color:var(--text-muted);margin:0 0 8px;font-size:0.82rem">
          <strong style="color:var(--text-main)">${datos.length}</strong> registros para
          <strong style="color:var(--primary,#3b82f6)">${act?.nombre_actividad ?? ""}</strong>
        </p>
        <table style="width:100%;font-size:0.8rem;border-collapse:collapse">
          <thead><tr><th style="text-align:left;color:var(--text-muted);padding:3px 6px">Matrícula</th><th style="text-align:left;color:var(--text-muted);padding:3px 6px">Calificación</th></tr></thead>
          <tbody>${datos
            .slice(0, 5)
            .map(
              (d) =>
                `<tr><td style="padding:3px 6px">${d.matricula}</td><td style="padding:3px 6px">${d.calificacion_obtenida ?? "<span style='color:var(--warning,#f59e0b)'>NP</span>"}</td></tr>`,
            )
            .join("")}
          ${datos.length > 5 ? `<tr><td colspan="2" style="padding:3px 6px;color:var(--text-muted)">... y ${datos.length - 5} más</td></tr>` : ""}</tbody>
        </table>
        <button class="btn btn-primary" style="margin-top:12px;width:100%" onclick="aplicarCSV(${idAct})">
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
  const data = await res.json();
  if (data.success) {
    mostrarToast(`${data.guardados} calificaciones importadas`, "success");
    cerrarModalCSV();
    await cargarResultadosExistentes();
  } else mostrarToast(data.error || "Error al importar", "error");
  window._csvDatos = null;
}

// ── Helpers ────────────────────────────────────────────────────────────
function actualizarEstadoBadge(activo) {
  const badge = document.getElementById("estadoBadge");
  if (!badge) return;
  badge.className = "estado-badge " + (activo ? "configurado" : "sin-config");
  badge.innerHTML = `<span class="dot-live"></span>${activo ? "Configurado" : "Sin configurar"}`;
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

// ─────────────────────────────────────────────────────────────────────
//  PASO 4 — Calificación Final del Grupo
// ─────────────────────────────────────────────────────────────────────

// Show/reveal the final section after any unit calc
function intentarMostrarSeccionFinal() {
  const sec = document.getElementById("seccionFinal");
  if (!sec || !estado.grupoId) return;
  if (estado.alumnos.length > 0 && estado.unidadesGrupo.length > 0) {
    sec.style.display = "block";
    calcularVistaFinal();
  }
}

// Calculate final grades view
async function calcularVistaFinal() {
  const wrap = document.getElementById("tablaFinalWrap");
  if (!wrap || !estado.grupoId) return;

  // Usar /reportes/grupo que sí existe y devuelve alumnos + califs por unidad
  let reporteData = null;
  try {
    const res = await fetch(
      `${BASE_URL_FORM}/api/reportes/grupo/${estado.grupoId}`,
      { headers: { Authorization: `Bearer ${token()}` } },
    );
    if (res.ok) reporteData = await res.json();
  } catch (_) {}

  if (!reporteData?.alumnos?.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.85rem">
      <iconify-icon icon="mdi:clipboard-off-outline" style="font-size:2rem;display:block;margin:0 auto 8px"></iconify-icon>
      Aún no hay calificaciones de unidad calculadas.<br>
      Usa <strong>Calcular y cerrar unidad</strong> en el Paso 3 para cada unidad.
    </div>`;
    return;
  }

  const unidades = reporteData.unidades || [];
  const alumnos = reporteData.alumnos || [];

  let html = `<div style="overflow-x:auto"><table class="tabla-calificaciones">
    <thead><tr>
      <th>Alumno</th><th>Matrícula</th>
      ${unidades.map((u) => `<th style="text-align:center">${u.nombre_unidad}</th>`).join("")}
      <th style="text-align:center">Promedio Final</th>
      <th style="text-align:center">Estado</th>
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
        return `<td style="text-align:center;font-weight:500;color:${color}">
        ${cal !== undefined ? cal.toFixed(1) : "—"}
      </td>`;
      })
      .join("");

    // Si ya tiene calificacion_oficial guardada, usarla
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
      <td style="font-weight:500">${al.nombre_completo}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${al.matricula}</td>
      ${celdas}
      <td style="text-align:center;font-weight:700;font-size:1rem;color:${colorFinal}">
        ${redondeado !== null ? redondeado : "—"}
      </td>
      <td style="text-align:center">
        ${
          redondeado === null
            ? `<span style="font-size:0.78rem;color:var(--text-muted)">Sin datos</span>`
            : aprobado
              ? `<span class="badge badge-success">Aprobado</span>`
              : `<span class="badge badge-danger">Reprobado</span>`
        }
      </td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;

  const badge = document.getElementById("badgeFinalGrupo");
  if (badge)
    badge.textContent = `${cfgsOk} de ${alumnos.length} alumnos con calificación`;
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
    const final = fila.dataset.final;
    if (!final) continue;

    try {
      // Usar calcular-final que sí existe en el backend
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
      const data = await res.json();
      data.success ? guardados++ : errores++;
    } catch {
      errores++;
    }
  }

  if (guardados > 0)
    mostrarToast(`${guardados} calificaciones finales guardadas`, "success");
  if (errores > 0) mostrarToast(`${errores} errores al guardar`, "error");
  if (guardados > 0) calcularVistaFinal(); // refresca para mostrar estado actualizado
}

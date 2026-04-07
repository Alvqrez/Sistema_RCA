// frontend/js/formulario.js
// FIX: solo muestra grupos del maestro logueado | CSV como modal
const BASE_URL_FORM = "http://localhost:3000";
const token = () => localStorage.getItem("token");

let estado = {
  grupoId: null,
  unidadId: null,
  actividades: [],
  alumnos: [],
  resultados: {},
  unidadesGrupo: [],
};

document.addEventListener("DOMContentLoaded", cargarGruposSelect);

// FIX: /api/grupos/mis-grupos — solo grupos del maestro logueado
async function cargarGruposSelect() {
  const sel = document.getElementById("selGrupo");
  try {
    const res = await fetch(`${BASE_URL_FORM}/api/grupos/mis-grupos`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const grupos = await res.json();
    if (!Array.isArray(grupos) || grupos.length === 0) {
      sel.innerHTML = `<option value="">-- Sin grupos asignados --</option>`;
      return;
    }
    grupos.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id_grupo;
      opt.textContent = `${g.nombre_materia} (${g.descripcion_periodo || "Periodo " + g.id_periodo})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("No se pudo cargar grupos:", e);
    mostrarToast("Error al cargar grupos", "error");
  }
}

async function cargarGrupo() {
  const sel = document.getElementById("selGrupo");
  const id = parseInt(sel.value);
  if (!id) return resetVista();
  estado.grupoId = id;
  document.getElementById("badgeGrupo").textContent =
    sel.options[sel.selectedIndex].text;
  document.getElementById("emptyConfig").style.display = "none";
  await Promise.all([cargarUnidadesGrupo(), cargarAlumnos()]);
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
  document.getElementById("emptyConfig").style.display = "block";
  document.getElementById("seccionUnidades").style.display = "none";
  document.getElementById("seccionActividades").style.display = "none";
  document.getElementById("badgeGrupo").textContent = "Sin grupo seleccionado";
  actualizarEstadoBadge(false);
}

async function cargarUnidadesGrupo() {
  const res = await fetch(
    `${BASE_URL_FORM}/api/grupos/${estado.grupoId}/unidades`,
    {
      headers: { Authorization: `Bearer ${token()}` },
    },
  );
  estado.unidadesGrupo = await res.json();
  const sel = document.getElementById("selUnidad");
  sel.innerHTML = `<option value="">-- Selecciona una unidad --</option>`;
  estado.unidadesGrupo.forEach((u) => {
    sel.innerHTML += `<option value="${u.id_unidad}">${u.nombre_unidad}  (Peso: ${u.ponderacion}%)</option>`;
  });
  const total = estado.unidadesGrupo.reduce(
    (s, u) => s + parseFloat(u.ponderacion),
    0,
  );
  const badge = document.getElementById("badgePesoTotal");
  if (badge) {
    badge.textContent = `${total}% total`;
    badge.style.color = Math.abs(total - 100) < 0.01 ? "#22c55e" : "#f59e0b";
  }
}

async function cargarAlumnos() {
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
}

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
  document.getElementById("seccionActividades").style.display = "block";
  document
    .getElementById("seccionActividades")
    .scrollIntoView({ behavior: "smooth" });
  actualizarEstadoBadge(true);
  actualizarSelectCSVActividad();
}

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
  const colorSuma = Math.abs(sumaP - 100) < 0.01 ? "#22c55e" : "#f59e0b";
  const resumen = document.getElementById("resumenActividades");
  if (resumen) {
    resumen.innerHTML =
      estado.actividades.length === 0
        ? `<span style="color:#94a3b8">No hay actividades definidas. Agrégalas en la sección <strong>Actividades</strong>.</span>`
        : `<span style="color:${colorSuma}">${estado.actividades.length} actividades — suma ponderaciones: <strong>${sumaP}%</strong></span>`;
  }
  renderTablaCalificaciones();
}

async function cargarResultadosExistentes() {
  estado.resultados = {};
  for (const act of estado.actividades) {
    const res = await fetch(
      `${BASE_URL_FORM}/api/resultado-actividad/actividad/${act.id_actividad}`,
      { headers: { Authorization: `Bearer ${token()}` } },
    );
    const filas = await res.json();
    filas.forEach((f) => {
      if (!estado.resultados[f.matricula]) estado.resultados[f.matricula] = {};
      estado.resultados[f.matricula][act.id_actividad] = {
        cal: f.calificacion_obtenida,
        estatus: f.estatus,
      };
    });
  }
  renderTablaCalificaciones();
}

function renderTablaCalificaciones() {
  const wrap = document.getElementById("tablaCalWrap");
  if (!wrap) return;
  if (estado.actividades.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:32px;color:#94a3b8"><iconify-icon icon="mdi:clipboard-off-outline" style="font-size:2rem;display:block;margin:0 auto 8px"></iconify-icon>No hay actividades para esta unidad.</div>`;
    return;
  }
  if (estado.alumnos.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:32px;color:#94a3b8"><iconify-icon icon="mdi:account-off-outline" style="font-size:2rem;display:block;margin:0 auto 8px"></iconify-icon>No hay alumnos inscritos.</div>`;
    return;
  }
  let html = `<div class="tabla-wrapper"><table class="tabla-calificaciones"><thead><tr><th>Alumno</th><th>Matrícula</th>`;
  estado.actividades.forEach((a) => {
    const lock = a.bloqueado
      ? `<iconify-icon icon="mdi:lock-outline" style="font-size:0.7rem;color:#f59e0b;margin-left:4px"></iconify-icon>`
      : "";
    html += `<th>${a.nombre_actividad}${lock}<br><small style="color:#94a3b8;font-weight:400">${a.ponderacion}%</small></th>`;
  });
  html += `<th>Promedio</th></tr></thead><tbody>`;
  estado.alumnos.forEach((al) => {
    let prom = 0;
    html += `<tr data-matricula="${al.matricula}"><td style="font-weight:500">${al.nombre}</td><td style="font-size:0.78rem;color:#94a3b8">${al.matricula}</td>`;
    estado.actividades.forEach((a) => {
      const r = estado.resultados[al.matricula]?.[a.id_actividad];
      const val = r?.cal ?? "";
      prom += (parseFloat(val) || 0) * (parseFloat(a.ponderacion) / 100);
      html += `<td><input class="cal-input" type="number" min="0" max="100" data-matricula="${al.matricula}" data-actividad="${a.id_actividad}" data-ponderacion="${a.ponderacion}" value="${val}" placeholder="${r?.estatus === "NP" ? "NP" : "—"}" oninput="recalcularFila('${al.matricula}')" /></td>`;
    });
    const color = prom >= 70 ? "#22c55e" : prom > 0 ? "#f59e0b" : "#94a3b8";
    html += `<td id="prom-${al.matricula}" style="font-weight:700;color:${color}">${prom.toFixed(1)}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  wrap.innerHTML = html;
}

function recalcularFila(matricula) {
  let suma = 0;
  document
    .querySelectorAll(`input[data-matricula="${matricula}"]`)
    .forEach((inp) => {
      suma +=
        (parseFloat(inp.value) || 0) *
        (parseFloat(inp.dataset.ponderacion) / 100);
    });
  const el = document.getElementById(`prom-${matricula}`);
  if (el) {
    el.textContent = suma.toFixed(1);
    el.style.color = suma >= 70 ? "#22c55e" : suma > 0 ? "#f59e0b" : "#94a3b8";
  }
}

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
  const dropZone = document.getElementById("csvDropZone");
  if (dropZone) dropZone.classList.remove("drag-over");
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
      <div style="margin-top:12px;background:var(--surface-2,#1e293b);border-radius:8px;padding:14px">
        <p style="color:#94a3b8;margin:0 0 8px;font-size:0.82rem">
          <strong style="color:#e2e8f0">${datos.length}</strong> registros para
          <strong style="color:#60a5fa">${act?.nombre_actividad ?? ""}</strong>
        </p>
        <table style="width:100%;font-size:0.8rem;border-collapse:collapse">
          <thead><tr><th style="text-align:left;color:#64748b;padding:3px 6px">Matrícula</th><th style="text-align:left;color:#64748b;padding:3px 6px">Calificación</th></tr></thead>
          <tbody>${datos
            .slice(0, 5)
            .map(
              (d) =>
                `<tr><td style="padding:3px 6px">${d.matricula}</td><td style="padding:3px 6px">${d.calificacion_obtenida ?? '<span style="color:#f59e0b">NP</span>'}</td></tr>`,
            )
            .join("")}
          ${datos.length > 5 ? `<tr><td colspan="2" style="padding:3px 6px;color:#64748b">... y ${datos.length - 5} más</td></tr>` : ""}</tbody>
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
  } else {
    mostrarToast(data.error || "Error al importar", "error");
  }
  window._csvDatos = null;
}

function actualizarEstadoBadge(activo) {
  const badge = document.getElementById("estadoBadge");
  if (!badge) return;
  badge.className = "estado-badge " + (activo ? "configurado" : "sin-config");
  badge.innerHTML = `<span class="dot-live"></span>${activo ? "Configurado" : "Sin configurar"}`;
}

function mostrarToast(msg, tipo = "success") {
  let toast = document.getElementById("rca-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "rca-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `rca-toast rca-toast-${tipo} visible`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("visible"), 3500);
}

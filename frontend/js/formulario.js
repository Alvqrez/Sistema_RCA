// frontend/js/formulario.js — CORREGIDO (FIX 3)
// Usa las actividades REALES de la BD en lugar de rubros fijos hardcoded.
// El CSV importa directamente a /api/resultado-actividad/bulk.
const BASE_URL_FORM = "http://localhost:3000";
const token = () => localStorage.getItem("token");

// ── Estado ────────────────────────────────────────────────────────────
let estado = {
  grupoId: null,
  unidadId: null,
  actividades: [], // actividades reales de la BD para (grupo, unidad)
  alumnos: [], // alumnos inscritos en el grupo
  resultados: {}, // { matricula: { id_actividad: calificacion } }
  unidadesGrupo: [], // unidades vinculadas al grupo con ponderación
};

// ── INIT ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", cargarGruposSelect);

async function cargarGruposSelect() {
  const sel = document.getElementById("selGrupo");
  try {
    const res = await fetch(`${BASE_URL_FORM}/api/grupos`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const grupos = await res.json();
    grupos.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id_grupo;
      opt.textContent = `${g.nombre_materia} — ${g.nombre_maestro} (${g.descripcion_periodo || ""})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("No se pudo cargar grupos:", e);
  }
}

// ── Selección de grupo ─────────────────────────────────────────────────
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
}

// ── Cargar unidades del grupo ──────────────────────────────────────────
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
    const label = `${u.nombre_unidad}  (Peso: ${u.ponderacion}%)`;
    sel.innerHTML += `<option value="${u.id_unidad}">${label}</option>`;
  });

  // Mostrar resumen de pesos
  const total = estado.unidadesGrupo.reduce(
    (s, u) => s + parseFloat(u.ponderacion),
    0,
  );
  const badge = document.getElementById("badgePesoTotal");
  if (badge) {
    badge.textContent = `${total}% asignado`;
    badge.style.color = Math.abs(total - 100) < 0.01 ? "#22c55e" : "#f59e0b";
  }
}

// ── Cargar alumnos inscritos en el grupo ──────────────────────────────
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

// ── Selección de unidad ────────────────────────────────────────────────
async function cargarUnidad() {
  const idUnidad = parseInt(document.getElementById("selUnidad").value);
  if (!idUnidad) {
    document.getElementById("seccionActividades").style.display = "none";
    return;
  }
  estado.unidadId = idUnidad;

  await cargarActividades();
  await cargarResultadosExistentes();

  document.getElementById("seccionActividades").style.display = "block";
  document
    .getElementById("seccionActividades")
    .scrollIntoView({ behavior: "smooth" });
}

// ── Actividades reales de la BD ────────────────────────────────────────
async function cargarActividades() {
  const res = await fetch(`${BASE_URL_FORM}/api/actividades`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const todas = await res.json();
  estado.actividades = todas.filter(
    (a) => a.id_grupo === estado.grupoId && a.id_unidad === estado.unidadId,
  );

  // Calcular suma de ponderaciones
  const sumaP = estado.actividades.reduce(
    (s, a) => s + parseFloat(a.ponderacion),
    0,
  );
  const colorSuma = Math.abs(sumaP - 100) < 0.01 ? "#22c55e" : "#f59e0b";

  const resumen = document.getElementById("resumenActividades");
  if (resumen) {
    resumen.innerHTML =
      estado.actividades.length === 0
        ? `<span style="color:#94a3b8">No hay actividades definidas para esta unidad. Agrégalas en la sección Actividades.</span>`
        : `<span style="color:${colorSuma}">${estado.actividades.length} actividades — suma ponderaciones: <strong>${sumaP}%</strong></span>`;
  }

  renderTablaCalificaciones();
}

// ── Resultados ya guardados ────────────────────────────────────────────
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

// ── Render tabla principal ─────────────────────────────────────────────
function renderTablaCalificaciones() {
  const wrap = document.getElementById("tablaCalWrap");
  if (!wrap) return;

  if (estado.actividades.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:32px;color:#94a3b8">No hay actividades para esta unidad. Créalas primero en "Actividades".</div>`;
    return;
  }
  if (estado.alumnos.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:32px;color:#94a3b8">No hay alumnos inscritos en este grupo.</div>`;
    return;
  }

  // Encabezado
  let html = `<div class="tabla-wrapper"><table class="tabla-calificaciones">
    <thead><tr>
      <th>Alumno</th>
      <th>Matrícula</th>`;
  estado.actividades.forEach((a) => {
    html += `<th title="${a.tipo_evaluacion}">${a.nombre_actividad}<br><small style="color:#94a3b8">${a.ponderacion}%</small></th>`;
  });
  html += `<th>Promedio</th></tr></thead><tbody>`;

  // Filas
  estado.alumnos.forEach((al) => {
    html += `<tr data-matricula="${al.matricula}">
      <td>${al.nombre}</td>
      <td style="font-size:0.78rem;color:#94a3b8">${al.matricula}</td>`;

    let promedioNum = 0;
    estado.actividades.forEach((a) => {
      const r = estado.resultados[al.matricula]?.[a.id_actividad];
      const val = r?.cal ?? "";
      const esNP = r?.estatus === "NP";
      html += `<td>
        <input class="cal-input" type="number" min="0" max="100"
               data-matricula="${al.matricula}"
               data-actividad="${a.id_actividad}"
               data-ponderacion="${a.ponderacion}"
               value="${val}"
               placeholder="${esNP ? "NP" : "0–100"}"
               oninput="recalcularFila('${al.matricula}')" />
      </td>`;
      const contrib = esNP
        ? 0
        : (parseFloat(val) || 0) * (parseFloat(a.ponderacion) / 100);
      promedioNum += contrib;
    });

    const color =
      promedioNum >= 70 ? "#22c55e" : promedioNum > 0 ? "#f59e0b" : "#94a3b8";
    html += `<td id="prom-${al.matricula}" style="font-weight:700;color:${color}">${promedioNum.toFixed(1)}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;
}

// ── Recalcular promedio de fila en tiempo real ─────────────────────────
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

// ── Guardar calificaciones (POST real a la API) ────────────────────────
async function guardarCalificaciones() {
  if (!estado.grupoId || !estado.unidadId) {
    mostrarToast("Selecciona grupo y unidad primero", "error");
    return;
  }

  // Agrupar por actividad para usar el endpoint bulk
  for (const act of estado.actividades) {
    const resultados = [];
    document
      .querySelectorAll(`input[data-actividad="${act.id_actividad}"]`)
      .forEach((inp) => {
        const mat = inp.dataset.matricula;
        const val = inp.value.trim();
        const cal = val === "" ? null : parseFloat(val);
        resultados.push({
          matricula: mat,
          calificacion_obtenida: cal,
          estatus: cal === null ? "NP" : "Validada",
        });
      });

    if (resultados.length === 0) continue;

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
        `Error en actividad "${act.nombre_actividad}": ${data.error}`,
        "error",
      );
      return;
    }
  }

  mostrarToast(`Calificaciones guardadas correctamente`, "success");
  await cargarResultadosExistentes();
}

// ── Calcular y cerrar unidad ───────────────────────────────────────────
async function calcularUnidad() {
  if (!estado.grupoId || !estado.unidadId) {
    mostrarToast("Selecciona grupo y unidad", "error");
    return;
  }
  if (
    !confirm(
      `¿Calcular y cerrar la unidad para todos los alumnos del grupo? Esta acción guardará los promedios finales.`,
    )
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

  if (errores === 0) {
    mostrarToast(
      "Unidad calculada y cerrada para todos los alumnos",
      "success",
    );
  } else {
    mostrarToast(`${errores} alumnos tuvieron errores al calcular`, "error");
  }
}

// ── CSV Import (FIX 3: ahora llama a la API real) ─────────────────────
function manejarDropCSV(e) {
  e.preventDefault();
  document.getElementById("csvDropZone").classList.remove("drag-over");
  const file = e.dataTransfer?.files[0] || e.target?.files[0];
  if (file) procesarCSV(file);
}

function procesarCSV(file) {
  const selAct = document.getElementById("selCSVActividad");
  if (!selAct || !selAct.value) {
    mostrarToast(
      "Selecciona la actividad a la que corresponde el CSV",
      "error",
    );
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const lineas = e.target.result.split("\n").filter(Boolean);
    const datos = [];
    lineas.forEach((linea, i) => {
      if (i === 0 && linea.toLowerCase().includes("matricula")) return; // saltar header
      const [matricula, calStr] = linea.split(",").map((s) => s.trim());
      if (!matricula) return;
      const cal = parseFloat(calStr);
      datos.push({
        matricula,
        calificacion_obtenida: isNaN(cal) ? null : cal,
        estatus: isNaN(cal) ? "NP" : "Validada",
      });
    });
    if (datos.length === 0) {
      mostrarToast("CSV vacío o sin datos válidos", "error");
      return;
    }
    mostrarPreviewCSV(datos, file.name, parseInt(selAct.value));
  };
  reader.readAsText(file);
}

function mostrarPreviewCSV(datos, nombre, id_actividad) {
  const preview = document.getElementById("csvPreview");
  if (!preview) return;
  const act = estado.actividades.find((a) => a.id_actividad === id_actividad);
  preview.innerHTML = `
    <div style="background:#1e293b;border-radius:8px;padding:16px;margin-top:12px;">
      <p style="color:#94a3b8;margin:0 0 8px">📄 <strong>${nombre}</strong> — ${datos.length} registros detectados</p>
      <p style="color:#94a3b8;margin:0 0 12px;font-size:0.82rem">Actividad: <strong style="color:#60a5fa">${act?.nombre_actividad ?? id_actividad}</strong></p>
      <table style="width:100%;font-size:0.82rem;border-collapse:collapse">
        <thead><tr><th style="text-align:left;color:#64748b;padding:4px">Matrícula</th><th style="text-align:left;color:#64748b;padding:4px">Calificación</th></tr></thead>
        <tbody>
          ${datos
            .slice(0, 8)
            .map(
              (d) =>
                `<tr><td style="padding:4px">${d.matricula}</td><td style="padding:4px">${d.calificacion_obtenida ?? "NP"}</td></tr>`,
            )
            .join("")}
          ${datos.length > 8 ? `<tr><td colspan="2" style="padding:4px;color:#64748b">... y ${datos.length - 8} más</td></tr>` : ""}
        </tbody>
      </table>
      <button class="btn btn-primary" style="margin-top:12px;width:100%" onclick="aplicarCSV(${JSON.stringify(datos).replace(/'/g, "&#39;")}, ${id_actividad})">
        ✅ Importar ${datos.length} calificaciones
      </button>
    </div>`;
  window._csvDatos = { datos, id_actividad };
}

async function aplicarCSV(datos, id_actividad) {
  const res = await fetch(`${BASE_URL_FORM}/api/resultado-actividad/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({ id_actividad, resultados: datos }),
  });
  const data = await res.json();
  if (data.success) {
    mostrarToast(
      `${data.guardados} calificaciones importadas desde CSV`,
      "success",
    );
    document.getElementById("csvPreview").innerHTML = "";
    await cargarResultadosExistentes();
  } else {
    mostrarToast(data.error || "Error al importar CSV", "error");
  }
  window._csvDatos = null;
}

// Poblar select de actividades para CSV cuando se carga la unidad
function actualizarSelectCSVActividad() {
  const sel = document.getElementById("selCSVActividad");
  if (!sel) return;
  sel.innerHTML = `<option value="">-- Selecciona actividad --</option>`;
  estado.actividades.forEach((a) => {
    sel.innerHTML += `<option value="${a.id_actividad}">${a.nombre_actividad} (${a.ponderacion}%)</option>`;
  });
}

// Llamar al cargar unidad
const _origCargarActividades = cargarActividades;
// eslint-disable-next-line no-global-assign
cargarActividades = async function () {
  await _origCargarActividades();
  actualizarSelectCSVActividad();
};

// ── Toast ──────────────────────────────────────────────────────────────
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

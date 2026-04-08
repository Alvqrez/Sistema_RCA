// frontend/js/actividades.js
const BASE_URL = "http://localhost:3000";

// ── ESTADO ────────────────────────────────────────────────────────────
let todasActividades = [];
let actividadActiva = null;
let gruposMap = {}; // id_grupo → grupo completo
let unidadesGrupoMap = {}; // id_grupo → [{ id_unidad, nombre_unidad, numero_unidad }]

// ─────────────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────────────
(async function init() {
  await cargarGruposSelect();
  await cargarActividades();
})();

// Carga grupos: maestro ve solo los suyos, admin ve todos
async function cargarGruposSelect() {
  const token = localStorage.getItem("token");
  const rol = localStorage.getItem("rol");

  const url =
    rol === "maestro"
      ? `${BASE_URL}/api/grupos/mis-grupos`
      : `${BASE_URL}/api/grupos`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403)
        window.location.href = "login.html";
      return;
    }
    const grupos = await res.json();

    const selCrear = document.getElementById("grupoActividad");
    const selFiltro = document.getElementById("filtroGrupo");

    selCrear.innerHTML = `<option value="">-- Selecciona grupo --</option>`;
    selFiltro.innerHTML = `<option value="">Todos los grupos</option>`;

    grupos.forEach((g) => {
      gruposMap[g.id_grupo] = g;
      const label = `${g.nombre_materia} — ${g.nombre_maestro}`;
      selCrear.innerHTML += `<option value="${g.id_grupo}">${label}</option>`;
      selFiltro.innerHTML += `<option value="${g.id_grupo}">${label}</option>`;
    });
  } catch (e) {
    console.error("No se pudo cargar grupos:", e);
  }
}

// ── Cargar unidades para un grupo (intenta grupo_unidad, luego materia) ─
async function cargarUnidadesParaGrupo(idGrupo) {
  const token = localStorage.getItem("token");

  // Si ya tenemos las unidades cacheadas, retornarlas
  if (unidadesGrupoMap[idGrupo]) return unidadesGrupoMap[idGrupo];

  // 1) Intentar desde grupo_unidad
  try {
    const res = await fetch(`${BASE_URL}/api/grupos/${idGrupo}/unidades`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Asignar numero_unidad secuencial (1, 2, 3...)
        const unidades = data.map((u, i) => ({ ...u, numero_unidad: i + 1 }));
        unidadesGrupoMap[idGrupo] = unidades;
        return unidades;
      }
    }
  } catch (_) {
    /* fallback abajo */
  }

  // 2) Fallback: unidades de la materia del grupo
  const g = gruposMap[idGrupo];
  if (g?.clave_materia) {
    try {
      const res2 = await fetch(
        `${BASE_URL}/api/unidades/materia/${encodeURIComponent(g.clave_materia)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res2.ok) {
        const unis = await res2.json();
        if (Array.isArray(unis) && unis.length > 0) {
          const unidades = unis.map((u, i) => ({ ...u, numero_unidad: i + 1 }));
          unidadesGrupoMap[idGrupo] = unidades;
          return unidades;
        }
      }
    } catch (_) {
      /* sin unidades */
    }
  }

  return [];
}

// ── Cuando cambia el grupo en el formulario de creación ──────────────
document
  .getElementById("grupoActividad")
  .addEventListener("change", async function () {
    const selUni = document.getElementById("unidadActividad");
    selUni.innerHTML = `<option value="">Cargando unidades…</option>`;
    selUni.disabled = true;

    if (!this.value) {
      selUni.innerHTML = `<option value="">-- Selecciona unidad --</option>`;
      selUni.disabled = false;
      return;
    }

    const unidades = await cargarUnidadesParaGrupo(this.value);
    selUni.disabled = false;

    if (unidades.length === 0) {
      selUni.innerHTML = `<option value="">⚠ Sin unidades — créalas primero</option>`;
      mostrarToast(
        "Este grupo no tiene unidades registradas. Ve a Unidades y crea las unidades para esta materia.",
        "error",
      );
      return;
    }

    selUni.innerHTML = `<option value="">-- Selecciona unidad --</option>`;
    unidades.forEach((u) => {
      // Bug 2 fix: muestra "(Unidad X) Nombre"
      selUni.innerHTML += `<option value="${u.id_unidad}">(Unidad ${u.numero_unidad}) ${u.nombre_unidad}</option>`;
    });
  });

// ── Cambio en filtro de grupo ─────────────────────────────────────────
document
  .getElementById("filtroGrupo")
  .addEventListener("change", async function () {
    const selUni = document.getElementById("filtroUnidad");
    selUni.innerHTML = `<option value="">Todas las unidades</option>`;

    if (this.value) {
      const unidades = await cargarUnidadesParaGrupo(this.value);
      unidades.forEach((u) => {
        selUni.innerHTML += `<option value="${u.id_unidad}">(Unidad ${u.numero_unidad}) ${u.nombre_unidad}</option>`;
      });
    }
    filtrarActividades();
  });

// ─────────────────────────────────────────────────────────────────────
//  CARGAR Y RENDERIZAR ACTIVIDADES
// ─────────────────────────────────────────────────────────────────────
async function cargarActividades() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${BASE_URL}/api/actividades`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      window.location.href = "login.html";
      return;
    }
    if (!res.ok) {
      mostrarToast("No se pudieron cargar las actividades", "error");
      return;
    }
    todasActividades = await res.json();
    filtrarActividades();
  } catch (e) {
    console.error("No se pudo cargar actividades:", e);
    mostrarToast("Error de conexión al cargar actividades", "error");
  }
}

function filtrarActividades() {
  const grupoFiltro = document.getElementById("filtroGrupo").value;
  const unidadFiltro = document.getElementById("filtroUnidad").value;
  const texto = document.getElementById("buscarActividad").value.toLowerCase();

  const filtradas = todasActividades.filter((a) => {
    if (grupoFiltro && String(a.id_grupo) !== grupoFiltro) return false;
    if (unidadFiltro && String(a.id_unidad) !== unidadFiltro) return false;
    if (texto && !a.nombre_actividad.toLowerCase().includes(texto))
      return false;
    return true;
  });

  renderTablaActividades(filtradas);
}

function renderTablaActividades(actividades) {
  const tbody = document.getElementById("tablaActividades");
  tbody.innerHTML = "";

  if (actividades.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">
          <iconify-icon icon="mdi:clipboard-text-off-outline" style="font-size:2rem;display:block;margin:0 auto 8px"></iconify-icon>
          Sin actividades registradas
        </td>
      </tr>`;
    return;
  }

  actividades.forEach((a) => {
    const grupo = gruposMap[a.id_grupo];
    const grupoLabel = grupo
      ? `<span style="font-weight:600">${grupo.nombre_materia}</span><br><span style="font-size:0.75rem;color:var(--text-muted)">${grupo.nombre_maestro}</span>`
      : `Grupo ${a.id_grupo}`;

    // Bug 2 fix: usar numero_unidad del backend; fallback al id si no viene
    const numUnidad = a.numero_unidad ?? a.id_unidad;
    const nombreUnidad = a.nombre_unidad ? ` — ${a.nombre_unidad}` : "";

    const esActiva =
      actividadActiva && actividadActiva.id_actividad === a.id_actividad;

    const tr = document.createElement("tr");
    tr.id = `fila-act-${a.id_actividad}`;
    if (esActiva) tr.classList.add("fila-activa");

    tr.innerHTML = `
      <td>
        <span style="font-weight:600">${a.nombre_actividad}</span>
      </td>
      <td>${grupoLabel}</td>
      <td>
        <span class="badge-unidad" title="${a.nombre_unidad ?? ""}">Unidad ${numUnidad}${nombreUnidad}</span>
      </td>
      <td>
        <span class="pond-chip chip-act">${a.ponderacion}%</span>
      </td>
      <td><span class="tipo-badge tipo-${(a.tipo_evaluacion || "").toLowerCase().substring(0, 3)}">${a.tipo_evaluacion || "—"}</span></td>
      <td style="font-size:0.82rem;color:var(--text-muted)">${a.fecha_entrega ? formatFecha(a.fecha_entrega) : "—"}</td>
      <td id="conteo-${a.id_actividad}">
        <span style="font-size:0.8rem;color:var(--text-muted)">—</span>
      </td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm ${esActiva ? "btn-primary" : "btn-outline"}"
                  onclick="abrirPanelCalificaciones(${a.id_actividad})"
                  title="Ver / calificar alumnos">
            <iconify-icon icon="mdi:account-group-outline"></iconify-icon>
            Calificar
          </button>
          <button class="btn btn-sm btn-danger-outline"
                  onclick="pedirEliminar(${a.id_actividad})"
                  title="Eliminar actividad">
            <iconify-icon icon="mdi:delete-outline"></iconify-icon>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ─────────────────────────────────────────────────────────────────────
//  REGISTRAR ACTIVIDAD
// ─────────────────────────────────────────────────────────────────────
async function registrarActividad() {
  const token = localStorage.getItem("token");

  const actividad = {
    id_grupo: document.getElementById("grupoActividad").value,
    id_unidad: document.getElementById("unidadActividad").value,
    nombre_actividad: document.getElementById("nombreActividad").value.trim(),
    ponderacion: document.getElementById("ponderacion").value,
    tipo_evaluacion:
      document.getElementById("tipoEvaluacion").value || "Sumativa",
    fecha_entrega: document.getElementById("fechaEntrega").value || null,
  };

  if (!actividad.id_grupo) {
    mostrarToast("Selecciona un grupo", "error");
    return;
  }
  if (!actividad.id_unidad) {
    mostrarToast("Selecciona una unidad", "error");
    return;
  }
  if (!actividad.nombre_actividad) {
    mostrarToast("Escribe el nombre de la actividad", "error");
    return;
  }
  if (!actividad.ponderacion || parseFloat(actividad.ponderacion) <= 0) {
    mostrarToast("Ingresa una ponderación válida (mayor a 0)", "error");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/actividades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(actividad),
    });

    // Parsear JSON independientemente del status code
    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: `Error del servidor (${res.status})` };
    }

    if (res.ok && data.success) {
      const porcRestante = 100 - (data.total_ponderacion ?? 0);
      mostrarToast(
        `Actividad registrada. Ponderación acumulada: ${data.total_ponderacion}%` +
          (porcRestante > 0
            ? ` (falta ${porcRestante.toFixed(0)}%)`
            : " ✓ Completa"),
        "success",
      );
      limpiarFormActividad();
      await cargarActividades();
    } else {
      mostrarToast(data.error || "Error al registrar la actividad", "error");
    }
  } catch (e) {
    console.error(e);
    mostrarToast("Error de conexión con el servidor", "error");
  }
}

function limpiarFormActividad() {
  document.getElementById("grupoActividad").value = "";
  document.getElementById("unidadActividad").innerHTML =
    `<option value="">-- Selecciona unidad --</option>`;
  document.getElementById("nombreActividad").value = "";
  document.getElementById("ponderacion").value = "";
  document.getElementById("tipoEvaluacion").value = "";
  document.getElementById("fechaEntrega").value = "";
}

// ─────────────────────────────────────────────────────────────────────
//  PANEL DE CALIFICACIONES POR ACTIVIDAD
// ─────────────────────────────────────────────────────────────────────
async function abrirPanelCalificaciones(id_actividad) {
  const token = localStorage.getItem("token");
  const act = todasActividades.find((a) => a.id_actividad === id_actividad);
  if (!act) return;

  actividadActiva = act;
  renderTablaActividades(
    todasActividades.filter((a) => {
      const g = document.getElementById("filtroGrupo").value;
      const u = document.getElementById("filtroUnidad").value;
      const t = document.getElementById("buscarActividad").value.toLowerCase();
      if (g && String(a.id_grupo) !== g) return false;
      if (u && String(a.id_unidad) !== u) return false;
      if (t && !a.nombre_actividad.toLowerCase().includes(t)) return false;
      return true;
    }),
  );

  const grupo = gruposMap[act.id_grupo];
  const numUnidad = act.numero_unidad ?? act.id_unidad;
  document.getElementById("tituloPanelCal").textContent =
    `Calificaciones — ${act.nombre_actividad}`;
  document.getElementById("infoPanelCal").innerHTML = `
    <span class="info-chip"><iconify-icon icon="mdi:school-outline"></iconify-icon>${grupo?.nombre_materia || "Grupo " + act.id_grupo}</span>
    <span class="badge-unidad" style="margin-left:8px">Unidad ${numUnidad}</span>
    <span class="pond-chip chip-act" style="margin-left:8px">${act.ponderacion}% de la unidad</span>
    <span class="tipo-badge tipo-${(act.tipo_evaluacion || "").toLowerCase().substring(0, 3)}" style="margin-left:8px">${act.tipo_evaluacion || ""}</span>
  `;

  const panel = document.getElementById("panelCalActividad");
  panel.style.display = "block";
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  const tbody = document.getElementById("tbodyCal");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)"><iconify-icon icon="mdi:loading" style="animation:spin 1s linear infinite"></iconify-icon> Cargando alumnos...</td></tr>`;

  try {
    const res = await fetch(
      `${BASE_URL}/api/resultado-actividad/actividad/${id_actividad}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const alumnos = await res.json();

    if (!Array.isArray(alumnos) || alumnos.length === 0) {
      await cargarAlumnosSinInscripcion(act);
    } else {
      renderTablaCal(alumnos, act);
    }

    const entregados = Array.isArray(alumnos)
      ? alumnos.filter((a) => a.estatus === "Validada").length
      : 0;
    const total = Array.isArray(alumnos) ? alumnos.length : 0;
    const conteo = document.getElementById(`conteo-${id_actividad}`);
    if (conteo) {
      conteo.innerHTML = `<span style="font-size:0.8rem">${entregados}/${total} <span style="color:var(--text-muted)">entregaron</span></span>`;
    }
  } catch (e) {
    console.error(e);
    await cargarAlumnosSinInscripcion(act);
  }
}

async function cargarAlumnosSinInscripcion(act) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${BASE_URL}/api/alumnos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const alumnos = await res.json();
    const datos = alumnos.map((a) => ({
      matricula: a.matricula,
      nombre_alumno: `${a.nombre} ${a.apellido_paterno}`,
      calificacion_obtenida: null,
      estatus: null,
    }));
    renderTablaCal(datos, act);
  } catch (e) {
    document.getElementById("tbodyCal").innerHTML =
      `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No se pudo cargar la lista de alumnos.</td></tr>`;
  }
}

function renderTablaCal(alumnos, act) {
  const tbody = document.getElementById("tbodyCal");
  const grupo = gruposMap[act.id_grupo];

  if (alumnos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">No hay alumnos en este grupo. Inscríbelos primero.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  alumnos.forEach((a) => {
    const entrego = a.estatus === "Validada";
    const esNP = a.estatus === "NP";
    const calVal = a.calificacion_obtenida ?? "";

    const tr = document.createElement("tr");
    tr.dataset.matricula = a.matricula;

    tr.innerHTML = `
      <td class="td-alumno">${a.nombre_alumno}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${a.matricula}</td>
      <td style="font-size:0.82rem">${grupo?.nombre_materia || "—"}</td>
      <td style="text-align:center">
        <label class="toggle-entrego" title="${entrego ? "Entregado" : "No entregado"}">
          <input type="checkbox" class="chk-entrego" data-matricula="${a.matricula}"
                 ${entrego ? "checked" : ""} onchange="toggleEntrego(this)" />
          <span class="toggle-track-cal"></span>
        </label>
      </td>
      <td>
        <input class="cal-input" type="number" min="0" max="100"
               placeholder="0"
               value="${calVal}"
               data-matricula="${a.matricula}"
               ${esNP ? 'disabled title="Marcado como NP"' : ""}
               oninput="actualizarEstatusFila(this)" />
      </td>
      <td id="estatus-${a.matricula}">
        ${renderEstatusBadge(a.estatus, a.calificacion_obtenida)}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderEstatusBadge(estatus, calificacion) {
  if (
    estatus === "NP" ||
    (!estatus && calificacion === null && calificacion !== 0)
  )
    return `<span class="badge-estatus badge-np">NP</span>`;
  if (estatus === "Validada") {
    const aprobado = parseFloat(calificacion) >= 60;
    return `<span class="badge-estatus ${aprobado ? "badge-aprobado" : "badge-reprobado"}">${aprobado ? "Aprobado" : "Reprobado"}</span>`;
  }
  return `<span class="badge-estatus badge-pendiente">Pendiente</span>`;
}

function toggleEntrego(chk) {
  const mat = chk.dataset.matricula;
  const tr = document.querySelector(`tr[data-matricula="${mat}"]`);
  const calInput = tr.querySelector(".cal-input");
  const entrego = chk.checked;

  if (!entrego) {
    calInput.disabled = true;
    calInput.value = "";
  } else {
    calInput.disabled = false;
    if (!calInput.value) calInput.value = "0";
  }
  actualizarEstatusFilaPorMatricula(mat);
}

function actualizarEstatusFila(inp) {
  actualizarEstatusFilaPorMatricula(inp.dataset.matricula);
}

function actualizarEstatusFilaPorMatricula(mat) {
  const tr = document.querySelector(`tr[data-matricula="${mat}"]`);
  if (!tr) return;
  const chk = tr.querySelector(".chk-entrego");
  const calInput = tr.querySelector(".cal-input");
  const estatusEl = document.getElementById(`estatus-${mat}`);
  if (!estatusEl) return;

  const entrego = chk.checked;
  const cal = parseFloat(calInput.value);

  let badge;
  if (!entrego) {
    badge = `<span class="badge-estatus badge-np">NP</span>`;
  } else if (isNaN(cal)) {
    badge = `<span class="badge-estatus badge-pendiente">Pendiente</span>`;
  } else {
    const aprobado = cal >= 60;
    badge = `<span class="badge-estatus ${aprobado ? "badge-aprobado" : "badge-reprobado"}">${aprobado ? "Aprobado" : "Reprobado"}</span>`;
  }
  estatusEl.innerHTML = badge;
}

function marcarTodosNP() {
  document.querySelectorAll("#tbodyCal tr").forEach((tr) => {
    const mat = tr.dataset.matricula;
    const chk = tr.querySelector(".chk-entrego");
    const calInput = tr.querySelector(".cal-input");
    if (!chk) return;
    chk.checked = false;
    calInput.disabled = true;
    calInput.value = "";
    actualizarEstatusFilaPorMatricula(mat);
  });
}

function marcarTodosEntregados() {
  document.querySelectorAll("#tbodyCal tr").forEach((tr) => {
    const mat = tr.dataset.matricula;
    const chk = tr.querySelector(".chk-entrego");
    const calInput = tr.querySelector(".cal-input");
    if (!chk) return;
    chk.checked = true;
    calInput.disabled = false;
    if (!calInput.value) calInput.value = "0";
    actualizarEstatusFilaPorMatricula(mat);
  });
}

async function guardarCalificacionesActividad() {
  if (!actividadActiva) return;
  const token = localStorage.getItem("token");

  const resultados = [];
  document.querySelectorAll("#tbodyCal tr").forEach((tr) => {
    const mat = tr.dataset.matricula;
    const chk = tr.querySelector(".chk-entrego");
    const calInput = tr.querySelector(".cal-input");
    if (!mat) return;

    const entrego = chk?.checked;
    const cal = parseFloat(calInput?.value);

    resultados.push({
      matricula: mat,
      calificacion_obtenida: entrego && !isNaN(cal) ? cal : null,
      estatus: entrego ? "Validada" : "NP",
    });
  });

  if (resultados.length === 0) {
    mostrarToast("No hay alumnos para guardar", "error");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/resultado-actividad/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id_actividad: actividadActiva.id_actividad,
        resultados,
      }),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: "Error del servidor" };
    }

    if (res.ok && data.success) {
      mostrarToast(`${data.guardados} calificaciones guardadas`, "success");
    } else {
      mostrarToast(data.error || "Error al guardar", "error");
    }
  } catch (e) {
    mostrarToast("Error de conexión", "error");
  }
}

function cerrarPanelCal() {
  document.getElementById("panelCalActividad").style.display = "none";
  actividadActiva = null;
  renderTablaActividades(todasActividades);
}

// ─────────────────────────────────────────────────────────────────────
//  ELIMINAR ACTIVIDAD
// ─────────────────────────────────────────────────────────────────────
let idEliminarPendiente = null;

function pedirEliminar(id) {
  idEliminarPendiente = id;
  document.getElementById("modalEliminar").classList.add("visible");
  document.getElementById("btnConfirmarEliminar").onclick = () =>
    confirmarEliminar(id);
}

async function confirmarEliminar(id) {
  cerrarModal("modalEliminar");
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${BASE_URL}/api/actividades/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: "Error del servidor" };
    }

    if (res.ok && data.success) {
      mostrarToast("Actividad eliminada", "success");
      if (actividadActiva?.id_actividad === id) cerrarPanelCal();
      await cargarActividades();
    } else {
      mostrarToast(data.error || "Error al eliminar", "error");
    }
  } catch (e) {
    mostrarToast("Error de conexión", "error");
  }
}

// ─────────────────────────────────────────────────────────────────────
//  UTILIDADES
// ─────────────────────────────────────────────────────────────────────
function formatFecha(f) {
  if (!f) return "—";
  const d = new Date(f);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function abrirModal(id) {
  document.getElementById(id).classList.add("visible");
}
function cerrarModal(id) {
  document.getElementById(id).classList.remove("visible");
}

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("visible");
  });
});

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
  toast._t = setTimeout(() => toast.classList.remove("visible"), 4000);
}

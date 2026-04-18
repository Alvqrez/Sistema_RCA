const BASE_URL = "http://localhost:3000";

let todasActividades = [];
let actividadActiva = null;
let gruposMap = {}; // id_grupo → grupo completo
let unidadesGrupoMap = {}; // id_grupo → [{ id_unidad, nombre_unidad, numero_unidad }]

(async function init() {
  const hoy = new Date().toISOString().split("T")[0];
  const fechaInput = document.getElementById("fechaEntrega");
  if (fechaInput) fechaInput.min = hoy;

  await cargarGruposSelect();
  await cargarActividades();
})();

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

async function cargarUnidadesParaGrupo(idGrupo) {
  const token = localStorage.getItem("token");
  if (unidadesGrupoMap[idGrupo]) return unidadesGrupoMap[idGrupo];

  // 1) desde grupo_unidad
  try {
    const res = await fetch(`${BASE_URL}/api/grupos/${idGrupo}/unidades`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const unidades = data.map((u, i) => ({
          ...u,
          numero_unidad: u.numero_unidad ?? i + 1,
        }));
        unidadesGrupoMap[idGrupo] = unidades;
        return unidades;
      }
    }
  } catch (_) {}

  // 2) fallback: unidades de la materia
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
    } catch (_) {}
  }
  return [];
}

async function onFiltroGrupoChange() {
  const idGrupo = document.getElementById("filtroGrupo").value;
  const selUni = document.getElementById("filtroUnidad");
  selUni.innerHTML = `<option value="">Todas las unidades</option>`;

  if (idGrupo) {
    const unidades = await cargarUnidadesParaGrupo(idGrupo);
    unidades.forEach((u) => {
      selUni.innerHTML += `<option value="${u.id_unidad}">(Unidad ${u.numero_unidad}) ${u.nombre_unidad}</option>`;
    });
  }
  filtrarActividades();
}

document
  .getElementById("grupoActividad")
  .addEventListener("change", async function () {
    const selUni = document.getElementById("unidadActividad");
    selUni.innerHTML = `<option value="">Cargando…</option>`;
    selUni.disabled = true;

    if (!this.value) {
      selUni.innerHTML = `<option value="">-- Selecciona unidad --</option>`;
      selUni.disabled = false;
      actualizarIndicadorPonderacion();
      return;
    }

    const unidades = await cargarUnidadesParaGrupo(this.value);
    selUni.disabled = false;

    if (unidades.length === 0) {
      selUni.innerHTML = `<option value="">Sin unidades disponibles</option>`;
      selUni.disabled = true;
      // Mostrar aviso con link
      const aviso = document.getElementById("avisoSinUnidades");
      if (aviso) aviso.style.display = "block";
      actualizarIndicadorPonderacion();
      return;
    }

    // Y cuando SÍ hay unidades, ocultar el aviso:
    const aviso = document.getElementById("avisoSinUnidades");
    if (aviso) aviso.style.display = "none";
    selUni.disabled = false;

    selUni.innerHTML = `<option value="">-- Selecciona unidad --</option>`;
    unidades.forEach((u) => {
      selUni.innerHTML += `<option value="${u.id_unidad}">(Unidad ${u.numero_unidad}) ${u.nombre_unidad}</option>`;
    });
    actualizarIndicadorPonderacion();
  });

document
  .getElementById("unidadActividad")
  .addEventListener("change", function () {
    actualizarIndicadorPonderacion();
  });

function actualizarIndicadorPonderacion() {
  const idGrupo = document.getElementById("grupoActividad").value;
  const idUnidad = document.getElementById("unidadActividad").value;
  const pondNueva =
    parseFloat(document.getElementById("ponderacion").value) || 0;

  const bigEl = document.querySelector("#indicadorPonderacion .pond-big");
  const label = document.querySelector("#indicadorPonderacion .pond-label");
  const barFill = document.getElementById("pondBarFill");

  if (!bigEl) return;

  if (!idGrupo || !idUnidad) {
    bigEl.textContent = "—";
    bigEl.style.color = "var(--text-muted)";
    label.textContent = "Selecciona grupo y unidad";
    barFill.style.width = "0%";
    barFill.style.background = "var(--primary)";
    return;
  }

  const usado = todasActividades
    .filter(
      (a) =>
        String(a.id_grupo) === String(idGrupo) &&
        String(a.id_unidad) === String(idUnidad),
    )
    .reduce((s, a) => s + parseFloat(a.ponderacion), 0);

  const disponible = Math.max(0, 100 - usado);
  const conNueva = usado + pondNueva;
  const excede = conNueva > 100;
  const color = excede
    ? "var(--danger)"
    : disponible === 0
      ? "var(--danger)"
      : disponible < 20
        ? "var(--warning, #f59e0b)"
        : "var(--success)";
  const barColor = conNueva > 100 ? "var(--danger)" : "var(--primary)";
  const barWidth = Math.min(100, conNueva || usado);

  bigEl.textContent = excede ? "¡Excede!" : `${disponible}%`;
  bigEl.style.color = color;
  label.textContent = `${usado}% usado${pondNueva > 0 ? ` + ${pondNueva}% nueva = ${conNueva}%` : ""} · ${disponible}% disponible`;
  barFill.style.width = barWidth + "%";
  barFill.style.background = barColor;
}

// Llama también cuando cambia la ponderacion input (ya conectado con oninput en HTML)
function actualizarIndicadorEnTiempoReal() {
  actualizarIndicadorPonderacion();
}

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
    renderResumenActividades();
    actualizarIndicadorPonderacion(); // actualiza indicador con datos frescos
  } catch (e) {
    console.error("No se pudo cargar actividades:", e);
    mostrarToast("Error de conexión al cargar actividades", "error");
  }
}

// ── RESUMEN DE PONDERACIONES POR GRUPO/UNIDAD ─────────────────────
function renderResumenActividades() {
  const cont = document.getElementById("resumenCards");
  if (!cont) return;
  if (!todasActividades.length) {
    cont.innerHTML =
      '<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">Sin actividades registradas aún.</div>';
    return;
  }

  // Agrupar por grupo+unidad
  const mapa = {};
  todasActividades.forEach((a) => {
    const key = `${a.id_grupo}__${a.id_unidad}`;
    if (!mapa[key]) {
      mapa[key] = {
        grupo: gruposMap[a.id_grupo],
        unidad: a.nombre_unidad || `Unidad ${a.id_unidad}`,
        total: 0,
        cantidad: 0,
      };
    }
    mapa[key].total += parseFloat(a.ponderacion);
    mapa[key].cantidad += 1;
  });

  cont.innerHTML = Object.values(mapa)
    .map((item) => {
      const pct = Math.round(item.total);
      const completa = pct >= 100;
      const color = completa
        ? "var(--success)"
        : pct > 75
          ? "var(--warning,#f59e0b)"
          : "var(--primary)";
      const bg = completa
        ? "var(--success-light,#d1fae5)"
        : "rgba(59,130,246,0.07)";

      return `
        <div style="background:${bg}; border:1.5px solid ${color}40; border-radius:12px;
                    padding:14px 18px; min-width:200px; flex:1;">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;">
                ${item.grupo?.nombre_materia || "Grupo"} · ${item.unidad}
            </div>
            <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px;">
                <span style="font-size:1.6rem;font-weight:700;color:${color};">${pct}%</span>
                <span style="font-size:0.78rem;color:var(--text-muted);">${item.cantidad} actividad${item.cantidad !== 1 ? "es" : ""}</span>
            </div>
            <div style="height:5px;background:var(--border);border-radius:99px;overflow:hidden;">
                <div style="height:100%;width:${Math.min(pct, 100)}%;background:${color};border-radius:99px;transition:width 0.4s;"></div>
            </div>
            ${
              completa
                ? `<div style="font-size:0.72rem;color:${color};margin-top:5px;font-weight:600;">✓ Unidad completa</div>`
                : `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:5px;">Disponible: ${100 - pct}%</div>`
            }
        </div>`;
    })
    .join("");
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
        <td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">
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

    const numUnidad = a.numero_unidad ?? a.id_unidad;
    const nombreUnidad = a.nombre_unidad ? ` — ${a.nombre_unidad}` : "";
    const esActiva =
      actividadActiva && actividadActiva.id_actividad === a.id_actividad;

    const tr = document.createElement("tr");
    tr.id = `fila-act-${a.id_actividad}`;
    if (esActiva) tr.classList.add("fila-activa");

    const tipoMap = {
      Sumativa: "tipo-sum",
      Formativa: "tipo-for",
      Diagnostica: "tipo-dia",
    };
    const tipoLabel = {
      Sumativa: "Sumativa",
      Formativa: "Formativa",
      Diagnostica: "Diagnóstica",
    };
    const tipoClass = tipoMap[a.tipo_evaluacion] || "tipo-sum";

    tr.innerHTML = `
      <td><span style="font-weight:600">${a.nombre_actividad}</span></td>
      <td>${grupoLabel}</td>
      <td>
        <span class="badge-unidad" title="${a.nombre_unidad ?? ""}">
          Unidad ${numUnidad}${nombreUnidad}
        </span>
      </td>
      <td><span class="pond-chip chip-act">${a.ponderacion}%</span></td>
      <td>
        <span class="tipo-badge ${tipoClass}">${tipoLabel[a.tipo_evaluacion] || a.tipo_evaluacion || "—"}</span>
      </td>
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
          <button class="btn btn-sm btn-outline"
                  onclick="editarActividad(${a.id_actividad})"
                  title="Editar actividad">
            <iconify-icon icon="mdi:pencil-outline"></iconify-icon>
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

async function registrarActividad() {
  const token = localStorage.getItem("token");

  const id_grupo = document.getElementById("grupoActividad").value;
  const id_unidad = document.getElementById("unidadActividad").value;
  const nombre_actividad = document
    .getElementById("nombreActividad")
    .value.trim();
  const ponderacion = document.getElementById("ponderacion").value;
  const fecha_entrega = document.getElementById("fechaEntrega").value || null;

  if (!id_grupo) {
    mostrarToast("Selecciona un grupo", "error");
    return;
  }
  if (!id_unidad) {
    mostrarToast("Selecciona una unidad", "error");
    return;
  }
  if (!nombre_actividad) {
    mostrarToast("Escribe el nombre de la actividad", "error");
    return;
  }
  if (!ponderacion || parseFloat(ponderacion) <= 0) {
    mostrarToast("Ingresa una ponderación válida (mayor a 0)", "error");
    return;
  }

  if (fecha_entrega) {
    const hoy = new Date().toISOString().split("T")[0];
    if (fecha_entrega < hoy) {
      mostrarToast("La fecha de entrega no puede ser en el pasado", "error");
      return;
    }
  }

  const actividad = {
    id_grupo,
    id_unidad,
    nombre_actividad,
    ponderacion,
    tipo_evaluacion:
      document.getElementById("tipoEvaluacion")?.value || "Sumativa",
    fecha_entrega,
  };

  try {
    const res = await fetch(`${BASE_URL}/api/actividades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(actividad),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: `Error del servidor (${res.status})` };
    }

    if (res.ok && data.success) {
      const restante = 100 - (data.total_ponderacion ?? 0);
      mostrarToast(
        `Actividad registrada. Acumulado: ${data.total_ponderacion}%` +
          (restante > 0
            ? ` · Disponible: ${restante.toFixed(0)}%`
            : " ✓ Unidad completa"),
        "success",
      );
      limpiarFormActividad();
      await cargarActividades();
    } else {
      mostrarToast(data.error || "Error al registrar la actividad", "error");
    }
  } catch (e) {
    mostrarToast("Error de conexión con el servidor", "error");
  }
}

function limpiarFormActividad() {
  document.getElementById("grupoActividad").value = "";
  document.getElementById("unidadActividad").innerHTML =
    `<option value="">-- Selecciona unidad --</option>`;
  document.getElementById("nombreActividad").value = "";
  document.getElementById("ponderacion").value = "";
  document.getElementById("fechaEntrega").value = "";
  actualizarIndicadorPonderacion();
}

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
  `;

  const panel = document.getElementById("panelCalActividad");

  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  const tbody = document.getElementById("tbodyCal");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)"><iconify-icon icon="mdi:loading" style="animation:spin 1s linear infinite"></iconify-icon> Cargando…</td></tr>`;

  try {
    const res = await fetch(
      `${BASE_URL}/api/resultado-actividad/actividad/${id_actividad}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
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
    if (conteo)
      conteo.innerHTML = `<span style="font-size:0.8rem">${entregados}/${total} <span style="color:var(--text-muted)">entregaron</span></span>`;
  } catch (e) {
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
    renderTablaCal(
      alumnos.map((a) => ({
        matricula: a.matricula,
        nombre_alumno: `${a.nombre} ${a.apellido_paterno}`,
        calificacion_obtenida: null,
        estatus: null,
      })),
      act,
    );
  } catch {
    document.getElementById("tbodyCal").innerHTML =
      `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No se pudo cargar la lista de alumnos.</td></tr>`;
  }
}

function renderTablaCal(alumnos, act) {
  const tbody = document.getElementById("tbodyCal");
  const grupo = gruposMap[act.id_grupo];

  if (alumnos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">No hay alumnos en este grupo.</td></tr>`;
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
        <label class="toggle-entrego">
          <input type="checkbox" class="chk-entrego" data-matricula="${a.matricula}"
                 ${entrego ? "checked" : ""} onchange="toggleEntrego(this)" />
          <span class="toggle-track-cal"></span>
        </label>
      </td>
      <td>
        <input class="cal-input" type="number" min="0" max="100" placeholder="0"
               value="${calVal}" data-matricula="${a.matricula}"
               ${esNP ? 'disabled title="Marcado como NP"' : ""}
               oninput="actualizarEstatusFila(this)" />
      </td>
      <td id="estatus-${a.matricula}">${renderEstatusBadge(a.estatus, a.calificacion_obtenida)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderEstatusBadge(estatus, cal) {
  if (estatus === "NP" || (!estatus && cal === null && cal !== 0))
    return `<span class="badge-estatus badge-np">NP</span>`;
  if (estatus === "Validada") {
    const ap = parseFloat(cal) >= 60;
    return `<span class="badge-estatus ${ap ? "badge-aprobado" : "badge-reprobado"}">${ap ? "Aprobado" : "Reprobado"}</span>`;
  }
  return `<span class="badge-estatus badge-pendiente">Pendiente</span>`;
}

function toggleEntrego(chk) {
  const mat = chk.dataset.matricula;
  const tr = document.querySelector(`tr[data-matricula="${mat}"]`);
  const inp = tr.querySelector(".cal-input");
  chk.checked
    ? ((inp.disabled = false), !inp.value && (inp.value = "0"))
    : ((inp.disabled = true), (inp.value = ""));
  actualizarEstatusFilaPorMatricula(mat);
}
function actualizarEstatusFila(inp) {
  actualizarEstatusFilaPorMatricula(inp.dataset.matricula);
}
function actualizarEstatusFilaPorMatricula(mat) {
  const tr = document.querySelector(`tr[data-matricula="${mat}"]`);
  if (!tr) return;
  const chk = tr.querySelector(".chk-entrego");
  const inp = tr.querySelector(".cal-input");
  const el = document.getElementById(`estatus-${mat}`);
  if (!el) return;
  const cal = parseFloat(inp.value);
  el.innerHTML = !chk.checked
    ? `<span class="badge-estatus badge-np">NP</span>`
    : isNaN(cal)
      ? `<span class="badge-estatus badge-pendiente">Pendiente</span>`
      : `<span class="badge-estatus ${cal >= 60 ? "badge-aprobado" : "badge-reprobado"}">${cal >= 60 ? "Aprobado" : "Reprobado"}</span>`;
}

function marcarTodosNP() {
  document.querySelectorAll("#tbodyCal tr").forEach((tr) => {
    const chk = tr.querySelector(".chk-entrego");
    const inp = tr.querySelector(".cal-input");
    if (!chk) return;
    chk.checked = false;
    inp.disabled = true;
    inp.value = "";
    actualizarEstatusFilaPorMatricula(tr.dataset.matricula);
  });
}
function marcarTodosEntregados() {
  document.querySelectorAll("#tbodyCal tr").forEach((tr) => {
    const chk = tr.querySelector(".chk-entrego");
    const inp = tr.querySelector(".cal-input");
    if (!chk) return;
    chk.checked = true;
    inp.disabled = false;
    if (!inp.value) inp.value = "0";
    actualizarEstatusFilaPorMatricula(tr.dataset.matricula);
  });
}

async function guardarCalificacionesActividad() {
  if (!actividadActiva) return;
  const token = localStorage.getItem("token");

  const resultados = [];
  document.querySelectorAll("#tbodyCal tr").forEach((tr) => {
    const mat = tr.dataset.matricula;
    const chk = tr.querySelector(".chk-entrego");
    const inp = tr.querySelector(".cal-input");
    if (!mat) return;
    resultados.push({
      matricula: mat,
      calificacion_obtenida:
        chk?.checked && !isNaN(parseFloat(inp?.value))
          ? parseFloat(inp.value)
          : null,
      estatus: chk?.checked ? "Validada" : "NP",
    });
  });

  if (!resultados.length) {
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
    res.ok && data.success
      ? mostrarToast(`${data.guardados} calificaciones guardadas`, "success")
      : mostrarToast(data.error || "Error al guardar", "error");
  } catch {
    mostrarToast("Error de conexión", "error");
  }
}

function cerrarPanelCal() {
  document.getElementById("panelCalActividad").style.display = "none";
  actividadActiva = null;
  renderTablaActividades(todasActividades);
}

function pedirEliminar(id) {
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
      mostrarToast("Actividad eliminada correctamente", "success");
      if (actividadActiva?.id_actividad === id) cerrarPanelCal();
      await cargarActividades();
    } else {
      mostrarToast(data.error || "Error al eliminar", "error");
    }
  } catch {
    mostrarToast("Error de conexión", "error");
  }
}

function toggleCard(btn) {
  const card = btn.closest(".card-collapsible");
  card.classList.toggle("collapsed");
  btn.title = card.classList.contains("collapsed") ? "Expandir" : "Contraer";
}

function abrirModal(id) {
  document.getElementById(id)?.classList.add("visible");
}
function cerrarModal(id) {
  document.getElementById(id)?.classList.remove("visible");
}

document.querySelectorAll(".modal-overlay").forEach((o) => {
  o.addEventListener("click", (e) => {
    if (e.target === o) o.classList.remove("visible");
  });
});

function formatFecha(f) {
  // Devuelve DD/MM/YYYY — usa fmtFecha global del sidebar si existe,
  // o la implementación local como respaldo
  if (typeof fmtFecha === "function") return fmtFecha(f);
  if (!f) return "—";
  const str = f.toString().split("T")[0];
  const [anio, mes, dia] = str.split("-");
  if (!anio || !mes || !dia) return str;
  return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anio}`;
}

function editarActividad(id) {
  const act = todasActividades.find((a) => a.id_actividad === id);
  if (!act) return;

  document.getElementById("editIdActividad").value = id;
  document.getElementById("editNombre").value = act.nombre_actividad;
  document.getElementById("editPonderacion").value = act.ponderacion;
  document.getElementById("editFecha").value = act.fecha_entrega
    ? act.fecha_entrega.toString().split("T")[0]
    : "";

  const sel = document.getElementById("editTipo");
  if (sel) sel.value = act.tipo_evaluacion || "Sumativa";

  // Mostrar cuánto disponible sin contar la actividad actual
  const usadoSinEsta = todasActividades
    .filter(
      (a) =>
        String(a.id_grupo) === String(act.id_grupo) &&
        String(a.id_unidad) === String(act.id_unidad) &&
        a.id_actividad !== id,
    )
    .reduce((s, a) => s + parseFloat(a.ponderacion), 0);
  const disponible = 100 - usadoSinEsta;
  const hint = document.getElementById("editPondHint");
  if (hint)
    hint.textContent = `Máximo disponible: ${disponible}% (otras actividades usan ${usadoSinEsta}%)`;

  const errEl = document.getElementById("editError");
  if (errEl) errEl.style.display = "none";

  document.getElementById("modalEditar").classList.add("visible");
}

async function guardarEdicionActividad() {
  const token = localStorage.getItem("token");
  const id = document.getElementById("editIdActividad").value;
  const nombre_actividad = document.getElementById("editNombre").value.trim();
  const ponderacion = parseFloat(
    document.getElementById("editPonderacion").value,
  );
  const tipo_evaluacion =
    document.getElementById("editTipo")?.value || "Sumativa";
  const fecha_entrega = document.getElementById("editFecha").value || null;
  const errEl = document.getElementById("editError");

  errEl.style.display = "none";

  if (!nombre_actividad) {
    errEl.textContent = "El nombre no puede estar vacío.";
    errEl.style.display = "block";
    return;
  }
  if (isNaN(ponderacion) || ponderacion <= 0 || ponderacion > 100) {
    errEl.textContent = "La ponderación debe ser un número entre 1 y 100.";
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("btnGuardarEdicion");
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite"></span> Guardando…`;

  try {
    const res = await fetch(`${BASE_URL}/api/actividades/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nombre_actividad,
        ponderacion,
        tipo_evaluacion,
        fecha_entrega,
      }),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: "Error del servidor" };
    }

    if (res.ok && (data.success || data.message)) {
      mostrarToast("Actividad actualizada correctamente", "success");
      cerrarModal("modalEditar");
      await cargarActividades();
    } else {
      errEl.textContent = data.error || "No se pudo actualizar la actividad.";
      errEl.style.display = "block";
    }
  } catch {
    errEl.textContent = "Error de conexión con el servidor.";
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="mdi:content-save-outline"></iconify-icon> Guardar cambios`;
  }
}

if (typeof showToast === "function") {
  showToast(msg, tipo);
} else {
  // Fallback independiente por si sidebar no cargó
  let t = document.getElementById("rca-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "rca-toast";
    Object.assign(t.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      padding: "12px 20px",
      borderRadius: "8px",
      fontFamily: "Inter,sans-serif",
      fontSize: "0.9rem",
      fontWeight: "600",
      zIndex: "9999",
      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      transition: "opacity 0.3s",
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background =
    tipo === "success" ? "#059669" : tipo === "error" ? "#dc2626" : "#1e40af";
  t.style.color = "#fff";
  t.style.opacity = "1";
  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.style.opacity = "0";
  }, 3000);
}

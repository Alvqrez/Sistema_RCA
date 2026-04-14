// frontend/js/unidades.js
const BASE_URL = "http://localhost:3000";
const rol = localStorage.getItem("rol");
const token = localStorage.getItem("token");

// Estado local de agrupación (antes de guardar)
let unidadesGrupoActual = [];

// ── Toggle plegable local ─────────────────────────────────────────────
function toggleCardLocal(btn) {
  const card = btn.closest(".card-collapsible");
  card.classList.toggle("collapsed");
  btn.title = card.classList.contains("collapsed") ? "Expandir" : "Contraer";
}

// ── Poblar select de materias ─────────────────────────────────────────
async function poblarSelectMaterias() {
  const url =
    rol === "maestro"
      ? `${BASE_URL}/api/unidades/mis-materias`
      : `${BASE_URL}/api/materias`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      window.location.href = "login.html";
      return;
    }
    const mat = await res.json();
    const select = document.getElementById("claveMateria");
    select.innerHTML = `<option value="">-- Selecciona una materia --</option>`;

    mat.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.clave_materia;
      opt.textContent = `${m.clave_materia} — ${m.nombre_materia}`;
      if (m.no_unidades) opt.dataset.noUnidades = m.no_unidades;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      const opt = select.options[select.selectedIndex];
      const hint = document.getElementById("hintUnidades");
      const total = opt.dataset.noUnidades;
      hint.textContent = total
        ? `Esta materia tiene ${total} unidad(es) en el plan.`
        : "";
      if (select.value) cargarUnidades(select.value);
      else cargarUnidades();
    });
  } catch (e) {
    console.error(e);
  }
}

// ── Poblar select de grupos (para la vista visual) ────────────────────
async function poblarSelectGrupos() {
  const url =
    rol === "maestro"
      ? `${BASE_URL}/api/grupos/mis-grupos`
      : `${BASE_URL}/api/grupos`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const grupos = await res.json();
    const sel = document.getElementById("selGrupoUnidades");
    sel.innerHTML = `<option value="">-- Elige un grupo --</option>`;
    grupos.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id_grupo;
      opt.textContent = `${g.nombre_materia} — ${g.nombre_maestro} (${g.descripcion_periodo || "Periodo " + g.id_periodo})`;
      opt.dataset.claveMateria = g.clave_materia;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
  }
}

// ── Cargar tabla clásica ──────────────────────────────────────────────
async function cargarUnidades(claveFiltro = null) {
  const url = claveFiltro
    ? `${BASE_URL}/api/unidades/materia/${claveFiltro}`
    : `${BASE_URL}/api/unidades`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    window.location.href = "login.html";
    return;
  }

  const unidades = await res.json();
  const tabla = document.getElementById("tablaUnidades");
  tabla.innerHTML = "";

  if (!unidades.length) {
    tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Sin unidades registradas</td></tr>`;
    return;
  }

  unidades.forEach((u) => {
    const badgeClass =
      u.estatus === "Cerrada"
        ? "badge-np"
        : u.estatus === "En curso"
          ? "badge-aprobado"
          : "badge-pendiente";
    tabla.innerHTML += `
            <tr>
                <td>${u.id_unidad}</td>
                <td><span class="badge-unidad">${u.clave_materia}</span></td>
                <td><strong>${u.nombre_unidad}</strong></td>
                <td><span class="badge-estatus ${badgeClass}">${u.estatus}</span></td>
                <td style="font-size:0.82rem;color:var(--text-muted)">${fmtFecha(u.fecha_cierre)}</td>
                <td>
                    <button class="btn btn-sm btn-danger-outline" onclick="eliminarUnidad(${u.id_unidad})">
                        <iconify-icon icon="mdi:delete-outline"></iconify-icon>
                    </button>
                </td>
            </tr>`;
  });
}

// ── VISTA VISUAL con fusionar/dividir ─────────────────────────────────
async function cargarUnidadesGrupoVisual() {
  const idGrupo = document.getElementById("selGrupoUnidades").value;
  const lista = document.getElementById("listaUnidades");
  const acciones = document.getElementById("accionesUnidadConfig");

  if (!idGrupo) {
    lista.innerHTML = `<div class="empty-state" style="padding:32px;text-align:center;color:var(--text-muted)">
            <iconify-icon icon="lucide:mouse-pointer-click" style="font-size:2rem;display:block;margin:0 auto 8px"></iconify-icon>
            <p>Selecciona un grupo para ver sus unidades</p></div>`;
    acciones.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/grupos/${idGrupo}/unidades`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let unidades = await res.json();

    if (!unidades.length) {
      const sel = document.getElementById("selGrupoUnidades");
      const claveMateria = sel.options[sel.selectedIndex]?.dataset.claveMateria || "";
      lista.innerHTML = `<div class="empty-state" style="padding:24px;text-align:center;color:var(--text-muted)">
                <iconify-icon icon="mdi:clipboard-off-outline" style="font-size:2rem;display:block;margin:0 auto 8px"></iconify-icon>
                <p>Este grupo no tiene unidades vinculadas todavía.</p>
                <small>Crea unidades para la materia del grupo primero, luego vincúlalas aquí.</small>
                <br><br>
                <button class="btn btn-primary" onclick="autoVincularUnidades(${idGrupo})">
                  <iconify-icon icon="mdi:link-variant-plus"></iconify-icon>
                  Vincular unidades de la materia
                </button>
              </div>`;
      acciones.style.display = "none";
      return;
    }

    // Asignar numero_unidad si no viene del servidor
    unidades = unidades.map((u, i) => ({
      ...u,
      numero_unidad: u.numero_unidad ?? i + 1,
    }));
    unidadesGrupoActual = JSON.parse(JSON.stringify(unidades)); // copia profunda

    renderListaUnidades(unidades);
    acciones.style.display = "flex";
  } catch (e) {
    lista.innerHTML = `<p style="color:var(--danger);padding:16px">Error al cargar unidades</p>`;
  }
}

function renderListaUnidades(unidades) {
  const lista = document.getElementById("listaUnidades");
  lista.innerHTML = "";

  // Agrupar fusionadas para mostrar el grupo
  const agrupaciones = {};
  unidades.forEach((u) => {
    if (u.agrupacion_id !== null && u.agrupacion_id !== undefined) {
      if (!agrupaciones[u.agrupacion_id]) agrupaciones[u.agrupacion_id] = [];
      agrupaciones[u.agrupacion_id].push(u.nombre_unidad);
    }
  });

  unidades.forEach((u) => {
    const tipo = u.tipo_config || "original";
    const grupLabel =
      tipo === "fusionada" && u.agrupacion_id != null
        ? `Fusionada con grupo ${u.agrupacion_id}`
        : tipo === "dividida"
          ? "Unidad dividida"
          : "Unidad original";

    const el = document.createElement("div");
    el.className = `unidad-item tipo-${tipo}`;
    el.dataset.idUnidad = u.id_unidad;
    el.dataset.tipo = tipo;
    el.dataset.agrupacion = u.agrupacion_id ?? "";
    el.innerHTML = `
            <div class="unidad-num">${u.numero_unidad}</div>
            <div class="unidad-info">
                <strong>${u.nombre_unidad}</strong><br>
                <small>${grupLabel} · Ponderación: ${u.ponderacion}%</small>
            </div>
            <span class="unidad-badge badge-${tipo}">${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</span>
            <div class="unidad-acciones">
                <button class="btn btn-sm btn-outline" title="Fusionar con otra unidad"
                        onclick="fusionarUnidad(${u.id_unidad}, event)">
                    <iconify-icon icon="mdi:link-variant"></iconify-icon>
                </button>
                <button class="btn btn-sm btn-outline" title="Marcar como dividida"
                        onclick="dividirUnidad(${u.id_unidad}, event)">
                    <iconify-icon icon="mdi:content-cut"></iconify-icon>
                </button>
                ${
                  tipo !== "original"
                    ? `
                <button class="btn btn-sm btn-outline" title="Restaurar a original"
                        onclick="restaurarUnidad(${u.id_unidad}, event)" style="color:var(--text-muted)">
                    <iconify-icon icon="mdi:restore"></iconify-icon>
                </button>`
                    : ""
                }
            </div>
        `;
    lista.appendChild(el);
  });
}

// ── Acciones de fusión/división ───────────────────────────────────────
function fusionarUnidad(idUnidad, event) {
  event.stopPropagation();
  const u = unidadesGrupoActual.find((x) => x.id_unidad === idUnidad);
  if (!u) return;

  // Pide con qué unidad fusionar
  const otras = unidadesGrupoActual.filter((x) => x.id_unidad !== idUnidad);
  if (!otras.length) {
    mostrarToast("No hay otras unidades para fusionar", "error");
    return;
  }

  const selOpc = otras
    .map((x) => `${x.numero_unidad}: ${x.nombre_unidad}`)
    .join("\n");
  const input = prompt(
    `¿Con qué unidad fusionar "${u.nombre_unidad}"?\nEscribe el número:\n\n${selOpc}`,
  );
  if (!input) return;

  const numObj = otras.find((x) => String(x.numero_unidad) === input.trim());
  if (!numObj) {
    mostrarToast("Número de unidad no encontrado", "error");
    return;
  }

  // Asignar mismo agrupacion_id a ambas
  const agrupId =
    Math.max(...unidadesGrupoActual.map((x) => x.agrupacion_id ?? 0)) + 1;
  [u, numObj].forEach((x) => {
    x.agrupacion_id = agrupId;
    x.tipo_config = "fusionada";
  });

  renderListaUnidades(unidadesGrupoActual);
  mostrarToast(`Unidades fusionadas (pendiente guardar)`, "success");
}

function dividirUnidad(idUnidad, event) {
  event.stopPropagation();
  const u = unidadesGrupoActual.find((x) => x.id_unidad === idUnidad);
  if (!u) return;
  u.tipo_config = "dividida";
  u.agrupacion_id = null;
  renderListaUnidades(unidadesGrupoActual);
  mostrarToast("Unidad marcada como dividida (pendiente guardar)", "success");
}

function restaurarUnidad(idUnidad, event) {
  event.stopPropagation();
  const u = unidadesGrupoActual.find((x) => x.id_unidad === idUnidad);
  if (!u) return;
  u.tipo_config = "original";
  u.agrupacion_id = null;
  renderListaUnidades(unidadesGrupoActual);
  mostrarToast("Unidad restaurada a original (pendiente guardar)", "success");
}

// ── Auto-vincular unidades de la materia al grupo ─────────────────────
async function autoVincularUnidades(idGrupo) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/grupos/${idGrupo}/unidades/auto-vincular`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    if (data.success) {
      mostrarToast(data.mensaje, data.vinculadas > 0 ? "success" : "error");
      if (data.vinculadas > 0) cargarUnidadesGrupoVisual();
    } else {
      mostrarToast(data.error || "Error al vincular", "error");
    }
  } catch (e) {
    mostrarToast("Error de conexión", "error");
  }
}

// ── Guardar configuración de agrupación ──────────────────────────────
async function guardarConfigAgrupacion() {
  const idGrupo = document.getElementById("selGrupoUnidades").value;
  if (!idGrupo) return;

  try {
    const res = await fetch(
      `${BASE_URL}/api/grupos/${idGrupo}/unidades/agrupacion`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ unidades: unidadesGrupoActual }),
      },
    );
    const data = await res.json();
    if (data.success) {
      mostrarToast("Configuración guardada correctamente", "success");
    } else {
      mostrarToast(data.error || "Error al guardar", "error");
    }
  } catch (e) {
    mostrarToast("Error de conexión", "error");
  }
}

// ── Registrar unidad ──────────────────────────────────────────────────
document
  .getElementById("formUnidad")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const clave = document.getElementById("claveMateria").value;
    if (!clave) {
      mostrarToast("Selecciona una materia", "error");
      return;
    }

    const unidad = {
      clave_materia: clave,
      nombre_unidad: document.getElementById("nombreUnidad").value,
      temario: document.getElementById("temario").value || null,
      estatus: document.getElementById("estatus").value,
      fecha_cierre: document.getElementById("fechaCierre").value || null,
    };

    const res = await fetch(`${BASE_URL}/api/unidades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(unidad),
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById("formUnidad").reset();
      mostrarToast("Unidad registrada correctamente", "success");
      cargarUnidades(clave);
      cargarUnidadesGrupoVisual();
    } else {
      mostrarToast(data.error || "Error al registrar", "error");
    }
  });

// ── Eliminar ──────────────────────────────────────────────────────────
async function eliminarUnidad(id) {
  if (!confirm("¿Eliminar esta unidad?")) return;
  const res = await fetch(`${BASE_URL}/api/unidades/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.success) {
    const clave = document.getElementById("claveMateria").value || null;
    cargarUnidades(clave);
    mostrarToast("Unidad eliminada", "success");
  } else {
    mostrarToast(data.error, "error");
  }
}

// ── Toast local ───────────────────────────────────────────────────────
function mostrarToast(msg, tipo = "success") {
  let t = document.getElementById("rca-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "rca-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `rca-toast rca-toast-${tipo} visible`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("visible"), 3200);
}

// ── Init ──────────────────────────────────────────────────────────────
(async function init() {
  await poblarSelectMaterias();
  await poblarSelectGrupos();

  if (rol === "administrador") {
    cargarUnidades();
  } else {
    document.getElementById("tablaUnidades").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">Selecciona una materia para ver sus unidades</td></tr>`;
  }
})();

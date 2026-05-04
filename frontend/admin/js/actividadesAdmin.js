// frontend/js/actividadesAdmin.js
// Gestión de actividades evaluables por materia — solo Administrador

// ─── Guard ────────────────────────────────────────────────────────────────────
(function () {
  if (localStorage.getItem("rol") !== "administrador") {
    window.location.href = "../../shared/pages/login.html";
  }
})();

function tk() {
  return localStorage.getItem("token");
}

// ─── Datos en memoria ─────────────────────────────────────────────────────────
let todasActividades = []; // todos los registros de materia_actividad
let todasCarreras = [];
let todasMaterias = []; // con campo .carreras[]
let todosTipos = [];

// ─── Inicializar ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  soloPermitido("administrador");
  await Promise.all([cargarCarreras(), cargarMaterias(), cargarTipos()]);
  await cargarActividades();
  poblarFiltroCarreras();
});

// ─── Cargar catálogos ─────────────────────────────────────────────────────────
async function cargarCarreras() {
  try {
    const res = await fetch(`${API_URL}/api/carreras`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (res.ok) todasCarreras = await res.json();
  } catch (_) {}
}

async function cargarMaterias() {
  try {
    const res = await fetch(`${API_URL}/api/materias`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (res.ok) todasMaterias = await res.json();
  } catch (_) {}
}

async function cargarTipos() {
  try {
    const res = await fetch(`${API_URL}/api/tipo-actividades`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (res.ok) todosTipos = await res.json();
  } catch (_) {}
}

// ─── Cargar actividades (lista principal) ─────────────────────────────────────
async function cargarActividades() {
  try {
    const res = await fetch(`${API_URL}/api/materia-actividades`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (!res.ok) throw new Error();
    todasActividades = await res.json();
    actualizarStats();
    poblarFiltroMaterias();
    renderTabla(todasActividades);
  } catch (_) {
    document.getElementById("tablaBody").innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:30px;color:red">Error al cargar actividades.</td></tr>`;
  }
}

function actualizarStats() {
  document.getElementById("statTotal").textContent = todasActividades.length;
  const materias = new Set(todasActividades.map((a) => a.clave_materia));
  const tipos = new Set(
    todasActividades.filter((a) => a.nombre_tipo).map((a) => a.nombre_tipo),
  );
  document.getElementById("statMaterias").textContent = materias.size;
  document.getElementById("statTipos").textContent = tipos.size;
}

// ─── Filtros ──────────────────────────────────────────────────────────────────
function poblarFiltroCarreras() {
  const sel = document.getElementById("filtroCarrera");
  todasCarreras.forEach((c) => {
    sel.innerHTML += `<option value="${c.id_carrera}">${c.nombre_carrera}</option>`;
  });
}

function poblarFiltroMaterias() {
  const sel = document.getElementById("filtroMateria");
  sel.innerHTML = `<option value="">Todas las materias</option>`;
  const vistas = new Set();
  todasActividades.forEach((a) => {
    if (!vistas.has(a.clave_materia)) {
      vistas.add(a.clave_materia);
      sel.innerHTML += `<option value="${a.clave_materia}">${a.nombre_materia}</option>`;
    }
  });
}

function filtrar() {
  const carrera = document.getElementById("filtroCarrera").value.toLowerCase();
  const materia = document.getElementById("filtroMateria").value;
  const busqueda = document
    .getElementById("filtroBusqueda")
    .value.toLowerCase();

  const filtradas = todasActividades.filter((a) => {
    const matchCarrera =
      !carrera || (a.carreras_raw || "").toLowerCase().includes(carrera);
    const matchMateria = !materia || a.clave_materia === materia;
    const matchBusqueda =
      !busqueda ||
      a.nombre_actividad.toLowerCase().includes(busqueda) ||
      (a.nombre_materia || "").toLowerCase().includes(busqueda);
    return matchCarrera && matchMateria && matchBusqueda;
  });

  renderTabla(filtradas);
}

// ─── Render tabla ─────────────────────────────────────────────────────────────
function renderTabla(lista) {
  const tbody = document.getElementById("tablaBody");
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">No hay actividades registradas.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista
    .map((a) => {
      const carrerasArr = a.carreras_raw
        ? a.carreras_raw.split("|").map((s) => {
            const [id, nom, sem] = s.split(":");
            return { id, nom, sem };
          })
        : [];
      const carrerasHtml = carrerasArr.length
        ? carrerasArr
            .map(
              (c) =>
                `<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
             <span>${c.nom}</span>
             ${c.sem ? `<span class="badge-semestre">Sem. ${c.sem}</span>` : ""}
           </div>`,
            )
            .join("")
        : "<span style='color:var(--text-muted)'>—</span>";

      const semHtml = carrerasArr.length
        ? carrerasArr
            .map((c) =>
              c.sem
                ? `<span class="badge-semestre">${c.sem}</span>`
                : "<span style='color:var(--text-muted)'>—</span>",
            )
            .join(" ")
        : "<span style='color:var(--text-muted)'>—</span>";

      const nombreCarrera = carrerasArr.length
        ? carrerasArr.map((c) => `<div>${c.nom}</div>`).join("")
        : "<span style='color:var(--text-muted)'>—</span>";

      return `
      <tr>
        <td>
          <div style="font-weight:600">${a.nombre_materia || a.clave_materia}</div>
          <div style="font-size:.75rem;color:var(--text-muted)">${a.clave_materia}</div>
        </td>
        <td style="font-size:.84rem">${nombreCarrera}</td>
        <td>${semHtml}</td>
        <td style="font-size:.84rem">${a.nombre_unidad || `Unidad ${a.id_unidad}`}</td>
        <td>
          ${
            a.nombre_tipo
              ? `<span class="badge-tipo"><iconify-icon icon="mdi:tag-outline"></iconify-icon>${a.nombre_tipo}</span>`
              : `<span style="color:var(--text-muted);font-size:.82rem">—</span>`
          }
        </td>
        <td style="font-weight:500">${esc(a.nombre_actividad)}</td>
        <td>
          <button class="btn btn-sm" style="padding:4px 8px;color:var(--danger,#dc2626);background:transparent;border:1px solid var(--danger,#dc2626);border-radius:6px"
                  onclick="eliminarActividad(${a.id_mat_act}, '${esc(a.nombre_actividad)}')"
                  title="Eliminar">
            <iconify-icon icon="mdi:trash-can-outline"></iconify-icon>
          </button>
        </td>
      </tr>`;
    })
    .join("");
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function abrirModalNueva() {
  // Reset
  document.getElementById("mCarrera").value = "";
  document.getElementById("wrapMateria").style.display = "none";
  document.getElementById("wrapUnidad").style.display = "none";
  document.getElementById("wrapTipoNombre").style.display = "none";
  document.getElementById("mMateriaInfo").style.display = "none";
  document.getElementById("modalHint").style.display = "flex";
  document.getElementById("btnGuardar").disabled = true;
  document.getElementById("mMateria").innerHTML =
    `<option value="">— Selecciona una materia —</option>`;
  document.getElementById("mUnidad").innerHTML =
    `<option value="">— Selecciona una unidad —</option>`;
  document.getElementById("mNombre").value = "";

  // Poblar tipos
  const selTipo = document.getElementById("mTipo");
  selTipo.innerHTML = `<option value="">— Sin tipo específico —</option>`;
  todosTipos.forEach((t) => {
    selTipo.innerHTML += `<option value="${t.id_tipo}">${t.nombre}</option>`;
  });

  // Poblar carreras
  const selCarrera = document.getElementById("mCarrera");
  selCarrera.innerHTML = `<option value="">— Selecciona una carrera —</option>`;
  todasCarreras.forEach((c) => {
    selCarrera.innerHTML += `<option value="${c.id_carrera}">${c.nombre_carrera}</option>`;
  });

  document.getElementById("modalNueva").classList.add("active");
}

function cerrarModal() {
  document.getElementById("modalNueva").classList.remove("active");
}

function modalClickFuera(e) {
  if (e.target === document.getElementById("modalNueva")) cerrarModal();
}

// ─── Cascada Carrera → Materia ────────────────────────────────────────────────
function onCarreraChange() {
  const idCarrera = document.getElementById("mCarrera").value;
  const wrapM = document.getElementById("wrapMateria");
  const wrapU = document.getElementById("wrapUnidad");
  const wrapTN = document.getElementById("wrapTipoNombre");
  const hint = document.getElementById("modalHint");

  wrapU.style.display = "none";
  wrapTN.style.display = "none";
  document.getElementById("btnGuardar").disabled = true;

  if (!idCarrera) {
    wrapM.style.display = "none";
    hint.style.display = "flex";
    hint.innerHTML = `<iconify-icon icon="lucide:info"></iconify-icon> Selecciona una carrera para comenzar`;
    return;
  }

  // Filtrar materias que pertenecen a esta carrera
  const materiasDeCarrera = todasMaterias.filter(
    (m) => m.carreras && m.carreras.some((c) => c.id_carrera === idCarrera),
  );

  const selMateria = document.getElementById("mMateria");
  selMateria.innerHTML = `<option value="">— Selecciona una materia —</option>`;
  materiasDeCarrera.forEach((m) => {
    const carreraInfo = m.carreras.find((c) => c.id_carrera === idCarrera);
    const sem = carreraInfo?.semestre ? ` (Sem. ${carreraInfo.semestre})` : "";
    selMateria.innerHTML += `<option value="${m.clave_materia}" data-sem="${carreraInfo?.semestre || ""}">${m.nombre_materia}${sem}</option>`;
  });

  wrapM.style.display = "grid";
  hint.style.display = "flex";
  hint.innerHTML = `<iconify-icon icon="lucide:info"></iconify-icon> Selecciona la materia`;
  document.getElementById("mMateriaInfo").style.display = "none";
}

// ─── Cascada Materia → Unidad ─────────────────────────────────────────────────
async function onMateriaChange() {
  const claveMateria = document.getElementById("mMateria").value;
  const wrapU = document.getElementById("wrapUnidad");
  const wrapTN = document.getElementById("wrapTipoNombre");
  const hint = document.getElementById("modalHint");
  const infoDiv = document.getElementById("mMateriaInfo");

  wrapTN.style.display = "none";
  document.getElementById("btnGuardar").disabled = true;

  if (!claveMateria) {
    wrapU.style.display = "none";
    infoDiv.style.display = "none";
    return;
  }

  // Mostrar semestre info
  const selOpt = document.getElementById("mMateria").selectedOptions[0];
  const sem = selOpt?.dataset?.sem;
  if (sem) {
    infoDiv.style.display = "flex";
    infoDiv.innerHTML = `<iconify-icon icon="lucide:calendar" style="color:var(--primary)"></iconify-icon>
      <span>Semestre <strong>${sem}</strong> en el plan de estudios</span>`;
  } else {
    infoDiv.style.display = "none";
  }

  // Cargar unidades de la materia
  try {
    const res = await fetch(`${API_URL}/api/unidades/materia/${claveMateria}`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    const unidades = res.ok ? await res.json() : [];
    const selUnidad = document.getElementById("mUnidad");
    selUnidad.innerHTML = `<option value="">— Selecciona una unidad —</option>`;
    unidades.forEach((u) => {
      selUnidad.innerHTML += `<option value="${u.id_unidad}">Unidad ${u.numero_unidad}: ${u.nombre_unidad || ""}</option>`;
    });
    wrapU.style.display = "grid";
    hint.style.display = "flex";
    hint.innerHTML = `<iconify-icon icon="lucide:info"></iconify-icon> Selecciona la unidad`;
  } catch (_) {
    showToast("Error al cargar unidades", "error");
  }
}

// ─── Cascada Unidad → Mostrar Tipo + Nombre ───────────────────────────────────
function onUnidadChange() {
  const idUnidad = document.getElementById("mUnidad").value;
  const wrapTN = document.getElementById("wrapTipoNombre");
  const hint = document.getElementById("modalHint");

  if (!idUnidad) {
    wrapTN.style.display = "none";
    document.getElementById("btnGuardar").disabled = true;
    return;
  }

  wrapTN.style.display = "grid";
  hint.style.display = "none";
  document.getElementById("mNombre").focus();
  document.getElementById("btnGuardar").disabled = false;
}

// ─── Guardar ──────────────────────────────────────────────────────────────────
async function guardarActividad() {
  const clave_materia = document.getElementById("mMateria").value;
  const id_unidad = document.getElementById("mUnidad").value;
  const id_tipo = document.getElementById("mTipo").value || null;
  const nombre_actividad = document.getElementById("mNombre").value.trim();

  if (!clave_materia || !id_unidad || !nombre_actividad) {
    showToast("Completa todos los campos obligatorios", "error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/materia-actividades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tk()}`,
      },
      body: JSON.stringify({
        clave_materia,
        id_unidad: parseInt(id_unidad),
        nombre_actividad,
        id_tipo: id_tipo ? parseInt(id_tipo) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Error al guardar", "error");
      return;
    }
    showToast("Actividad registrada", "success");
    cerrarModal();
    await cargarActividades();
  } catch (_) {
    showToast("Error de conexión", "error");
  }
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────
async function eliminarActividad(id, nombre) {
  if (!confirm(`¿Eliminar la actividad "${nombre}"?`)) return;
  try {
    const res = await fetch(`${API_URL}/api/materia-actividades/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tk()}` },
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "No se pudo eliminar", "error");
      return;
    }
    showToast("Actividad eliminada", "success");
    await cargarActividades();
  } catch (_) {
    showToast("Error de conexión", "error");
  }
}

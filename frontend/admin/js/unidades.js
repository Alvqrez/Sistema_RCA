// frontend/js/unidades.js
// Admin: configura nombres de unidades + tipos de actividad a nivel MATERIA
// Los tipos elegidos se aplican IGUAL a todas las unidades de esa materia.

const BASE_URL = "http://localhost:3000";
const rol = localStorage.getItem("rol");
const token = localStorage.getItem("token");

(function () {
  if (rol !== "administrador")
    window.location.href = "../../shared/pages/login.html";
})();

let materiaActual = null; // { clave_materia, nombre_materia, no_unidades }
let unidadesGuardadas = []; // unidades existentes en DB
let tiposCatalogo = []; // catálogo completo de tipo_actividad
// Tipos seleccionados a nivel materia (aplican igual a TODAS las unidades)
let tiposSeleccionados = []; // [ id_tipo, ... ]

// ─── Utilidades ───────────────────────────────────────────────────────────────
function toast(msg, tipo = "success") {
  let t = document.getElementById("rca-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "rca-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `rca-toast rca-toast-${tipo} visible`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("visible"), 3500);
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Catálogo de tipos ─────────────────────────────────────────────────────────
async function cargarTiposCatalogo() {
  try {
    const res = await fetch(`${BASE_URL}/api/tipo-actividades`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    tiposCatalogo = res.ok ? await res.json() : [];
  } catch (_) {
    tiposCatalogo = [];
  }
}

// ─── Selector de materia ───────────────────────────────────────────────────────
async function poblarSelectMaterias() {
  try {
    const res = await fetch(`${BASE_URL}/api/materias`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      window.location.href = "../../shared/pages/login.html";
      return;
    }
    const materias = await res.json();
    const sel = document.getElementById("selMateria");
    sel.innerHTML = '<option value="">— Selecciona una materia —</option>';
    materias.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.clave_materia;
      opt.textContent = `${m.clave_materia} — ${m.nombre_materia}`;
      opt.dataset.noUnidades = m.no_unidades || 0;
      opt.dataset.nombreMateria = m.nombre_materia;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      const opt = sel.options[sel.selectedIndex];
      const info = document.getElementById("infoMateria");
      const texto = document.getElementById("textoInfoMateria");
      if (sel.value && opt.dataset.noUnidades > 0) {
        texto.textContent = `Esta materia tiene ${opt.dataset.noUnidades} unidad(es) en su plan de estudios.`;
        info.style.display = "block";
      } else if (sel.value) {
        texto.textContent =
          "⚠️ Esta materia tiene 0 unidades. Edítala primero.";
        info.style.display = "block";
      } else {
        info.style.display = "none";
      }
      cancelarConfig();
    });
  } catch (e) {
    toast("Error al cargar materias", "error");
  }
}

// ─── Cargar configuración ──────────────────────────────────────────────────────
async function cargarConfiguracion() {
  const sel = document.getElementById("selMateria");
  const clave = sel.value;
  if (!clave) {
    toast("Selecciona una materia primero", "error");
    return;
  }

  const opt = sel.options[sel.selectedIndex];
  const noUnidades = parseInt(opt.dataset.noUnidades) || 0;
  const nombreMateria = opt.dataset.nombreMateria || clave;

  if (noUnidades === 0) {
    toast("Esta materia tiene 0 unidades. Edítala primero.", "error");
    return;
  }

  materiaActual = {
    clave_materia: clave,
    nombre_materia: nombreMateria,
    no_unidades: noUnidades,
  };

  // Traer unidades existentes
  try {
    const res = await fetch(
      `${BASE_URL}/api/unidades/materia/${encodeURIComponent(clave)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    unidadesGuardadas = res.ok ? await res.json() : [];
  } catch (_) {
    unidadesGuardadas = [];
  }

  // Cargar tipos ya asignados (de la primera unidad — todas tienen los mismos)
  tiposSeleccionados = [];
  if (unidadesGuardadas.length > 0) {
    try {
      const r = await fetch(
        `${BASE_URL}/api/unidades/${unidadesGuardadas[0].id_unidad}/tipos`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const tipos = r.ok ? await r.json() : [];
      tiposSeleccionados = tipos.map((t) => t.id_tipo);
    } catch (_) {}
  }

  // Si todas las unidades ya están guardadas → mostrar vista bloqueada
  if (unidadesGuardadas.length >= noUnidades && noUnidades > 0) {
    renderizarResumen(unidadesGuardadas, clave, nombreMateria);
    renderizarBloqueado(unidadesGuardadas, nombreMateria);
  } else {
    renderizarFormulario(noUnidades, nombreMateria, unidadesGuardadas);
    renderizarResumen(unidadesGuardadas, clave, nombreMateria);
  }

  // Cargar y mostrar actividades (siempre que haya unidades guardadas)
  if (unidadesGuardadas.length > 0) {
    await cargarActividadesMateria(clave);
    renderActividadesCard();
  }
}

// ─── Renderizar formulario ─────────────────────────────────────────────────────
function renderizarFormulario(n, nombreMateria, existentes) {
  const card = document.getElementById("cardConfigUnidades");
  const titulo = document.getElementById("tituloConfig");
  const instrucciones = document.getElementById("instruccionesConfig");
  const grid = document.getElementById("gridUnidades");

  titulo.textContent = `Configurar unidades — ${nombreMateria}`;
  instrucciones.textContent =
    existentes.length > 0
      ? `${existentes.length} de ${n} unidad(es) registradas. Edita los nombres y las opciones disponibles.`
      : `Asigna un nombre a cada unidad y elige qué tipos de actividad puede usar el maestro.`;

  grid.innerHTML = "";

  // ── Bloque de opciones para el maestro (a nivel materia, no por unidad) ──────
  if (tiposCatalogo.length > 0) {
    const bloqueOpciones = document.createElement("div");
    bloqueOpciones.className = "bloque-opciones";
    bloqueOpciones.innerHTML = `
      <div class="opciones-label">
        <iconify-icon icon="lucide:tag" style="vertical-align:middle;font-size:.85rem"></iconify-icon>
        Opciones para el maestro
        <span class="opciones-sublabel">— aplica igual a todas las unidades de esta materia</span>
      </div>
      <div class="tipos-chips" id="chips-materia">
        ${tiposCatalogo
          .map(
            (t) => `
          <button type="button"
            class="tipo-chip-toggle ${tiposSeleccionados.includes(t.id_tipo) ? "activo" : ""}"
            data-tipo-id="${t.id_tipo}"
            onclick="toggleChip(this)">
            ${escHtml(t.nombre)}
          </button>`,
          )
          .join("")}
      </div>
      <div class="opciones-hint" id="opciones-hint">
        ${
          tiposSeleccionados.length === 0
            ? "Sin opciones seleccionadas — el maestro verá todos los tipos disponibles"
            : `${tiposSeleccionados.length} tipo(s) seleccionado(s)`
        }
      </div>`;
    grid.appendChild(bloqueOpciones);
  }

  // ── Separador ─────────────────────────────────────────────────────────────────
  const sep = document.createElement("div");
  sep.style.cssText =
    "font-size:.72rem;font-weight:700;text-transform:uppercase;" +
    "letter-spacing:.06em;color:var(--text-muted);margin:4px 0 8px";
  sep.textContent = "Nombres de las unidades";
  grid.appendChild(sep);

  // ── Filas de unidades (solo nombre) ───────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    const u = existentes[i] || null;
    const nombreActual = u ? u.nombre_unidad : "";

    const row = document.createElement("div");
    row.className = "unidad-row";
    row.innerHTML = `
      <div class="unidad-numero">${i + 1}</div>
      <input type="text"
        class="unidad-input"
        id="unidad-input-${i}"
        value="${escHtml(nombreActual)}"
        placeholder="Ej. Unidad ${i + 1}: Introducción al tema"
        maxlength="100" />`;
    grid.appendChild(row);
  }

  // Enfocar primer campo vacío
  for (let i = 0; i < n; i++) {
    const inp = document.getElementById(`unidad-input-${i}`);
    if (inp && !inp.value.trim()) {
      inp.focus();
      break;
    }
  }

  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("estadoGuardado").textContent = "";
}

// ─── Toggle chip ───────────────────────────────────────────────────────────────
function toggleChip(btn) {
  btn.classList.toggle("activo");
  // Actualizar tiposSeleccionados
  tiposSeleccionados = Array.from(
    document.querySelectorAll("#chips-materia .tipo-chip-toggle.activo"),
  ).map((c) => parseInt(c.dataset.tipoId));

  const hint = document.getElementById("opciones-hint");
  if (hint) {
    hint.textContent =
      tiposSeleccionados.length === 0
        ? "Sin opciones seleccionadas — el maestro verá todos los tipos disponibles"
        : `${tiposSeleccionados.length} tipo(s) seleccionado(s)`;
  }
}

// ─── Guardar unidades + tipos ──────────────────────────────────────────────────
async function guardarUnidades() {
  if (!materiaActual) return;

  const { clave_materia, no_unidades } = materiaActual;
  const payload = [];

  for (let i = 0; i < no_unidades; i++) {
    const inp = document.getElementById(`unidad-input-${i}`);
    const nombre = inp ? inp.value.trim() : "";
    if (!nombre) {
      toast(`El nombre de la Unidad ${i + 1} es obligatorio.`, "error");
      inp?.focus();
      return;
    }
    payload.push({ nombre_unidad: nombre });
  }

  const btnGuardar = document.getElementById("btnGuardar");
  const estadoSpan = document.getElementById("estadoGuardado");
  btnGuardar.disabled = true;
  estadoSpan.textContent = "Guardando...";

  try {
    // 1. Guardar nombres de unidades
    const res = await fetch(
      `${BASE_URL}/api/unidades/materia/${encodeURIComponent(clave_materia)}/configurar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();

    if (!res.ok || !data.success) {
      toast(data.error || "Error al guardar", "error");
      estadoSpan.textContent = "";
      return;
    }

    // 2. Guardar MISMO set de tipos para TODAS las unidades de la materia
    const resultados = data.resultados || [];
    const idTipos = tiposSeleccionados;

    await Promise.all(
      resultados.map((r) =>
        fetch(`${BASE_URL}/api/unidades/${r.id}/tipos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id_tipos: idTipos }),
        }).catch(() => {}),
      ),
    );

    toast(
      `✓ Unidades de "${materiaActual.nombre_materia}" guardadas correctamente.`,
      "success",
    );

    // Recargar datos
    const resGet = await fetch(
      `${BASE_URL}/api/unidades/materia/${encodeURIComponent(clave_materia)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    unidadesGuardadas = resGet.ok ? await resGet.json() : [];
    renderizarResumen(
      unidadesGuardadas,
      clave_materia,
      materiaActual.nombre_materia,
    );
    renderizarBloqueado(unidadesGuardadas, materiaActual.nombre_materia);
  } catch (e) {
    toast("Error de conexión con el servidor", "error");
    estadoSpan.textContent = "";
  } finally {
    btnGuardar.disabled = false;
  }
}

// ─── Cancelar ──────────────────────────────────────────────────────────────────
function cancelarConfig() {
  document.getElementById("cardConfigUnidades").style.display = "none";
  document.getElementById("cardResumen").style.display = "none";
  materiaActual = null;
  unidadesGuardadas = [];
  tiposSeleccionados = [];
}

// ─── Resumen ───────────────────────────────────────────────────────────────────
function renderizarResumen(unidades, clave, nombreMateria) {
  const card = document.getElementById("cardResumen");
  const cuerpo = document.getElementById("cuerpoResumen");

  if (!unidades.length) {
    cuerpo.innerHTML = `
      <tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">
        Aún no hay unidades guardadas para <strong>${escHtml(nombreMateria)}</strong>.
      </td></tr>`;
    card.style.display = "block";
    return;
  }

  const tiposNombres = tiposCatalogo
    .filter((t) => tiposSeleccionados.includes(t.id_tipo))
    .map(
      (
        t,
      ) => `<span style="background:var(--bg-secondary);border:1px solid var(--border);
                     padding:1px 7px;border-radius:999px;font-size:.72rem">${escHtml(t.nombre)}</span>`,
    )
    .join(" ");

  const tiposCell =
    tiposNombres ||
    '<span style="color:var(--text-muted);font-size:.75rem">Todos los tipos</span>';

  cuerpo.innerHTML = unidades
    .map(
      (u, i) => `
    <tr>
      <td style="font-weight:700;color:var(--text-muted)">${i + 1}</td>
      <td><span style="font-size:.8rem;background:var(--bg-secondary);padding:2px 8px;
                 border-radius:6px;color:var(--text-secondary)">${escHtml(clave)}</span></td>
      <td><strong>${escHtml(u.nombre_unidad)}</strong></td>
      <td style="font-size:.8rem">${tiposCell}</td>
    </tr>`,
    )
    .join("");

  card.style.display = "block";
}

// ─── Vista de solo lectura ────────────────────────────────────────────────────
function renderizarBloqueado(unidades, nombreMateria) {
  const card = document.getElementById("cardConfigUnidades");
  const titulo = document.getElementById("tituloConfig");
  const grid = document.getElementById("gridUnidades");
  const instr = document.getElementById("instruccionesConfig");

  titulo.textContent = `Configurar unidades — ${nombreMateria}`;
  if (instr) instr.textContent = "";

  const tiposNombres = tiposCatalogo
    .filter((t) => tiposSeleccionados.includes(t.id_tipo))
    .map(
      (t) =>
        `<span class="tipo-chip-toggle activo" style="cursor:default">${escHtml(t.nombre)}</span>`,
    )
    .join("");

  grid.innerHTML = `
    <div class="bloque-opciones" style="opacity:.75">
      <div class="opciones-label">
        <iconify-icon icon="lucide:tag" style="vertical-align:middle;font-size:.85rem"></iconify-icon>
        Opciones para el maestro
        <span class="opciones-sublabel">— ${
          tiposSeleccionados.length > 0
            ? tiposSeleccionados.length + " tipo(s) habilitado(s)"
            : "Todos los tipos disponibles"
        }</span>
      </div>
      <div class="tipos-chips">${
        tiposNombres ||
        '<span style="color:var(--text-muted);font-size:.78rem">Todos los tipos disponibles</span>'
      }</div>
    </div>
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
         color:var(--text-muted);margin:4px 0 8px">Unidades registradas</div>
    ${unidades
      .map(
        (u, i) => `
      <div class="unidad-row">
        <div class="unidad-numero">${i + 1}</div>
        <div style="display:flex;align-items:center;gap:8px;flex:1">
          <span style="flex:1;font-weight:600;color:var(--text-primary)">${escHtml(u.nombre_unidad)}</span>
          <iconify-icon icon="mdi:lock-outline" style="color:var(--text-muted);font-size:.9rem"
            title="Guardada y bloqueada"></iconify-icon>
        </div>
      </div>`,
      )
      .join("")}
    <div style="margin-top:14px;padding:10px 14px;background:var(--bg-secondary);
         border:1px solid var(--border);border-radius:8px;font-size:.82rem;color:var(--text-muted);
         display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <span>
        <iconify-icon icon="mdi:lock-check-outline"
          style="vertical-align:middle;color:var(--success,#16a34a)"></iconify-icon>
        Las unidades ya están guardadas.
      </span>
      <button class="btn btn-outline" style="font-size:.8rem;padding:5px 14px"
        onclick="editarUnidades()">
        <iconify-icon icon="lucide:pencil" style="vertical-align:middle"></iconify-icon>
        Editar unidades
      </button>
    </div>`;

  const btnRow = document.getElementById("btnGuardar")?.closest("div");
  if (btnRow) btnRow.style.display = "none";

  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Editar unidades ──────────────────────────────────────────────────────────
function editarUnidades() {
  if (!materiaActual) return;
  const btnRow = document.getElementById("btnGuardar")?.closest("div");
  if (btnRow) btnRow.style.display = "";
  renderizarFormulario(
    materiaActual.no_unidades,
    materiaActual.nombre_materia,
    unidadesGuardadas,
  );
}

// ─── Actividades de la materia (definidas por el Admin) ────────────────────────

let actividadesMateria = []; // cache

async function cargarActividadesMateria(clave) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/materia-actividades/materia/${encodeURIComponent(clave)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    actividadesMateria = res.ok ? await res.json() : [];
  } catch (_) {
    actividadesMateria = [];
  }
}

function renderActividadesCard() {
  const card = document.getElementById("cardActividades");
  if (!card || !materiaActual) return;

  const { clave_materia } = materiaActual;
  if (!unidadesGuardadas.length) {
    card.style.display = "none";
    return;
  }

  // Group by unit
  const porUnidad = {};
  unidadesGuardadas.forEach((u) => {
    porUnidad[u.id_unidad] = [];
  });
  actividadesMateria.forEach((a) => {
    if (porUnidad[a.id_unidad]) porUnidad[a.id_unidad].push(a);
  });

  const tiposOptions = tiposCatalogo
    .map((t) => `<option value="${t.id_tipo}">${escHtml(t.nombre)}</option>`)
    .join("");

  let html = `<p class="act-desc">
    Define las actividades evaluables. El maestro las seleccionará al configurar su grupo.
  </p>`;

  unidadesGuardadas.forEach((u, i) => {
    const acts = porUnidad[u.id_unidad] || [];
    const totalActs = acts.length;

    html += `
    <div class="act-unidad-block">
      <div class="act-unidad-header">
        <span class="act-unidad-num">${i + 1}</span>
        <span class="act-unidad-nombre">${escHtml(u.nombre_unidad)}</span>
        <span class="act-unidad-badge">${totalActs} actividad${totalActs !== 1 ? "es" : ""}</span>
      </div>

      <div class="act-list">
        ${
          acts.length
            ? acts
                .map(
                  (a) => `
          <div class="act-item">
            <div class="act-item-info">
              <span class="act-item-nombre">${escHtml(a.nombre_actividad)}</span>
              ${a.nombre_tipo ? `<span class="act-item-tipo">${escHtml(a.nombre_tipo)}</span>` : ""}
            </div>
            <button class="act-item-del" type="button"
              title="Eliminar"
              onclick="eliminarActividadMateria(${a.id_mat_act},'${clave_materia}')">
              <iconify-icon icon="mdi:close"></iconify-icon>
            </button>
          </div>`,
                )
                .join("")
            : `
          <div class="act-empty">Sin actividades — agrega la primera abajo.</div>`
        }
      </div>

      <div class="act-form">
        <input type="text" id="act-nombre-${u.id_unidad}"
          class="act-form-input"
          placeholder="Nombre de la actividad *"
          onkeydown="if(event.key==='Enter')agregarActividadMateria(${u.id_unidad},'${clave_materia}')" />
        <select id="act-tipo-${u.id_unidad}" class="act-form-select">
          <option value="">Sin tipo</option>
          ${tiposOptions}
        </select>
        <button type="button" class="act-form-btn"
          onclick="agregarActividadMateria(${u.id_unidad},'${clave_materia}')">
          <iconify-icon icon="mdi:plus"></iconify-icon>
          Agregar
        </button>
      </div>
    </div>`;
  });

  document.getElementById("actividadesContent").innerHTML = html;
  card.style.display = "block";
}

async function agregarActividadMateria(idUnidad, claveMateria) {
  const nombreEl = document.getElementById(`act-nombre-${idUnidad}`);
  const tipoEl = document.getElementById(`act-tipo-${idUnidad}`);
  const nombre = nombreEl?.value?.trim();
  const idTipo = tipoEl?.value || null;

  if (!nombre) {
    toast("El nombre de la actividad es obligatorio", "error");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/materia-actividades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        clave_materia: claveMateria,
        id_unidad: idUnidad,
        nombre_actividad: nombre,
        id_tipo: idTipo || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Error al agregar", "error");
      return;
    }
    nombreEl.value = "";
    await cargarActividadesMateria(claveMateria);
    renderActividadesCard();
    toast("✓ Actividad agregada", "success");
  } catch (_) {
    toast("Error de conexión", "error");
  }
}

async function eliminarActividadMateria(id, claveMateria) {
  try {
    const res = await fetch(`${BASE_URL}/api/materia-actividades/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      toast("Error al eliminar", "error");
      return;
    }
    await cargarActividadesMateria(claveMateria);
    renderActividadesCard();
    toast("Actividad eliminada", "success");
  } catch (_) {
    toast("Error de conexión", "error");
  }
}

function toggleActividades() {
  const content = document.getElementById("actividadesContent");
  const icon = document.getElementById("actividadesToggleIcon");
  if (!content) return;
  const open = content.style.display !== "none";
  content.style.display = open ? "none" : "block";
  if (icon)
    icon.setAttribute("icon", open ? "mdi:chevron-down" : "mdi:chevron-up");
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await cargarTiposCatalogo();
  await poblarSelectMaterias();
});

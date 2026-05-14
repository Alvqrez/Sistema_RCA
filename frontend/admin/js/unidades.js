// frontend/js/unidades.js
// Admin: configura nombres de unidades + importar/exportar CSV

const rol = localStorage.getItem("rol");
const token = localStorage.getItem("token");

(function () {
  if (rol !== "administrador")
    window.location.href = "../../shared/pages/login.html";
})();

let materiaActual = null;
let unidadesGuardadas = [];
let tiposCatalogo = [];
let tiposSeleccionados = [];

// ─── Toast (un solo mensaje a la vez) ─────────────────────────────────────────
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
    const res = await fetch(`${API_URL}/api/tipo-actividades`, {
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
    const res = await fetch(`${API_URL}/api/materias`, {
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
        texto.textContent = "⚠️ Esta materia tiene 0 unidades. Edítala primero.";
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
  if (!clave) { toast("Selecciona una materia primero", "error"); return; }

  const opt = sel.options[sel.selectedIndex];
  const noUnidades = parseInt(opt.dataset.noUnidades) || 0;
  const nombreMateria = opt.dataset.nombreMateria || clave;

  if (noUnidades === 0) {
    toast("Esta materia tiene 0 unidades. Edítala primero.", "error");
    return;
  }

  materiaActual = { clave_materia: clave, nombre_materia: nombreMateria, no_unidades: noUnidades };

  try {
    const res = await fetch(
      `${API_URL}/api/unidades/materia/${encodeURIComponent(clave)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    unidadesGuardadas = res.ok ? await res.json() : [];
  } catch (_) { unidadesGuardadas = []; }

  tiposSeleccionados = [];
  if (unidadesGuardadas.length > 0) {
    try {
      const r = await fetch(
        `${API_URL}/api/unidades/${unidadesGuardadas[0].id_unidad}/tipos`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const tipos = r.ok ? await r.json() : [];
      tiposSeleccionados = tipos.map((t) => t.id_tipo);
    } catch (_) {}
  }

  if (unidadesGuardadas.length >= noUnidades && noUnidades > 0) {
    renderizarResumen(unidadesGuardadas, clave, nombreMateria);
    renderizarBloqueado(unidadesGuardadas, nombreMateria);
  } else {
    renderizarFormulario(noUnidades, nombreMateria, unidadesGuardadas);
    renderizarResumen(unidadesGuardadas, clave, nombreMateria);
  }

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
      ? `${existentes.length} de ${n} unidad(es) registradas. Edita los nombres si lo necesitas.`
      : `Asigna un nombre a cada unidad.`;

  grid.innerHTML = "";

  const sep = document.createElement("div");
  sep.style.cssText =
    "font-size:.72rem;font-weight:700;text-transform:uppercase;" +
    "letter-spacing:.06em;color:var(--text-muted);margin:4px 0 8px";
  sep.textContent = "Nombres de las unidades";
  grid.appendChild(sep);

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

  for (let i = 0; i < n; i++) {
    const inp = document.getElementById(`unidad-input-${i}`);
    if (inp && !inp.value.trim()) { inp.focus(); break; }
  }

  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("estadoGuardado").textContent = "";

  const btnGuardar = document.getElementById("btnGuardar");
  if (btnGuardar) {
    const btnRow = btnGuardar.closest("div");
    if (btnRow) btnRow.style.display = "flex";
    btnGuardar.disabled = false;
  }
}

// ─── Formulario editable ──────────────────────────────────────────────────────
let unidadesEditables = [];

function renderizarFormularioEditable(nombreMateria, existentes) {
  unidadesEditables = existentes.map((u) => u.nombre_unidad || "");
  if (unidadesEditables.length === 0) unidadesEditables.push("");

  const card = document.getElementById("cardConfigUnidades");
  const titulo = document.getElementById("tituloConfig");
  const instrucciones = document.getElementById("instruccionesConfig");
  const grid = document.getElementById("gridUnidades");

  titulo.textContent = `Editar unidades — ${nombreMateria}`;
  instrucciones.textContent =
    "Agrega, elimina o renombra unidades. Ordénalas según el programa oficial.";

  function rebuild() {
    grid.innerHTML = "";
    const sep = document.createElement("div");
    sep.style.cssText =
      "font-size:.72rem;font-weight:700;text-transform:uppercase;" +
      "letter-spacing:.06em;color:var(--text-muted);margin:4px 0 8px";
    sep.textContent = "Nombres de las unidades";
    grid.appendChild(sep);

    unidadesEditables.forEach((nombre, i) => {
      const row = document.createElement("div");
      row.className = "unidad-row";
      row.style.cssText = "display:flex;gap:8px;align-items:center";
      row.innerHTML = `
        <div class="unidad-numero">${i + 1}</div>
        <input type="text" class="unidad-input" style="flex:1"
          value="${escHtml(nombre)}"
          placeholder="Ej. Unidad ${i + 1}: Introducción al tema"
          maxlength="100"
          oninput="unidadesEditables[${i}]=this.value" />
        ${
          unidadesEditables.length > 1
            ? `<button type="button" class="btn btn-sm btn-danger-outline"
               onclick="eliminarUnidadEditable(${i})" title="Eliminar unidad">
               <iconify-icon icon="lucide:trash-2"></iconify-icon>
             </button>`
            : ""
        }
      `;
      grid.appendChild(row);
    });

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn-outline btn-sm";
    addBtn.style.cssText = "margin-top:10px;display:flex;align-items:center;gap:6px";
    addBtn.innerHTML = `<iconify-icon icon="mdi:plus"></iconify-icon> Agregar unidad`;
    addBtn.onclick = () => { unidadesEditables.push(""); rebuild(); };
    grid.appendChild(addBtn);

    const saveRow = document.createElement("div");
    saveRow.style.cssText = "margin-top:14px;display:flex;gap:8px";
    saveRow.innerHTML = `
      <button type="button" class="btn btn-primary" onclick="guardarUnidadesEditables()">
        <iconify-icon icon="mdi:content-save-outline"></iconify-icon> Guardar unidades
      </button>
      <button type="button" class="btn btn-outline" onclick="cancelarEdicion()">Cancelar</button>
    `;
    grid.appendChild(saveRow);
  }

  rebuild();
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

function eliminarUnidadEditable(idx) {
  unidadesEditables.splice(idx, 1);
  renderizarFormularioEditable(
    materiaActual.nombre_materia,
    unidadesEditables.map((n) => ({ nombre_unidad: n }))
  );
}

function cancelarEdicion() {
  document.getElementById("cardConfigUnidades").style.display = "none";
  document.getElementById("estadoGuardado").textContent = "";
}

async function guardarUnidadesEditables() {
  if (!materiaActual) return;
  const nombres = unidadesEditables.map((n) => n.trim()).filter((n) => n.length > 0);
  if (nombres.length === 0) { toast("Debes tener al menos una unidad", "error"); return; }

  const { clave_materia, nombre_materia } = materiaActual;

  try {
    if (nombres.length !== materiaActual.no_unidades) {
      const rGet = await fetch(
        `${API_URL}/api/materias/${encodeURIComponent(clave_materia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const matData = rGet.ok ? await rGet.json() : {};
      const rMat = await fetch(
        `${API_URL}/api/materias/${encodeURIComponent(clave_materia)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nombre_materia: matData.nombre_materia || nombre_materia,
            horas_teoricas: matData.horas_teoricas ?? 0,
            horas_practicas: matData.horas_practicas ?? 0,
            no_unidades: nombres.length,
          }),
        }
      );
      if (!rMat.ok) {
        const d = await rMat.json();
        toast(d.error || "Error al actualizar el número de unidades", "error");
        return;
      }
      materiaActual.no_unidades = nombres.length;
      const sel = document.getElementById("selMateria");
      if (sel) {
        const opt = sel.options[sel.selectedIndex];
        if (opt) opt.dataset.noUnidades = nombres.length;
      }
    }

    const r = await fetch(
      `${API_URL}/api/unidades/materia/${encodeURIComponent(clave_materia)}/configurar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(nombres.map((n) => ({ nombre_unidad: n }))),
      }
    );
    const data = await r.json();
    if (!r.ok || !data.success) {
      toast(data.error || "Error al guardar unidades", "error");
      return;
    }
    toast(`✓ Unidades de "${nombre_materia}" actualizadas correctamente.`, "success");
    await cargarConfiguracion();
  } catch {
    toast("Error de conexión con el servidor", "error");
  }
}

// ─── Toggle chip ───────────────────────────────────────────────────────────────
function toggleChip(btn) {
  btn.classList.toggle("activo");
  tiposSeleccionados = Array.from(
    document.querySelectorAll("#chips-materia .tipo-chip-toggle.activo")
  ).map((c) => parseInt(c.dataset.tipoId));
  const hint = document.getElementById("opciones-hint");
  if (hint) {
    hint.textContent =
      tiposSeleccionados.length === 0
        ? "Sin opciones seleccionadas — el maestro verá todos los tipos disponibles"
        : `${tiposSeleccionados.length} tipo(s) seleccionado(s)`;
  }
}

// ─── Guardar unidades ──────────────────────────────────────────────────────────
async function guardarUnidades() {
  if (!materiaActual) return;
  const { clave_materia, no_unidades } = materiaActual;
  const payload = [];

  for (let i = 0; i < no_unidades; i++) {
    const inp = document.getElementById(`unidad-input-${i}`);
    const nombre = inp ? inp.value.trim() : "";
    if (!nombre) { toast(`El nombre de la Unidad ${i + 1} es obligatorio.`, "error"); inp?.focus(); return; }
    payload.push({ nombre_unidad: nombre });
  }

  const btnGuardar = document.getElementById("btnGuardar");
  const estadoSpan = document.getElementById("estadoGuardado");
  btnGuardar.disabled = true;
  estadoSpan.textContent = "Guardando...";

  try {
    const res = await fetch(
      `${API_URL}/api/unidades/materia/${encodeURIComponent(clave_materia)}/configurar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      toast(data.error || "Error al guardar", "error");
      estadoSpan.textContent = "";
      return;
    }

    const resultados = data.resultados || [];
    await Promise.all(
      resultados.map((r) =>
        fetch(`${API_URL}/api/unidades/${r.id}/tipos`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id_tipos: [] }),
        }).catch(() => {})
      )
    );

    toast(`✓ Unidades de "${materiaActual.nombre_materia}" guardadas correctamente.`, "success");
    const resGet = await fetch(
      `${API_URL}/api/unidades/materia/${encodeURIComponent(clave_materia)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    unidadesGuardadas = resGet.ok ? await resGet.json() : [];
    renderizarResumen(unidadesGuardadas, clave_materia, materiaActual.nombre_materia);
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
      <tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted)">
        Aún no hay unidades guardadas para <strong>${escHtml(nombreMateria)}</strong>.
      </td></tr>`;
    card.style.display = "block";
    return;
  }

  cuerpo.innerHTML = unidades
    .map(
      (u, i) => `
    <tr>
      <td style="font-weight:700;color:var(--text-muted)">${i + 1}</td>
      <td><span style="font-size:.8rem;background:var(--bg-secondary);padding:2px 8px;
                 border-radius:6px;color:var(--text-secondary)">${escHtml(clave)}</span></td>
      <td><strong>${escHtml(u.nombre_unidad)}</strong></td>
    </tr>`
    )
    .join("");
  card.style.display = "block";
}

// ─── Vista de solo lectura ─────────────────────────────────────────────────────
function renderizarBloqueado(unidades, nombreMateria) {
  const card = document.getElementById("cardConfigUnidades");
  const titulo = document.getElementById("tituloConfig");
  const grid = document.getElementById("gridUnidades");
  const instr = document.getElementById("instruccionesConfig");

  titulo.textContent = `Configurar unidades — ${nombreMateria}`;
  if (instr) instr.textContent = "";

  grid.innerHTML = `
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
      </div>`
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

function editarUnidades() {
  if (!materiaActual) return;
  document.getElementById("modalAdvertenciaUnidades").classList.add("visible");
}

function confirmarEditarUnidades() {
  document.getElementById("modalAdvertenciaUnidades").classList.remove("visible");
  renderizarFormularioEditable(materiaActual.nombre_materia, unidadesGuardadas);
}

// ─── Actividades de la materia ─────────────────────────────────────────────────
let actividadesMateria = [];

async function cargarActividadesMateria(clave) {
  try {
    const res = await fetch(
      `${API_URL}/api/materia-actividades/materia/${encodeURIComponent(clave)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    actividadesMateria = res.ok ? await res.json() : [];
  } catch (_) { actividadesMateria = []; }
}

function renderActividadesCard() {
  const card = document.getElementById("cardActividades");
  if (!card || !materiaActual) return;

  const { clave_materia } = materiaActual;
  if (!unidadesGuardadas.length) { card.style.display = "none"; return; }

  const porUnidad = {};
  unidadesGuardadas.forEach((u) => { porUnidad[u.id_unidad] = []; });
  actividadesMateria.forEach((a) => { if (porUnidad[a.id_unidad]) porUnidad[a.id_unidad].push(a); });

  const tiposOptions = tiposCatalogo
    .map((t) => `<option value="${t.id_tipo}">${escHtml(t.nombre)}</option>`)
    .join("");

  let html = `<p class="act-desc">
    Define las actividades evaluables. El maestro las seleccionará al configurar su grupo.
  </p>`;

  unidadesGuardadas.forEach((u, i) => {
    const acts = porUnidad[u.id_unidad] || [];
    html += `
    <div class="act-unidad-block">
      <div class="act-unidad-header">
        <span class="act-unidad-num">${i + 1}</span>
        <span class="act-unidad-nombre">${escHtml(u.nombre_unidad)}</span>
        <span class="act-unidad-badge">${acts.length} actividad${acts.length !== 1 ? "es" : ""}</span>
      </div>
      <div class="act-list">
        ${
          acts.length
            ? acts.map((a) => `
          <div class="act-item">
            <div class="act-item-info">
              <span class="act-item-nombre">${escHtml(a.nombre_actividad)}</span>
              ${a.nombre_tipo ? `<span class="act-item-tipo">${escHtml(a.nombre_tipo)}</span>` : ""}
            </div>
            <button class="act-item-del" type="button" title="Eliminar"
              onclick="eliminarActividadMateria(${a.id_mat_act},'${clave_materia}')">
              <iconify-icon icon="mdi:close"></iconify-icon>
            </button>
          </div>`).join("")
            : `<div class="act-empty">Sin actividades — agrega la primera abajo.</div>`
        }
      </div>
      <div class="act-form">
        <input type="text" id="act-nombre-${u.id_unidad}" class="act-form-input"
          placeholder="Nombre de la actividad *"
          onkeydown="if(event.key==='Enter')agregarActividadMateria(${u.id_unidad},'${clave_materia}')" />
        <select id="act-tipo-${u.id_unidad}" class="act-form-select">
          <option value="">Sin tipo</option>
          ${tiposOptions}
        </select>
        <button type="button" class="act-form-btn"
          onclick="agregarActividadMateria(${u.id_unidad},'${clave_materia}')">
          <iconify-icon icon="mdi:plus"></iconify-icon> Agregar
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
  if (!nombre) { toast("El nombre de la actividad es obligatorio", "error"); return; }
  try {
    const res = await fetch(`${API_URL}/api/materia-actividades`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ clave_materia: claveMateria, id_unidad: idUnidad, nombre_actividad: nombre, id_tipo: tipoEl?.value || null }),
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Error al agregar", "error"); return; }
    nombreEl.value = "";
    await cargarActividadesMateria(claveMateria);
    renderActividadesCard();
    toast("✓ Actividad agregada", "success");
  } catch (_) { toast("Error de conexión", "error"); }
}

async function eliminarActividadMateria(id, claveMateria) {
  try {
    const res = await fetch(`${API_URL}/api/materia-actividades/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { toast("Error al eliminar", "error"); return; }
    await cargarActividadesMateria(claveMateria);
    renderActividadesCard();
    toast("Actividad eliminada", "success");
  } catch (_) { toast("Error de conexión", "error"); }
}

function toggleActividades() {
  const content = document.getElementById("actividadesContent");
  const icon = document.getElementById("actividadesToggleIcon");
  if (!content) return;
  const open = content.style.display !== "none";
  content.style.display = open ? "none" : "block";
  if (icon) icon.setAttribute("icon", open ? "mdi:chevron-down" : "mdi:chevron-up");
}

// ─── CSV: Exportar ─────────────────────────────────────────────────────────────
async function exportarCSVUnidades() {
  try {
    const r = await fetch(`${API_URL}/api/unidades/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) { toast("Error al obtener unidades", "error"); return; }
    const filas = await r.json();
    if (!filas.length) { toast("No hay unidades para exportar.", "error"); return; }

    const cols = ["clave_materia", "numero_unidad", "nombre_unidad"];
    exportarXLSX(cols, cols, filas, "unidades_RCA");
    toast("Unidades exportadas correctamente");
  } catch {
    toast("Error al exportar unidades.", "error");
  }
}

// ─── CSV: Modal Importar ───────────────────────────────────────────────────────
let csvUnidadesData = [];

function abrirModalCSVUnidades() {
  csvUnidadesData = [];
  document.getElementById("csvUnidadesPreview").innerHTML = "";
  document.getElementById("btnImportarUnidades").disabled = true;
  document.getElementById("inputCSVUnidades").value = "";
  document.getElementById("modalImportUnidades").classList.add("visible");
}

function cerrarModalCSVUnidades() {
  document.getElementById("modalImportUnidades").classList.remove("visible");
}

function dragOverUnidades(e) {
  e.preventDefault();
  document.getElementById("dropZoneUnidades").classList.add("drag-over");
}

function soltarCSVUnidades(e) {
  e.preventDefault();
  document.getElementById("dropZoneUnidades").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) procesarCSVUnidades(file);
}

function leerCSVUnidades(e) {
  const file = e.target.files[0];
  if (file) procesarCSVUnidades(file);
}

function procesarCSVUnidades(file) {
  leerArchivo(file, (headers, rows) => {
    if (!rows.length) {
      const el = document.getElementById("csvUnidadesPreview");
      if (el) el.innerHTML = "<p style='color:var(--danger);font-size:.85rem;margin-top:8px'>Archivo vacío o sin datos.</p>";
      return;
    }
    csvUnidadesData = rows;
    mostrarPreviewCSVUnidades(headers, rows);
    document.getElementById("btnImportarUnidades").disabled = false;
  });
}

function mostrarPreviewCSVUnidades(headers, data) {
  const muestra = data.slice(0, 5);
  const preview = document.getElementById("csvUnidadesPreview");
  preview.innerHTML = `
    <p style="font-size:.8rem;color:var(--text-muted);margin:10px 0 4px">
      ${data.length} registros detectados — vista previa (primeros 5):
    </p>
    <div class="csv-preview"><table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${muestra.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
}

async function importarCSVUnidades() {
  if (!csvUnidadesData.length) return;
  const btn = document.getElementById("btnImportarUnidades");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Importando…`;
  try {
    const r = await fetch(`${API_URL}/api/unidades/csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ unidades: csvUnidadesData }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error al importar");

    // Un solo toast con el resumen completo
    const partes = [`${data.materiasProcesadas} materia(s), ${data.unidadesGuardadas} unidad(es) importadas`];
    if (data.errores?.length) partes.push(`${data.errores.length} fila(s) con errores`);
    toast(partes.join(" · "), data.errores?.length ? "info" : "success");

    if (data.errores?.length) console.table(data.errores);
    cerrarModalCSVUnidades();
    // Refrescar vista si hay materia activa
    if (materiaActual) await cargarConfiguracion();
    // Refrescar select en caso de que hayan cambiado no_unidades
    await poblarSelectMaterias();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:upload"></iconify-icon> Importar`;
  }
}

function descargarEjemploCSVUnidades() {
  const BOM = "\uFEFF";
  const contenido = BOM + "clave_materia,numero_unidad,nombre_unidad\n";
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ejemplo_unidades.csv";
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("click", (e) => {
  if (e.target.id === "modalImportUnidades") cerrarModalCSVUnidades();
});

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await cargarTiposCatalogo();
  await poblarSelectMaterias();
});

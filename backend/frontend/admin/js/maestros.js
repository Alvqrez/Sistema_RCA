// frontend/admin/js/maestros.js — v12
// Campos eliminados: genero, tel_oficina, direccion, tipo_contrato,
//   estatus, fecha_ingreso, grado_academico, especialidad, departamento

function fechaADisplay(isoStr) {
  if (!isoStr) return "";
  const d = isoStr.slice(0, 10).split("-");
  if (d.length !== 3) return isoStr;
  return `${d[2]}/${d[1]}/${d[0]}`;
}
function fechaAISO(ddmmyyyy) {
  if (!ddmmyyyy) return null;
  const partes = ddmmyyyy.trim().split("/");
  if (partes.length === 3 && partes[0].length <= 2)
    return `${partes[2]}-${partes[1].padStart(2,"0")}-${partes[0].padStart(2,"0")}`;
  return ddmmyyyy;
}

let maestrosGlobal = [];
let modoEdicion = false;
let empleadoEditando = null;

function toast(msg, tipo = "success") {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const t = document.createElement("div");
  t.className = `toast toast-${tipo}`;
  const icons = { success: "lucide:check-circle", error: "lucide:x-circle", info: "lucide:info" };
  t.innerHTML = `<iconify-icon icon="${icons[tipo] || icons.info}"></iconify-icon>${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function abrirModal(id) { document.getElementById(id).classList.add("visible"); }
function cerrarModal(id) {
  document.getElementById(id).classList.remove("visible");
  if (id === "modalMaestro") { modoEdicion = false; empleadoEditando = null; limpiarForm(); }
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("visible");
    modoEdicion = false; empleadoEditando = null; limpiarForm();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  soloPermitido("administrador");
  document.getElementById("headerActions").style.display = "flex";
  await cargarMaestros();
  if (window.location.hash === "#registro") abrirModalNuevo();
});

async function cargarMaestros() {
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${API_URL}/api/maestros`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 401) { window.location.href = "../../shared/pages/login.html"; return; }
    maestrosGlobal = await r.json();
    actualizarStats();
    filtrarMaestros();
  } catch {
    toast("No se pudo cargar la lista de maestros", "error");
  }
}

function actualizarStats() {
  document.getElementById("statTotal").textContent = maestrosGlobal.length;
  document.getElementById("statFiltrados").textContent = maestrosGlobal.length;
}

let expandedMaestro = null;

function filtrarMaestros() {
  const q = document.getElementById("filtroBusqueda").value.toLowerCase();
  let datos = maestrosGlobal.filter((m) => {
    const nombre = `${m.nombre} ${m.apellido_paterno} ${m.apellido_materno ?? ""}`.toLowerCase();
    return !q || nombre.includes(q) || m.rfc?.toLowerCase().includes(q) ||
      (m.correo_institucional || "").toLowerCase().includes(q);
  });
  datos.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));
  document.getElementById("statFiltrados").textContent = datos.length;
  renderTabla(datos);
}

function renderTabla(datos) {
  const tbody = document.getElementById("tablaMaestros");
  if (!datos.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><iconify-icon icon="lucide:search-x"></iconify-icon><p>Sin resultados</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = datos.map((m) => {
    const ini = `${m.nombre?.[0] ?? ""}${m.apellido_paterno?.[0] ?? ""}`.toUpperCase();
    const rfcSafe = m.rfc?.replace(/'/g, "\\'") ?? "";
    return `<tr style="cursor:pointer" onclick="toggleMaestroExpand('${rfcSafe}')">
      <td><div class="avatar-cell">
        <div class="avatar" style="background:var(--success-light);color:var(--success)">${ini}</div>
        <span>${m.apellido_paterno} ${m.apellido_materno ?? ""}, ${m.nombre}</span>
      </div></td>
      <td><code>${m.rfc ?? "—"}</code></td>
      <td>${m.correo_institucional ?? "—"}</td>
      <td>${m.tel_celular ?? "—"}</td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px">
          <div class="table-actions">
            <button class="btn-icon" onclick="editarMaestro('${rfcSafe}')"><iconify-icon icon="lucide:pencil"></iconify-icon></button>
            <button class="btn-icon btn-del" onclick="eliminarMaestro('${rfcSafe}')"><iconify-icon icon="lucide:trash-2"></iconify-icon></button>
          </div>
          <iconify-icon id="chev_m_${rfcSafe}" icon="lucide:chevron-down"
            onclick="event.stopPropagation();toggleMaestroExpand('${rfcSafe}')"
            style="color:var(--text-muted);font-size:1rem;transition:transform 0.2s;flex-shrink:0;cursor:pointer">
          </iconify-icon>
        </div>
      </td>
    </tr>
    <tr id="expand_m_${rfcSafe}" style="display:none">
      <td colspan="5" style="padding:0">
        <div style="background:var(--bg-alt);padding:14px 24px 14px 60px;border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          <div><p style="font-size:0.72rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin:0 0 3px">CURP</p>
               <p style="font-size:0.85rem;color:var(--text-main);margin:0">${m.curp || "—"}</p></div>
          <div><p style="font-size:0.72rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin:0 0 3px">Fecha nacimiento</p>
               <p style="font-size:0.85rem;color:var(--text-main);margin:0">${fechaADisplay(m.fecha_nacimiento) || "—"}</p></div>
          <div><p style="font-size:0.72rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin:0 0 3px">Correo personal</p>
               <p style="font-size:0.85rem;color:var(--text-main);margin:0">${m.correo_personal || "—"}</p></div>
        </div>
      </td>
    </tr>`;
  }).join("");
}

function toggleMaestroExpand(rfc) {
  const expandRow = document.getElementById(`expand_m_${rfc}`);
  const chevron = document.getElementById(`chev_m_${rfc}`);
  if (!expandRow) return;
  const isOpen = expandRow.style.display !== "none";
  if (expandedMaestro && expandedMaestro !== rfc) {
    const prev = document.getElementById(`expand_m_${expandedMaestro}`);
    const prevChev = document.getElementById(`chev_m_${expandedMaestro}`);
    if (prev) prev.style.display = "none";
    if (prevChev) prevChev.style.transform = "rotate(0deg)";
  }
  expandRow.style.display = isOpen ? "none" : "table-row";
  if (chevron) chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  expandedMaestro = isOpen ? null : rfc;
}

function abrirModalNuevo() {
  modoEdicion = false; empleadoEditando = null;
  document.getElementById("modalTitulo").textContent = "Nuevo maestro";
  document.getElementById("grupoPassword").style.display = "";
  limpiarForm();
  const rfcEl = document.getElementById("f_rfc");
  if (rfcEl) rfcEl.disabled = false;
  ocultarError();
  abrirModal("modalMaestro");
}

function editarMaestro(rfc) {
  const m = maestrosGlobal.find((x) => x.rfc === rfc);
  if (!m) return;
  modoEdicion = true; empleadoEditando = rfc;
  document.getElementById("modalTitulo").textContent = "Editar maestro";
  document.getElementById("grupoPassword").style.display = "none";

  document.getElementById("f_rfc").value = m.rfc ?? "";
  document.getElementById("f_rfc").disabled = true;
  document.getElementById("f_nombre").value = m.nombre ?? "";
  document.getElementById("f_ap_pat").value = m.apellido_paterno ?? "";
  document.getElementById("f_ap_mat").value = m.apellido_materno ?? "";
  document.getElementById("f_correo").value = m.correo_institucional ?? "";
  document.getElementById("f_curp").value = m.curp ?? "";
  document.getElementById("f_fnac").value = m.fecha_nacimiento?.slice(0, 10) ?? "";
  document.getElementById("f_celular").value = m.tel_celular ?? "";
  document.getElementById("f_correo_personal").value = m.correo_personal ?? "";

  ocultarError();
  abrirModal("modalMaestro");
}

async function guardarMaestro() {
  const rfc = document.getElementById("f_rfc").value.trim().toUpperCase();
  const nom = document.getElementById("f_nombre").value.trim();
  const ap = document.getElementById("f_ap_pat").value.trim();
  const correo = document.getElementById("f_correo").value.trim();
  const pwd = document.getElementById("f_password").value;
  ocultarError();

  if (!modoEdicion) {
    if (!rfc) { mostrarError("El RFC es obligatorio."); return; }
    if (!nom) { mostrarError("El nombre es obligatorio."); return; }
    if (!ap) { mostrarError("El apellido paterno es obligatorio."); return; }
    if (!correo) { mostrarError("El correo institucional es obligatorio."); return; }
    if (!pwd) { mostrarError("La contraseña inicial es obligatoria."); return; }
  }

  const token = localStorage.getItem("token");
  const btn = document.getElementById("btnGuardar");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Guardando…`;

  const body = {
    rfc,
    nombre: nom,
    apellido_paterno: ap,
    apellido_materno: document.getElementById("f_ap_mat").value.trim(),
    correo_institucional: correo,
    correo_personal: document.getElementById("f_correo_personal").value.trim(),
    curp: document.getElementById("f_curp").value.trim().toUpperCase(),
    fecha_nacimiento: document.getElementById("f_fnac").value || null,
    tel_celular: document.getElementById("f_celular").value.trim(),
    password: pwd,
  };

  try {
    const url = modoEdicion ? `${API_URL}/api/maestros/${empleadoEditando}` : `${API_URL}/api/maestros`;
    const method = modoEdicion ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error al guardar");
    toast(modoEdicion ? "Maestro actualizado" : "Maestro registrado correctamente");
    cerrarModal("modalMaestro");
    await cargarMaestros();
  } catch (e) {
    mostrarError(e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:save"></iconify-icon> Guardar`;
  }
}

async function eliminarMaestro(rfc) {
  const errEl = document.getElementById("eliminarMaestroError");
  errEl.style.display = "none";
  document.getElementById("nombreEliminarMaestro").textContent = rfc;
  document.getElementById("modalEliminarMaestro").classList.add("visible");
  document.getElementById("btnConfirmarEliminarMaestro").onclick = async () => {
    errEl.style.display = "none";
    const token = localStorage.getItem("token");
    try {
      const r = await fetch(`${API_URL}/api/maestros/${rfc}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        errEl.textContent = data.error || "No se pudo eliminar.";
        errEl.style.display = "block"; return;
      }
      cerrarModalEliminarMaestro();
      toast("Maestro eliminado");
      await cargarMaestros();
    } catch {
      errEl.textContent = "Error de conexión con el servidor.";
      errEl.style.display = "block";
    }
  };
}

function mostrarError(msg) {
  const errEl = document.getElementById("modalError");
  errEl.textContent = msg; errEl.style.display = "block";
}
function ocultarError() {
  const errEl = document.getElementById("modalError");
  if (errEl) errEl.style.display = "none";
}

function limpiarForm() {
  ["f_correo","f_nombre","f_ap_pat","f_ap_mat","f_curp","f_rfc",
   "f_fnac","f_celular","f_correo_personal","f_password"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.value = ""; delete el.dataset.editado; }
  });
  ocultarError();
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────────
function exportarCSVMaestros() {
  if (!maestrosGlobal.length) { toast("No hay datos para exportar", "info"); return; }
  const cols = ["rfc","nombre","apellido_paterno","apellido_materno",
                "correo_institucional","username","pwd",
                "curp","fecha_nacimiento","correo_personal","tel_celular"];
  exportarXLSX(cols, cols, maestrosGlobal, "maestros_RCA", (c, v) => {
    if (c === "fecha_nacimiento") return fechaADisplay(v);
    return v ?? "";
  });
  toast("Exportado correctamente");
}

// ─── Importar CSV ─────────────────────────────────────────────────────────────
let csvMaestrosData = [];

function abrirModalCSVMaestros() {
  csvMaestrosData = [];
  document.getElementById("csvMaestrosPreview").innerHTML = "";
  document.getElementById("btnImportarMaestros").disabled = true;
  document.getElementById("inputCSVMaestros").value = "";
  document.getElementById("modalImportMaestros").classList.add("visible");
}
function cerrarModalCSVMaestros() {
  document.getElementById("modalImportMaestros").classList.remove("visible");
}
function dragOverMaestros(e) {
  e.preventDefault();
  document.getElementById("dropZoneMaestros").classList.add("drag-over");
}
function soltarCSVMaestros(e) {
  e.preventDefault();
  document.getElementById("dropZoneMaestros").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) procesarCSVMaestros(file);
}
function leerCSVMaestros(e) {
  const file = e.target.files[0];
  if (file) procesarCSVMaestros(file);
}

function procesarCSVMaestros(file) {
  leerArchivo(file, (headers, rows) => {
    if (!rows.length) {
      const el = document.getElementById("csvMaestrosPreview");
      if (el) el.innerHTML = "<p style='color:var(--danger);font-size:0.85rem;margin-top:8px'>El archivo está vacío o solo tiene encabezado.</p>";
      return;
    }
    csvMaestrosData = rows;
    const muestra = rows.slice(0, 5);
    document.getElementById("csvMaestrosPreview").innerHTML = `
      <p style="font-size:.8rem;color:var(--text-muted);margin:10px 0 4px">
        ${rows.length} registros detectados — vista previa (primeros 5):
      </p>
      <div class="csv-preview"><table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${muestra.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
    document.getElementById("btnImportarMaestros").disabled = false;
  });
}

async function importarCSVMaestros() {
  if (!csvMaestrosData.length) return;
  const token = localStorage.getItem("token");
  const btn = document.getElementById("btnImportarMaestros");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Importando…`;
  try {
    const r = await fetch(`${API_URL}/api/maestros/csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        maestros: csvMaestrosData.map((m) => ({
          ...m, fecha_nacimiento: fechaAISO(m.fecha_nacimiento) || null,
        })),
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error al importar");
    toast(`${data.insertados} maestro(s) importados correctamente`);
    if (data.errores?.length) { toast(`${data.errores.length} fila(s) con errores`, "info"); console.table(data.errores); }
    cerrarModalCSVMaestros();
    cargarMaestros();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:upload"></iconify-icon> Importar`;
  }
}

document.addEventListener("click", (e) => {
  if (e.target.id === "modalImportMaestros") cerrarModalCSVMaestros();
});

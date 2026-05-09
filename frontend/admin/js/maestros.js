// ── Helpers de fecha DD/MM/YYYY ──────────────────────────────────────────────
function fechaADisplay(isoStr) {
  // "2006-04-20" → "20/04/2006"  |  null/"" → ""
  if (!isoStr) return "";
  const d = isoStr.slice(0, 10).split("-");
  if (d.length !== 3) return isoStr;
  return `${d[2]}/${d[1]}/${d[0]}`;
}
function fechaAISO(ddmmyyyy) {
  // "20/04/2006" → "2006-04-20"  |  ya en ISO → devuelve igual
  if (!ddmmyyyy) return null;
  const partes = ddmmyyyy.trim().split("/");
  if (partes.length === 3 && partes[0].length <= 2) {
    return `${partes[2]}-${partes[1].padStart(2,"0")}-${partes[0].padStart(2,"0")}`;
  }
  return ddmmyyyy; // ya estaba en YYYY-MM-DD
}
// ─────────────────────────────────────────────────────────────────────────────
let maestrosGlobal = [];
let modoEdicion = false;
let empleadoEditando = null;

function toast(msg, tipo = "success") {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const t = document.createElement("div");
  t.className = `toast toast-${tipo}`;
  const icons = {
    success: "lucide:check-circle",
    error: "lucide:x-circle",
    info: "lucide:info",
  };
  t.innerHTML = `<iconify-icon icon="${icons[tipo] || icons.info}"></iconify-icon>${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function cambiarTab(nombre) {
  // Función mantenida por compatibilidad — el modal ya no usa tabs
}

function abrirModal(id) {
  document.getElementById(id).classList.add("visible");
}
function cerrarModal(id) {
  document.getElementById(id).classList.remove("visible");
  // BUG FIX: resetear estado de edición al cerrar para que "Nuevo maestro"
  // no herede datos de la última edición si se cerró con ✕ o click fuera
  if (id === "modalMaestro") {
    modoEdicion = false;
    empleadoEditando = null;
    limpiarForm();
  }
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("visible");
    // Mismo reset por click fuera
    modoEdicion = false;
    empleadoEditando = null;
    limpiarForm();
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
    if (r.status === 401) {
      window.location.href = "../../shared/pages/login.html";
      return;
    }
    maestrosGlobal = await r.json();
    actualizarStats();
    poblarFiltroDpto();
    filtrarMaestros();
  } catch {
    toast("No se pudo cargar la lista de maestros", "error");
  }
}

function actualizarStats() {
  document.getElementById("statTotal").textContent = maestrosGlobal.length;
  document.getElementById("statActivos").textContent = maestrosGlobal.filter(
    (m) => m.estatus === "Activo",
  ).length;
}

function poblarFiltroDpto() {
  const sel = document.getElementById("filtroDepartamento");
  const deptos = [
    ...new Set(maestrosGlobal.map((m) => m.departamento).filter(Boolean)),
  ].sort();
  // Limpiar opciones extras (conservar "Todos")
  sel.innerHTML = `<option value="">Todos los departamentos</option>`;
  deptos.forEach((d) => {
    sel.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

let expandedMaestro = null;

function filtrarMaestros() {
  const q = document.getElementById("filtroBusqueda").value.toLowerCase();
  const dpto = document.getElementById("filtroDepartamento").value;
  const estatus = document.getElementById("filtroEstatus")?.value || "";
  let datos = maestrosGlobal.filter((m) => {
    const nombre =
      `${m.nombre} ${m.apellido_paterno} ${m.apellido_materno ?? ""}`.toLowerCase();
    return (
      (!q ||
        nombre.includes(q) ||
        m.rfc?.toLowerCase().includes(q) ||
        (m.correo_institucional || "").toLowerCase().includes(q)) &&
      (!dpto || m.departamento === dpto) &&
      (!estatus || m.estatus === estatus)
    );
  });
  datos.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));
  document.getElementById("statFiltrados").textContent = datos.length;

  // Chips de filtros activos
  const chips = [];
  if (dpto)
    chips.push({
      label: dpto,
      clear: () => {
        document.getElementById("filtroDepartamento").value = "";
        filtrarMaestros();
      },
    });
  if (estatus)
    chips.push({
      label: estatus,
      clear: () => {
        document.getElementById("filtroEstatus").value = "";
        filtrarMaestros();
      },
    });
  const chipsEl = document.getElementById("chipsMaestros");
  if (chipsEl)
    chipsEl.innerHTML = chips
      .map(
        (c) =>
          `<span style="background:var(--primary-light);color:var(--primary);font-size:0.78rem;padding:3px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:6px">${c.label}<button onclick="(${c.clear.toString()})()" style="background:none;border:none;cursor:pointer;color:var(--primary);font-size:0.9rem;padding:0;line-height:1">×</button></span>`,
      )
      .join("");

  renderTabla(datos);
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
  if (chevron)
    chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  expandedMaestro = isOpen ? null : rfc;
}

function renderTabla(datos) {
  const tbody = document.getElementById("tablaMaestros");
  if (!datos.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><iconify-icon icon="lucide:search-x"></iconify-icon><p>Sin resultados</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = datos
    .map((m) => {
      const ini =
        `${m.nombre?.[0] ?? ""}${m.apellido_paterno?.[0] ?? ""}`.toUpperCase();
      const badge =
        m.estatus === "Activo"
          ? `<span class="badge badge-success">Activo</span>`
          : m.estatus === "Licencia"
            ? `<span class="badge badge-warning">Licencia</span>`
            : `<span class="badge badge-danger">${m.estatus || "Inactivo"}</span>`;
      const rfcSafe = m.rfc?.replace(/'/g, "\\'") ?? "";
      return `<tr style="cursor:pointer" onclick="toggleMaestroExpand('${rfcSafe}')">
      <td><div class="avatar-cell">
        <div class="avatar" style="background:var(--success-light);color:var(--success)">${ini}</div>
        <span>${m.apellido_paterno} ${m.apellido_materno ?? ""}, ${m.nombre}</span>
      </div></td>
      <td><code>${m.rfc ?? "—"}</code></td>
      <td>${m.departamento ?? "—"}</td>
      <td>${m.correo_institucional ?? "—"}</td>
      <td style="text-align:center">${badge}</td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px">
          <div class="table-actions">
            <button class="btn-icon" onclick="editarMaestro('${rfcSafe}')"><iconify-icon icon="lucide:pencil"></iconify-icon></button>
            <button class="btn-icon btn-del" onclick="eliminarMaestro('${rfcSafe}')"><iconify-icon icon="lucide:trash-2"></iconify-icon></button>
          </div>
          <iconify-icon id="chev_m_${rfcSafe}" icon="lucide:chevron-down" onclick="event.stopPropagation();toggleMaestroExpand('${rfcSafe}')" style="color:var(--text-muted);font-size:1rem;transition:transform 0.2s;flex-shrink:0;cursor:pointer"></iconify-icon>
        </div>
      </td>
    </tr>
    <tr id="expand_m_${rfcSafe}" style="display:none">
      <td colspan="6" style="padding:0">
        <div style="background:var(--bg-alt);padding:14px 24px 14px 60px;border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
          <div><p style="font-size:0.72rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin:0 0 3px">CURP</p><p style="font-size:0.85rem;color:var(--text-main);margin:0">${m.curp || "—"}</p></div>
          <div><p style="font-size:0.72rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin:0 0 3px">Correo personal</p><p style="font-size:0.85rem;color:var(--text-main);margin:0">${m.correo_personal || "—"}</p></div>
          <div><p style="font-size:0.72rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin:0 0 3px">Teléfono</p><p style="font-size:0.85rem;color:var(--text-main);margin:0">${m.tel_celular || "—"}</p></div>
          <div><p style="font-size:0.72rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin:0 0 3px">Grado académico</p><p style="font-size:0.85rem;color:var(--text-main);margin:0">${m.grado_academico || "—"}</p></div>
        </div>
      </td>
    </tr>`;
    })
    .join("");
}

function abrirModalNuevo() {
  modoEdicion = false;
  empleadoEditando = null;
  document.getElementById("modalTitulo").textContent = "Nuevo maestro";
  document.getElementById("grupoPassword").style.display = "";
  limpiarForm();
  const rfcEl = document.getElementById("f_rfc");
  if (rfcEl) rfcEl.disabled = false;
  ocultarError();
  abrirModal("modalMaestro");
}

function editarMaestro(ne) {
  const m = maestrosGlobal.find((x) => x.rfc === ne);
  if (!m) return;

  modoEdicion = true;
  empleadoEditando = ne;
  document.getElementById("modalTitulo").textContent = "Editar maestro";
  document.getElementById("grupoPassword").style.display = "none";

  // Rellenar campos
  document.getElementById("f_rfc").value = m.rfc ?? "";
  document.getElementById("f_rfc").disabled = true;
  document.getElementById("f_nombre").value = m.nombre ?? "";
  document.getElementById("f_ap_pat").value = m.apellido_paterno ?? "";
  document.getElementById("f_ap_mat").value = m.apellido_materno ?? "";
  document.getElementById("f_estatus").value = m.estatus ?? "Activo";
  document.getElementById("f_correo").value = m.correo_institucional ?? "";

  document.getElementById("f_curp").value = m.curp ?? "";
  document.getElementById("f_fnac").value =
    m.fecha_nacimiento?.slice(0, 10) ?? "";
  document.getElementById("f_genero").value = m.genero ?? "";
  document.getElementById("f_celular").value = m.tel_celular ?? "";
  document.getElementById("f_correo_personal").value = m.correo_personal ?? "";
  document.getElementById("f_direccion").value = m.direccion ?? "";

  document.getElementById("f_departamento").value = m.departamento ?? "";
  document.getElementById("f_especialidad").value = m.especialidad ?? "";
  document.getElementById("f_grado").value = m.grado_academico ?? "";
  document.getElementById("f_contrato").value = m.tipo_contrato ?? "";
  document.getElementById("f_ingreso").value =
    m.fecha_ingreso?.slice(0, 10) ?? "";
  document.getElementById("f_tel_oficina").value = m.tel_oficina ?? "";

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
    if (!rfc) {
      mostrarError("El RFC es obligatorio.", "esencial");
      return;
    }
    if (!nom) {
      mostrarError("El nombre es obligatorio.", "esencial");
      return;
    }
    if (!ap) {
      mostrarError("El apellido paterno es obligatorio.", "esencial");
      return;
    }
    if (!correo) {
      mostrarError("El correo institucional es obligatorio.", "esencial");
      return;
    }
    if (!pwd) {
      mostrarError("La contraseña inicial es obligatoria.", "esencial");
      return;
    }
  }

  const token = localStorage.getItem("token");
  const btn = document.getElementById("btnGuardar");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Guardando…`;

  const body = {
    nombre: nom,
    apellido_paterno: ap,
    apellido_materno: document.getElementById("f_ap_mat").value.trim(),
    correo_institucional: document.getElementById("f_correo").value.trim(),
    correo_personal: document.getElementById("f_correo_personal").value.trim(),
    curp: document.getElementById("f_curp").value.trim().toUpperCase(),
    rfc: document.getElementById("f_rfc").value.trim().toUpperCase(),
    fecha_nacimiento: document.getElementById("f_fnac").value || null,
    genero: document.getElementById("f_genero").value || null,
    tel_celular: document.getElementById("f_celular").value.trim(),
    tel_oficina: document.getElementById("f_tel_oficina").value.trim(),
    grado_academico: document.getElementById("f_grado").value || null,
    tipo_contrato: document.getElementById("f_contrato").value || null,
    departamento: document.getElementById("f_departamento").value.trim(),
    especialidad: document.getElementById("f_especialidad").value.trim(),
    direccion: document.getElementById("f_direccion").value.trim(),
    estatus: document.getElementById("f_estatus").value,
    fecha_ingreso: document.getElementById("f_ingreso").value || null,
    password: pwd,
  };

  try {
    const url = modoEdicion
      ? `${API_URL}/api/maestros/${empleadoEditando}`
      : `${API_URL}/api/maestros`;
    const method = modoEdicion ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error al guardar");
    toast(
      modoEdicion ? "Maestro actualizado" : "Maestro registrado correctamente",
    );
    cerrarModal("modalMaestro");
    await cargarMaestros();
  } catch (e) {
    mostrarError(e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:save"></iconify-icon> Guardar`;
  }
}

async function eliminarMaestro(ne) {
  const errEl = document.getElementById("eliminarMaestroError");
  errEl.style.display = "none";
  document.getElementById("nombreEliminarMaestro").textContent = ne;
  document.getElementById("modalEliminarMaestro").classList.add("visible");
  document.getElementById("btnConfirmarEliminarMaestro").onclick = async () => {
    errEl.style.display = "none";
    const token = localStorage.getItem("token");
    try {
      const r = await fetch(`${API_URL}/api/maestros/${ne}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        errEl.textContent = data.error || "No se pudo eliminar.";
        errEl.style.display = "block";
        return;
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

function mostrarError(msg, tabDonde = null) {
  const errEl = document.getElementById("modalError");
  errEl.textContent = msg;
  errEl.style.display = "block";
}
function ocultarError() {
  const errEl = document.getElementById("modalError");
  if (errEl) errEl.style.display = "none";
}

function limpiarForm() {
  const ids = [
    "f_correo",
    "f_nombre",
    "f_ap_pat",
    "f_ap_mat",
    "f_curp",
    "f_rfc",
    "f_fnac",
    "f_genero",
    "f_celular",
    "f_correo_personal",
    "f_grado",
    "f_contrato",
    "f_departamento",
    "f_especialidad",
    "f_direccion",
    "f_ingreso",
    "f_password",
    "f_tel_oficina",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = "";
      delete el.dataset.editado;
    }
  });
  const estEl = document.getElementById("f_estatus");
  if (estEl) estEl.value = "Activo";
  ocultarError();
}

function exportarCSVMaestros() {
  if (!maestrosGlobal.length) {
    toast("No hay datos para exportar", "info");
    return;
  }
  const cols = [
    "rfc", "nombre", "apellido_paterno", "apellido_materno", "curp",
    "fecha_nacimiento", "genero", "correo_institucional", "correo_personal",
    "tel_celular", "tel_oficina", "direccion", "departamento",
    "tipo_contrato", "estatus", "fecha_ingreso", "grado_academico", "especialidad",
  ];
  const headers = [
    "RFC", "Nombre", "Apellido Paterno", "Apellido Materno", "CURP",
    "Fecha Nacimiento", "Género", "Correo Institucional", "Correo Personal",
    "Tel. Celular", "Tel. Oficina", "Dirección", "Departamento",
    "Tipo Contrato", "Estatus", "Fecha Ingreso", "Grado Académico", "Especialidad",
  ];
  const fechasCols = ["fecha_nacimiento", "fecha_ingreso"];
  exportarXLSX(cols, headers, maestrosGlobal, "maestros_RCA", (c, v) =>
    fechasCols.includes(c) ? fechaADisplay(v) : (v ?? "")
  );
  toast("Exportado correctamente");
}

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
  const reader = new FileReader();
  reader.onload = (e) => {
    const { headers, rows } = parseCSVRobusto(e.target.result);
    if (!rows.length) {
      document.getElementById("csvMaestrosPreview").innerHTML =
        "<p style='color:var(--danger);font-size:0.85rem;margin-top:8px'>El archivo está vacío o solo tiene encabezado.</p>";
      return;
    }
    csvMaestrosData = rows;
    mostrarPreviewCSVMaestros(headers, csvMaestrosData);
    document.getElementById("btnImportarMaestros").disabled = csvMaestrosData.length === 0;
  };
  reader.readAsText(file, "UTF-8");
}

function mostrarPreviewCSVMaestros(headers, data) {
  const muestra = data.slice(0, 5);
  const preview = document.getElementById("csvMaestrosPreview");
  if (!data.length) {
    preview.innerHTML =
      "<p style='color:var(--danger);font-size:0.85rem;margin-top:8px'>Sin datos válidos.</p>";
    return;
  }
  preview.innerHTML = `
    <p style="font-size:0.8rem;color:var(--text-muted);margin:10px 0 4px">
      ${data.length} registros detectados — vista previa (primeros 5):
    </p>
    <div class="csv-preview">
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${muestra
          .map(
            (r) =>
              `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody>
      </table>
    </div>`;
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        maestros: csvMaestrosData.map((m) => ({
          ...m,
          fecha_nacimiento: fechaAISO(m.fecha_nacimiento) || null,
          fecha_ingreso: fechaAISO(m.fecha_ingreso) || null,
        })),
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error al importar");

    toast(`${data.insertados} maestro(s) importados correctamente`);
    if (data.errores?.length) {
      toast(
        `${data.errores.length} fila(s) con errores — revisa la consola`,
        "info",
      );
      console.table(data.errores);
    }
    cerrarModalCSVMaestros();
    cargarMaestros(); // recarga la tabla
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

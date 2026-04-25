const BASE_URL = "http://localhost:3000";
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
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".modal-tab")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(`tab-${nombre}`)?.classList.add("active");
  document.getElementById(`tab-btn-${nombre}`)?.classList.add("active");
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
    const r = await fetch(`${BASE_URL}/api/maestros`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 401) {
      window.location.href = "login.html";
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

function filtrarMaestros() {
  const q = document.getElementById("filtroBusqueda").value.toLowerCase();
  const dpto = document.getElementById("filtroDepartamento").value;
  let datos = maestrosGlobal.filter((m) => {
    const nombre =
      `${m.nombre} ${m.apellido_paterno} ${m.apellido_materno ?? ""}`.toLowerCase();
    return (
      (!q ||
        nombre.includes(q) ||
        m.rfc?.toLowerCase().includes(q)) &&
      (!dpto || m.departamento === dpto)
    );
  });
  datos.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));
  document.getElementById("statFiltrados").textContent = datos.length;
  renderTabla(datos);
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
            : `<span class="badge badge-danger">Inactivo</span>`;
      return `<tr>
      <td><div class="avatar-cell">
        <div class="avatar" style="background:var(--success-light);color:var(--success)">${ini}</div>
        <span>${m.apellido_paterno} ${m.apellido_materno ?? ""}, ${m.nombre}</span>
      </div></td>
      <td><code>${m.rfc ?? "—"}</code></td>
      <td>${m.departamento ?? "—"}</td>
      <td>${m.correo_institucional ?? "—"}</td>
      <td>${badge}</td>
      <td><div class="table-actions">
        <button class="btn-icon" onclick="editarMaestro('${m.rfc}')"><iconify-icon icon="lucide:pencil"></iconify-icon></button>
        <button class="btn-icon btn-del" onclick="eliminarMaestro('${m.rfc}')"><iconify-icon icon="lucide:trash-2"></iconify-icon></button>
      </div></td>
    </tr>`;
    })
    .join("");
}

function abrirModalNuevo() {
  modoEdicion = false;
  empleadoEditando = null;
  document.getElementById("modalTitulo").textContent = "Nuevo maestro";
  document.getElementById("grupoPassword").style.display = "";
  document.getElementById("modalAvatarHeader").style.display = "none";
  limpiarForm();
  const rfcEl = document.getElementById("f_rfc");
  if (rfcEl) rfcEl.disabled = false;
  cambiarTab("esencial");
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

  // Avatar dinámico
  const ini =
    `${m.nombre?.[0] ?? ""}${m.apellido_paterno?.[0] ?? ""}`.toUpperCase();
  document.getElementById("modalAvatarBig").textContent = ini;
  document.getElementById("modalAvatarNombre").textContent =
    `${m.nombre} ${m.apellido_paterno} ${m.apellido_materno ?? ""}`.trim();
  document.getElementById("modalAvatarHeader").style.display = "flex";

  // Rellenar campos — Tab Esencial
  document.getElementById("f_rfc").value = m.rfc ?? "";
  document.getElementById("f_rfc").disabled = true; // RFC no se puede cambiar al editar
  document.getElementById("f_correo").value = m.correo_institucional ?? "";
  document.getElementById("f_nombre").value = m.nombre ?? "";
  document.getElementById("f_ap_pat").value = m.apellido_paterno ?? "";
  document.getElementById("f_ap_mat").value = m.apellido_materno ?? "";
  document.getElementById("f_estatus").value = m.estatus ?? "Activo";

  // Tab Personal
  document.getElementById("f_curp").value = m.curp ?? "";
  document.getElementById("f_rfc").value = m.rfc ?? "";
  document.getElementById("f_fnac").value =
    m.fecha_nacimiento?.slice(0, 10) ?? "";
  document.getElementById("f_genero").value = m.genero ?? "";
  document.getElementById("f_celular").value = m.tel_celular ?? "";
  document.getElementById("f_correo_personal").value = m.correo_personal ?? "";
  document.getElementById("f_direccion").value = m.direccion ?? "";

  // Tab Laboral
  document.getElementById("f_departamento").value = m.departamento ?? "";
  document.getElementById("f_especialidad").value = m.especialidad ?? "";
  document.getElementById("f_grado").value = m.grado_academico ?? "";
  document.getElementById("f_contrato").value = m.tipo_contrato ?? "";
  document.getElementById("f_ingreso").value =
    m.fecha_ingreso?.slice(0, 10) ?? "";
  document.getElementById("f_tel_oficina").value = m.tel_oficina ?? "";

  cambiarTab("esencial");
  ocultarError();
  abrirModal("modalMaestro");
}

async function guardarMaestro() {
  const rfc = document.getElementById("f_rfc").value.trim().toUpperCase();
  const nom = document.getElementById("f_nombre").value.trim();
  const ap = document.getElementById("f_ap_pat").value.trim();
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
      ? `${BASE_URL}/api/maestros/${empleadoEditando}`
      : `${BASE_URL}/api/maestros`;
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
  if (!confirm(`¿Eliminar al maestro ${ne}? Esta acción no se puede deshacer.`))
    return;
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${BASE_URL}/api/maestros/${ne}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error("No se pudo eliminar");
    toast("Maestro eliminado");
    await cargarMaestros();
  } catch (e) {
    toast(e.message, "error");
  }
}

function mostrarError(msg, tabDonde = null) {
  const errEl = document.getElementById("modalError");
  errEl.textContent = msg;
  errEl.style.display = "block";
  if (tabDonde) cambiarTab(tabDonde);
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
    if (el) { el.value = ""; delete el.dataset.editado; }
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
    "nombre",
    "apellido_paterno",
    "apellido_materno",
    "correo_institucional",
    "departamento",
    "tipo_contrato",
    "estatus",
    "grado_academico",
  ];
  const rows = [
    cols.join(","),
    ...maestrosGlobal.map((m) =>
      cols
        .map((c) => `"${(m[c] ?? "").toString().replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "maestros_RCA.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast("CSV exportado correctamente");
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
    const lines = e.target.result.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      document.getElementById("csvMaestrosPreview").innerHTML =
        "<p style='color:var(--danger);font-size:0.85rem;margin-top:8px'>El archivo está vacío o solo tiene encabezado.</p>";
      return;
    }
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    csvMaestrosData = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] ?? "";
      });
      return obj;
    });
    mostrarPreviewCSVMaestros(headers, csvMaestrosData);
    document.getElementById("btnImportarMaestros").disabled =
      csvMaestrosData.length === 0;
  };
  reader.readAsText(file);
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
    const r = await fetch(`${BASE_URL}/api/maestros/csv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ maestros: csvMaestrosData }),
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

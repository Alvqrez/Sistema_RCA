// frontend/js/maestros.js
const BASE_URL = "http://localhost:3000";
let maestrosGlobal = [];
let modoEdicion = false;
let empleadoEditando = null;

// ─── Toast ───────────────────────────────────────────────────────────
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

// ─── Tabs ────────────────────────────────────────────────────────────
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

// ─── Modal helpers ───────────────────────────────────────────────────
function abrirModal(id) {
  document.getElementById(id).classList.add("visible");
}
function cerrarModal(id) {
  document.getElementById(id).classList.remove("visible");
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay"))
    e.target.classList.remove("visible");
});

// ─── Init ────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  soloPermitido("administrador");
  document.getElementById("headerActions").style.display = "flex";
  await cargarMaestros();
  if (window.location.hash === "#registro") abrirModalNuevo();
});

// ─── Cargar maestros ─────────────────────────────────────────────────
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
        m.numero_empleado.toLowerCase().includes(q)) &&
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
      <td><code>${m.numero_empleado}</code></td>
      <td>${m.departamento ?? "—"}</td>
      <td>${m.correo_institucional ?? "—"}</td>
      <td>${badge}</td>
      <td><div class="table-actions">
        <button class="btn-icon" onclick="editarMaestro('${m.numero_empleado}')"><iconify-icon icon="lucide:pencil"></iconify-icon></button>
        <button class="btn-icon btn-del" onclick="eliminarMaestro('${m.numero_empleado}')"><iconify-icon icon="lucide:trash-2"></iconify-icon></button>
      </div></td>
    </tr>`;
    })
    .join("");
}

// ─── Abrir modal nuevo ───────────────────────────────────────────────
function abrirModalNuevo() {
  modoEdicion = false;
  empleadoEditando = null;
  document.getElementById("modalTitulo").textContent = "Nuevo maestro";
  document.getElementById("f_num_emp").disabled = false;
  document.getElementById("grupoPassword").style.display = "";
  document.getElementById("modalAvatarHeader").style.display = "none";
  limpiarForm();
  cambiarTab("esencial"); // siempre empezar en la primera pestaña
  ocultarError();
  abrirModal("modalMaestro");
}

// ─── Editar maestro ──────────────────────────────────────────────────
function editarMaestro(ne) {
  const m = maestrosGlobal.find((x) => x.numero_empleado === ne);
  if (!m) return;

  modoEdicion = true;
  empleadoEditando = ne;
  document.getElementById("modalTitulo").textContent = "Editar maestro";
  document.getElementById("f_num_emp").disabled = true;
  document.getElementById("grupoPassword").style.display = "none";

  // Avatar dinámico
  const ini =
    `${m.nombre?.[0] ?? ""}${m.apellido_paterno?.[0] ?? ""}`.toUpperCase();
  document.getElementById("modalAvatarBig").textContent = ini;
  document.getElementById("modalAvatarNombre").textContent =
    `${m.nombre} ${m.apellido_paterno} ${m.apellido_materno ?? ""}`.trim();
  document.getElementById("modalAvatarHeader").style.display = "flex";

  // Rellenar campos — Tab Esencial
  document.getElementById("f_num_emp").value = m.numero_empleado;
  document.getElementById("f_correo").value = m.correo_institucional ?? "";
  document.getElementById("f_nombre").value = m.nombre ?? "";
  document.getElementById("f_ap_pat").value = m.apellido_paterno ?? "";
  document.getElementById("f_ap_mat").value = m.apellido_materno ?? "";
  document.getElementById("f_estatus").value = m.estatus ?? "Activo";
  document.getElementById("f_username").value = "";

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

// ─── Guardar maestro ─────────────────────────────────────────────────
async function guardarMaestro() {
  const ne = document.getElementById("f_num_emp").value.trim();
  const nom = document.getElementById("f_nombre").value.trim();
  const ap = document.getElementById("f_ap_pat").value.trim();
  const user = document.getElementById("f_username").value.trim();
  const pwd = document.getElementById("f_password").value;

  ocultarError();

  if (!modoEdicion) {
    if (!ne) {
      mostrarError("El No. de empleado es obligatorio.", "esencial");
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
    if (!user) {
      mostrarError("El usuario de acceso es obligatorio.", "esencial");
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
    numero_empleado: ne,
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
    username: user,
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

// ─── Eliminar maestro ────────────────────────────────────────────────
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

// ─── Helpers de error ────────────────────────────────────────────────
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

// ─── Limpiar form ────────────────────────────────────────────────────
function limpiarForm() {
  const ids = [
    "f_num_emp",
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
    "f_username",
    "f_password",
    "f_tel_oficina",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const estEl = document.getElementById("f_estatus");
  if (estEl) estEl.value = "Activo";
  ocultarError();
}

// ─── Exportar CSV ────────────────────────────────────────────────────
function exportarCSVMaestros() {
  if (!maestrosGlobal.length) {
    toast("No hay datos para exportar", "info");
    return;
  }
  const cols = [
    "numero_empleado",
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

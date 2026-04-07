// frontend/js/alumnos.js
const BASE_URL = "http://localhost:3000";
let alumnosGlobal = [];
let modoEdicion = false;
let matriculaEditando = null;
let csvData = [];

// ── Toast ─────────────────────────────────────────────────────────────
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

// ── Modal helpers ─────────────────────────────────────────────────────
function abrirModal(id) {
  document.getElementById(id).classList.add("visible");
}
function cerrarModal(id) {
  document.getElementById(id).classList.remove("visible");
}

// Cerrar modal al hacer clic fuera
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("visible");
  }
});

// ── Init ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  soloPermitido("administrador", "maestro");
  const rol = localStorage.getItem("rol");

  if (rol === "administrador") {
    document.getElementById("headerActions").style.display = "flex";
  }

  await Promise.all([cargarAlumnos(), cargarCarrerasSelect()]);

  // Hash check
  if (window.location.hash === "#registro") abrirModalNuevo();
});

// ── Cargar alumnos ────────────────────────────────────────────────────
async function cargarAlumnos() {
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${BASE_URL}/api/alumnos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 401) {
      window.location.href = "login.html";
      return;
    }
    alumnosGlobal = await r.json();
    actualizarStats();
    filtrar();
  } catch {
    toast("No se pudo cargar la lista de alumnos", "error");
  }
}

function actualizarStats() {
  document.getElementById("statTotal").textContent = alumnosGlobal.length;
  const carreras = new Set(alumnosGlobal.map((a) => a.id_carrera));
  document.getElementById("statCarreras").textContent = carreras.size;
}

// ── Filtrar ───────────────────────────────────────────────────────────
function filtrar() {
  const q = document.getElementById("filtroBusqueda").value.toLowerCase();
  const carrera = document.getElementById("filtroCarrera").value;
  const rol = localStorage.getItem("rol");

  let datos = alumnosGlobal.filter((a) => {
    const nombre =
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno ?? ""}`.toLowerCase();
    const matchQ =
      !q || nombre.includes(q) || a.matricula.toLowerCase().includes(q);
    const matchC = !carrera || a.id_carrera === carrera;
    return matchQ && matchC;
  });
  datos.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));
  document.getElementById("statFiltrados").textContent = datos.length;
  renderTabla(datos, rol);
}

function renderTabla(datos, rol) {
  const tbody = document.getElementById("tablaAlumnos");
  if (!datos.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <iconify-icon icon="lucide:search-x"></iconify-icon>
      <p>Sin resultados con los filtros actuales</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = datos
    .map((a) => {
      const iniciales =
        `${a.nombre?.[0] ?? ""}${a.apellido_paterno?.[0] ?? ""}`.toUpperCase();
      const acciones =
        rol === "administrador"
          ? `<div class="table-actions">
          <button class="btn-icon" title="Editar" onclick="editarAlumno('${a.matricula}')">
            <iconify-icon icon="lucide:pencil"></iconify-icon>
          </button>
          <button class="btn-icon btn-del" title="Eliminar" onclick="eliminarAlumno('${a.matricula}')">
            <iconify-icon icon="lucide:trash-2"></iconify-icon>
          </button>
        </div>`
          : "—";
      return `<tr>
      <td><div class="avatar-cell">
        <div class="avatar">${iniciales}</div>
        <span>${a.apellido_paterno} ${a.apellido_materno ?? ""}, ${a.nombre}</span>
      </div></td>
      <td><code>${a.matricula}</code></td>
      <td><span class="badge badge-info">${a.id_carrera}</span></td>
      <td>${a.correo_institucional ?? "—"}</td>
      <td>${a.tel_celular ?? "—"}</td>
      <td>${acciones}</td>
    </tr>`;
    })
    .join("");
}

// ── Cargar carreras en selects ────────────────────────────────────────
async function cargarCarrerasSelect() {
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${BASE_URL}/api/carreras`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const carreras = await r.json();

    const selForm = document.getElementById("f_carrera");
    const selFiltro = document.getElementById("filtroCarrera");

    carreras.forEach((c) => {
      const opt = `<option value="${c.id_carrera}">${c.id_carrera} — ${c.nombre_carrera}</option>`;
      selForm.innerHTML += opt;
      selFiltro.innerHTML += `<option value="${c.id_carrera}">${c.id_carrera}</option>`;
    });
  } catch {
    /* silencioso */
  }
}

// ── Abrir modal nuevo ─────────────────────────────────────────────────
function abrirModalNuevo() {
  modoEdicion = false;
  matriculaEditando = null;
  document.getElementById("modalTitulo").textContent = "Nuevo alumno";
  document.getElementById("f_matricula").disabled = false;
  document.getElementById("grupoPassword").style.display = "";
  limpiarForm();
  abrirModal("modalAlumno");
}

// ── Editar alumno ─────────────────────────────────────────────────────
function editarAlumno(matricula) {
  const a = alumnosGlobal.find((x) => x.matricula === matricula);
  if (!a) return;
  modoEdicion = true;
  matriculaEditando = matricula;
  document.getElementById("modalTitulo").textContent = "Editar alumno";
  document.getElementById("f_matricula").value = a.matricula;
  document.getElementById("f_matricula").disabled = true;
  document.getElementById("f_carrera").value = a.id_carrera ?? "";
  document.getElementById("f_correo").value = a.correo_institucional ?? "";
  document.getElementById("f_nombre").value = a.nombre ?? "";
  document.getElementById("f_ap_pat").value = a.apellido_paterno ?? "";
  document.getElementById("f_ap_mat").value = a.apellido_materno ?? "";
  document.getElementById("f_curp").value = a.curp ?? "";
  document.getElementById("f_fnac").value =
    a.fecha_nacimiento?.slice(0, 10) ?? "";
  document.getElementById("f_genero").value = a.genero ?? "";
  document.getElementById("f_direccion").value = a.direccion ?? "";
  document.getElementById("f_celular").value = a.tel_celular ?? "";
  document.getElementById("f_tel_casa").value = a.tel_casa ?? "";
  document.getElementById("f_correo_personal").value = a.correo_personal ?? "";
  document.getElementById("f_username").value = "";
  document.getElementById("f_password").value = "";
  document.getElementById("grupoPassword").style.display = "none"; // no cambiar pwd en edición
  abrirModal("modalAlumno");
}

// ── Guardar alumno ────────────────────────────────────────────────────
async function guardarAlumno() {
  const matricula = document.getElementById("f_matricula").value.trim();
  const id_carrera = document.getElementById("f_carrera").value;
  const correo = document.getElementById("f_correo").value.trim();
  const nombre = document.getElementById("f_nombre").value.trim();
  const username = document.getElementById("f_username").value.trim();
  const password = document.getElementById("f_password").value;

  const errEl = document.getElementById("modalError");
  errEl.style.display = "none";

  if (!modoEdicion && (!matricula || !id_carrera || !username || !password)) {
    errEl.textContent = "Los campos marcados con * son obligatorios.";
    errEl.style.display = "block";
    return;
  }

  const token = localStorage.getItem("token");
  const btn = document.getElementById("btnGuardar");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Guardando…`;

  const body = {
    matricula,
    id_carrera,
    correo_institucional: correo,
    nombre,
    apellido_paterno: document.getElementById("f_ap_pat").value.trim(),
    apellido_materno: document.getElementById("f_ap_mat").value.trim(),
    curp: document.getElementById("f_curp").value.trim(),
    fecha_nacimiento: document.getElementById("f_fnac").value || null,
    genero: document.getElementById("f_genero").value || null,
    direccion: document.getElementById("f_direccion").value.trim(),
    tel_celular: document.getElementById("f_celular").value.trim(),
    tel_casa: document.getElementById("f_tel_casa").value.trim(),
    correo_personal: document.getElementById("f_correo_personal").value.trim(),
    username,
    password,
  };

  try {
    const url = modoEdicion
      ? `${BASE_URL}/api/alumnos/${matriculaEditando}`
      : `${BASE_URL}/api/alumnos`;
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
      modoEdicion ? "Alumno actualizado" : "Alumno registrado correctamente",
    );
    cerrarModal("modalAlumno");
    await cargarAlumnos();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:save"></iconify-icon> Guardar`;
  }
}

// ── Eliminar alumno ───────────────────────────────────────────────────
async function eliminarAlumno(matricula) {
  if (
    !confirm(
      `¿Eliminar al alumno ${matricula}? Esta acción no se puede deshacer.`,
    )
  )
    return;
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${BASE_URL}/api/alumnos/${matricula}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error("No se pudo eliminar");
    toast("Alumno eliminado");
    await cargarAlumnos();
  } catch (e) {
    toast(e.message, "error");
  }
}

// ── Limpiar form ──────────────────────────────────────────────────────
function limpiarForm() {
  [
    "f_matricula",
    "f_carrera",
    "f_correo",
    "f_nombre",
    "f_ap_pat",
    "f_ap_mat",
    "f_curp",
    "f_fnac",
    "f_genero",
    "f_direccion",
    "f_celular",
    "f_tel_casa",
    "f_correo_personal",
    "f_username",
    "f_password",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const errEl = document.getElementById("modalError");
  if (errEl) errEl.style.display = "none";
}

// ── Exportar CSV ──────────────────────────────────────────────────────
function exportarCSV() {
  if (!alumnosGlobal.length) {
    toast("No hay datos para exportar", "info");
    return;
  }
  const cols = [
    "matricula",
    "nombre",
    "apellido_paterno",
    "apellido_materno",
    "id_carrera",
    "correo_institucional",
    "tel_celular",
  ];
  const rows = [cols.join(",")];
  alumnosGlobal.forEach((a) => {
    rows.push(
      cols
        .map((c) => `"${(a[c] ?? "").toString().replace(/"/g, '""')}"`)
        .join(","),
    );
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "alumnos_RCA.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast("CSV exportado correctamente");
}

// ── CSV Import ────────────────────────────────────────────────────────
function abrirModalImport() {
  csvData = [];
  document.getElementById("csvPreview").innerHTML = "";
  document.getElementById("btnImportar").disabled = true;
  document.getElementById("inputCSV").value = "";
  abrirModal("modalImport");
}

function soltar(e) {
  e.preventDefault();
  document.getElementById("dropZone").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) procesarCSVFile(file);
}

function leerCSV(e) {
  const file = e.target.files[0];
  if (file) procesarCSVFile(file);
}

function procesarCSVFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.trim().split("\n").filter(Boolean);
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    csvData = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] ?? "";
      });
      return obj;
    });
    mostrarPreviewCSV(headers, csvData);
    document.getElementById("btnImportar").disabled = csvData.length === 0;
  };
  reader.readAsText(file);
}

function mostrarPreviewCSV(headers, data) {
  const muestra = data.slice(0, 5);
  const preview = document.getElementById("csvPreview");
  if (!data.length) {
    preview.innerHTML =
      "<p style='color:var(--danger);font-size:0.85rem;margin-top:8px'>Sin datos válidos en el archivo.</p>";
    return;
  }
  preview.innerHTML = `
    <p style="font-size:0.8rem;color:var(--text-muted);margin:10px 0 4px">${data.length} registros detectados — vista previa (primeros 5):</p>
    <div class="csv-preview">
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${muestra.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>`;
}

async function importarCSV() {
  if (!csvData.length) return;
  const token = localStorage.getItem("token");
  const btn = document.getElementById("btnImportar");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Importando…`;
  try {
    const r = await fetch(`${BASE_URL}/api/alumnos/csv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ alumnos: csvData }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error al importar");
    toast(`${data.insertados} alumno(s) importados correctamente`);
    if (data.errores?.length) {
      toast(
        `${data.errores.length} registro(s) con errores — revisa la consola`,
        "info",
      );
      console.table(data.errores);
    }
    cerrarModal("modalImport");
    await cargarAlumnos();
  } catch (e) {
    toast(e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:upload"></iconify-icon> Importar`;
  }
}

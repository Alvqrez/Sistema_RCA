let alumnosGlobal = [];
let modoEdicion = false;
let no_controlEditando = null;
let csvData = [];

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

document.addEventListener("DOMContentLoaded", async () => {
  soloPermitido("administrador", "maestro");
  const rol = localStorage.getItem("rol");
  if (rol === "administrador")
    document.getElementById("headerActions").style.display = "flex";
  await Promise.all([cargarAlumnos(), cargarCarrerasSelect()]);
  if (window.location.hash === "#registro") abrirModalNuevo();
});

async function cargarAlumnos() {
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${API_URL}/api/alumnos`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (r.status === 401) {
      window.location.href = "../../shared/pages/login.html";
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

function filtrar() {
  const q = document.getElementById("filtroBusqueda").value.toLowerCase();
  const carrera = document.getElementById("filtroCarrera").value;
  const rol = localStorage.getItem("rol");

  let datos = alumnosGlobal.filter((a) => {
    const nombre =
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno ?? ""}`.toLowerCase();
    return (
      (!q || nombre.includes(q) || a.no_control.toLowerCase().includes(q)) &&
      (!carrera || a.id_carrera === carrera)
    );
  });
  datos.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));
  document.getElementById("statFiltrados").textContent = datos.length;
  renderTabla(datos, rol);
}

function renderTabla(datos, rol) {
  const tbody = document.getElementById("tablaAlumnos");
  if (!datos.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
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
          <button class="btn-icon" title="Ver cursos inscritos" onclick="abrirModalCursos('${a.no_control}')">
            <iconify-icon icon="lucide:book-open"></iconify-icon>
          </button>
          <button class="btn-icon" title="Editar" onclick="editarAlumno('${a.no_control}')">
            <iconify-icon icon="lucide:pencil"></iconify-icon>
          </button>
          <button class="btn-icon btn-del" title="Eliminar" onclick="eliminarAlumno('${a.no_control}')">
            <iconify-icon icon="lucide:trash-2"></iconify-icon>
          </button>
        </div>`
          : "—";
      return `<tr>
      <td><div class="avatar-cell">
        <div class="avatar">${iniciales}</div>
        <span>${a.apellido_paterno} ${a.apellido_materno ?? ""}, ${a.nombre}</span>
      </div></td>
      <td><code>${a.no_control}</code></td>
      <td><span class="badge badge-info">${a.id_carrera}</span></td>
      <td>${a.correo_institucional ?? "—"}</td>
      <td>${a.tel_celular ?? "—"}</td>
      <td>${acciones}</td>
    </tr>`;
    })
    .join("");
}

async function cargarCarrerasSelect() {
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${API_URL}/api/carreras`, {
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

// Modal: cursos inscritos del alumno
async function abrirModalCursos(no_control) {
  const alumno = alumnosGlobal.find((a) => a.no_control === no_control);
  document.getElementById("cursosNombreAlumno").textContent = alumno
    ? `${alumno.nombre} ${alumno.apellido_paterno} (${no_control})`
    : no_control;

  const body = document.getElementById("cursosBody");
  body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">
    <iconify-icon icon="mdi:loading" style="animation:spin 1s linear infinite"></iconify-icon> Cargando…</td></tr>`;

  abrirModal("modalCursos");

  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${API_URL}/api/inscripciones/alumno/${no_control}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const cursos = await r.json();

    if (!Array.isArray(cursos) || !cursos.length) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">
        <iconify-icon icon="lucide:inbox" style="font-size:1.5rem;display:block;margin:0 auto 8px"></iconify-icon>
        Sin inscripciones registradas</td></tr>`;
      return;
    }

    body.innerHTML = cursos
      .map((c) => {
        const cal =
          c.calificacion_oficial != null
            ? `<strong style="color:${parseFloat(c.calificacion_oficial) >= 70 ? "var(--success)" : "var(--danger)"}">${c.calificacion_oficial}</strong>`
            : `<span style="color:var(--text-muted)">—</span>`;

        const estatus =
          c.estatus === "Cursando"
            ? `<span class="badge badge-info">Cursando</span>`
            : c.estatus === "Baja"
              ? `<span class="badge badge-danger">Baja</span>`
              : c.estatus === "Aprobado"
                ? `<span class="badge badge-success">Aprobado</span>`
                : `<span class="badge">${c.estatus ?? "—"}</span>`;

        return `<tr>
        <td><strong>${c.nombre_materia}</strong><br>
            <span style="font-size:0.75rem;color:var(--text-muted)">${c.clave_materia} · Grupo #${c.id_grupo}</span></td>
        <td style="font-size:0.83rem">${c.nombre_maestro ?? "—"}</td>
        <td style="font-size:0.83rem">${c.periodo ?? "—"}${c.anio ? ` ${c.anio}` : ""}</td>
        <td>${estatus}</td>
        <td style="text-align:center">${cal}</td>
      </tr>`;
      })
      .join("");
  } catch {
    body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--danger)">
      Error al cargar los cursos</td></tr>`;
  }
}

function abrirModalNuevo() {
  modoEdicion = false;
  no_controlEditando = null;
  document.getElementById("modalTitulo").textContent = "Nuevo alumno";
  document.getElementById("f_no_control").disabled = false;
  document.getElementById("f_carrera").disabled = false;
  document.getElementById("grupoUsername").style.display = "";
  document.getElementById("grupoPassword").style.display = "";
  limpiarForm();
  abrirModal("modalAlumno");
}

async function editarAlumno(no_control) {
  let a;
  try {
    const r = await fetch(`${API_URL}/api/alumnos/${no_control}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error();
    a = await r.json();
  } catch {
    toast("No se pudo cargar la información del alumno", "error");
    return;
  }
  modoEdicion = true;
  no_controlEditando = no_control;
  document.getElementById("modalTitulo").textContent = "Editar alumno";
  document.getElementById("f_no_control").value = a.no_control;
  document.getElementById("f_no_control").disabled = true;
  document.getElementById("f_carrera").value = a.id_carrera ?? "";
  document.getElementById("f_carrera").disabled = true;
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
  document.getElementById("grupoUsername").style.display = "none";
  document.getElementById("grupoPassword").style.display = "none";
  abrirModal("modalAlumno");
}

async function guardarAlumno() {
  const no_control = document.getElementById("f_no_control").value.trim();
  const id_carrera = document.getElementById("f_carrera").value;
  const correo = document.getElementById("f_correo").value.trim();
  const nombre = document.getElementById("f_nombre").value.trim();
  const password = document.getElementById("f_password").value;
  const errEl = document.getElementById("modalError");
  errEl.style.display = "none";

  if (!modoEdicion && (!no_control || !id_carrera || !password)) {
    errEl.textContent = "Los campos marcados con * son obligatorios.";
    errEl.style.display = "block";
    return;
  }

  // Validar CURP si se proporcionó (debe tener exactamente 18 caracteres)
  const curpVal = document.getElementById("f_curp").value.trim();
  if (curpVal && curpVal.length !== 18) {
    errEl.textContent =
      "El CURP debe tener exactamente 18 caracteres (actualmente: " +
      curpVal.length +
      ").";
    errEl.style.display = "block";
    return;
  }

  const token = localStorage.getItem("token");
  const btn = document.getElementById("btnGuardar");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Guardando…`;

  const body = {
    no_control,
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
    password,
  };

  try {
    const url = modoEdicion
      ? `${API_URL}/api/alumnos/${no_controlEditando}`
      : `${API_URL}/api/alumnos`;
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

async function eliminarAlumno(no_control) {
  if (
    !confirm(
      `¿Eliminar al alumno ${no_control}? Esta acción no se puede deshacer.`,
    )
  )
    return;
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${API_URL}/api/alumnos/${no_control}`, {
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

function limpiarForm() {
  [
    "f_no_control",
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
    if (el) {
      el.value = "";
      delete el.dataset.editado;
    }
  });
  const errEl = document.getElementById("modalError");
  if (errEl) errEl.style.display = "none";
}

function exportarCSV() {
  if (!alumnosGlobal.length) {
    toast("No hay datos para exportar", "info");
    return;
  }
  const cols = [
    "no_control",
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
    const r = await fetch(`${API_URL}/api/alumnos/csv`, {
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

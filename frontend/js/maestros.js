// frontend/js/maestros.js — CORREGIDO (con editar)
const BASE_URL = "http://localhost:3000";
const token = localStorage.getItem("token");

soloPermitido("administrador");

if (!token) window.location.href = "login.html";

let maestroEditando = null; // null = registro, string = numero_empleado en edición

// ─── CARGAR ────────────────────────────────────────────────────────────────

async function cargarMaestros() {
  const response = await fetch(`${BASE_URL}/api/maestros`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    window.location.href = "login.html";
    return;
  }

  const maestros = await response.json();
  const tbody = document.getElementById("tablaMaestros");
  tbody.innerHTML = "";

  if (maestros.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">Sin maestros registrados</td></tr>`;
    return;
  }

  const rol = localStorage.getItem("rol");

  maestros.forEach((m) => {
    tbody.innerHTML += `
      <tr>
        <td>${m.numero_empleado}</td>
        <td>${m.nombre} ${m.apellido_paterno} ${m.apellido_materno ?? ""}</td>
        <td>${m.departamento ?? "—"}</td>
        <td>${m.correo_institucional}</td>
        <td>${m.tel_celular ?? "—"}</td>
        <td>${m.estatus}</td>
        <td>
          ${
            rol === "administrador"
              ? `<button class="btn-editar" onclick="editarMaestro('${m.numero_empleado}')">Editar</button>
                 <button class="btn-eliminar" onclick="eliminarMaestro('${m.numero_empleado}')">Eliminar</button>`
              : "—"
          }
        </td>
      </tr>
    `;
  });
}

// ─── SUBMIT ────────────────────────────────────────────────────────────────

document
  .querySelector("#formMaestro")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const maestro = {
      numero_empleado: document.getElementById("idMaestro").value.trim(),
      nombre: document.getElementById("nombre").value.trim(),
      apellido_paterno: document.getElementById("apellidoPaterno").value.trim(),
      apellido_materno:
        document.getElementById("apellidoMaterno").value.trim() || null,
      curp: document.getElementById("curp").value.trim() || null,
      correo_institucional: document
        .getElementById("correoInstitucional")
        .value.trim(),
      correo_personal:
        document.getElementById("correoPersonal").value.trim() || null,
      tel_celular: document.getElementById("telCelular").value.trim() || null,
      tel_oficina: document.getElementById("telOficina").value.trim() || null,
      direccion: document.getElementById("direccion").value.trim() || null,
      tipo_contrato:
        document.getElementById("tipoContrato").value.trim() || null,
      estatus: document.getElementById("estatus").value,
      fecha_ingreso: document.getElementById("fechaIngreso").value || null,
      grado_academico:
        document.getElementById("gradoAcademico").value.trim() || null,
      especialidad:
        document.getElementById("especialidad").value.trim() || null,
      departamento:
        document.getElementById("departamento").value.trim() || null,
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
    };

    let url = `${BASE_URL}/api/maestros`;
    let method = "POST";

    if (maestroEditando) {
      url = `${BASE_URL}/api/maestros/${maestroEditando}`;
      method = "PUT";
      delete maestro.numero_empleado;
      delete maestro.username;
      delete maestro.password;
    }

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(maestro),
    });

    const data = await response.json();

    if (data.success) {
      alert(data.mensaje || "Guardado correctamente.");
      cancelarEdicionMaestro();
      cargarMaestros();
    } else {
      alert(data.error || "Error al guardar.");
    }
  });

// ─── EDITAR ────────────────────────────────────────────────────────────────

async function editarMaestro(numero_empleado) {
  try {
    const res = await fetch(`${BASE_URL}/api/maestros/${numero_empleado}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      alert("No se pudo cargar el maestro.");
      return;
    }

    const m = await res.json();
    maestroEditando = numero_empleado;

    document.getElementById("idMaestro").value = m.numero_empleado;
    document.getElementById("idMaestro").disabled = true;
    document.getElementById("nombre").value = m.nombre ?? "";
    document.getElementById("apellidoPaterno").value = m.apellido_paterno ?? "";
    document.getElementById("apellidoMaterno").value = m.apellido_materno ?? "";
    document.getElementById("curp").value = m.curp ?? "";
    document.getElementById("correoInstitucional").value =
      m.correo_institucional ?? "";
    document.getElementById("correoPersonal").value = m.correo_personal ?? "";
    document.getElementById("telCelular").value = m.tel_celular ?? "";
    document.getElementById("telOficina").value = m.tel_oficina ?? "";
    document.getElementById("direccion").value = m.direccion ?? "";
    document.getElementById("tipoContrato").value = m.tipo_contrato ?? "";
    document.getElementById("estatus").value = m.estatus ?? "Activo";
    document.getElementById("fechaIngreso").value = m.fecha_ingreso
      ? m.fecha_ingreso.substring(0, 10)
      : "";
    document.getElementById("gradoAcademico").value = m.grado_academico ?? "";
    document.getElementById("especialidad").value = m.especialidad ?? "";
    document.getElementById("departamento").value = m.departamento ?? "";

    // Oculta la sección de acceso al editar
    const seccionAcceso = document.getElementById("seccionAccesoMaestro");
    if (seccionAcceso) seccionAcceso.style.display = "none";

    document.getElementById("tituloFormMaestro").textContent = "Editar maestro";
    document.querySelector("#formMaestro .btn-guardar").textContent =
      "Actualizar";
    document
      .getElementById("cardRegistroMaestro")
      .scrollIntoView({ behavior: "smooth" });
  } catch {
    alert("Error de conexión al cargar datos del maestro.");
  }
}

// ─── CANCELAR ──────────────────────────────────────────────────────────────

function cancelarEdicionMaestro() {
  maestroEditando = null;
  document.getElementById("formMaestro").reset();
  document.getElementById("idMaestro").disabled = false;

  const seccionAcceso = document.getElementById("seccionAccesoMaestro");
  if (seccionAcceso) seccionAcceso.style.display = "";

  document.getElementById("tituloFormMaestro").textContent =
    "Registrar Maestro";
  document.querySelector("#formMaestro .btn-guardar").textContent = "Guardar";
}

// ─── ELIMINAR ──────────────────────────────────────────────────────────────

async function eliminarMaestro(id) {
  if (!confirm(`¿Eliminar al maestro ${id}? Esta acción no se puede deshacer.`))
    return;

  const res = await fetch(`${BASE_URL}/api/maestros/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (data.success) {
    cargarMaestros();
  } else {
    alert(data.error || "Error al eliminar.");
  }
}

function cerrarSesion() {
  localStorage.clear();
  window.location.href = "login.html";
}

cargarMaestros();

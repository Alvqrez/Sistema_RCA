// Maneja toda la funcionalidad de la página alumnos.html
const BASE_URL = "http://localhost:3000";
let alumnosGlobal = [];
let filtroCarrera = "";
let filtroBusqueda = "";
let modoEdicion = false; // false = registrar, true = editar
let no_controlEditando = null; // no_control del alumno en edición

async function cargarAlumnos() {
  const token = localStorage.getItem("token");

  const response = await fetch(`${BASE_URL}/api/alumnos`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    window.location.href = "login.html";
    return;
  }

  alumnosGlobal = await response.json();
  renderTabla();
}

function renderTabla() {
  let datos = [...alumnosGlobal];

  if (filtroCarrera)
    datos = datos.filter((a) => a.id_carrera === filtroCarrera);

  if (filtroBusqueda) {
    const q = filtroBusqueda.toLowerCase();
    datos = datos.filter(
      (a) =>
        a.no_control.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q) ||
        a.apellido_paterno.toLowerCase().includes(q),
    );
  }

  datos.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));

  const tabla = document.getElementById("tablaAlumnos");
  tabla.innerHTML = "";

  if (datos.length === 0) {
    tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">Sin resultados</td></tr>`;
    return;
  }

  const rol = localStorage.getItem("rol");

  datos.forEach((alumno) => {
    tabla.innerHTML += `
      <tr>
        <td>${alumno.no_control}</td>
        <td>${alumno.apellido_paterno} ${alumno.apellido_materno ?? ""}, ${alumno.nombre}</td>
        <td>${alumno.id_carrera}</td>
        <td>${alumno.correo_institucional}</td>
        <td>${alumno.tel_celular ?? "—"}</td>
        <td style="text-align:center;">
          ${
            rol === "administrador"
              ? `<button class="btn-editar" onclick="editarAlumno('${alumno.no_control}')">Editar</button>
                 <button class="btn-eliminar" onclick="eliminarAlumno('${alumno.no_control}')">Eliminar</button>`
              : "—"
          }
        </td>
      </tr>
    `;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Ocultar card de registro si no es admin
  const rol = localStorage.getItem("rol");
  const cardForm = document.getElementById("cardRegistroAlumno");
  if (rol !== "administrador" && cardForm) cardForm.style.display = "none";

  // Filtros
  const inputBusqueda = document.getElementById("filtroBusqueda");
  const selectCarreraFiltro = document.getElementById("filtroCarrera");

  if (inputBusqueda)
    inputBusqueda.addEventListener("input", (e) => {
      filtroBusqueda = e.target.value;
      renderTabla();
    });

  if (selectCarreraFiltro)
    selectCarreraFiltro.addEventListener("change", (e) => {
      filtroCarrera = e.target.value;
      renderTabla();
    });

  // Cargar datos iniciales
  cargarCarrerasEnSelect("carrera");
  cargarCarrerasEnSelect("filtroCarrera");
  cargarAlumnos();

  const form = document.getElementById("formAlumno");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    const generoRaw = document.getElementById("genero").value;
    // Convierte "Masculino"→"M", "Femenino"→"F", "Otro"→"Otro"
    const generoMap = { Masculino: "M", Femenino: "F", Otro: "Otro" };
    const genero = generoMap[generoRaw] ?? null;

    const alumno = {
      no_control: document.getElementById("no_control").value.trim(),
      nombre: document.getElementById("nombre").value.trim(),
      apellido_paterno: document.getElementById("apellidoPaterno").value.trim(),
      apellido_materno:
        document.getElementById("apellidoMaterno").value.trim() || null,
      id_carrera: document.getElementById("carrera").value,
      correo_institucional: document.getElementById("correo").value.trim(),
      correo_personal:
        document.getElementById("correoPersonal").value.trim() || null,
      curp: document.getElementById("curp").value.trim() || null,
      fecha_nacimiento:
        document.getElementById("fechaNacimiento").value || null,
      genero,
      direccion: document.getElementById("direccion").value.trim() || null,
      tel_celular: document.getElementById("celular").value.trim() || null,
      tel_casa: document.getElementById("telefonoCasa").value.trim() || null,
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
    };

    if (
      !alumno.no_control ||
      !alumno.nombre ||
      !alumno.apellido_paterno ||
      !alumno.id_carrera ||
      !alumno.correo_institucional
    ) {
      mostrarMensaje(
        "formMensaje",
        "Completa los campos obligatorios.",
        "error",
      );
      return;
    }

    let url = `${BASE_URL}/api/alumnos`;
    let method = "POST";

    if (modoEdicion) {
      url = `${BASE_URL}/api/alumnos/${no_controlEditando}`;
      method = "PUT";
      // PUT no necesita username/password (no los cambia)
      delete alumno.username;
      delete alumno.password;
      delete alumno.no_control;
    } else {
      if (!alumno.username || !alumno.password) {
        mostrarMensaje(
          "formMensaje",
          "Usuario y contraseña son requeridos.",
          "error",
        );
        return;
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(alumno),
      });

      const data = await response.json();

      if (data.success) {
        mostrarMensaje(
          "formMensaje",
          data.mensaje || "Guardado correctamente.",
          "ok",
        );
        cancelarEdicion();
        cargarAlumnos();
      } else {
        mostrarMensaje(
          "formMensaje",
          data.error || "Error al guardar.",
          "error",
        );
      }
    } catch {
      mostrarMensaje(
        "formMensaje",
        "Error de conexión con el servidor.",
        "error",
      );
    }
  });
});

async function editarAlumno(no_control) {
  // Busca el alumno en la lista global (ya cargada)
  const alumno = alumnosGlobal.find((a) => a.no_control === no_control);
  if (!alumno) return;

  modoEdicion = true;
  no_controlEditando = no_control;

  // Rellena el formulario con los datos actuales
  document.getElementById("no_control").value = alumno.no_control;
  document.getElementById("no_control").disabled = true; // No se puede cambiar la PK
  document.getElementById("nombre").value = alumno.nombre ?? "";
  document.getElementById("apellidoPaterno").value =
    alumno.apellido_paterno ?? "";
  document.getElementById("apellidoMaterno").value =
    alumno.apellido_materno ?? "";
  document.getElementById("correo").value = alumno.correo_institucional ?? "";
  document.getElementById("carrera").value = alumno.id_carrera ?? "";

  // Oculta campos de acceso (no se editan aquí)
  const seccionAcceso = document.getElementById("seccionAcceso");
  if (seccionAcceso) seccionAcceso.style.display = "none";

  // Cambia el título y el botón
  document.getElementById("tituloFormAlumno").textContent = "Editar alumno";
  document.querySelector("#formAlumno .btn-guardar").textContent = "Actualizar";

  // Scroll al formulario
  document
    .getElementById("cardRegistroAlumno")
    .scrollIntoView({ behavior: "smooth" });
}

function cancelarEdicion() {
  modoEdicion = false;
  no_controlEditando = null;

  const form = document.getElementById("formAlumno");
  form.reset();

  document.getElementById("no_control").disabled = false;

  const seccionAcceso = document.getElementById("seccionAcceso");
  if (seccionAcceso) seccionAcceso.style.display = "";

  document.getElementById("tituloFormAlumno").textContent = "Registrar alumno";
  document.querySelector("#formAlumno .btn-guardar").textContent = "Guardar";
}

async function eliminarAlumno(no_control) {
  if (
    !confirm(
      `¿Eliminar al alumno con no_control ${no_control}? Esta acción no se puede deshacer.`,
    )
  )
    return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${BASE_URL}/api/alumnos/${no_control}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (data.success) {
      cargarAlumnos();
    } else {
      alert(data.error || "Error al eliminar.");
    }
  } catch {
    alert("Error de conexión con el servidor.");
  }
}

function mostrarMensaje(elementId, texto, tipo) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = texto;
  el.style.color = tipo === "error" ? "#ef4444" : "#22c55e";
  setTimeout(() => {
    el.textContent = "";
  }, 4000);
}

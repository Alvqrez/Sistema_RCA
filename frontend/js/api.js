// api.js — versión final con filtros
const BASE_URL = "http://localhost:3000";
let alumnosGlobal = [];
let filtroCarrera = "";
let filtroBusqueda = "";

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

  // Filtros (se mantienen igual)
  if (filtroCarrera) {
    datos = datos.filter((a) => a.id_carrera === filtroCarrera);
  }
  if (filtroBusqueda) {
    const q = filtroBusqueda.toLowerCase();
    datos = datos.filter(
      (a) =>
        a.matricula.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q) ||
        a.apellido_paterno.toLowerCase().includes(q),
    );
  }

  datos.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));

  const tabla = document.getElementById("tablaAlumnos");
  tabla.innerHTML = "";

  // CORRECCIÓN 1: Colspan debe ser 6 porque tienes 6 columnas en el header
  if (datos.length === 0) {
    tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">Sin resultados</td></tr>`;
    return;
  }

  const rol = localStorage.getItem("rol");

  datos.forEach((alumno) => {
    const globalIndex = alumnosGlobal.indexOf(alumno);
    // CORRECCIÓN 2: Agregamos la celda de Teléfono para que coincida con el header
    tabla.innerHTML += `
            <tr>
                <td>${alumno.matricula}</td>
                <td>${alumno.apellido_paterno} ${alumno.apellido_materno ?? ""}, ${alumno.nombre}</td>
                <td>${alumno.id_carrera}</td>
                <td>${alumno.correo_institucional}</td>
                <td>${alumno.telefono || "—"}</td> 
                <td style="text-align: center;">
                    ${
                      rol === "administrador"
                        ? `
                        <button class="btn-editar" onclick="editarAlumno(${globalIndex})">Editar</button>
                        <button class="btn-eliminar" onclick="eliminarAlumno('${alumno.matricula}')">Eliminar</button>
                    `
                        : "—"
                    }
                </td>
            </tr>
        `;
  });
}

// Filtros — conectar a los inputs en el HTML
document.addEventListener("DOMContentLoaded", () => {
  const rol = localStorage.getItem("rol");
  const cardForm = document.getElementById("cardRegistroAlumno");
  if (rol !== "administrador" && cardForm) cardForm.style.display = "none";

  const inputBusqueda = document.getElementById("filtroBusqueda");
  const selectCarreraFiltro = document.getElementById("filtroCarrera");

  if (inputBusqueda) {
    inputBusqueda.addEventListener("input", (e) => {
      filtroBusqueda = e.target.value;
      renderTabla();
    });
  }

  if (selectCarreraFiltro) {
    selectCarreraFiltro.addEventListener("change", (e) => {
      filtroCarrera = e.target.value;
      renderTabla();
    });
  }

  cargarCarrerasEnSelect("carrera");
  cargarCarrerasEnSelect("filtroCarrera");
  cargarAlumnos();
});

// frontend/js/portalAlumno.js
const BASE_URL = "http://localhost:3000";

const token    = localStorage.getItem("token");
const nombre   = localStorage.getItem("nombre");
const rol      = localStorage.getItem("rol");

// Redirige si no hay sesión o si el rol no es alumno
if (!token || rol !== "alumno") {
    window.location.href = "login.html";
}

// Decodifica el token para obtener la matrícula
function parsearToken(token) {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch {
        return null;
    }
}

const payload  = parsearToken(token);
const matricula = payload?.id_referencia;

// Muestra el nombre del header
document.getElementById("nombre").textContent   = nombre || "—";
document.getElementById("matricula").textContent = matricula || "—";

async function cargarDatosAlumno() {

    const response = await fetch(`${BASE_URL}/api/alumnos/${matricula}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
        window.location.href = "login.html";
        return;
    }

    const alumno = await response.json();

    document.getElementById("matricula").textContent = alumno.matricula;
    document.getElementById("nombre").textContent    = `${alumno.nombre} ${alumno.apellido_paterno}`;
    document.getElementById("carrera").textContent   = alumno.id_carrera;

}

async function cargarCalificaciones() {

    const response = await fetch(`${BASE_URL}/api/calificaciones/alumno/${matricula}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const califs = await response.json();
    const tabla  = document.getElementById("tablaBoleta");

    tabla.innerHTML = "";

    if (califs.length === 0) {
        tabla.innerHTML = `<tr><td colspan="4">No hay calificaciones registradas</td></tr>`;
        return;
    }

    califs.forEach(c => {
        const estatus = c.calificacion_unidad_final >= 60 ? "Aprobada" : "Reprobada";
        tabla.innerHTML += `
            <tr>
                <td>${c.nombre_unidad}</td>
                <td>${c.id_grupo}</td>
                <td>${c.calificacion_unidad_final ?? "Pendiente"}</td>
                <td>${c.estatus_unidad}</td>
            </tr>
        `;
    });

}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = "login.html";
}

// Inicializar
cargarDatosAlumno();
cargarCalificaciones();
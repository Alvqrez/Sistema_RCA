// frontend/js/api.js
const BASE_URL = "http://localhost:3000";

let alumnosGlobal = [];

async function cargarAlumnos() {

    const token = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/api/alumnos`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
        window.location.href = "login.html";
        return;
    }

    alumnosGlobal = await response.json();

    const tabla = document.getElementById("tablaAlumnos");
    tabla.innerHTML = "";

    alumnosGlobal.forEach((alumno, index) => {
        tabla.innerHTML += `
            <tr>
                <td>${alumno.matricula}</td>
                <td>${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno ?? ""}</td>
                <td>${alumno.id_carrera}</td>
                <td>${alumno.correo_institucional}</td>
                <td>
                    <button class="btn-editar"  onclick="editarAlumno(${index})">Editar</button>
                    <button class="btn-eliminar" onclick="eliminarAlumno('${alumno.matricula}')">Eliminar</button>
                </td>
            </tr>
        `;
    });

}

document.getElementById("formAlumno").addEventListener("submit", async function(e) {

    e.preventDefault();

    const token = localStorage.getItem("token");

    const alumno = {
        nombre:               document.getElementById("nombre").value,
        apellido_paterno:     document.getElementById("apellidoPaterno").value,
        apellido_materno:     document.getElementById("apellidoMaterno").value,
        matricula:            document.getElementById("matricula").value,
        id_carrera:           document.getElementById("carrera").value,
        correo_institucional: document.getElementById("correo").value,
        username:             document.getElementById("username").value,
        password:             document.getElementById("password").value
    };

    const response = await fetch(`${BASE_URL}/api/alumnos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(alumno)
    });

    const data = await response.json();

    if (data.success) {
        alert("Alumno registrado");
        document.getElementById("formAlumno").reset();
        cargarAlumnos();
    } else {
        alert(data.error || "Error al registrar");
    }

});

function editarAlumno(index) {
    const a = alumnosGlobal[index];
    document.getElementById("nombre").value          = a.nombre;
    document.getElementById("apellidoPaterno").value = a.apellido_paterno;
    document.getElementById("apellidoMaterno").value = a.apellido_materno ?? "";
    document.getElementById("matricula").value        = a.matricula;
    document.getElementById("carrera").value          = a.id_carrera;
    document.getElementById("correo").value           = a.correo_institucional;
}

async function eliminarAlumno(matricula) {

    if (!confirm("¿Eliminar este alumno?")) return;

    const token = localStorage.getItem("token");

    const res = await fetch(`${BASE_URL}/api/alumnos/${matricula}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.success) cargarAlumnos();
    else alert(data.error);

}

cargarAlumnos();
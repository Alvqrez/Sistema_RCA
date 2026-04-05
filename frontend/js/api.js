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

    alumnosGlobal = await response.json(); // ← guarda en la variable global

    const tabla = document.getElementById("tablaAlumnos");
    tabla.innerHTML = "";

    alumnosGlobal.forEach((alumno, index) => {
        tabla.innerHTML += `
            <tr>
                <td>${alumno.nombre}</td>
                <td>${alumno.apellido_paterno} ${alumno.apellido_materno ?? ""}</td>
                <td>${alumno.matricula}</td>
                <td>
                    <button onclick="editarAlumno(${index})">Editar</button>
                    <button onclick="eliminarAlumno('${alumno.matricula}')">Eliminar</button>
                </td>
            </tr>
        `;
    });

}

document.getElementById("formAlumno").addEventListener("submit", async function(e) {

    e.preventDefault();

    const token = localStorage.getItem("token");

// frontend/js/api.js — solo el objeto del POST corregido
const alumno = {
    nombre:               document.getElementById("nombre").value,
    apellido_paterno:     document.getElementById("apellidoPaterno").value,
    apellido_materno:     document.getElementById("apellidoMaterno").value,
    matricula:            document.getElementById("matricula").value,
    id_carrera:           document.getElementById("carrera").value,
    correo_institucional: document.getElementById("correo").value,
    username:             document.getElementById("username").value,  // ← era "usuario"
    password:             document.getElementById("password").value
};

    const response = await fetch(`${BASE_URL}/api/alumnos`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
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
    const alumno = alumnosGlobal[index]; // ← ahora sí funciona

    document.getElementById("nombre").value         = alumno.nombre;
    document.getElementById("apellidoPaterno").value = alumno.apellido_paterno;
    document.getElementById("apellidoMaterno").value = alumno.apellido_materno ?? "";
    document.getElementById("matricula").value       = alumno.matricula;
    document.getElementById("correo").value          = alumno.correo_institucional;
}

async function eliminarAlumno(matricula) {

    if (!confirm("¿Eliminar alumno?")) return;

    const token = localStorage.getItem("token");

    await fetch(`${BASE_URL}/api/alumnos/${matricula}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    cargarAlumnos();

}

// Logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        localStorage.removeItem("rol");
        window.location.href = "login.html";
    });
}

cargarAlumnos();
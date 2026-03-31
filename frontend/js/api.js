let alumnos = JSON.parse(localStorage.getItem("alumnos")) || [];

const form = document.getElementById("formAlumno");
const tabla = document.getElementById("tablaAlumnos");

let editIndex = null;

form.addEventListener("submit", function(e) {
    e.preventDefault();

    let nombre = document.getElementById("nombre").value;
    let matricula = document.getElementById("matricula").value;

    if (editIndex !== null) {
        alumnos[editIndex] = { nombre, matricula };
        editIndex = null;
    } else {
        alumnos.push({ nombre, matricula });
    }

    guardarDatos();
    mostrarAlumnos();
    form.reset();
});

function mostrarAlumnos() {
    tabla.innerHTML = "";

    alumnos.forEach((alumno, index) => {
        tabla.innerHTML += `
            <tr>
                <td>${alumno.nombre}</td>
                <td>${alumno.matricula}</td>
                <td>
                    <button onclick="editarAlumno(${index})">Editar</button>
                    <button onclick="eliminarAlumno(${index})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

function editarAlumno(index) {
    let alumno = alumnos[index];

    document.getElementById("nombre").value = alumno.nombre;
    document.getElementById("matricula").value = alumno.matricula;

    editIndex = index;
}

function eliminarAlumno(index) {
    if (confirm("¿Seguro que quieres eliminar este alumno?")) {
        alumnos.splice(index, 1);
        guardarDatos();
        mostrarAlumnos();
    }
}

function guardarDatos() {
    localStorage.setItem("alumnos", JSON.stringify(alumnos));
}

mostrarAlumnos();
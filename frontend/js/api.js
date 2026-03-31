const form = document.getElementById("formAlumno");
const tabla = document.getElementById("tablaAlumnos");

let alumnos = [];

form.addEventListener("submit", function(e) {
    e.preventDefault();

    let nombre = document.getElementById("nombre").value;
    let matricula = document.getElementById("matricula").value;

    alumnos.push({ nombre, matricula });

    mostrarAlumnos();

    form.reset();
});

function mostrarAlumnos() {
    tabla.innerHTML = "";

    alumnos.forEach(alumno => {
        let fila = `
            <tr>
                <td>${alumno.nombre}</td>
                <td>${alumno.matricula}</td>
            </tr>
        `;
        tabla.innerHTML += fila;
    });
}
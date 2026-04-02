let calificaciones = JSON.parse(localStorage.getItem("calificaciones")) || [];

const form = document.getElementById("formCalificacion");
const tabla = document.getElementById("tablaCalificaciones");

let editIndex = null;

form.addEventListener("submit", function(e) {
    e.preventDefault();

    let alumno = document.getElementById("alumno").value;
    let materia = document.getElementById("materia").value;
    let calificacion = document.getElementById("calificacion").value;

    if (editIndex !== null) {
        calificaciones[editIndex] = { alumno, materia, calificacion };
        editIndex = null;
    } else {
        calificaciones.push({ alumno, materia, calificacion });
    }

    guardar();
    mostrar();
    form.reset();
});

function mostrar() {
    tabla.innerHTML = "";

    calificaciones.forEach((c, index) => {
        tabla.innerHTML += `
            <tr>
                <td>${c.alumno}</td>
                <td>${c.materia}</td>
                <td>${c.calificacion}</td>
                <td>
                    <button onclick="editar(${index})">Editar</button>
                    <button onclick="eliminar(${index})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

function editar(index) {
    let c = calificaciones[index];

    document.getElementById("alumno").value = c.alumno;
    document.getElementById("materia").value = c.materia;
    document.getElementById("calificacion").value = c.calificacion;

    editIndex = index;
}

function eliminar(index) {
    if (confirm("¿Eliminar?")) {
        calificaciones.splice(index, 1);
        guardar();
        mostrar();
    }
}

function guardar() {
    localStorage.setItem("calificaciones", JSON.stringify(calificaciones));
}

mostrar();
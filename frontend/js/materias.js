let materias = JSON.parse(localStorage.getItem("materias")) || [];

const form = document.getElementById("formMateria");
const tabla = document.getElementById("tablaMaterias");

let editIndex = null;

form.addEventListener("submit", function(e) {
    e.preventDefault();

    let nombre = document.getElementById("nombreMateria").value;

    if (editIndex !== null) {
        materias[editIndex] = { nombre };
        editIndex = null;
    } else {
        materias.push({ nombre });
    }

    guardarMaterias();
    mostrarMaterias();
    form.reset();
});

function mostrarMaterias() {
    tabla.innerHTML = "";

    materias.forEach((materia, index) => {
        tabla.innerHTML += `
            <tr>
                <td>${materia.nombre}</td>
                <td>
                    <button onclick="editarMateria(${index})">Editar</button>
                    <button onclick="eliminarMateria(${index})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

function editarMateria(index) {
    let materia = materias[index];

    document.getElementById("nombreMateria").value = materia.nombre;

    editIndex = index;
}

function eliminarMateria(index) {
    if (confirm("¿Eliminar esta materia?")) {
        materias.splice(index, 1);
        guardarMaterias();
        mostrarMaterias();
    }
}

function guardarMaterias() {
    localStorage.setItem("materias", JSON.stringify(materias));
}

mostrarMaterias();
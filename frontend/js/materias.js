// let materias = JSON.parse(localStorage.getItem("materias")) || [];

// const form = document.getElementById("formMateria");
// const tabla = document.getElementById("tablaMaterias");

// let editIndex = null;

// form.addEventListener("submit", function(e) {
//     e.preventDefault();

//     let nombre = document.getElementById("nombreMateria").value;

//     if (editIndex !== null) {
//         materias[editIndex] = { nombre };
//         editIndex = null;
//     } else {
//         materias.push({ nombre });
//     }

//     guardarMaterias();
//     mostrarMaterias();
//     form.reset();
// });

// function mostrarMaterias() {
//     tabla.innerHTML = "";

//     materias.forEach((materia, index) => {
//         tabla.innerHTML += `
//             <tr>
//                 <td>${materia.nombre}</td>
//                 <td>
//                     <button onclick="editarMateria(${index})">Editar</button>
//                     <button onclick="eliminarMateria(${index})">Eliminar</button>
//                 </td>
//             </tr>
//         `;
//     });
// }

// function editarMateria(index) {
//     let materia = materias[index];

//     document.getElementById("nombreMateria").value = materia.nombre;

//     editIndex = index;
// }

// function eliminarMateria(index) {
//     if (confirm("¿Eliminar esta materia?")) {
//         materias.splice(index, 1);
//         guardarMaterias();
//         mostrarMaterias();
//     }
// }

// function guardarMaterias() {
//     localStorage.setItem("materias", JSON.stringify(materias));
// }

// mostrarMaterias();

// frontend/js/materias.js
const BASE_URL = "http://localhost:3000";

const form  = document.getElementById("formMateria");
const tabla = document.getElementById("tablaMaterias");

async function cargarMaterias() {

    const token = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/api/materias`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
        window.location.href = "../login.html";
        return;
    }

    const materias = await response.json();

    tabla.innerHTML = "";

    materias.forEach(materia => {
        tabla.innerHTML += `
            <tr>
                <td>${materia.clave_materia}</td>
                <td>${materia.nombre_materia}</td>
                <td>${materia.creditos_totales}</td>
                <td>
                    <button onclick="eliminarMateria('${materia.clave_materia}')">Eliminar</button>
                </td>
            </tr>
        `;
    });

}

form.addEventListener("submit", async function(e) {

    e.preventDefault();

    const token = localStorage.getItem("token");

    const materia = {
        clave_materia:    document.getElementById("claveMateria").value,
        nombre_materia:   document.getElementById("nombreMateria").value,
        creditos_totales: document.getElementById("creditos").value,
        horas_teoricas:   document.getElementById("horasTeoricas").value,
        horas_practicas:  document.getElementById("horasPracticas").value,
        no_unidades:      document.getElementById("noUnidades").value
    };

    const response = await fetch(`${BASE_URL}/api/materias`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(materia)
    });

    const data = await response.json();

    if (data.success) {
        alert("Materia registrada");
        form.reset();
        cargarMaterias();
    } else {
        alert(data.error || "Error al registrar");
    }

});

async function eliminarMateria(clave) {

    if (!confirm("¿Eliminar esta materia?")) return;

    const token = localStorage.getItem("token");

    await fetch(`${BASE_URL}/api/materias/${clave}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    cargarMaterias();

}

cargarMaterias();
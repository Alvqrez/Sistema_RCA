// let calificaciones = JSON.parse(localStorage.getItem("calificaciones")) || [];

// const form = document.getElementById("formCalificacion");
// const tabla = document.getElementById("tablaCalificaciones");

// let editIndex = null;

// form.addEventListener("submit", function(e) {
//     e.preventDefault();

//     let alumno = document.getElementById("alumno").value;
//     let materia = document.getElementById("materia").value;
//     let calificacion = document.getElementById("calificacion").value;

//     if (editIndex !== null) {
//         calificaciones[editIndex] = { alumno, materia, calificacion };
//         editIndex = null;
//     } else {
//         calificaciones.push({ alumno, materia, calificacion });
//     }

//     guardar();
//     mostrar();
//     form.reset();
// });

// function mostrar() {
//     tabla.innerHTML = "";

//     calificaciones.forEach((c, index) => {
//         tabla.innerHTML += `
//             <tr>
//                 <td>${c.alumno}</td>
//                 <td>${c.materia}</td>
//                 <td>${c.calificacion}</td>
//                 <td>
//                     <button onclick="editar(${index})">Editar</button>
//                     <button onclick="eliminar(${index})">Eliminar</button>
//                 </td>
//             </tr>
//         `;
//     });
// }

// function editar(index) {
//     let c = calificaciones[index];

//     document.getElementById("alumno").value = c.alumno;
//     document.getElementById("materia").value = c.materia;
//     document.getElementById("calificacion").value = c.calificacion;

//     editIndex = index;
// }

// function eliminar(index) {
//     if (confirm("¿Eliminar?")) {
//         calificaciones.splice(index, 1);
//         guardar();
//         mostrar();
//     }
// }

// function guardar() {
//     localStorage.setItem("calificaciones", JSON.stringify(calificaciones));
// }

// mostrar();

// frontend/js/calificaciones.js
const BASE_URL = "http://localhost:3000";

const form  = document.getElementById("formCalificacion");
const tabla = document.getElementById("tablaCalificaciones");

async function cargarCalificaciones() {

    const token = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/api/calificaciones`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
        window.location.href = "../login.html";
        return;
    }

    const califs = await response.json();

    tabla.innerHTML = "";

    califs.forEach(c => {
        tabla.innerHTML += `
            <tr>
                <td>${c.matricula}</td>
                <td>${c.id_grupo}</td>
                <td>${c.id_unidad}</td>
                <td>${c.calificacion_unidad_final ?? "Pendiente"}</td>
            </tr>
        `;
    });

}

form.addEventListener("submit", async function(e) {

    e.preventDefault();

    const token = localStorage.getItem("token");

    const data = {
        matricula:                 document.getElementById("alumno").value,
        id_grupo:                  document.getElementById("grupo").value,
        id_unidad:                 document.getElementById("unidad").value,
        calificacion_unidad_final: document.getElementById("calificacion").value
    };

    const response = await fetch(`${BASE_URL}/api/calificaciones`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    alert(result.mensaje || result.error);
    form.reset();
    cargarCalificaciones();

});

cargarCalificaciones();
let alumnos = JSON.parse(localStorage.getItem("alumnos")) || [];

const form = document.getElementById("formAlumno");
const tabla = document.getElementById("tablaAlumnos");

let editIndex = null;

form.addEventListener("submit", async function(e){

    e.preventDefault();

    const alumno = {

        nombre: document.getElementById("nombre").value,
        apellido_paterno: document.getElementById("apellidoPaterno").value,
        apellido_materno: document.getElementById("apellidoMaterno").value,
        matricula: document.getElementById("noControl").value,
        correo_institucional: document.getElementById("correo").value
    };

    const response = await fetch("http://localhost:3000/api/alumnos",{

        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body: JSON.stringify(alumno)

    });

    const data = await response.json();

    if(data.success){
        alert("Alumno registrado");
        form.reset();
    }

});

form.addEventListener("submit", function(e){

    e.preventDefault();

    alert("Funciona el botón");

});
async function obtenerAlumnos(){

    const respuesta = await fetch("http://localhost:3000/alumnos");
    const alumnos = await respuesta.json();

    tabla.innerHTML = "";

    alumnos.forEach(alumno => {

        tabla.innerHTML += `
            <tr>
                <td>${alumno.nombre}</td>
                <td>${alumno.apellidoPaterno} ${alumno.apellidoMaterno}</td>
                <td>${alumno.NumeroControl}</td>
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


document.getElementById("logoutBtn").addEventListener("click", function(){

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    window.location.href = "../../login.html";

});

obtenerAlumnos();


const form = document.getElementById("formAlumno");
const tabla = document.getElementById("tablaAlumnos");

let editIndex = null;

async function cargarAlumnos(){

    const response = await fetch("http://localhost:3000/api/alumnos");

    const alumnos = await response.json();

    const tabla = document.getElementById("tablaAlumnos");

    tabla.innerHTML = "";

    alumnos.forEach(alumno => {

        tabla.innerHTML += `
            <tr>
                <td>${alumno.nombre}</td>
                <td>${alumno.apellido_paterno} ${alumno.apellido_materno}</td>
                <td>${alumno.matricula}</td>
                <td>
                    <button>Editar</button>
                      <button onclick="eliminarAlumno(${alumno.id_alumno})">Eliminar</button>
                </td>
            </tr>
        `;

    });

}

form.addEventListener("submit", async function(e){

    e.preventDefault();

    const alumno = {

        nombre: document.getElementById("nombre").value,
        apellido_paterno: document.getElementById("apellidoPaterno").value,
        apellido_materno: document.getElementById("apellidoMaterno").value,
        matricula: document.getElementById("matricula").value,
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

    cargarAlumnos();

});

function editarAlumno(index) {
    let alumno = alumnos[index];

    document.getElementById("nombre").value = alumno.nombre;
    document.getElementById("matricula").value = alumno.matricula;

    editIndex = index;
}

async function eliminarAlumno(id){

    if(!confirm("¿Eliminar alumno?")) return;

    await fetch(`http://localhost:3000/api/alumnos/${id}`,{
        method:"DELETE"
    });

    cargarAlumnos();

}

function guardarDatos() {
    localStorage.setItem("alumnos", JSON.stringify(alumnos));
}


const logoutBtn = document.getElementById("logoutBtn");

if(logoutBtn){
    logoutBtn.addEventListener("click", function(){

        localStorage.removeItem("token");
        localStorage.removeItem("usuario");

        window.location.href = "../../login.html";

    });
}

cargarAlumnos();

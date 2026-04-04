let alumno = JSON.parse(localStorage.getItem("usuarioActivo"));

let calificaciones = JSON.parse(localStorage.getItem("calificaciones")) || [];

document.getElementById("matricula").textContent = alumno?.matricula || "N/A";
document.getElementById("nombre").textContent = alumno?.nombre || "N/A";

const tabla = document.getElementById("tablaBoleta");

function mostrarBoleta() {
    tabla.innerHTML = "";

    let datos = calificaciones.filter(c => c.matricula === alumno?.matricula);

    datos.forEach(c => {
        tabla.innerHTML += `
            <tr>
                <td>${c.materia}</td>
                <td>${c.calificacion}</td>
            </tr>
        `;
    });
}

function cerrarSesion() {
    localStorage.removeItem("usuarioActivo");
    window.location.href = "login.html";
}

mostrarBoleta();
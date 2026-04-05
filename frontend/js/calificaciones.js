const BASE_URL = "http://localhost:3000";

const form  = document.getElementById("formCalificacion");
const tabla = document.getElementById("tablaCalificaciones");

async function cargarCalificaciones() {

    const token = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/api/calificaciones`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
        window.location.href = "login.html";
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
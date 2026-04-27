const BASE_URL = "http://localhost:3000";

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
    const tabla  = document.getElementById("tablaCalificaciones");
    tabla.innerHTML = "";

    califs.forEach(c => {
        const estatusClass = c.estatus_unidad === "Aprobada" ? "badge-verde" : c.estatus_unidad === "Reprobada" ? "badge-rojo" : "badge-gris";
        tabla.innerHTML += `
            <tr>
                <td>${c.no_control}</td>
                <td>${c.nombre_alumno}</td>
                <td>${c.nombre_unidad}</td>
                <td>${c.id_grupo}</td>
                <td>${c.promedio_ponderado ?? "—"}</td>
                <td>${c.calificacion_unidad_final ?? "Pendiente"}</td>
                <td><span class="badge ${estatusClass}">${c.estatus_unidad}</span></td>
            </tr>
        `;
    });

}

document.getElementById("formCalificacion").addEventListener("submit", async function(e) {

    e.preventDefault();

    const token = localStorage.getItem("token");

    const data = {
        no_control:                 document.getElementById("no_control").value,
        id_grupo:                  document.getElementById("idGrupo").value,
        id_unidad:                 document.getElementById("idUnidad").value,
        calificacion_unidad_final: document.getElementById("calificacion").value
    };

    const response = await fetch(`${BASE_URL}/api/calificaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
        alert("Calificación registrada");
        this.reset();
        cargarCalificaciones();
    } else {
        alert(result.error || "Error al registrar");
    }

});

cargarCalificaciones();

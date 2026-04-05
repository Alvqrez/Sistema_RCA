// frontend/js/unidades.js
const BASE_URL = "http://localhost:3000";

async function cargarUnidades() {

    const token = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/api/unidades`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
        window.location.href = "login.html";
        return;
    }

    const unidades = await response.json();
    const tabla    = document.getElementById("tablaUnidades");
    tabla.innerHTML = "";

    unidades.forEach(u => {
        const estatusClass = u.estatus === "Cerrada" ? "badge-gris" : u.estatus === "En curso" ? "badge-azul" : "badge-verde";
        tabla.innerHTML += `
            <tr>
                <td>${u.id_unidad}</td>
                <td>${u.clave_materia}</td>
                <td>${u.nombre_unidad}</td>
                <td><span class="badge ${estatusClass}">${u.estatus}</span></td>
                <td>${u.fecha_cierre ?? "—"}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarUnidad(${u.id_unidad})">Eliminar</button>
                </td>
            </tr>
        `;
    });

}

document.getElementById("formUnidad").addEventListener("submit", async function(e) {

    e.preventDefault();

    const token = localStorage.getItem("token");

    const unidad = {
        clave_materia: document.getElementById("claveMateria").value,
        nombre_unidad: document.getElementById("nombreUnidad").value,
        temario:       document.getElementById("temario").value || null,
        estatus:       document.getElementById("estatus").value,
        fecha_cierre:  document.getElementById("fechaCierre").value || null
    };

    const response = await fetch(`${BASE_URL}/api/unidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(unidad)
    });

    const data = await response.json();

    if (data.success) {
        alert("Unidad registrada");
        this.reset();
        cargarUnidades();
    } else {
        alert(data.error || "Error al registrar");
    }

});

async function eliminarUnidad(id) {

    if (!confirm("¿Eliminar esta unidad?")) return;

    const token = localStorage.getItem("token");

    const res = await fetch(`${BASE_URL}/api/unidades/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.success) cargarUnidades();
    else alert(data.error);

}

cargarUnidades();
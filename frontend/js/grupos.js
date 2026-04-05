// frontend/js/grupos.js
const BASE_URL = "http://localhost:3000";

async function cargarGrupos() {

    const token = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/api/grupos`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
        window.location.href = "login.html";
        return;
    }

    const grupos = await response.json();
    const tabla  = document.getElementById("tablaGrupos");
    tabla.innerHTML = "";

    grupos.forEach(g => {
        tabla.innerHTML += `
            <tr>
                <td>${g.id_grupo}</td>
                <td>${g.nombre_materia}</td>
                <td>${g.nombre_maestro}</td>
                <td>${g.id_periodo}</td>
                <td>${g.aula ?? "—"}</td>
                <td>${g.horario ?? "—"}</td>
                <td><span class="badge ${g.estatus === "Activo" ? "badge-verde" : "badge-gris"}">${g.estatus}</span></td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarGrupo(${g.id_grupo})">Eliminar</button>
                </td>
            </tr>
        `;
    });

}

document.getElementById("formGrupo").addEventListener("submit", async function(e) {

    e.preventDefault();

    const token = localStorage.getItem("token");

    const grupo = {
        clave_materia:   document.getElementById("claveMateria").value,
        numero_empleado: document.getElementById("numeroEmpleado").value,
        id_periodo:      document.getElementById("idPeriodo").value,
        limite_alumnos:  document.getElementById("limiteAlumnos").value || 30,
        horario:         document.getElementById("horario").value || null,
        aula:            document.getElementById("aula").value || null
    };

    const response = await fetch(`${BASE_URL}/api/grupos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(grupo)
    });

    const data = await response.json();

    if (data.success) {
        alert(`Grupo creado con ID: ${data.id_grupo}`);
        this.reset();
        cargarGrupos();
    } else {
        alert(data.error || "Error al crear grupo");
    }

});

async function eliminarGrupo(id) {

    if (!confirm("¿Eliminar este grupo?")) return;

    const token = localStorage.getItem("token");

    const res = await fetch(`${BASE_URL}/api/grupos/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.success) cargarGrupos();
    else alert(data.error);

}

cargarGrupos();
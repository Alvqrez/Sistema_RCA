// frontend/js/maestros.js
const BASE_URL = "http://localhost:3000";
const token    = localStorage.getItem("token");

if (!token) window.location.href = "login.html";

async function cargarMaestros() {

    const response = await fetch(`${BASE_URL}/api/maestros`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
        window.location.href = "login.html";
        return;
    }

    const maestros = await response.json();
    const tbody    = document.querySelector("#tablaMaestros tbody");
    tbody.innerHTML = "";

    maestros.forEach(m => {
        tbody.innerHTML += `
            <tr>
                <td>${m.numero_empleado}</td>
                <td>${m.nombre} ${m.apellido_paterno}</td>
                <td>${m.departamento ?? "—"}</td>
                <td>${m.correo_institucional}</td>
                <td>${m.tel_celular ?? "—"}</td>
                <td>${m.estatus}</td>
                <td>
                    <button onclick="eliminarMaestro('${m.numero_empleado}')">Eliminar</button>
                </td>
            </tr>
        `;
    });

}

document.querySelector("#formMaestro").addEventListener("submit", async function(e) {

    e.preventDefault();

    const maestro = {
        numero_empleado:      document.getElementById("idMaestro").value,
        nombre:               document.getElementById("nombre").value,
        apellido_paterno:     document.getElementById("apellidoPaterno").value,
        apellido_materno:     document.getElementById("apellidoMaterno").value,
        curp:                 document.getElementById("curp").value,
        correo_institucional: document.getElementById("correoInstitucional").value,
        correo_personal:      document.getElementById("correoPersonal").value,
        tel_celular:          document.getElementById("telCelular").value,
        tel_oficina:          document.getElementById("telOficina").value,
        direccion:            document.getElementById("direccion").value,
        tipo_contrato:        document.getElementById("tipoContrato").value,
        estatus:              document.getElementById("estatus").value,
        fecha_ingreso:        document.getElementById("fechaIngreso").value,
        grado_academico:      document.getElementById("gradoAcademico").value,
        especialidad:         document.getElementById("especialidad").value,
        departamento:         document.getElementById("departamento").value,
        username:             document.getElementById("username").value,
        password:             document.getElementById("password").value
    };

    const response = await fetch(`${BASE_URL}/api/maestros`, {
        method: "POST",
        headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(maestro)
    });

    const data = await response.json();
    alert(data.mensaje || data.error);

    if (data.success) {
        this.reset();
        cargarMaestros();
    }

});

async function eliminarMaestro(id) {

    if (!confirm("¿Eliminar maestro?")) return;

    await fetch(`${BASE_URL}/api/maestros/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    cargarMaestros();

}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = "login.html";
}

cargarMaestros();
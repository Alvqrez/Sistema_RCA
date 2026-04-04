// DATOS
let alumno = JSON.parse(localStorage.getItem("usuarioActivo"));
let calificaciones = JSON.parse(localStorage.getItem("calificaciones")) || [];

// ELEMENTOS
const tabla = document.getElementById("tablaBoleta");
const selectPeriodo = document.getElementById("periodoSelect");

// MOSTRAR DATOS BASICOS
document.getElementById("matricula").textContent = alumno?.matricula || "N/A";
document.getElementById("nombre").textContent = alumno?.nombre || "N/A";
document.getElementById("semestre").textContent = alumno?.semestre || "N/A";
document.getElementById("carrera").textContent = alumno?.carrera || "N/A";

// CARGAR PERIODOS
function cargarPeriodos(){
    let periodos = [...new Set(calificaciones
        .filter(c => c.matricula === alumno?.matricula)
        .map(c => c.periodo))];

    selectPeriodo.innerHTML = "";

    periodos.forEach(p => {
        selectPeriodo.innerHTML += `<option value="${p}">${p}</option>`;
    });
}

// MOSTRAR BOLETA
function mostrarBoleta() {
    let periodo = selectPeriodo.value;

    document.getElementById("periodoActual").textContent = periodo || "N/A";

    let datos = calificaciones.filter(c =>
        c.matricula === alumno?.matricula &&
        c.periodo === periodo
    );

    tabla.innerHTML = "";

    if(datos.length === 0){
        tabla.innerHTML = `
            <tr>
                <td colspan="4">No hay calificaciones</td>
            </tr>
        `;
        return;
    }

    datos.forEach(c => {
        tabla.innerHTML += `
            <tr>
                <td>${c.materia}</td>
                <td>${c.cr || "-"}</td>
                <td>${c.calificacion}</td>
                <td>${c.observaciones || (c.calificacion >= 6 ? "Aprobado" : "Reprobado")}</td>
            </tr>
        `;
    });
}

// CERRAR SESION
function cerrarSesion() {
    localStorage.removeItem("usuarioActivo");
    window.location.href = "login.html";
}

// INICIALIZAR
cargarPeriodos();
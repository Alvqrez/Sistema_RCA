let alumno = JSON.parse(localStorage.getItem("usuarioActivo"));
let calificaciones = JSON.parse(localStorage.getItem("calificaciones")) || [];

document.getElementById("matricula").textContent = alumno?.matricula || "N/A";
document.getElementById("nombre").textContent = alumno?.nombre || "N/A";
document.getElementById("carrera").textContent = alumno?.carrera || "N/A";

const tabla = document.getElementById("tablaBoleta");
const selectPeriodo = document.getElementById("periodoSelect");

// CARGAR PERIODOS
function cargarPeriodos(){
    let periodos = [...new Set(calificaciones.map(c => c.periodo))];

    selectPeriodo.innerHTML = "";

    periodos.forEach(p => {
        selectPeriodo.innerHTML += `<option value="${p}">${p}</option>`;
    });
}

// MOSTRAR BOLETA POR PERIODO
function mostrarBoleta() {
    let periodo = selectPeriodo.value;

    let datos = calificaciones.filter(c =>
        c.matricula === alumno?.matricula &&
        c.periodo === periodo
    );

    tabla.innerHTML = "";

    if(datos.length === 0){
        tabla.innerHTML = `
            <tr>
                <td colspan="2">No hay calificaciones</td>
            </tr>
        `;
        document.getElementById("promedio").textContent = "N/A";
        return;
    }

    let suma = 0;

    datos.forEach(c => {
        suma += Number(c.calificacion);

        tabla.innerHTML += `
            <tr>
                <td>${c.materia}</td>
                <td>${c.calificacion}</td>
            </tr>
        `;
    });

    let promedio = (suma / datos.length).toFixed(1);
    document.getElementById("promedio").textContent = promedio;
}

// EVENTO CAMBIO DE PERIODO
selectPeriodo.addEventListener("change", mostrarBoleta);

// CERRAR SESION
function cerrarSesion() {
    localStorage.removeItem("usuarioActivo");
    window.location.href = "login.html";
}

// INICIALIZAR
cargarPeriodos();
mostrarBoleta();
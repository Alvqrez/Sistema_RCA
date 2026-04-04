// Obtener alumno activo
let alumno = JSON.parse(localStorage.getItem("usuarioActivo"));

// Obtener calificaciones
let calificaciones = JSON.parse(localStorage.getItem("calificaciones")) || [];

// Mostrar datos del alumno
document.getElementById("matricula").textContent = alumno?.matricula || "N/A";
document.getElementById("nombre").textContent = alumno?.nombre || "N/A";

// Referencia tabla
const tabla = document.getElementById("tablaBoleta");

// Mostrar boleta
function mostrarBoleta() {
    tabla.innerHTML = "";

    let datos = calificaciones.filter(c => c.matricula === alumno?.matricula);

    if(datos.length === 0){
        tabla.innerHTML = `
            <tr>
                <td colspan="2">No hay calificaciones registradas</td>
            </tr>
        `;
        return;
    }

    datos.forEach(c => {
        tabla.innerHTML += `
            <tr>
                <td>${c.materia}</td>
                <td>${c.calificacion}</td>
            </tr>
        `;
    });
}

// Calcular promedio
function calcularPromedio() {
    let datos = calificaciones.filter(c => c.matricula === alumno?.matricula);

    if(datos.length === 0){
        document.getElementById("promedio").textContent = "N/A";
        return;
    }

    let suma = 0;

    datos.forEach(c => {
        suma += Number(c.calificacion);
    });

    let promedio = (suma / datos.length).toFixed(1);

    document.getElementById("promedio").textContent = promedio;
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem("usuarioActivo");
    window.location.href = "login.html";
}

// Ejecutar funciones
mostrarBoleta();
calcularPromedio();
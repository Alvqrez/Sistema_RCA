// frontend/js/login.js
const BASE_URL = "http://localhost:3000";

const form  = document.getElementById("loginForm");
const error = document.getElementById("error");

form.addEventListener("submit", async function(e) {

    e.preventDefault();

    // Ahora solo necesitas username y password, el rol viene del token
    const username = document.getElementById("user").value;
    const password = document.getElementById("pass").value;

    try {

        const response = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, rol: localStorage.getItem("tabRol") || "alumno" }) // Envía el rol seleccionado
        }); 

        const data = await response.json();

        if (data.success) {

            localStorage.setItem("token",   data.token);
            localStorage.setItem("nombre",  data.nombre);
            localStorage.setItem("rol",     data.rol);

            // Redirige según el rol que devuelve el servidor
            if (data.rol === "alumno") {
                window.location.href = "portalAlumno.html";
            } else if (data.rol === "maestro") {
                window.location.href = "maestros.html";
            } else if (data.rol === "administrador") {
                window.location.href = "admin.html";
            }

        } else {
            error.textContent = data.message || "Credenciales incorrectas";
        }

    } catch (e) {
        error.textContent = "No se pudo conectar con el servidor";
    }

});

const tabs = document.querySelectorAll(".tab");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        localStorage.setItem("tabRol", tab.dataset.rol);
    });
});

// Activa la primera tab por defecto
localStorage.setItem("tabRol", "alumno");
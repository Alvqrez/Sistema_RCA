const form = document.getElementById("loginForm");
const error = document.getElementById("error");

form.addEventListener("submit", function(e) {
    e.preventDefault();

    const user = document.getElementById("user").value;
    const pass = document.getElementById("pass").value;
    const rol = document.getElementById("rol").value;

    if (user === "admin" && pass === "1234") {

        // Guardar sesión
        localStorage.setItem("usuario", user);
        localStorage.setItem("rol", rol);

        // Redirección según rol
        if(rol === "alumno"){
            window.location.href = "alumnos.html";
        }else{
            window.location.href = "maestros.html";
        }

    } else {
        error.textContent = "Usuario o contraseña incorrectos";
    }
});

const tabs = document.querySelectorAll(".tab");
const rolInput = document.getElementById("rol");

tabs.forEach(tab => {

    tab.addEventListener("click", () => {

        tabs.forEach(t => t.classList.remove("active"));

        tab.classList.add("active");

        rolInput.value = tab.dataset.rol;

    });

});
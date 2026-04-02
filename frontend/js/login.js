document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();

    let user = document.getElementById("user").value;
    let pass = document.getElementById("pass").value;

    if (user === "admin" && pass === "1234") {
        localStorage.setItem("login", "true");
        window.location.href = "pages/alumnos.html";
    } else {
        document.getElementById("error").textContent = "Datos incorrectos";
    }
});
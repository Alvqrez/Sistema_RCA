// frontend/js/login.js
const BASE_URL = "http://localhost:3000";

const form = document.getElementById("loginForm");
const error = document.getElementById("error");

let tabRolActual = "alumno";

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = document.getElementById("user").value.trim();
  const password = document.getElementById("pass").value;

  if (!username || !password) {
    error.textContent = "Ingresa usuario y contraseña";
    return;
  }

  error.textContent = "";

  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, rol: tabRolActual }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("nombre", data.nombre);
      localStorage.setItem("rol", data.rol);

      // ─── REDIRECCIÓN POR ROL ──────────────────────────────────────────
      if (data.rol === "alumno") window.location.href = "portalAlumno.html";
      else if (data.rol === "maestro")
        window.location.href = "mis_grupos.html"; // ← CORREGIDO
      else if (data.rol === "administrador")
        window.location.href = "admin.html";
    } else {
      error.textContent = data.message || "Credenciales incorrectas";
    }
  } catch {
    error.textContent = "No se pudo conectar con el servidor";
  }
});

// Tabs de rol en la pantalla de login
const tabs = document.querySelectorAll(".tab");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    tabRolActual = tab.dataset.rol;
  });
});

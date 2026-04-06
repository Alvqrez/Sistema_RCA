// frontend/js/admin.js
const BASE_URL = "http://localhost:3000";
const token = localStorage.getItem("token");
const rol = localStorage.getItem("rol");

soloPermitido("administrador");

if (!token || rol !== "administrador") {
  window.location.href = "login.html";
}

async function cargarUsuarios() {
  const response = await fetch(`${BASE_URL}/api/admin/usuarios`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const usuarios = await response.json();
  const tabla = document.getElementById("tablaUsuarios");
  tabla.innerHTML = "";

  usuarios.forEach((u) => {
    tabla.innerHTML += `
            <tr>
                <td>${u.username}</td>
                <td>${u.rol}</td>
                <td>${u.id_referencia}</td>
                <td>${u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString("es-MX") : "Nunca"}</td>
                <td>${u.activo ? "Activo" : "Inactivo"}</td>
                <td>
                    <button onclick="toggleEstatus(${u.id_usuario}, ${u.activo})">
                        ${u.activo ? "Desactivar" : "Activar"}
                    </button>
                </td>
            </tr>
        `;
  });
}

document
  .getElementById("formUsuario")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const data = {
      username: document.getElementById("uUsername").value,
      password: document.getElementById("uPassword").value,
      rol: document.getElementById("uRol").value,
      id_referencia: document.getElementById("uReferencia").value,
    };

    const response = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    alert(result.mensaje || result.error);

    if (result.success) {
      this.reset();
      cargarUsuarios();
    }
  });

async function toggleEstatus(id, estadoActual) {
  await fetch(`${BASE_URL}/api/admin/usuarios/${id}/estatus`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ activo: !estadoActual }),
  });

  cargarUsuarios();
}

function cerrarSesion() {
  localStorage.clear();
  window.location.href = "login.html";
}

cargarUsuarios();

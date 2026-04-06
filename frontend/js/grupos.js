// frontend/js/grupos.js — versión completa
const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", async () => {
  const rol = localStorage.getItem("rol");
  const cardForm = document.getElementById("cardRegistroGrupo");

  // Solo admin puede crear grupos
  if (rol !== "administrador" && cardForm) {
    cardForm.style.display = "none";
  }

  // Carga selects con datos reales
  await cargarMateriasSelect();
  await cargarMaestrosSelect();
  cargarGrupos();
});

async function cargarMateriasSelect() {
  const token = localStorage.getItem("token");
  const sel = document.getElementById("claveMateria");
  if (!sel) return;

  const res = await fetch(`${BASE_URL}/api/materias`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const materias = await res.json();
  sel.innerHTML = `<option value="">-- Selecciona una materia --</option>`;
  materias.forEach((m) => {
    sel.innerHTML += `<option value="${m.clave_materia}">${m.nombre_materia} (${m.clave_materia})</option>`;
  });
}

async function cargarMaestrosSelect() {
  const token = localStorage.getItem("token");
  const sel = document.getElementById("numeroEmpleado");
  if (!sel) return;

  const res = await fetch(`${BASE_URL}/api/maestros`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const maestros = await res.json();
  sel.innerHTML = `<option value="">-- Selecciona un maestro --</option>`;
  maestros.forEach((m) => {
    sel.innerHTML += `<option value="${m.numero_empleado}">${m.nombre} ${m.apellido_paterno}</option>`;
  });
}

async function cargarGrupos() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${BASE_URL}/api/grupos`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    window.location.href = "login.html";
    return;
  }

  const grupos = await response.json();
  const tabla = document.getElementById("tablaGrupos");
  const rol = localStorage.getItem("rol");
  tabla.innerHTML = "";

  grupos.forEach((g) => {
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
                    ${rol === "administrador" ? `<button class="btn-eliminar" onclick="eliminarGrupo(${g.id_grupo})">Eliminar</button>` : "—"}
                </td>
            </tr>
        `;
  });
}

document
  .getElementById("formGrupo")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const grupo = {
      clave_materia: document.getElementById("claveMateria").value,
      numero_empleado: document.getElementById("numeroEmpleado").value,
      id_periodo: document.getElementById("idPeriodo").value,
      limite_alumnos: document.getElementById("limiteAlumnos").value || 30,
      horario: document.getElementById("horario").value || null,
      aula: document.getElementById("aula").value || null,
    };
    const res = await fetch(`${BASE_URL}/api/grupos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(grupo),
    });
    const data = await res.json();
    if (data.success) {
      alert(`Grupo creado (ID: ${data.id_grupo})`);
      this.reset();
      cargarGrupos();
    } else alert(data.error || "Error al crear grupo");
  });

async function eliminarGrupo(id) {
  if (!confirm("¿Eliminar este grupo?")) return;
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/api/grupos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.success) cargarGrupos();
  else alert(data.error);
}

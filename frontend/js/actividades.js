// frontend/js/actividades.js
const BASE_URL = "http://localhost:3000";

async function cargarActividades() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${BASE_URL}/api/actividades`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    window.location.href = "login.html";
    return;
  }

  const actividades = await response.json();
  const tabla = document.getElementById("tablaActividades");
  tabla.innerHTML = "";

  actividades.forEach((a) => {
    tabla.innerHTML += `
            <tr>
                <td>${a.id_actividad}</td>
                <td>${a.id_grupo}</td>
                <td>${a.id_unidad}</td>
                <td>${a.nombre_actividad}</td>
                <td>${a.ponderacion}%</td>
                <td>${a.tipo_evaluacion}</td>
                <td>${a.fecha_entrega ?? "—"}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarActividad(${a.id_actividad})">Eliminar</button>
                </td>
            </tr>
        `;
  });
}

// Carga grupos en el select para crear actividad
async function cargarGruposSelect() {
  const token = localStorage.getItem("token");
  const sel = document.getElementById("grupoActividad");
  const res = await fetch(`${BASE_URL}/api/grupos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const grupos = await res.json();
  grupos.forEach((g) => {
    sel.innerHTML += `<option value="${g.id_grupo}">${g.nombre_materia} (${g.id_grupo})</option>`;
  });
}

// Al cambiar grupo, carga sus unidades
document
  .getElementById("grupoActividad")
  .addEventListener("change", async function () {
    const token = localStorage.getItem("token");
    const selUni = document.getElementById("unidadActividad");
    selUni.innerHTML = `<option value="">-- Selecciona unidad --</option>`;

    if (!this.value) return;

    const res = await fetch(`${BASE_URL}/api/unidades`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const unidades = await res.json();
    unidades.forEach((u) => {
      selUni.innerHTML += `<option value="${u.id_unidad}">${u.nombre_unidad}</option>`;
    });
  });

document
  .getElementById("formActividad")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const actividad = {
      id_grupo: document.getElementById("grupoActividad").value,
      id_unidad: document.getElementById("unidadActividad").value,
      nombre_actividad: document.getElementById("nombreActividad").value,
      ponderacion: document.getElementById("ponderacion").value,
      tipo_evaluacion: document.getElementById("tipoEvaluacion").value,
      fecha_entrega: document.getElementById("fechaEntrega").value || null,
    };

    const res = await fetch(`${BASE_URL}/api/actividades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(actividad),
    });
    const data = await res.json();

    if (data.success) {
      alert("Actividad registrada");
      this.reset();
      cargarActividades();
    } else {
      alert(data.error || "Error al registrar");
    }
  });

async function eliminarActividad(id) {
  if (!confirm("¿Eliminar esta actividad?")) return;
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/api/actividades/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.success) cargarActividades();
  else alert(data.error);
}

cargarGruposSelect();
cargarActividades();

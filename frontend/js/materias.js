// frontend/js/materias.js — CORREGIDO
const BASE_URL = "http://localhost:3000";

soloPermitido("administrador");

let materiaEditando = null; // null = modo registro, string = clave en edición

const form = document.getElementById("formMateria");
const tabla = document.getElementById("tablaMaterias");

// ─── CARGAR ────────────────────────────────────────────────────────────────

async function cargarMaterias() {
  const token = localStorage.getItem("token");

  const response = await fetch(`${BASE_URL}/api/materias`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    window.location.href = "login.html";
    return;
  }

  const materias = await response.json();
  tabla.innerHTML = "";

  if (materias.length === 0) {
    tabla.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px;">Sin materias registradas</td></tr>`;
    return;
  }

  const rol = localStorage.getItem("rol");

  materias.forEach((m) => {
    tabla.innerHTML += `
      <tr>
        <td>${m.clave_materia}</td>
        <td>${m.nombre_materia}</td>
        <td>${m.creditos_totales}</td>
        <td>${m.no_unidades}</td>
        <td>
          ${
            rol === "administrador"
              ? `<button class="btn-editar" onclick="editarMateria('${m.clave_materia}')">Editar</button>
                 <button class="btn-eliminar" onclick="eliminarMateria('${m.clave_materia}')">Eliminar</button>`
              : "—"
          }
        </td>
      </tr>
    `;
  });
}

// ─── SUBMIT (REGISTRAR O EDITAR) ───────────────────────────────────────────

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const token = localStorage.getItem("token");

  const materia = {
    clave_materia: document.getElementById("claveMateria").value.trim(),
    nombre_materia: document.getElementById("nombreMateria").value.trim(),
    creditos_totales: parseInt(document.getElementById("creditos").value) || 0,
    horas_teoricas:
      parseInt(document.getElementById("horasTeoricas").value) || 0,
    horas_practicas:
      parseInt(document.getElementById("horasPracticas").value) || 0,
    no_unidades: parseInt(document.getElementById("noUnidades").value) || 0,
  };

  if (!materia.nombre_materia) {
    mostrarMensaje("El nombre de la materia es requerido.", "error");
    return;
  }

  let url = `${BASE_URL}/api/materias`;
  let method = "POST";

  if (materiaEditando) {
    url = `${BASE_URL}/api/materias/${materiaEditando}`;
    method = "PUT";
    delete materia.clave_materia; // No se puede editar la PK
  } else {
    if (!materia.clave_materia) {
      mostrarMensaje("La clave es requerida.", "error");
      return;
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(materia),
    });

    const data = await response.json();

    if (data.success) {
      mostrarMensaje(data.mensaje || "Guardado correctamente.", "ok");
      cancelarEdicion();
      cargarMaterias();
    } else {
      mostrarMensaje(data.error || "Error al guardar.", "error");
    }
  } catch {
    mostrarMensaje("Error de conexión con el servidor.", "error");
  }
});

// ─── EDITAR ────────────────────────────────────────────────────────────────

async function editarMateria(clave) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${BASE_URL}/api/materias/${clave}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    materiaEditando = clave;

    document.getElementById("claveMateria").value = data.clave_materia;
    document.getElementById("claveMateria").disabled = true; // PK no editable
    document.getElementById("nombreMateria").value = data.nombre_materia;
    document.getElementById("creditos").value = data.creditos_totales;
    document.getElementById("horasTeoricas").value = data.horas_teoricas;
    document.getElementById("horasPracticas").value = data.horas_practicas;
    document.getElementById("noUnidades").value = data.no_unidades;

    document.getElementById("tituloFormMateria").textContent = "Editar materia";
    document.querySelector("#formMateria .btn-guardar").textContent =
      "Actualizar";
    document
      .getElementById("cardFormMateria")
      .scrollIntoView({ behavior: "smooth" });
  } catch {
    alert("Error al cargar datos de la materia.");
  }
}

// ─── CANCELAR EDICIÓN ──────────────────────────────────────────────────────

function cancelarEdicion() {
  materiaEditando = null;
  form.reset();
  document.getElementById("claveMateria").disabled = false;
  document.getElementById("tituloFormMateria").textContent =
    "Registrar materia";
  document.querySelector("#formMateria .btn-guardar").textContent = "Guardar";
  mostrarMensaje("", "");
}

// ─── ELIMINAR ──────────────────────────────────────────────────────────────

async function eliminarMateria(clave) {
  if (
    !confirm(
      `¿Eliminar la materia "${clave}"? Esta acción no se puede deshacer.`,
    )
  )
    return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${BASE_URL}/api/materias/${clave}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success) {
      cargarMaterias();
    } else {
      alert(data.error || "Error al eliminar.");
    }
  } catch {
    alert("Error de conexión con el servidor.");
  }
}

// ─── UTILIDAD ──────────────────────────────────────────────────────────────

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensajeMateria");
  if (!el) return;
  el.textContent = texto;
  el.style.color = tipo === "error" ? "#ef4444" : "#22c55e";
  if (texto)
    setTimeout(() => {
      el.textContent = "";
    }, 4000);
}

cargarMaterias();

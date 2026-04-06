// frontend/js/unidades.js
const BASE_URL = "http://localhost:3000";

const rol    = localStorage.getItem("rol");
const token  = localStorage.getItem("token");

// ─── CARGAR DROPDOWN DE MATERIAS ────────────────────────────────────────────
async function cargarMaterias() {
  const url = rol === "maestro"
    ? `${BASE_URL}/api/unidades/mis-materias`
    : `${BASE_URL}/api/materias`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    window.location.href = "login.html";
    return [];
  }

  return await res.json();
}

async function poblarSelectMaterias() {
  const materias = await cargarMaterias();
  const select   = document.getElementById("claveMateria");
  select.innerHTML = `<option value="">-- Selecciona una materia --</option>`;

  materias.forEach((m) => {
    const opt = document.createElement("option");
    opt.value       = m.clave_materia;
    opt.textContent = `${m.clave_materia} — ${m.nombre_materia}`;
    if (m.no_unidades) opt.dataset.noUnidades = m.no_unidades;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    const opt   = select.options[select.selectedIndex];
    const hint  = document.getElementById("hintUnidades");
    const total = opt.dataset.noUnidades;
    hint.textContent = total
      ? `Esta materia tiene ${total} unidad${total > 1 ? "es" : ""} definida${total > 1 ? "s" : ""} en el plan.`
      : "";

    if (select.value) cargarUnidades(select.value);
    else cargarUnidades();
  });
}

// ─── CARGAR TABLA DE UNIDADES ────────────────────────────────────────────────
async function cargarUnidades(claveFiltro = null) {
  const url = claveFiltro
    ? `${BASE_URL}/api/unidades/materia/${claveFiltro}`
    : `${BASE_URL}/api/unidades`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    window.location.href = "login.html";
    return;
  }

  const unidades = await res.json();
  const tabla    = document.getElementById("tablaUnidades");
  tabla.innerHTML = "";

  if (unidades.length === 0) {
    tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#888;">Sin unidades registradas</td></tr>`;
    return;
  }

  unidades.forEach((u) => {
    const badgeClass =
      u.estatus === "Cerrada"  ? "badge-gris"  :
      u.estatus === "En curso" ? "badge-azul"  : "badge-verde";

    tabla.innerHTML += `
      <tr>
        <td>${u.id_unidad}</td>
        <td>${u.clave_materia}</td>
        <td>${u.nombre_unidad}</td>
        <td><span class="badge ${badgeClass}">${u.estatus}</span></td>
        <td>${u.fecha_cierre ? new Date(u.fecha_cierre).toLocaleDateString("es-MX") : "—"}</td>
        <td>
          <button class="btn-eliminar" onclick="eliminarUnidad(${u.id_unidad})">Eliminar</button>
        </td>
      </tr>`;
  });
}

// ─── REGISTRAR UNIDAD ────────────────────────────────────────────────────────
document.getElementById("formUnidad").addEventListener("submit", async function (e) {
  e.preventDefault();

  const clave = document.getElementById("claveMateria").value;
  if (!clave) {
    alert("Selecciona una materia primero");
    return;
  }

  const unidad = {
    clave_materia: clave,
    nombre_unidad: document.getElementById("nombreUnidad").value,
    temario:       document.getElementById("temario").value || null,
    estatus:       document.getElementById("estatus").value,
    fecha_cierre:  document.getElementById("fechaCierre").value || null,
  };

  const res  = await fetch(`${BASE_URL}/api/unidades`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body:    JSON.stringify(unidad),
  });

  const data = await res.json();

  if (data.success) {
    document.getElementById("nombreUnidad").value = "";
    document.getElementById("temario").value      = "";
    document.getElementById("fechaCierre").value  = "";
    document.getElementById("estatus").value      = "Pendiente";
    cargarUnidades(clave);
  } else {
    alert(data.error || "Error al registrar");
  }
});

// ─── ELIMINAR UNIDAD ─────────────────────────────────────────────────────────
async function eliminarUnidad(id) {
  if (!confirm("¿Eliminar esta unidad?")) return;

  const res  = await fetch(`${BASE_URL}/api/unidades/${id}`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (data.success) {
    const clave = document.getElementById("claveMateria").value || null;
    cargarUnidades(clave);
  } else {
    alert(data.error);
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
(async function init() {
  await poblarSelectMaterias();

  if (rol === "administrador") {
    cargarUnidades();
  } else {
    document.getElementById("tablaUnidades").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#888;">Selecciona una materia para ver sus unidades</td></tr>`;
  }
})();

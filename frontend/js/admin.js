const BASE_URL = "http://localhost:3000";
const token = () => localStorage.getItem("token");

let usuariosGlobal = [];
let resetUserId = null;

soloPermitido("administrador");

function toast(msg, tipo = "success") {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const t = document.createElement("div");
  t.className = `toast toast-${tipo}`;
  const icons = {
    success: "lucide:check-circle",
    error: "lucide:x-circle",
    info: "lucide:info",
  };
  t.innerHTML = `<iconify-icon icon="${icons[tipo] || icons.info}"></iconify-icon>${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function abrirModal(id) {
  document.getElementById(id).classList.add("visible");
}
function cerrarModal(id) {
  document.getElementById(id).classList.remove("visible");
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay"))
    e.target.classList.remove("visible");
});

document.addEventListener("DOMContentLoaded", () => {
  cargarStats();
  cargarUsuarios();
});

async function cargarStats() {
  try {
    const r = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!r.ok) throw new Error();
    const s = await r.json();
    renderStats(s);
  } catch {
    document.getElementById("statsRow").innerHTML =
      `<div class="stat-card"><iconify-icon icon="lucide:wifi-off"></iconify-icon><div><p>—</p><span>Sin conexión</span></div></div>`;
  }
}

function renderStats(s) {
  const statsRow = document.getElementById("statsRow");
  const items = [
    {
      icon: "lucide:users",
      val: s.alumnos,
      label: "Alumnos registrados",
      cls: "",
    },
    {
      icon: "lucide:graduation-cap",
      val: s.maestros,
      label: "Maestros activos",
      cls: "stat-success",
    },
    {
      icon: "lucide:library",
      val: s.grupos_activos,
      label: "Grupos activos",
      cls: "stat-purple",
    },
    { icon: "lucide:book-open", val: s.materias, label: "Materias", cls: "" },
    {
      icon: "lucide:clipboard-list",
      val: s.inscripciones,
      label: "Inscripciones activas",
      cls: "stat-success",
    },
    
    
    
  ];
  statsRow.innerHTML = items
    .map(
      (i) => `
    <div class="stat-card ${i.cls}">
      <iconify-icon icon="${i.icon}"></iconify-icon>
      <div><p>${i.val}</p><span>${i.label}</span></div>
    </div>`,
    )
    .join("");
}

async function cargarUsuarios() {
  try {
    const r = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!r.ok) throw new Error();
    usuariosGlobal = await r.json();
    filtrarUsuarios();
  } catch {
    toast("No se pudo cargar la lista de usuarios", "error");
  }
}

function filtrarUsuarios() {
  const q = document.getElementById("filtroUsuarios").value.toLowerCase();
  const datos = q
    ? usuariosGlobal.filter(
        (u) => u.username.toLowerCase().includes(q) || u.rol.includes(q),
      )
    : usuariosGlobal;
  renderUsuarios(datos);
}

function renderUsuarios(datos) {
  const tbody = document.getElementById("tablaUsuarios");
  if (!datos.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:20px">
      <iconify-icon icon="lucide:search-x"></iconify-icon><p>Sin resultados</p></div></td></tr>`;
    return;
  }
  const rolColor = {
    alumno: "badge-info",
    maestro: "badge-success",
    administrador: "badge-purple",
  };
  const rolLabel = {
    alumno: "Alumno",
    maestro: "Maestro",
    administrador: "Admin",
  };
  tbody.innerHTML = datos
    .map(
      (u) => `
    <tr>
      <td><div class="avatar-cell">
        <div class="avatar" style="width:28px;height:28px;font-size:0.72rem">${u.username[0].toUpperCase()}</div>
        <span style="font-size:0.85rem">${u.username}</span>
      </div></td>
      <td><span class="badge ${rolColor[u.rol] || "badge-info"}">${rolLabel[u.rol] || u.rol}</span></td>
      <td style="font-size:0.8rem;color:var(--text-muted)">
        ${u.ultimo_acceso ? fmtFecha(u.ultimo_acceso) : "Nunca"}
      </td>
      <td>
        ${
          u.activo
            ? `<span class="badge badge-success">Activo</span>`
            : `<span class="badge badge-danger">Inactivo</span>`
        }
      </td>
      <td><div class="table-actions">
        <button class="btn-icon" title="Resetear contraseña" onclick="abrirReset(${u.id_usuario},'${u.username}')">
          <iconify-icon icon="lucide:key"></iconify-icon>
        </button>
        <button class="btn-icon ${u.activo ? "btn-del" : ""}" title="${u.activo ? "Desactivar" : "Activar"}"
                onclick="toggleEstatus(${u.id_usuario}, ${u.activo})">
          <iconify-icon icon="${u.activo ? "lucide:user-x" : "lucide:user-check"}"></iconify-icon>
        </button>
      </div></td>
    </tr>`,
    )
    .join("");
}

async function crearUsuario() {
  const username = document.getElementById("uUsername").value.trim();
  const password = document.getElementById("uPassword").value;
  const rol = "administrador";
  const id_referencia = document.getElementById("uReferencia").value.trim();
  const errEl = document.getElementById("modalUserError");
  errEl.style.display = "none";

  if (!username || !password || !id_referencia) {
    errEl.textContent = "Todos los campos son obligatorios.";
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("btnCrearUser");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Creando…`;

  try {
    const r = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({ username, password, rol, id_referencia }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error al crear usuario");
    toast("Usuario creado correctamente");
    cerrarModal("modalUsuario");
    limpiarModalUser();
    await cargarUsuarios();
    await cargarStats();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:user-plus"></iconify-icon> Crear usuario`;
  }
}

function limpiarModalUser() {
  ["uUsername", "uPassword", "uReferencia"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("uRol").value = "administrador";
  const e = document.getElementById("modalUserError");
  if (e) e.style.display = "none";
}

async function toggleEstatus(id, estadoActual) {
  try {
    const r = await fetch(`${BASE_URL}/api/admin/usuarios/${id}/estatus`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({ activo: !estadoActual }),
    });
    if (!r.ok) throw new Error("Error al cambiar estatus");
    toast(estadoActual ? "Usuario desactivado" : "Usuario activado");
    await cargarUsuarios();
    await cargarStats();
  } catch (e) {
    toast(e.message, "error");
  }
}

function abrirReset(id, username) {
  resetUserId = id;
  document.getElementById("resetUsername").textContent = username;
  document.getElementById("resetPassword").value = "";
  const errEl = document.getElementById("modalResetError");
  if (errEl) errEl.style.display = "none";
  abrirModal("modalReset");
}

async function confirmarReset() {
  const nuevaPassword = document.getElementById("resetPassword").value;
  const errEl = document.getElementById("modalResetError");
  errEl.style.display = "none";

  if (!nuevaPassword || nuevaPassword.length < 6) {
    errEl.textContent = "La contraseña debe tener al menos 6 caracteres.";
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("btnReset");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Actualizando…`;

  try {
    const r = await fetch(
      `${BASE_URL}/api/admin/usuarios/${resetUserId}/password`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ nuevaPassword }),
      },
    );
    if (!r.ok) throw new Error("Error al actualizar contraseña");
    toast("Contraseña actualizada correctamente");
    cerrarModal("modalReset");
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:key"></iconify-icon> Actualizar`;
  }
}

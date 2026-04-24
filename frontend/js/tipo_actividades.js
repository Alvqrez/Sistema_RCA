// frontend/js/tipo_actividades.js
// Gestión del catálogo de tipos de actividad — solo administrador

const BASE_URL_TA = 'http://localhost:3000';

// ─── Guard: solo admin ────────────────────────────────────────────────────────
(function() {
  const rol = localStorage.getItem('rol');
  if (rol !== 'administrador') {
    window.location.href = 'login.html';
  }
})();

// ─── Utilerías ────────────────────────────────────────────────────────────────
function token() { return localStorage.getItem('token'); }

function mostrarToast(msg, tipo = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── Cargar lista ─────────────────────────────────────────────────────────────
async function cargarTipos() {
  const lista = document.getElementById('listaTipos');
  lista.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px">Cargando...</p>';

  try {
    const res  = await fetch(`${BASE_URL_TA}/api/tipo-actividades`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      lista.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px">No hay tipos registrados aún.</p>';
      return;
    }

    const iconos = {
      'Tarea': '📝', 'Proyecto': '🗂️', 'Exposición': '🎤',
      'Práctica': '🔬', 'Examen': '📄', 'Investigación': '🔍', 'Cuestionario': '📋'
    };

    lista.innerHTML = data.map(t => `
      <div class="tipo-card" id="tipo-card-${t.id_tipo}">
        <div class="tipo-icon">${iconos[t.nombre] || '🏷️'}</div>
        <div class="tipo-info">
          <div class="tipo-nombre">${t.nombre}
            <span class="${t.activo ? 'badge-activo' : 'badge-inactivo'}" style="margin-left:8px">
              ${t.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div class="tipo-desc">${t.descripcion || '—'}</div>
        </div>
        <div class="tipo-actions">
          <button class="btn btn-sm btn-secondary" onclick="abrirModalEditar(${t.id_tipo}, '${escHtml(t.nombre)}', '${escHtml(t.descripcion || '')}', ${t.activo})">✏️ Editar</button>
          <button class="btn btn-sm btn-danger"    onclick="eliminarTipo(${t.id_tipo}, '${escHtml(t.nombre)}')">🗑️</button>
        </div>
      </div>
    `).join('');

  } catch (e) {
    lista.innerHTML = '<p style="color:red;text-align:center;padding:20px">Error al cargar los tipos.</p>';
  }
}

function escHtml(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function abrirModalNuevo() {
  document.getElementById('tipoId').value      = '';
  document.getElementById('tipoNombre').value  = '';
  document.getElementById('tipoDesc').value    = '';
  document.getElementById('tipoActivo').value  = '1';
  document.getElementById('grupoActivo').style.display = 'none';
  document.getElementById('modalTipoTitulo').textContent = 'Nuevo tipo de actividad';
  document.getElementById('modalTipo').classList.add('active');
}

function abrirModalEditar(id, nombre, desc, activo) {
  document.getElementById('tipoId').value      = id;
  document.getElementById('tipoNombre').value  = nombre;
  document.getElementById('tipoDesc').value    = desc;
  document.getElementById('tipoActivo').value  = activo ? '1' : '0';
  document.getElementById('grupoActivo').style.display = 'block';
  document.getElementById('modalTipoTitulo').textContent = 'Editar tipo de actividad';
  document.getElementById('modalTipo').classList.add('active');
}

function cerrarModal() {
  document.getElementById('modalTipo').classList.remove('active');
}

// Cerrar modal al hacer click fuera
document.getElementById('modalTipo')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalTipo')) cerrarModal();
});

// ─── Guardar (crear o editar) ─────────────────────────────────────────────────
async function guardarTipo() {
  const id     = document.getElementById('tipoId').value;
  const nombre = document.getElementById('tipoNombre').value.trim();
  const desc   = document.getElementById('tipoDesc').value.trim();
  const activo = parseInt(document.getElementById('tipoActivo').value);

  if (!nombre) {
    mostrarToast('El nombre es requerido', 'error');
    return;
  }

  const body   = { nombre, descripcion: desc || null, activo };
  const url    = id ? `${BASE_URL_TA}/api/tipo-actividades/${id}` : `${BASE_URL_TA}/api/tipo-actividades`;
  const method = id ? 'PUT' : 'POST';

  try {
    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok) {
      mostrarToast(data.error || 'Error al guardar', 'error');
      return;
    }
    mostrarToast(id ? 'Tipo actualizado' : 'Tipo registrado', 'success');
    cerrarModal();
    cargarTipos();
  } catch (e) {
    mostrarToast('Error de conexión', 'error');
  }
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────
async function eliminarTipo(id, nombre) {
  if (!confirm(`¿Eliminar el tipo "${nombre}"?\nSi ya tiene actividades asignadas no se podrá eliminar.`)) return;

  try {
    const res  = await fetch(`${BASE_URL_TA}/api/tipo-actividades/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` }
    });
    const data = await res.json();
    if (!res.ok) {
      mostrarToast(data.error || 'No se pudo eliminar', 'error');
      return;
    }
    mostrarToast('Tipo eliminado', 'success');
    cargarTipos();
  } catch (e) {
    mostrarToast('Error de conexión', 'error');
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', cargarTipos);

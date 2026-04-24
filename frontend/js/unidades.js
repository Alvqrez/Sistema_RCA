// frontend/js/unidades.js
// Flujo: Admin elige materia → ve N campos (según no_unidades) → rellena nombres → guarda

const BASE_URL = "http://localhost:3000";
const rol      = localStorage.getItem("rol");
const token    = localStorage.getItem("token");

// Guard: solo admin puede gestionar unidades
(function () {
  if (rol !== "administrador") {
    window.location.href = "login.html";
  }
})();

// Estado de la sesión
let materiaActual = null; // { clave_materia, nombre_materia, no_unidades }
let unidadesGuardadas = []; // unidades ya existentes en DB para la materia actual

// ─── Utilidades ───────────────────────────────────────────────────────────────
function toast(msg, tipo = "success") {
  let t = document.getElementById("rca-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "rca-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `rca-toast rca-toast-${tipo} visible`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("visible"), 3500);
}

function fmtFecha(f) {
  if (!f) return "—";
  const [y, m, d] = f.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

// ─── Poblar el selector de materias ───────────────────────────────────────────
async function poblarSelectMaterias() {
  try {
    const res = await fetch(`${BASE_URL}/api/materias`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      window.location.href = "login.html";
      return;
    }
    const materias = await res.json();
    const sel = document.getElementById("selMateria");
    sel.innerHTML = '<option value="">— Selecciona una materia —</option>';

    materias.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.clave_materia;
      opt.textContent = `${m.clave_materia} — ${m.nombre_materia}`;
      opt.dataset.noUnidades   = m.no_unidades || 0;
      opt.dataset.nombreMateria = m.nombre_materia;
      sel.appendChild(opt);
    });

    // Mostrar info cuando se cambia la selección
    sel.addEventListener("change", () => {
      const opt = sel.options[sel.selectedIndex];
      const infoDiv   = document.getElementById("infoMateria");
      const infoTexto = document.getElementById("textoInfoMateria");

      if (sel.value && opt.dataset.noUnidades > 0) {
        infoTexto.textContent = `Esta materia tiene ${opt.dataset.noUnidades} unidad(es) en su plan de estudios.`;
        infoDiv.style.display = "block";
      } else if (sel.value && opt.dataset.noUnidades == 0) {
        infoTexto.textContent = "⚠️ Esta materia tiene 0 unidades definidas. Edítala primero para establecer el número de unidades.";
        infoDiv.style.display = "block";
      } else {
        infoDiv.style.display = "none";
      }

      // Ocultar configuración si cambian la selección
      cancelarConfig();
    });
  } catch (e) {
    toast("Error al cargar las materias", "error");
  }
}

// ─── Cargar configuración al presionar "Configurar unidades" ─────────────────
async function cargarConfiguracion() {
  const sel = document.getElementById("selMateria");
  const clave = sel.value;
  if (!clave) {
    toast("Selecciona una materia primero", "error");
    return;
  }

  const opt = sel.options[sel.selectedIndex];
  const noUnidades   = parseInt(opt.dataset.noUnidades) || 0;
  const nombreMateria = opt.dataset.nombreMateria || clave;

  if (noUnidades === 0) {
    toast("Esta materia tiene 0 unidades. Edítala primero.", "error");
    return;
  }

  materiaActual = { clave_materia: clave, nombre_materia: nombreMateria, no_unidades: noUnidades };

  // Traer unidades ya existentes para esa materia
  try {
    const res = await fetch(`${BASE_URL}/api/unidades/materia/${encodeURIComponent(clave)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    unidadesGuardadas = res.ok ? await res.json() : [];
  } catch (e) {
    unidadesGuardadas = [];
  }

  // Renderizar el formulario de configuración
  renderizarFormulario(noUnidades, nombreMateria, unidadesGuardadas);

  // Mostrar el resumen de lo que ya hay
  renderizarResumen(unidadesGuardadas, clave, nombreMateria);
}

// ─── Renderizar formulario de N campos ───────────────────────────────────────
function renderizarFormulario(n, nombreMateria, existentes) {
  const card        = document.getElementById("cardConfigUnidades");
  const titulo      = document.getElementById("tituloConfigCard");
  const instrucciones = document.getElementById("instruccionesConfig");
  const grid        = document.getElementById("gridUnidades");

  titulo.textContent = `Configurar unidades — ${nombreMateria}`;

  const yaConfiguradas = existentes.length;
  if (yaConfiguradas > 0) {
    instrucciones.textContent =
      `${yaConfiguradas} de ${n} unidad(es) ya están registradas. Puedes editar sus nombres y guardar.`;
  } else {
    instrucciones.textContent =
      `Asigna un nombre a cada una de las ${n} unidades de esta materia.`;
  }

  grid.innerHTML = "";

  for (let i = 0; i < n; i++) {
    const unidadExistente = existentes[i] || null;
    const nombreActual    = unidadExistente ? unidadExistente.nombre_unidad : "";
    const placeholder     = `Ej. Unidad ${i + 1}: Introducción al tema`;

    const row = document.createElement("div");
    row.className = "unidad-row";
    row.innerHTML = `
      <div class="unidad-numero">${i + 1}</div>
      <input
        type="text"
        class="unidad-input"
        id="unidad-input-${i}"
        value="${escHtml(nombreActual)}"
        placeholder="${placeholder}"
        maxlength="100"
      />
    `;
    grid.appendChild(row);
  }

  // Enfocar el primer campo vacío
  for (let i = 0; i < n; i++) {
    const inp = document.getElementById(`unidad-input-${i}`);
    if (inp && !inp.value.trim()) {
      inp.focus();
      break;
    }
  }

  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("estadoGuardado").textContent = "";
}

// ─── Guardar (bulk configurar) ────────────────────────────────────────────────
async function guardarUnidades() {
  if (!materiaActual) return;

  const { clave_materia, no_unidades } = materiaActual;
  const payload = [];

  for (let i = 0; i < no_unidades; i++) {
    const inp = document.getElementById(`unidad-input-${i}`);
    const nombre = inp ? inp.value.trim() : "";

    if (!nombre) {
      toast(`El nombre de la Unidad ${i + 1} es obligatorio.`, "error");
      inp?.focus();
      return;
    }
    payload.push({ nombre_unidad: nombre });
  }

  const btnGuardar = document.getElementById("btnGuardar");
  const estadoSpan = document.getElementById("estadoGuardado");
  btnGuardar.disabled = true;
  estadoSpan.textContent = "Guardando...";

  try {
    const res = await fetch(
      `${BASE_URL}/api/unidades/materia/${encodeURIComponent(clave_materia)}/configurar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    if (res.ok && data.success) {
      toast(`Unidades de "${materiaActual.nombre_materia}" guardadas correctamente.`, "success");
      estadoSpan.textContent = "✓ Guardado";

      // Recargar existentes y actualizar resumen
      const resGet = await fetch(
        `${BASE_URL}/api/unidades/materia/${encodeURIComponent(clave_materia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      unidadesGuardadas = resGet.ok ? await resGet.json() : [];
      renderizarResumen(unidadesGuardadas, clave_materia, materiaActual.nombre_materia);

      // Actualizar instrucciones
      const instr = document.getElementById("instruccionesConfig");
      instr.textContent = `${unidadesGuardadas.length} de ${no_unidades} unidad(es) registradas. Puedes editar sus nombres y guardar de nuevo.`;
    } else {
      toast(data.error || "Error al guardar", "error");
      estadoSpan.textContent = "";
    }
  } catch (e) {
    toast("Error de conexión con el servidor", "error");
    estadoSpan.textContent = "";
  } finally {
    btnGuardar.disabled = false;
  }
}

// ─── Cancelar / ocultar configuración ────────────────────────────────────────
function cancelarConfig() {
  document.getElementById("cardConfigUnidades").style.display = "none";
  document.getElementById("cardResumen").style.display = "none";
  materiaActual = null;
  unidadesGuardadas = [];
}

// ─── Renderizar resumen (tabla inferior) ──────────────────────────────────────
function renderizarResumen(unidades, clave, nombreMateria) {
  const card   = document.getElementById("cardResumen");
  const cuerpo = document.getElementById("cuerpoResumen");

  if (!unidades.length) {
    cuerpo.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">
          Aún no hay unidades guardadas para <strong>${nombreMateria}</strong>.
        </td>
      </tr>`;
    card.style.display = "block";
    return;
  }

  cuerpo.innerHTML = unidades
    .map(
      (u, i) => `
      <tr>
        <td style="font-weight:700;color:var(--text-muted)">${i + 1}</td>
        <td><span style="font-size:.8rem;background:var(--bg-secondary);padding:2px 8px;border-radius:6px;color:var(--text-secondary)">${clave}</span></td>
        <td><strong>${escHtml(u.nombre_unidad)}</strong></td>
        <td><span class="badge-configurada">Configurada</span></td>
      </tr>`
    )
    .join("");

  // Si hay unidades del plan sin configurar
  const faltantes = materiaActual?.no_unidades - unidades.length;
  if (faltantes > 0) {
    for (let i = 0; i < faltantes; i++) {
      cuerpo.innerHTML += `
        <tr>
          <td style="font-weight:700;color:var(--text-muted)">${unidades.length + i + 1}</td>
          <td><span style="font-size:.8rem;background:var(--bg-secondary);padding:2px 8px;border-radius:6px;color:var(--text-secondary)">${clave}</span></td>
          <td style="color:var(--text-muted);font-style:italic">Sin nombre asignado</td>
          <td><span class="badge-pendiente-r">Pendiente</span></td>
        </tr>`;
    }
  }

  card.style.display = "block";
}

// ─── Escape HTML ──────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", poblarSelectMaterias);

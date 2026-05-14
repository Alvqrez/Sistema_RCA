// frontend/admin/js/actividadesAdmin.js
// Catálogo global de actividades — opera sobre la tabla tipo_actividad

(function () {
  if (localStorage.getItem("rol") !== "administrador")
    window.location.href = "../../shared/pages/login.html";
})();

const tk = () => localStorage.getItem("token");

let todasActividades = []; // cache completo
let editandoId = null;     // id_tipo en edición, null = nuevo
let csvData = [];

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, tipo = "success") {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const t = document.createElement("div");
  t.className = `rca-toast rca-toast-${tipo === "error" ? "error" : tipo === "info" ? "warning" : "success"}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add("visible"));
  setTimeout(() => { t.classList.remove("visible"); setTimeout(() => t.remove(), 400); }, 3500);
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => cargar());

// ─── Cargar lista ─────────────────────────────────────────────────────────────
async function cargar() {
  try {
    const res = await fetch(`${API_URL}/api/tipo-actividades`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (res.status === 401 || res.status === 403) {
      window.location.href = "../../shared/pages/login.html";
      return;
    }
    todasActividades = await res.json();
    actualizarStats();
    filtrar();
  } catch {
    document.getElementById("tablaBody").innerHTML =
      `<tr><td colspan="4" style="text-align:center;padding:30px;color:red">Error al cargar actividades.</td></tr>`;
  }
}

function actualizarStats() {
  document.getElementById("statTotal").textContent = todasActividades.length;
  document.getElementById("statConDesc").textContent =
    todasActividades.filter((a) => a.descripcion?.trim()).length;
}

// ─── Filtrar / Renderizar ─────────────────────────────────────────────────────
function filtrar() {
  const q = (document.getElementById("filtroBusqueda")?.value || "").toLowerCase();
  const lista = q
    ? todasActividades.filter(
        (a) =>
          a.nombre.toLowerCase().includes(q) ||
          (a.descripcion || "").toLowerCase().includes(q)
      )
    : todasActividades;
  renderTabla(lista);
}

function renderTabla(lista) {
  const tbody = document.getElementById("tablaBody");
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-muted)">
      Sin actividades registradas.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map((a, i) => `
    <tr>
      <td style="color:var(--text-muted);font-weight:700">${i + 1}</td>
      <td><strong>${esc(a.nombre)}</strong></td>
      <td class="desc-cell">${esc(a.descripcion) || '<span style="color:var(--text-muted);font-style:italic">Sin descripción</span>'}</td>
      <td>
        <div class="table-actions" style="justify-content:center">
          <button class="btn-icon" title="Editar" onclick="abrirEditar(${a.id_tipo})">
            <iconify-icon icon="lucide:pencil"></iconify-icon>
          </button>
          <button class="btn-icon btn-del" title="Eliminar" onclick="abrirEliminar(${a.id_tipo},'${esc(a.nombre)}')">
            <iconify-icon icon="lucide:trash-2"></iconify-icon>
          </button>
        </div>
      </td>
    </tr>`).join("");
}

// ─── Modal Crear / Editar ─────────────────────────────────────────────────────
function abrirModal() {
  editandoId = null;
  document.getElementById("modalTitulo").textContent = "Nueva actividad";
  document.getElementById("fNombre").value = "";
  document.getElementById("fDescripcion").value = "";
  document.getElementById("modalError").style.display = "none";
  document.getElementById("btnGuardar").disabled = false;
  document.getElementById("modalActividad").classList.add("visible");
  document.getElementById("fNombre").focus();
}

function abrirEditar(id) {
  const a = todasActividades.find((x) => x.id_tipo === id);
  if (!a) return;
  editandoId = id;
  document.getElementById("modalTitulo").textContent = "Editar actividad";
  document.getElementById("fNombre").value = a.nombre;
  document.getElementById("fDescripcion").value = a.descripcion || "";
  document.getElementById("modalError").style.display = "none";
  document.getElementById("btnGuardar").disabled = false;
  document.getElementById("modalActividad").classList.add("visible");
  document.getElementById("fNombre").focus();
}

function cerrarModal() {
  document.getElementById("modalActividad").classList.remove("visible");
}

async function guardar() {
  const nombre = document.getElementById("fNombre").value.trim();
  const descripcion = document.getElementById("fDescripcion").value.trim();
  const errEl = document.getElementById("modalError");

  if (!nombre) {
    errEl.textContent = "El nombre es obligatorio.";
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("btnGuardar");
  btn.disabled = true;

  try {
    const url = editandoId
      ? `${API_URL}/api/tipo-actividades/${editandoId}`
      : `${API_URL}/api/tipo-actividades`;
    const method = editandoId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ nombre, descripcion: descripcion || null }),
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || "Error al guardar.";
      errEl.style.display = "block";
      btn.disabled = false;
      return;
    }

    toast(editandoId ? "Actividad actualizada" : "Actividad registrada");
    cerrarModal();
    await cargar();
  } catch {
    errEl.textContent = "Error de conexión.";
    errEl.style.display = "block";
    btn.disabled = false;
  }
}

// ─── Modal Eliminar ───────────────────────────────────────────────────────────
function abrirEliminar(id, nombre) {
  document.getElementById("nombreEliminar").textContent = nombre;
  document.getElementById("eliminarError").style.display = "none";
  document.getElementById("modalEliminar").classList.add("visible");
  document.getElementById("btnConfirmarEliminar").onclick = () => confirmarEliminar(id);
}

function cerrarModalEliminar() {
  document.getElementById("modalEliminar").classList.remove("visible");
}

async function confirmarEliminar(id) {
  const errEl = document.getElementById("eliminarError");
  try {
    const res = await fetch(`${API_URL}/api/tipo-actividades/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tk()}` },
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || "Error al eliminar.";
      errEl.style.display = "block";
      return;
    }
    toast("Actividad eliminada");
    cerrarModalEliminar();
    await cargar();
  } catch {
    errEl.textContent = "Error de conexión.";
    errEl.style.display = "block";
  }
}

// ─── CSV: Exportar ────────────────────────────────────────────────────────────
function exportarCSV() {
  if (!todasActividades.length) { toast("No hay actividades para exportar.", "error"); return; }
  const cols = ["nombre", "descripcion"];
  exportarXLSX(cols, cols, todasActividades, "actividades_RCA");
  toast("Exportado correctamente");
}

// ─── CSV: Modal Importar ──────────────────────────────────────────────────────
function abrirModalCSV() {
  csvData = [];
  document.getElementById("csvPreview").innerHTML = "";
  document.getElementById("btnImportar").disabled = true;
  document.getElementById("inputCSV").value = "";
  document.getElementById("modalImport").classList.add("visible");
}

function cerrarModalCSV() {
  document.getElementById("modalImport").classList.remove("visible");
}

function soltarCSV(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) procesarCSV(file);
}

function leerCSV(e) {
  const file = e.target.files[0];
  if (file) procesarCSV(file);
}

function procesarCSV(file) {
  leerArchivo(file, (headers, rows) => {
    if (!rows.length) {
      document.getElementById("csvPreview").innerHTML =
        "<p style='color:var(--danger);font-size:.85rem;margin-top:8px'>Archivo vacío o sin datos.</p>";
      return;
    }
    csvData = rows;
    const muestra = rows.slice(0, 5);
    const cols = ["nombre", "descripcion"];
    document.getElementById("csvPreview").innerHTML = `
      <p style="font-size:.8rem;color:var(--text-muted);margin:10px 0 4px">
        ${rows.length} registro(s) detectados — vista previa (primeros 5):
      </p>
      <div class="csv-preview"><table>
        <thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
        <tbody>${muestra.map((r) =>
          `<tr>${cols.map((c) => `<td>${r[c] ?? "—"}</td>`).join("")}</tr>`
        ).join("")}</tbody>
      </table></div>`;
    document.getElementById("btnImportar").disabled = false;
  });
}

async function importarCSV() {
  if (!csvData.length) return;
  const btn = document.getElementById("btnImportar");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Importando…`;

  try {
    const res = await fetch(`${API_URL}/api/tipo-actividades/csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ actividades: csvData }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al importar");

    const partes = [`${data.insertadas} actividad(es) importadas`];
    if (data.actualizadas) partes.push(`${data.actualizadas} actualizada(s)`);
    if (data.errores?.length) partes.push(`${data.errores.length} error(es)`);
    toast(partes.join(" · "), data.errores?.length ? "info" : "success");
    if (data.errores?.length) console.table(data.errores);

    cerrarModalCSV();
    await cargar();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:upload"></iconify-icon> Importar`;
  }
}

function descargarEjemplo() {
  const BOM = "\uFEFF";
  const contenido = BOM + "nombre,descripcion\n";
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ejemplo_actividades.csv";
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("click", (e) => {
  if (e.target.id === "modalImport") cerrarModalCSV();
  if (e.target.id === "modalActividad") cerrarModal();
  if (e.target.id === "modalEliminar") cerrarModalEliminar();
});

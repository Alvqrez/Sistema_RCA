// frontend/js/materias.js — CORREGIDO v2
const BASE_URL = "http://localhost:3000";

soloPermitido("administrador");

let materiaEditando = null; // null = modo registro, string = clave en edición

const form = document.getElementById("formMateria");
const tabla = document.getElementById("tablaMaterias");

// ── Helpers modal ──────────────────────────────────────────────────────

function abrirModalMateria() {
  document.getElementById("modalMateria").classList.add("visible");
}

function cerrarModalMateria() {
  document.getElementById("modalMateria").classList.remove("visible");
  // BUG 1 FIX: limpiar estado al cerrar para que "Nueva materia" no quede
  // contaminado con el estado de la última edición que pudo haber fallado
  cancelarEdicion();
}

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
      cerrarModalMateria();      // ya llama cancelarEdicion() internamente
      await cargarMaterias();   // BUG 2 FIX: recargar tabla después de guardar
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

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // BUG 1 FIX: asignar materiaEditando SOLO después de que el fetch tuvo éxito
    materiaEditando = clave;

    document.getElementById("claveMateria").value = data.clave_materia;
    document.getElementById("claveMateria").disabled = true;
    document.getElementById("nombreMateria").value = data.nombre_materia;
    document.getElementById("creditos").value = data.creditos_totales;
    document.getElementById("horasTeoricas").value = data.horas_teoricas;
    document.getElementById("horasPracticas").value = data.horas_practicas;
    document.getElementById("noUnidades").value = data.no_unidades;

    document.getElementById("tituloFormMateria").textContent = "Editar materia";
    // BUG 1 FIX: selector correcto — era ".btn-guardar" (no existe), ahora "[type='submit']"
    const btnSubmit = document.querySelector("#formMateria [type='submit']");
    if (btnSubmit) btnSubmit.textContent = "Actualizar";

    abrirModalMateria();
  } catch {
    alert("Error al cargar datos de la materia. Intenta de nuevo.");
    // BUG 1 FIX: asegurarse de NO dejar materiaEditando contaminado
    materiaEditando = null;
  }
}

// ─── CANCELAR EDICIÓN ──────────────────────────────────────────────────────

function cancelarEdicion() {
  materiaEditando = null;
  form.reset();
  document.getElementById("claveMateria").disabled = false;
  document.getElementById("tituloFormMateria").textContent =
    "Registrar materia";
  // BUG 1 FIX: selector corregido
  const btnSubmit = document.querySelector("#formMateria [type='submit']");
  if (btnSubmit) btnSubmit.textContent = "Guardar";
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

// ── Estado CSV ────────────────────────────────────────────────────────────────
let csvMateriasData = [];
let materiasGlobal = [];

// ── Abrir / cerrar modal ──────────────────────────────────────────────────────
function abrirModalCSVMaterias() {
  csvMateriasData = [];
  document.getElementById("csvMateriasPreview").innerHTML = "";
  document.getElementById("btnImportarMaterias").disabled = true;
  document.getElementById("inputCSVMaterias").value = "";
  document.getElementById("modalImportMaterias").classList.add("visible");
}
function cerrarModalCSVMaterias() {
  document.getElementById("modalImportMaterias").classList.remove("visible");
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
function dragOverMaterias(e) {
  e.preventDefault();
  document.getElementById("dropZoneMaterias").classList.add("drag-over");
}
function soltarCSVMaterias(e) {
  e.preventDefault();
  document.getElementById("dropZoneMaterias").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) procesarCSVMaterias(file);
}
function leerCSVMaterias(e) {
  const file = e.target.files[0];
  if (file) procesarCSVMaterias(file);
}

// ── Parsear archivo ───────────────────────────────────────────────────────────
function procesarCSVMaterias(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      document.getElementById("csvMateriasPreview").innerHTML =
        "<p style='color:var(--danger);font-size:0.85rem;margin-top:8px'>Archivo vacío o sin datos.</p>";
      return;
    }
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    csvMateriasData = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] ?? "";
      });
      return obj;
    });
    mostrarPreviewCSVMaterias(headers, csvMateriasData);
    document.getElementById("btnImportarMaterias").disabled =
      csvMateriasData.length === 0;
  };
  reader.readAsText(file);
}

function mostrarPreviewCSVMaterias(headers, data) {
  const muestra = data.slice(0, 5);
  const preview = document.getElementById("csvMateriasPreview");
  if (!data.length) {
    preview.innerHTML =
      "<p style='color:var(--danger);font-size:0.85rem;margin-top:8px'>Sin datos válidos.</p>";
    return;
  }
  preview.innerHTML = `
    <p style="font-size:0.8rem;color:var(--text-muted);margin:10px 0 4px">
      ${data.length} registros detectados — vista previa (primeros 5):
    </p>
    <div class="csv-preview">
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${muestra
          .map(
            (r) =>
              `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody>
      </table>
    </div>`;
}

// ── Enviar al backend ─────────────────────────────────────────────────────────
async function importarCSVMaterias() {
  if (!csvMateriasData.length) return;

  const token =
    localStorage.getItem("token") || localStorage.getItem("authToken");
  const btn = document.getElementById("btnImportarMaterias");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Importando…`;

  try {
    const r = await fetch(`${BASE_URL}/api/materias/csv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ materias: csvMateriasData }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error al importar");

    if (typeof toast === "function") {
      toast(`${data.insertados} materia(s) importadas correctamente`);
      if (data.errores?.length)
        toast(`${data.errores.length} fila(s) con errores — consola`, "info");
    } else {
      alert(`${data.insertados} materia(s) importadas correctamente.`);
    }

    if (data.errores?.length) console.table(data.errores);
    cerrarModalCSVMaterias();
    cargarMaterias();
  } catch (err) {
    if (typeof toast === "function") toast(err.message, "error");
    else alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:upload"></iconify-icon> Importar`;
  }
}

// ── Exportar CSV ──────────────────────────────────────────────────────────────
async function exportarCSVMaterias() {
  const token =
    localStorage.getItem("token") || localStorage.getItem("authToken");
  try {
    const r = await fetch(`${BASE_URL}/api/materias`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const materias = await r.json();
    if (!materias.length) {
      alert("No hay materias para exportar.");
      return;
    }

    const cols = [
      "clave_materia",
      "nombre_materia",
      "creditos_totales",
      "horas_teoricas",
      "horas_practicas",
      "no_unidades",
    ];
    const rows = [cols.join(",")];
    materias.forEach((m) => {
      rows.push(
        cols
          .map((c) => `"${(m[c] ?? "").toString().replace(/"/g, '""')}"`)
          .join(","),
      );
    });

    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "materias_RCA.csv";
    a.click();
    URL.revokeObjectURL(url);
    if (typeof toast === "function") toast("CSV exportado correctamente");
  } catch {
    alert("Error al exportar materias.");
  }
}

// ── Cerrar al hacer clic fuera ────────────────────────────────────────────────
document.addEventListener("click", (e) => {
  if (e.target.id === "modalImportMaterias") cerrarModalCSVMaterias();
});

cargarMaterias();

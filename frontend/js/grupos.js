// frontend/js/grupos.js
const BASE_URL = "http://localhost:3000";

soloPermitido("administrador");

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    cargarMateriasSelect(),
    cargarMaestrosSelect(),
    cargarPeriodosSelect(), // FIX 12
  ]);
  cargarGrupos();
});

// FIX 12: Cargar periodos desde la API
async function cargarPeriodosSelect() {
  const token = localStorage.getItem("token");
  const sel = document.getElementById("idPeriodo");
  if (!sel) return;
  try {
    const res = await fetch(`${BASE_URL}/api/periodos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const periodos = await res.json();
    sel.innerHTML = `<option value="">-- Selecciona un periodo --</option>`;
    periodos.forEach((p) => {
      sel.innerHTML += `<option value="${p.id_periodo}">${p.descripcion} (${p.anio})</option>`;
    });
  } catch (e) {
    console.error("No se pudo cargar periodos:", e);
  }
}

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
  const tabla = document.getElementById("tablaGrupos");
  const rol = localStorage.getItem("rol");

  // BUG FIX: envolver en try/catch para manejar errores de red
  let grupos;
  try {
    const response = await fetch(`${BASE_URL}/api/grupos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401 || response.status === 403) {
      window.location.href = "login.html";
      return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    grupos = await response.json();
  } catch (err) {
    if (tabla) tabla.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--danger,#ef4444)">
      <iconify-icon icon="lucide:wifi-off" style="font-size:1.4rem;display:block;margin:0 auto 8px"></iconify-icon>
      Error al cargar grupos. Verifica la conexión con el servidor.
    </td></tr>`;
    return;
  }

  tabla.innerHTML = "";

  if (!grupos || grupos.length === 0) {
    tabla.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8">No hay grupos registrados</td></tr>`;
    return;
  }

  grupos.forEach((g) => {
    // FIX 7: mostrar descripcion_periodo en lugar del id crudo
    const periodoLabel = g.descripcion_periodo
      ? `${g.descripcion_periodo} ${g.anio || ""}`
      : `Periodo ${g.id_periodo}`;

    tabla.innerHTML += `
      <tr>
        <td>${g.id_grupo}</td>
        <td><strong>${g.nombre_materia}</strong><br><span style="font-size:0.75rem;color:#94a3b8">${g.clave_materia}</span></td>
        <td>${g.nombre_maestro}</td>
        <td style="font-size:0.82rem">${periodoLabel}</td>
        <td>${g.aula ?? "—"}</td>
        <td>${g.horario ?? "—"}</td>
        <td><span class="badge ${g.estatus === "Activo" ? "badge-verde" : "badge-gris"}">${g.estatus}</span></td>
        <td>
          ${
            rol === "administrador"
              ? `<button class="btn-eliminar" onclick="eliminarGrupo(${g.id_grupo})">Eliminar</button>`
              : "—"
          }
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

    if (!grupo.clave_materia || !grupo.numero_empleado || !grupo.id_periodo) {
      toastGrupo("Selecciona materia, maestro y periodo.", "error");
      return;
    }

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
      toastGrupo(`Grupo creado correctamente (ID: ${data.id_grupo})`);
      this.reset();
      cargarGrupos();
    } else {
      toastGrupo(data.error || "Error al crear grupo", "error");
    }
  });

async function eliminarGrupo(id) {
  if (
    !confirm(
      "¿Eliminar este grupo? Se perderán las inscripciones y actividades asociadas.",
    )
  )
    return;
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/api/grupos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.success) {
    toastGrupo("Grupo eliminado");
    cargarGrupos();
  } else {
    toastGrupo(data.error || "Error al eliminar", "error");
  }
}

// ── Estado CSV ────────────────────────────────────────────────────────────────
let csvGruposData = [];

// ── Toast (si grupos.js no tiene uno propio) ──────────────────────────────────
function toastGrupo(msg, tipo = "success") {
  // Reutiliza el contenedor global del proyecto
  const c = document.getElementById("toast-container");
  if (!c) {
    alert(msg);
    return;
  }
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

// ── Abrir / cerrar modal ───────────────────────────────────────────────────────
function abrirModalCSVGrupos() {
  csvGruposData = [];
  document.getElementById("csvGruposPreview").innerHTML = "";
  document.getElementById("btnImportarGrupos").disabled = true;
  document.getElementById("inputCSVGrupos").value = "";
  document.getElementById("modalImportGrupos").classList.add("visible");
}
function cerrarModalCSVGrupos() {
  document.getElementById("modalImportGrupos").classList.remove("visible");
}

// ── Leer archivo ──────────────────────────────────────────────────────────────
function leerCSVGrupos(e) {
  const file = e.target.files[0];
  if (file) procesarCSVGrupos(file);
}

function soltarCSVGrupos(e) {
  e.preventDefault();
  document.getElementById("dropZoneGrupos").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) procesarCSVGrupos(file);
}

function dragOverGrupos(e) {
  e.preventDefault();
  document.getElementById("dropZoneGrupos").classList.add("drag-over");
}

function procesarCSVGrupos(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      document.getElementById("csvGruposPreview").innerHTML =
        "<p style='color:var(--danger);font-size:0.85rem;margin-top:8px'>El archivo está vacío o solo tiene encabezado.</p>";
      return;
    }
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    csvGruposData = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] ?? "";
      });
      return obj;
    });
    mostrarPreviewCSVGrupos(headers, csvGruposData);
    document.getElementById("btnImportarGrupos").disabled =
      csvGruposData.length === 0;
  };
  reader.readAsText(file);
}

function mostrarPreviewCSVGrupos(headers, data) {
  const muestra = data.slice(0, 5);
  const preview = document.getElementById("csvGruposPreview");
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
        <tbody>${muestra.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>`;
}

// ── Enviar al backend ─────────────────────────────────────────────────────────
async function importarCSVGrupos() {
  if (!csvGruposData.length) return;
  const token = localStorage.getItem("token");
  const btn = document.getElementById("btnImportarGrupos");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Importando…`;

  try {
    const r = await fetch(`${BASE_URL}/api/grupos/csv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ grupos: csvGruposData }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error al importar");

    toastGrupo(`${data.insertados} grupo(s) importados correctamente`);
    if (data.errores?.length) {
      toastGrupo(
        `${data.errores.length} fila(s) con errores — revisa la consola`,
        "info",
      );
      console.table(data.errores);
    }
    cerrarModalCSVGrupos();
    cargarGrupos();
  } catch (err) {
    toastGrupo(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:upload"></iconify-icon> Importar`;
  }
}

// ── Exportar CSV ──────────────────────────────────────────────────────────────
async function exportarCSVGrupos() {
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${BASE_URL}/api/grupos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const grupos = await r.json();
    if (!grupos.length) {
      toastGrupo("No hay grupos para exportar", "info");
      return;
    }

    const cols = [
      "id_grupo",
      "clave_materia",
      "nombre_materia",
      "numero_empleado",
      "nombre_maestro",
      "id_periodo",
      "limite_alumnos",
      "horario",
      "aula",
      "estatus",
    ];
    const rows = [cols.join(",")];
    grupos.forEach((g) => {
      rows.push(
        cols
          .map((c) => `"${(g[c] ?? "").toString().replace(/"/g, '""')}"`)
          .join(","),
      );
    });

    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grupos_RCA.csv";
    a.click();
    URL.revokeObjectURL(url);
    toastGrupo("CSV exportado correctamente");
  } catch {
    toastGrupo("Error al exportar", "error");
  }
}

// ── Cerrar modal al hacer clic fuera ──────────────────────────────────────────
document.addEventListener("click", (e) => {
  if (e.target.id === "modalImportGrupos") cerrarModalCSVGrupos();
});

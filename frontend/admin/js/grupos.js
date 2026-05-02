// frontend/js/grupos.js

soloPermitido("administrador");

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    cargarMateriasSelect(),
    cargarMaestrosSelect(),
    cargarPeriodosSelect(),
  ]);
  cargarGrupos();
});

// ─── Cargar selects del modal ─────────────────────────────────────────────────
async function cargarPeriodosSelect() {
  const token = localStorage.getItem("token");
  const sel = document.getElementById("idPeriodo");
  if (!sel) return;
  try {
    const res = await fetch(`${API_URL}/api/periodos`, {
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
  const res = await fetch(`${API_URL}/api/materias`, {
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
  const res = await fetch(`${API_URL}/api/maestros`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const maestros = await res.json();
  sel.innerHTML = `<option value="">-- Selecciona un maestro --</option>`;
  maestros.forEach((m) => {
    sel.innerHTML += `<option value="${m.rfc}">${m.nombre} ${m.apellido_paterno}</option>`;
  });
}

// ─── Modal Nuevo Grupo ────────────────────────────────────────────────────────
function abrirModalNuevoGrupo() {
  // Limpiar formulario
  document.getElementById("claveMateria").value = "";
  document.getElementById("numeroEmpleado").value = "";
  document.getElementById("idPeriodo").value = "";
  document.getElementById("limiteAlumnos").value = "30";
  document.getElementById("aula").value = "";
  document.getElementById("horaInicio").value = "";
  document.getElementById("horaFin").value = "";
  // Deseleccionar todos los dias
  document.querySelectorAll("#diasGrid .dia-chip").forEach((chip) => {
    chip.classList.remove("checked");
    chip.querySelector("input[type='checkbox']").checked = false;
  });
  actualizarHorarioPreview();
  document.getElementById("conflictBanner").classList.remove("visible");
  document.getElementById("modalNuevoGrupo").classList.add("active");
}

function cerrarModalGrupo() {
  document.getElementById("modalNuevoGrupo").classList.remove("active");
}

function modalClickFuera(e) {
  if (e.target.id === "modalNuevoGrupo") cerrarModalGrupo();
}

// ─── Horario estructurado ─────────────────────────────────────────────────────
function toggleDia(chip) {
  // Necesario porque el click del label ya hace toggle del checkbox
  setTimeout(() => {
    const cb = chip.querySelector("input[type='checkbox']");
    chip.classList.toggle("checked", cb.checked);
    actualizarHorarioPreview();
  }, 0);
}

function getDiasSeleccionados() {
  return [
    ...document.querySelectorAll("#diasGrid input[type='checkbox']:checked"),
  ].map((cb) => cb.value);
}

function obtenerHorario() {
  const dias = getDiasSeleccionados();
  const inicio = document.getElementById("horaInicio").value;
  const fin = document.getElementById("horaFin").value;
  if (!dias.length || !inicio || !fin) return null;
  return `${dias.join("-")} ${inicio}-${fin}`;
}

function actualizarHorarioPreview() {
  const h = obtenerHorario();
  const el = document.getElementById("horarioPreview");
  if (h) {
    el.innerHTML = `<iconify-icon icon="lucide:clock" style="vertical-align:middle;margin-right:4px"></iconify-icon><strong>${h}</strong>`;
  } else {
    el.innerHTML = `<span style="color:var(--text-muted)">Selecciona dias y horas para ver el horario</span>`;
  }
}

// ─── Guardar grupo con validación de conflicto ────────────────────────────────
async function guardarNuevoGrupo() {
  const token = localStorage.getItem("token");

  const grupo = {
    clave_materia: document.getElementById("claveMateria").value,
    rfc: document.getElementById("numeroEmpleado").value,
    id_periodo: document.getElementById("idPeriodo").value,
    limite_alumnos: document.getElementById("limiteAlumnos").value || 30,
    horario: obtenerHorario() || null,
    aula: document.getElementById("aula").value.trim() || null,
  };

  if (!grupo.clave_materia || !grupo.rfc || !grupo.id_periodo) {
    toastGrupo("Selecciona materia, maestro y periodo.", "error");
    return;
  }

  // Validar que la materia tenga unidades configuradas
  try {
    const resU = await fetch(
      `${API_URL}/api/unidades/materia/${encodeURIComponent(grupo.clave_materia)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const unidades = resU.ok ? await resU.json() : [];
    if (!unidades.length) {
      toastGrupo(
        "Esta materia no tiene unidades configuradas. El administrador debe registrarlas primero.",
        "error",
      );
      return;
    }
  } catch (_) {}

  // Ocultar banner antes de enviar
  document.getElementById("conflictBanner").classList.remove("visible");

  const res = await fetch(`${API_URL}/api/grupos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(grupo),
  });
  const data = await res.json();

  if (res.status === 409 && data.conflict) {
    // Conflicto de aula/horario — mostrar banner dentro del modal
    document.getElementById("conflictMsg").textContent = data.error;
    document.getElementById("conflictBanner").classList.add("visible");
    document
      .getElementById("conflictBanner")
      .scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  if (data.success) {
    toastGrupo(`Grupo creado correctamente (ID: ${data.id_grupo})`);
    cerrarModalGrupo();
    cargarGrupos();
  } else {
    toastGrupo(data.error || "Error al crear grupo", "error");
  }
}

// ─── Cargar y filtrar lista ───────────────────────────────────────────────────
async function cargarGrupos() {
  const token = localStorage.getItem("token");
  const tabla = document.getElementById("tablaGrupos");
  let grupos;
  try {
    const response = await fetch(`${API_URL}/api/grupos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401 || response.status === 403) {
      window.location.href = "../../shared/pages/login.html";
      return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    grupos = await response.json();
  } catch (err) {
    if (tabla)
      tabla.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--danger,#ef4444)">Error al cargar grupos.</td></tr>`;
    return;
  }
  todosGrupos = grupos;
  filtrarGrupos();
}

let todosGrupos = [];

function filtrarGrupos() {
  const texto = (
    document.getElementById("filtroTexto")?.value || ""
  ).toLowerCase();
  const estatus = document.getElementById("filtroEstatus")?.value || "";
  const tabla = document.getElementById("tablaGrupos");
  if (!tabla) return;

  const filtrados = todosGrupos.filter((g) => {
    const matchText =
      !texto ||
      (g.nombre_materia || "").toLowerCase().includes(texto) ||
      (g.nombre_maestro || "").toLowerCase().includes(texto) ||
      (g.aula || "").toLowerCase().includes(texto) ||
      (g.clave_materia || "").toLowerCase().includes(texto);
    const matchEst = !estatus || g.estatus === estatus;
    return matchText && matchEst;
  });

  const badge = document.getElementById("badgeTotal");
  if (badge)
    badge.textContent =
      filtrados.length === todosGrupos.length
        ? `${todosGrupos.length} grupos`
        : `${filtrados.length} / ${todosGrupos.length}`;

  tabla.innerHTML = "";

  if (!filtrados.length) {
    tabla.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">
      <iconify-icon icon="lucide:search-x" style="font-size:2rem;display:block;margin:0 auto 8px;opacity:.4"></iconify-icon>Sin resultados</td></tr>`;
    return;
  }

  filtrados.forEach((g) => {
    const periodoLabel = g.descripcion_periodo
      ? `${g.descripcion_periodo} ${g.anio || ""}`
      : `Periodo ${g.id_periodo}`;
    const badgeEst =
      g.estatus === "Activo"
        ? "badge-success"
        : g.estatus === "Cerrado"
          ? "badge-warning"
          : g.estatus === "Cancelado"
            ? "badge-danger"
            : "badge-info";
    tabla.innerHTML += `<tr>
      <td style="font-size:.78rem;color:var(--text-muted);font-weight:600">#${g.id_grupo}</td>
      <td><div style="font-weight:600;font-size:.88rem">${g.nombre_materia}</div><div style="font-size:.73rem;color:var(--text-muted)">${g.clave_materia}</div></td>
      <td style="font-size:.85rem">${g.nombre_maestro}</td>
      <td style="font-size:.8rem;color:var(--text-muted)">${periodoLabel}</td>
      <td style="text-align:center;font-size:.85rem">${g.limite_alumnos ?? "—"}</td>
      <td style="font-size:.82rem">${g.aula ?? "—"}</td>
      <td style="font-size:.78rem;color:var(--text-muted)">${g.horario ?? "—"}</td>
      <td><span class="badge ${badgeEst}">${g.estatus ?? "—"}</span></td>
      <td style="text-align:right">
        <div class="table-actions">
          <button class="btn-icon btn-del" onclick="eliminarGrupo(${g.id_grupo})" title="Eliminar grupo">
            <iconify-icon icon="lucide:trash-2"></iconify-icon>
          </button>
        </div>
      </td>
    </tr>`;
  });
}

async function eliminarGrupo(id) {
  if (
    !confirm(
      "Eliminar este grupo? Se perderan las inscripciones y actividades asociadas.",
    )
  )
    return;
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/api/grupos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.success) {
    toastGrupo("Grupo eliminado");
    cargarGrupos();
  } else toastGrupo(data.error || "Error al eliminar", "error");
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function toastGrupo(msg, tipo = "success") {
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

// ─── CSV Import/Export ────────────────────────────────────────────────────────
let csvGruposData = [];

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
        "<p style='color:var(--danger)'>El archivo esta vacio o solo tiene encabezado.</p>";
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
    preview.innerHTML = "<p style='color:var(--danger)'>Sin datos validos.</p>";
    return;
  }
  preview.innerHTML = `<p style="font-size:.8rem;color:var(--text-muted);margin:10px 0 4px">${data.length} registros detectados:</p>
    <div class="csv-preview"><table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${muestra.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
}

async function importarCSVGrupos() {
  if (!csvGruposData.length) return;
  const token = localStorage.getItem("token");
  const btn = document.getElementById("btnImportarGrupos");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Importando...`;
  try {
    const r = await fetch(`${API_URL}/api/grupos/csv`, {
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
    if (data.errores?.length)
      toastGrupo(`${data.errores.length} fila(s) con errores`, "info");
    cerrarModalCSVGrupos();
    cargarGrupos();
  } catch (err) {
    toastGrupo(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:upload"></iconify-icon> Importar`;
  }
}

async function exportarCSVGrupos() {
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${API_URL}/api/grupos`, {
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
      "rfc",
      "nombre_maestro",
      "id_periodo",
      "limite_alumnos",
      "horario",
      "aula",
      "estatus",
    ];
    const rows = [cols.join(",")];
    grupos.forEach((g) =>
      rows.push(
        cols
          .map((c) => `"${(g[c] ?? "").toString().replace(/"/g, '""')}"`)
          .join(","),
      ),
    );
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

document.addEventListener("click", (e) => {
  if (e.target.id === "modalImportGrupos") cerrarModalCSVGrupos();
});

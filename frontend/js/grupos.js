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
    if (tabla)
      tabla.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--danger,#ef4444)">
      <iconify-icon icon="lucide:wifi-off" style="font-size:1.4rem;display:block;margin:0 auto 8px"></iconify-icon>
      Error al cargar grupos. Verifica la conexión con el servidor.
    </td></tr>`;
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
  const rol = localStorage.getItem("rol");
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

  // Badge de total
  const badge = document.getElementById("badgeTotal");
  if (badge)
    badge.textContent =
      filtrados.length === todosGrupos.length
        ? `${todosGrupos.length} grupos`
        : `${filtrados.length} / ${todosGrupos.length}`;

  tabla.innerHTML = "";

  if (!filtrados.length) {
    tabla.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">
      <iconify-icon icon="lucide:search-x" style="font-size:2rem;display:block;margin:0 auto 8px;opacity:.4"></iconify-icon>
      Sin resultados
    </td></tr>`;
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
      <td style="font-size:0.78rem;color:var(--text-muted);font-weight:600">#${g.id_grupo}</td>
      <td>
        <div style="font-weight:600;font-size:0.88rem">${g.nombre_materia}</div>
        <div style="font-size:0.73rem;color:var(--text-muted)">${g.clave_materia}</div>
      </td>
      <td style="font-size:0.85rem">${g.nombre_maestro}</td>
      <td style="font-size:0.8rem;color:var(--text-muted)">${periodoLabel}</td>
      <td style="text-align:center;font-size:0.85rem">${g.limite_alumnos ?? "—"}</td>
      <td style="font-size:0.82rem">${g.aula ?? "—"}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${g.horario ?? "—"}</td>
      <td><span class="badge ${badgeEst}">${g.estatus ?? "—"}</span></td>
      <td style="text-align:right">
        <div class="table-actions">
          ${
            rol === "administrador"
              ? `<button class="btn-icon btn-del" onclick="eliminarGrupo(${g.id_grupo})" title="Eliminar grupo">
                 <iconify-icon icon="lucide:trash-2"></iconify-icon>
               </button>`
              : "—"
          }
        </div>
      </td>
    </tr>`;
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

    // Verificar que la materia tenga unidades configuradas
    try {
      const resU = await fetch(`${BASE_URL}/api/unidades/materia/${encodeURIComponent(grupo.clave_materia)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const unidades = resU.ok ? await resU.json() : [];
      if (!unidades.length) {
        toastGrupo("Esta materia no tiene unidades configuradas. El administrador debe registrarlas primero.", "error");
        return;
      }
    } catch (_) {}

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

let csvGruposData = [];

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

document.addEventListener("click", (e) => {
  if (e.target.id === "modalImportGrupos") cerrarModalCSVGrupos();
});

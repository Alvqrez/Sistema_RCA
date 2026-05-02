const BASE_URL = "http://localhost:3000";

soloPermitido("administrador");

let materiaEditando = null;
let carrerasDisponibles = []; // catálogo completo de carreras
let carrerasPendientes = []; // carreras a vincular al guardar (nuevas)
let carrerasEliminar = []; // carreras a desvincular al guardar

const form = document.getElementById("formMateria");
const tabla = document.getElementById("tablaMaterias");

// ── Inicialización ────────────────────────────────────────────────────────
(async () => {
  await cargarCarrerasCatalogo();
  await cargarMaterias();
})();

async function cargarCarrerasCatalogo() {
  const token = localStorage.getItem("token");
  try {
    const r = await fetch(`${BASE_URL}/api/carreras`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    carrerasDisponibles = await r.json();
    const sel = document.getElementById("selCarrera");
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selecciona --</option>';
    carrerasDisponibles.forEach((c) => {
      sel.innerHTML += `<option value="${c.id_carrera}">${c.nombre_carrera} (${c.id_carrera})</option>`;
    });
  } catch {}
}

// ── Tabla de materias ──────────────────────────────────────────────────────
function abrirModalMateria() {
  document.getElementById("modalMateria").classList.add("visible");
}

function cerrarModalMateria() {
  document.getElementById("modalMateria").classList.remove("visible");
  cancelarEdicion();
}

async function cargarMaterias() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${BASE_URL}/api/materias`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401 || response.status === 403) {
    window.location.href = "../../shared/pages/login.html";
    return;
  }
  const materias = await response.json();
  tabla.innerHTML = "";
  if (!materias.length) {
    tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">Sin materias registradas</td></tr>`;
    return;
  }
  const rol = localStorage.getItem("rol");
  materias.forEach((m) => {
    const carrerasBadges =
      (m.carreras || [])
        .map(
          (c) =>
            `<span class="badge-unidad" title="Semestre ${c.semestre || "?"}" style="font-size:.7rem">${c.id_carrera}</span>`,
        )
        .join(" ") ||
      '<span style="color:var(--text-muted);font-size:.8rem">—</span>';

    tabla.innerHTML += `
      <tr>
        <td>${m.clave_materia}</td>
        <td>${m.nombre_materia}</td>
        <td>${carrerasBadges}</td>
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
      </tr>`;
  });
}

// ── Chips de carreras en el modal ─────────────────────────────────────────
// carrerasActuales = array de {id_carrera, nombre_carrera, semestre} ya vinculadas
let carrerasActuales = [];

function renderChips() {
  const wrap = document.getElementById("carrerasChips");
  if (!wrap) return;
  const todas = [...carrerasActuales, ...carrerasPendientes];
  if (!todas.length) {
    wrap.innerHTML = `<span style="font-size:.78rem;color:var(--text-muted)">Sin carreras vinculadas</span>`;
    return;
  }
  wrap.innerHTML = todas
    .map(
      (c) => `
    <span style="display:inline-flex;align-items:center;gap:5px;background:var(--primary-light,rgba(37,99,235,.1));
                 color:var(--primary);border:1px solid var(--primary);border-radius:99px;
                 padding:2px 10px;font-size:.78rem;font-weight:600">
      ${c.id_carrera} · Sem ${c.semestre || 1}
      <button type="button" onclick="quitarCarrera('${c.id_carrera}')"
        style="background:none;border:none;cursor:pointer;color:var(--primary);font-size:.85rem;padding:0;line-height:1">✕</button>
    </span>
  `,
    )
    .join("");
}

function agregarCarreraLocal() {
  const sel = document.getElementById("selCarrera");
  const semInput = document.getElementById("selSemestre");
  const id = sel.value;
  if (!id) {
    mostrarMensaje("Selecciona una carrera primero", "error");
    return;
  }

  const yaEsta = [...carrerasActuales, ...carrerasPendientes].some(
    (c) => c.id_carrera === id,
  );
  if (yaEsta) {
    mostrarMensaje("Esa carrera ya está vinculada", "error");
    return;
  }

  const carrera = carrerasDisponibles.find((c) => c.id_carrera === id);
  const semestre = parseInt(semInput.value) || 1;

  // Si estaba en la lista de eliminar, la quitamos de ahí
  carrerasEliminar = carrerasEliminar.filter((x) => x !== id);
  carrerasPendientes.push({
    id_carrera: id,
    nombre_carrera: carrera?.nombre_carrera || id,
    semestre,
  });

  sel.value = "";
  semInput.value = "1";
  renderChips();
}

function quitarCarrera(id_carrera) {
  const eraActual = carrerasActuales.some((c) => c.id_carrera === id_carrera);
  if (eraActual) carrerasEliminar.push(id_carrera);
  carrerasActuales = carrerasActuales.filter(
    (c) => c.id_carrera !== id_carrera,
  );
  carrerasPendientes = carrerasPendientes.filter(
    (c) => c.id_carrera !== id_carrera,
  );
  renderChips();
}

// ── Guardar materia + carreras ─────────────────────────────────────────────
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
    delete materia.clave_materia;
  } else {
    if (!materia.clave_materia) {
      mostrarMensaje("La clave es requerida.", "error");
      return;
    }
  }

  try {
    const r = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(materia),
    });
    const data = await r.json();
    if (!data.success) {
      mostrarMensaje(data.error || "Error al guardar.", "error");
      return;
    }

    const clave = materiaEditando || materia.clave_materia;

    // Guardar vínculos de carreras en retícula
    for (const c of carrerasEliminar) {
      await fetch(`${BASE_URL}/api/materias/${clave}/carreras/${c}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    for (const c of carrerasPendientes) {
      await fetch(`${BASE_URL}/api/materias/${clave}/carreras`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_carrera: c.id_carrera,
          semestre: c.semestre,
          creditos: 0,
        }),
      });
    }

    mostrarMensaje(data.mensaje || "Guardado correctamente.", "ok");
    cerrarModalMateria();
    await cargarMaterias();
  } catch {
    mostrarMensaje("Error de conexión con el servidor.", "error");
  }
});

// ── Editar materia ─────────────────────────────────────────────────────────
async function editarMateria(clave) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${BASE_URL}/api/materias/${clave}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    const data = await res.json();

    materiaEditando = clave;
    carrerasActuales = data.carreras || [];
    carrerasPendientes = [];
    carrerasEliminar = [];

    document.getElementById("claveMateria").value = data.clave_materia;
    document.getElementById("claveMateria").disabled = true;
    document.getElementById("nombreMateria").value = data.nombre_materia;
    document.getElementById("creditos").value = data.creditos_totales;
    document.getElementById("horasTeoricas").value = data.horas_teoricas;
    document.getElementById("horasPracticas").value = data.horas_practicas;
    document.getElementById("noUnidades").value = data.no_unidades;
    renderChips();

    document.getElementById("tituloFormMateria").textContent = "Editar materia";
    const btnSubmit = document.querySelector("#formMateria [type='submit']");
    if (btnSubmit) btnSubmit.textContent = "Actualizar";
    abrirModalMateria();
  } catch {
    alert("Error al cargar datos de la materia.");
    materiaEditando = null;
  }
}

function cancelarEdicion() {
  materiaEditando = null;
  carrerasActuales = [];
  carrerasPendientes = [];
  carrerasEliminar = [];
  form.reset();
  renderChips();
  document.getElementById("claveMateria").disabled = false;
  document.getElementById("tituloFormMateria").textContent =
    "Registrar materia";
  const btnSubmit = document.querySelector("#formMateria [type='submit']");
  if (btnSubmit) btnSubmit.textContent = "Guardar";
  mostrarMensaje("", "");
}

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
    if (data.success) cargarMaterias();
    else alert(data.error || "Error al eliminar.");
  } catch {
    alert("Error de conexión con el servidor.");
  }
}

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

// ── CSV ───────────────────────────────────────────────────────────────────
let csvMateriasData = [];

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

function procesarCSVMaterias(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      document.getElementById("csvMateriasPreview").innerHTML =
        "<p style='color:var(--danger);font-size:.85rem;margin-top:8px'>Archivo vacío o sin datos.</p>";
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
      !csvMateriasData.length;
  };
  reader.readAsText(file);
}

function mostrarPreviewCSVMaterias(headers, data) {
  const muestra = data.slice(0, 5);
  const preview = document.getElementById("csvMateriasPreview");
  if (!data.length) {
    preview.innerHTML =
      "<p style='color:var(--danger);font-size:.85rem;margin-top:8px'>Sin datos válidos.</p>";
    return;
  }
  preview.innerHTML = `<p style="font-size:.8rem;color:var(--text-muted);margin:10px 0 4px">${data.length} registros detectados — vista previa (primeros 5):</p>
    <div class="csv-preview"><table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${muestra.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
}

async function importarCSVMaterias() {
  if (!csvMateriasData.length) return;
  const token = localStorage.getItem("token");
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
        toast(`${data.errores.length} fila(s) con errores`, "info");
    } else alert(`${data.insertados} materia(s) importadas correctamente.`);
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

async function exportarCSVMaterias() {
  const token = localStorage.getItem("token");
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
    materias.forEach((m) =>
      rows.push(
        cols
          .map((c) => `"${(m[c] ?? "").toString().replace(/"/g, '""')}"`)
          .join(","),
      ),
    );
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

document.addEventListener("click", (e) => {
  if (e.target.id === "modalImportMaterias") cerrarModalCSVMaterias();
});

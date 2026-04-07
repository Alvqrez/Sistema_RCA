// frontend/js/inscripcion.js
const BASE = "http://localhost:3000";
const token = () => localStorage.getItem("token");

let todosGrupos = [];
let todosAlumnos = [];
let todasInsc = [];
let grupoSel = null; // objeto grupo seleccionado
let alumnosSel = new Set();
let yaInscritos = new Set(); // matriculas ya en el grupo seleccionado

// ── INIT ─────────────────────────────────────────────────────────────
(async () => {
  soloPermitido("administrador");
  await Promise.all([
    cargarPeriodos(),
    cargarGrupos(),
    cargarAlumnosLista(),
    cargarInscripciones(),
  ]);
  await cargarCarrerasAlumno();
})();

// ── PERIODOS ─────────────────────────────────────────────────────────
async function cargarPeriodos() {
  try {
    const r = await fetch(`${BASE}/api/periodos`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const periodos = await r.json();
    const sel = document.getElementById("selPeriodo");
    periodos.forEach(
      (p) =>
        (sel.innerHTML += `<option value="${p.id_periodo}">${p.descripcion} (${p.anio})</option>`),
    );
  } catch (_) {}
}

// ── GRUPOS ───────────────────────────────────────────────────────────
async function cargarGrupos() {
  try {
    const r = await fetch(`${BASE}/api/grupos`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    todosGrupos = await r.json();
    // Poblar filtro de materias
    const materias = [
      ...new Map(
        todosGrupos.map((g) => [g.clave_materia, g.nombre_materia]),
      ).entries(),
    ];
    const selMat = document.getElementById("selMateriaFiltro");
    materias.forEach(
      ([clave, nombre]) =>
        (selMat.innerHTML += `<option value="${clave}">${nombre}</option>`),
    );
    // Poblar filtro de grupos en inscripciones recientes
    const selGI = document.getElementById("filtroGrupoInsc");
    todosGrupos.forEach(
      (g) =>
        (selGI.innerHTML += `<option value="${g.id_grupo}">${g.nombre_materia} (${g.id_grupo})</option>`),
    );
    renderTablaGrupos(todosGrupos);
  } catch (e) {
    mostrarToast("No se pudieron cargar grupos", "error");
  }
}

function filtrarGrupos() {
  const periodo = document.getElementById("selPeriodo").value;
  const materia = document.getElementById("selMateriaFiltro").value;
  const filtrados = todosGrupos.filter((g) => {
    if (periodo && String(g.id_periodo) !== periodo) return false;
    if (materia && g.clave_materia !== materia) return false;
    return true;
  });
  renderTablaGrupos(filtrados);
}
function filtrarGruposPorPeriodo() {
  filtrarGrupos();
}

function renderTablaGrupos(grupos) {
  const tbody = document.getElementById("tablaGrupos");
  tbody.innerHTML = "";
  if (!grupos.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Sin grupos disponibles</td></tr>`;
    return;
  }
  grupos.forEach((g) => {
    const sel = grupoSel?.id_grupo === g.id_grupo;
    const tr = document.createElement("tr");
    if (sel) tr.classList.add("fila-activa");
    tr.innerHTML = `
      <td style="text-align:center">
        <input type="radio" name="grupoRad" ${sel ? "checked" : ""} onchange="seleccionarGrupo(${g.id_grupo})"/>
      </td>
      <td><strong>#${g.id_grupo}</strong></td>
      <td>${g.nombre_materia}</td>
      <td>${g.nombre_maestro}</td>
      <td style="font-size:0.8rem;color:var(--text-muted)">${g.id_periodo || "—"}</td>
      <td style="font-size:0.8rem">${g.horario || "—"}</td>
      <td>${g.limite_alumnos || 30}</td>
    `;
    tbody.appendChild(tr);
  });
}

function seleccionarGrupo(id) {
  grupoSel = todosGrupos.find((g) => g.id_grupo === id);
  document.getElementById("btnIrPaso2").disabled = false;
  renderTablaGrupos(
    todosGrupos.filter((g) => {
      const p = document.getElementById("selPeriodo").value;
      const m = document.getElementById("selMateriaFiltro").value;
      if (p && String(g.id_periodo) !== p) return false;
      if (m && g.clave_materia !== m) return false;
      return true;
    }),
  );
}

// ── PASO 2 — ALUMNOS ─────────────────────────────────────────────────
async function irPaso2() {
  if (!grupoSel) return;
  setStep(2);
  document.getElementById("grupoSelBadge").textContent =
    `Grupo #${grupoSel.id_grupo} — ${grupoSel.nombre_materia}`;
  // Cargar ya inscritos en este grupo
  try {
    const r = await fetch(
      `${BASE}/api/inscripciones/grupo/${grupoSel.id_grupo}`,
      { headers: { Authorization: `Bearer ${token()}` } },
    );
    const inscritos = await r.json();
    yaInscritos = new Set(inscritos.map((i) => i.matricula));
    document.getElementById("infoYaInscritos").textContent =
      `${yaInscritos.size} ya inscritos en este grupo`;
  } catch (_) {
    yaInscritos = new Set();
  }
  filtrarAlumnos();
}

async function cargarAlumnosLista() {
  try {
    const r = await fetch(`${BASE}/api/alumnos`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    todosAlumnos = await r.json();
  } catch (_) {}
}

async function cargarCarrerasAlumno() {
  try {
    const r = await fetch(`${BASE}/api/carreras`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const carreras = await r.json();
    const sel = document.getElementById("filtroCarreraAlumno");
    carreras.forEach(
      (c) =>
        (sel.innerHTML += `<option value="${c.id_carrera}">${c.nombre_carrera}</option>`),
    );
  } catch (_) {}
}

function filtrarAlumnos() {
  const q = document.getElementById("buscarAlumno").value.toLowerCase();
  const car = document.getElementById("filtroCarreraAlumno").value;
  const filtrados = todosAlumnos.filter((a) => {
    if (car && a.id_carrera !== car) return false;
    if (
      q &&
      !`${a.nombre} ${a.apellido_paterno} ${a.matricula}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    return true;
  });
  renderTablaAlumnos(filtrados);
}

function renderTablaAlumnos(alumnos) {
  const tbody = document.getElementById("tablaAlumnos");
  tbody.innerHTML = "";
  alumnos.forEach((a) => {
    const inscrito = yaInscritos.has(a.matricula);
    const selec = alumnosSel.has(a.matricula);
    const tr = document.createElement("tr");
    if (inscrito) tr.style.opacity = "0.5";
    tr.innerHTML = `
      <td><input type="checkbox" data-mat="${a.matricula}" ${selec ? "checked" : ""} ${inscrito ? "disabled title='Ya inscrito'" : ""} onchange="toggleAlumno(this)"/></td>
      <td><code>${a.matricula}</code></td>
      <td>${a.apellido_paterno} ${a.apellido_materno ?? ""}, ${a.nombre}</td>
      <td><span class="badge-unidad">${a.id_carrera}</span></td>
      <td style="font-size:0.8rem">${a.correo_institucional}</td>
      <td>${inscrito ? '<span class="badge-estatus badge-guardado">Ya inscrito</span>' : '<span class="badge-estatus badge-pendiente">Disponible</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
  actualizarContadorSel();
}

function toggleAlumno(chk) {
  if (chk.checked) alumnosSel.add(chk.dataset.mat);
  else alumnosSel.delete(chk.dataset.mat);
  actualizarContadorSel();
}

function actualizarContadorSel() {
  document.getElementById("infoSeleccion").textContent =
    `${alumnosSel.size} alumno(s) seleccionado(s)`;
  document.getElementById("btnIrPaso3").disabled = alumnosSel.size === 0;
  // Sync checkbox maestro
  const todos = [
    ...document.querySelectorAll(
      "#tablaAlumnos input[type=checkbox]:not(:disabled)",
    ),
  ];
  document.getElementById("chkTodos").checked =
    todos.length > 0 && todos.every((c) => c.checked);
}

function toggleTodos(chk) {
  document
    .querySelectorAll("#tablaAlumnos input[type=checkbox]:not(:disabled)")
    .forEach((c) => {
      c.checked = chk.checked;
      if (chk.checked) alumnosSel.add(c.dataset.mat);
      else alumnosSel.delete(c.dataset.mat);
    });
  actualizarContadorSel();
}

function seleccionarTodos() {
  document.getElementById("chkTodos").checked = true;
  toggleTodos({ checked: true });
}
function deseleccionarTodos() {
  document.getElementById("chkTodos").checked = false;
  toggleTodos({ checked: false });
}

// ── PASO 3 — CONFIRMACIÓN ─────────────────────────────────────────────
function irPaso3() {
  setStep(3);
  const alumnosSelArr = todosAlumnos.filter((a) => alumnosSel.has(a.matricula));
  const filas = alumnosSelArr
    .map(
      (a) => `
    <tr>
      <td><code>${a.matricula}</code></td>
      <td>${a.apellido_paterno} ${a.apellido_materno ?? ""}, ${a.nombre}</td>
      <td><span class="badge-unidad">${a.id_carrera}</span></td>
    </tr>
  `,
    )
    .join("");

  document.getElementById("resumenInsc").innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      <div class="stat-mini">
        <iconify-icon icon="lucide:library"></iconify-icon>
        <div><strong>${grupoSel.nombre_materia}</strong><span>Grupo #${grupoSel.id_grupo}</span></div>
      </div>
      <div class="stat-mini">
        <iconify-icon icon="lucide:graduation-cap"></iconify-icon>
        <div><strong>${grupoSel.nombre_maestro}</strong><span>Docente</span></div>
      </div>
      <div class="stat-mini">
        <iconify-icon icon="lucide:users"></iconify-icon>
        <div><strong>${alumnosSel.size} alumnos</strong><span>a inscribir</span></div>
      </div>
    </div>
    <div class="tabla-wrapper">
      <table style="font-size:0.85rem">
        <thead><tr><th>No. Control</th><th>Nombre</th><th>Carrera</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

async function confirmarInscripcion() {
  const btn = document.getElementById("btnConfirmar");
  btn.disabled = true;
  btn.innerHTML = `<iconify-icon icon="mdi:loading" style="animation:spin 1s linear infinite"></iconify-icon> Inscribiendo...`;

  try {
    const r = await fetch(`${BASE}/api/inscripciones/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({
        matriculas: [...alumnosSel],
        id_grupo: grupoSel.id_grupo,
        tipo_curso: document.getElementById("tipoCurso").value,
      }),
    });
    const data = await r.json();
    if (data.success) {
      mostrarToast(
        `${data.insertados} alumnos inscritos correctamente`,
        "success",
      );
      alumnosSel.clear();
      grupoSel = null;
      setStep(1);
      await cargarInscripciones();
      renderTablaGrupos(todosGrupos);
    } else {
      mostrarToast(data.error || "Error al inscribir", "error");
    }
  } catch (_) {
    mostrarToast("Error de conexión", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="mdi:check-circle-outline"></iconify-icon> Inscribir alumnos`;
  }
}

// ── TABLA DE INSCRIPCIONES ────────────────────────────────────────────
async function cargarInscripciones() {
  try {
    const r = await fetch(`${BASE}/api/inscripciones`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    todasInsc = await r.json();
    filtrarTablaInsc();
  } catch (_) {}
}

function filtrarTablaInsc() {
  const grupo = document.getElementById("filtroGrupoInsc").value;
  const est = document.getElementById("filtroEstatusInsc").value;
  const q = document.getElementById("buscarInsc").value.toLowerCase();
  const filtradas = todasInsc.filter((i) => {
    if (grupo && String(i.id_grupo) !== grupo) return false;
    if (est && i.estatus !== est) return false;
    if (q && !`${i.nombre_alumno} ${i.matricula}`.toLowerCase().includes(q))
      return false;
    return true;
  });
  renderTablaInsc(filtradas);
}

function renderTablaInsc(insc) {
  const tbody = document.getElementById("tablaInscripciones");
  tbody.innerHTML = "";
  if (!insc.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">Sin inscripciones</td></tr>`;
    return;
  }
  insc.forEach((i) => {
    const color =
      {
        Cursando: "badge-pendiente",
        Baja: "badge-np",
        Aprobado: "badge-aprobado",
        Reprobado: "badge-reprobado",
      }[i.estatus] || "badge-pendiente";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code style="font-size:0.8rem">${i.matricula}</code></td>
      <td>${i.nombre_alumno}</td>
      <td><strong>${i.nombre_materia}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">Grupo #${i.id_grupo}</span></td>
      <td style="font-size:0.82rem">${i.nombre_maestro}</td>
      <td style="font-size:0.8rem;color:var(--text-muted)">${i.periodo || "—"}</td>
      <td><span class="badge-estatus badge-guardado">${i.tipo_curso}</span></td>
      <td><span class="badge-estatus ${color}">${i.estatus}</span></td>
      <td>
        ${
          i.estatus === "Cursando"
            ? `<button class="btn btn-sm btn-danger-outline" onclick="pedirBaja('${i.matricula}',${i.id_grupo})" title="Dar de baja">
          <iconify-icon icon="mdi:account-remove-outline"></iconify-icon>
        </button>`
            : ""
        }
        <button class="btn btn-sm btn-danger-outline" onclick="eliminarInscripcion('${i.matricula}',${i.id_grupo})" title="Eliminar registro" style="margin-left:4px">
          <iconify-icon icon="mdi:delete-outline"></iconify-icon>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function pedirBaja(matricula, id_grupo) {
  document.getElementById("modalBaja").classList.add("visible");
  document.getElementById("btnConfirmarBaja").onclick = async () => {
    cerrarModal("modalBaja");
    const r = await fetch(
      `${BASE}/api/inscripciones/${matricula}/${id_grupo}/estatus`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ estatus: "Baja" }),
      },
    );
    const d = await r.json();
    if (d.success) {
      mostrarToast("Baja registrada", "success");
      cargarInscripciones();
    } else mostrarToast(d.error, "error");
  };
}

async function eliminarInscripcion(matricula, id_grupo) {
  if (
    !confirm(
      "¿Eliminar el registro de inscripción? Esta acción no se puede deshacer.",
    )
  )
    return;
  const r = await fetch(`${BASE}/api/inscripciones/${matricula}/${id_grupo}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token()}` },
  });
  const d = await r.json();
  if (d.success) {
    mostrarToast("Inscripción eliminada", "success");
    cargarInscripciones();
  } else mostrarToast(d.error, "error");
}

// ── NAVEGACIÓN DE PASOS ───────────────────────────────────────────────
function setStep(n) {
  [1, 2, 3].forEach((i) => {
    document.getElementById(`paso${i}`).style.display =
      i === n ? "block" : "none";
    const dot = document.getElementById(`stepDot${i}`);
    dot.classList.toggle("active", i === n);
    dot.classList.toggle("completed", i < n);
  });
}

function volverPaso1() {
  setStep(1);
}
function volverPaso2() {
  setStep(2);
  filtrarAlumnos();
}

// ── UTILS ─────────────────────────────────────────────────────────────
function cerrarModal(id) {
  document.getElementById(id).classList.remove("visible");
}
document.querySelectorAll(".modal-overlay").forEach((o) =>
  o.addEventListener("click", (e) => {
    if (e.target === o) o.classList.remove("visible");
  }),
);

function mostrarToast(msg, tipo = "success") {
  let t = document.getElementById("rca-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "rca-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `rca-toast rca-toast-${tipo} visible`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("visible"), 3200);
}

// ── CSV Inscripciones ─────────────────────────────────────────────
let csvInscData = [];

function abrirModalCSVInscripcion() {
  csvInscData = [];
  document.getElementById("csvPreviewInsc").innerHTML = "";
  document.getElementById("btnImportarInsc").disabled = true;
  document.getElementById("inputCSVInsc").value = "";
  const msg = document.getElementById("csvInscMsg");
  if (msg) {
    msg.style.display = "none";
    msg.textContent = "";
  }
  document.getElementById("modalCSVInscripcion").classList.add("visible");
}

function soltarInsc(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) procesarCSVInsc(file);
}

function leerCSVInsc(e) {
  const file = e.target.files[0];
  if (file) procesarCSVInsc(file);
}

function procesarCSVInsc(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.trim().split("\n").filter(Boolean);
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    csvInscData = lines
      .slice(1)
      .map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = vals[i] ?? "";
        });
        return obj;
      })
      .filter((r) => r.matricula && r.id_grupo);
    // Preview
    const preview = document.getElementById("csvPreviewInsc");
    if (!csvInscData.length) {
      preview.innerHTML = `<p style="color:var(--danger);font-size:0.85rem;margin-top:8px">Sin datos válidos — revisa las columnas: matricula, id_grupo, tipo_curso.</p>`;
      document.getElementById("btnImportarInsc").disabled = true;
      return;
    }
    const muestra = csvInscData.slice(0, 5);
    preview.innerHTML = `
      <p style="font-size:0.8rem;color:var(--text-muted);margin:10px 0 4px">${csvInscData.length} inscripciones detectadas (primeros 5):</p>
      <div class="csv-preview"><table>
        <thead><tr><th>Matrícula</th><th>ID Grupo</th><th>Tipo curso</th></tr></thead>
        <tbody>${muestra.map((r) => `<tr><td>${r.matricula}</td><td>${r.id_grupo}</td><td>${r.tipo_curso || "Ordinario"}</td></tr>`).join("")}</tbody>
      </table></div>`;
    document.getElementById("btnImportarInsc").disabled = false;
  };
  reader.readAsText(file);
}

async function importarCSVInsc() {
  if (!csvInscData.length) return;
  const btn = document.getElementById("btnImportarInsc");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Importando…`;
  const msg = document.getElementById("csvInscMsg");
  let insertados = 0,
    errores = [];
  const tk = localStorage.getItem("token");

  for (const row of csvInscData) {
    try {
      const r = await fetch(`${BASE}/api/inscripciones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify({
          matricula: row.matricula,
          id_grupo: row.id_grupo,
          tipo_curso: row.tipo_curso || "Ordinario",
        }),
      });
      if (r.ok) insertados++;
      else {
        const d = await r.json();
        errores.push({ matricula: row.matricula, motivo: d.error || "Error" });
      }
    } catch (e) {
      errores.push({ matricula: row.matricula, motivo: e.message });
    }
  }

  msg.style.display = "block";
  if (errores.length === 0) {
    msg.style.color = "var(--success)";
    msg.textContent = `✓ ${insertados} inscripción(es) importadas correctamente.`;
  } else {
    msg.style.color = "var(--warning)";
    msg.textContent = `${insertados} importadas, ${errores.length} con errores. Revisa la consola.`;
    console.table(errores);
  }
  btn.disabled = false;
  btn.innerHTML = `<iconify-icon icon="lucide:upload"></iconify-icon> Importar`;
  if (insertados > 0) {
    await cargarInscripciones();
    await cargarAlumnosLista();
  }
}

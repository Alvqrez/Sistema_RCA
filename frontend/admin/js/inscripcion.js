// inscripcion.js — Wizard de inscripción v2
// Flujo: Periodo → Carrera + Materia + Grupo → Alumnos → Confirmación

const token = () => localStorage.getItem("token");

// ── Estado global ──────────────────────────────────────────────────────────
let todosGrupos = []; // Todos los grupos cargados
let todasMaterias = []; // Todas las materias con carreras
let todasCarreras = []; // Todas las carreras
let todosAlumnos = []; // Todos los alumnos
let todasInsc = []; // Inscripciones para la tabla de recientes
let yaInscritos = new Set(); // no_controls ya inscritos en el grupo elegido

// Selecciones del wizard
let periodoSel = null; // objeto periodo
let carreraSel = null; // id_carrera string
let materiaSel = null; // objeto materia
let grupoSel = null; // objeto grupo
let alumnosSel = new Set(); // no_controls seleccionados

// Paso activo
let pasoActual = 1;

// ── Init ───────────────────────────────────────────────────────────────────
(async () => {
  soloPermitido("administrador");
  await Promise.all([
    cargarPeriodos(),
    cargarGruposGlobal(),
    cargarMaterias(),
    cargarCarreras(),
    cargarAlumnos(),
    cargarInscripciones(),
  ]);
})();

// ── Carga de datos ─────────────────────────────────────────────────────────
async function cargarPeriodos() {
  try {
    const r = await fetch(`${API_URL}/api/periodos`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const periodos = await r.json();
    // Solo Vigente y Proximo
    const disponibles = periodos.filter(
      (p) => p.estatus === "Vigente" || p.estatus === "Proximo",
    );
    renderPeriodos(disponibles);
  } catch {
    document.getElementById("periodosGrid").innerHTML =
      `<div style="color:var(--danger);grid-column:1/-1;padding:20px;text-align:center">
        <iconify-icon icon="lucide:wifi-off"></iconify-icon>
        <p>No se pudieron cargar los periodos</p>
       </div>`;
  }
}

function renderPeriodos(periodos) {
  const grid = document.getElementById("periodosGrid");
  if (!periodos.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted)">
        <iconify-icon icon="mdi:calendar-remove-outline" style="font-size:2rem;display:block;margin:0 auto 8px;opacity:0.4"></iconify-icon>
        <p>No hay periodos vigentes o próximos disponibles</p>
        <a href="periodos.html" class="btn btn-outline btn-sm" style="margin-top:10px">Gestionar periodos</a>
      </div>`;
    return;
  }
  grid.innerHTML = periodos
    .map(
      (p) => `
    <div class="periodo-card" onclick="seleccionarPeriodo(${p.id_periodo}, this)" data-id="${p.id_periodo}">
      <div class="pc-estatus ${p.estatus === "Vigente" ? "vigente" : "proximo"}">
        <iconify-icon icon="${p.estatus === "Vigente" ? "mdi:circle" : "mdi:clock-outline"}"></iconify-icon>
        ${p.estatus}
      </div>
      <div class="pc-nombre">${p.descripcion}</div>
      <div class="pc-anio">${p.anio || new Date(p.fecha_inicio).getFullYear()}</div>
    </div>`,
    )
    .join("");
}

function seleccionarPeriodo(id, el) {
  document
    .querySelectorAll(".periodo-card")
    .forEach((c) => c.classList.remove("selected"));
  el.classList.add("selected");
  periodoSel = {
    id_periodo: id,
    descripcion: el.querySelector(".pc-nombre").textContent,
  };
  document.getElementById("btnIrPaso2").disabled = false;
  document.getElementById("tc1val").textContent = periodoSel.descripcion;
}

async function cargarGruposGlobal() {
  try {
    const r = await fetch(`${API_URL}/api/grupos`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    todosGrupos = await r.json();
    // Populate filtro de recientes
    const sel = document.getElementById("filtroGrupoInsc");
    todosGrupos.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id_grupo;
      opt.textContent = `#${g.id_grupo} — ${g.nombre_materia}`;
      sel.appendChild(opt);
    });
  } catch {}
}

async function cargarMaterias() {
  try {
    const r = await fetch(`${API_URL}/api/materias`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    todasMaterias = await r.json();
  } catch {}
}

async function cargarCarreras() {
  try {
    const r = await fetch(`${API_URL}/api/carreras`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    todasCarreras = await r.json();
    const sel = document.getElementById("selCarrera");
    todasCarreras.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id_carrera;
      opt.textContent = `${c.id_carrera} — ${c.nombre_carrera}`;
      sel.appendChild(opt);
    });
  } catch {}
}

async function cargarAlumnos() {
  try {
    const r = await fetch(`${API_URL}/api/alumnos`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    todosAlumnos = await r.json();
  } catch {}
}

// ── Navegación del wizard ──────────────────────────────────────────────────
function setStep(n) {
  pasoActual = n;
  for (let i = 1; i <= 4; i++) {
    const step = document.getElementById(`paso${i}`);
    if (step) step.classList.toggle("active", i === n);

    const track = document.getElementById(`track${i}`);
    if (track) {
      track.classList.remove("active", "done");
      if (i < n) track.classList.add("done");
      else if (i === n) track.classList.add("active");

      // Actualizar ícono done
      const circle = document.getElementById(`tc${i}`);
      if (circle) {
        circle.innerHTML =
          i < n
            ? `<iconify-icon icon="lucide:check" style="font-size:0.75rem"></iconify-icon>`
            : String(i);
      }
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function irPaso1() {
  setStep(1);
}

function irPaso2() {
  if (!periodoSel) return;
  setStep(2);
  // Si ya hay carrera, refrescar grupos
  if (carreraSel) onCarreraChange();
}

async function irPaso3() {
  if (!grupoSel) return;
  setStep(3);

  // Cargar ya inscritos en este grupo
  yaInscritos.clear();
  try {
    const r = await fetch(
      `${API_URL}/api/inscripciones/grupo/${grupoSel.id_grupo}`,
      {
        headers: { Authorization: `Bearer ${token()}` },
      },
    );
    if (r.ok) {
      const inscritos = await r.json();
      inscritos.forEach((i) => yaInscritos.add(i.no_control));
    }
  } catch {}

  document.getElementById("lblYaInscritos").textContent =
    yaInscritos.size > 0 ? `${yaInscritos.size} ya inscritos (ocultos)` : "";
  document.getElementById("paso3Sub").textContent =
    `Alumnos de ${carreraSel} — ${grupoSel.nombre_materia} / Grupo #${grupoSel.id_grupo}`;

  alumnosSel.clear();
  actualizarContadorAlumnos();
  filtrarAlumnos();
}

function irPaso4() {
  if (!alumnosSel.size) return;
  setStep(4);
  poblarResumen();
}

// ── Paso 2: Carrera → Materias → Grupos ───────────────────────────────────
function onCarreraChange() {
  const sel = document.getElementById("selCarrera");
  carreraSel = sel.value;
  materiaSel = null;
  grupoSel = null;
  document.getElementById("btnIrPaso3").disabled = true;

  if (!carreraSel) {
    document.getElementById("secMaterias").style.display = "none";
    document.getElementById("secGrupos").style.display = "none";
    return;
  }

  // Filtrar materias que pertenecen a esta carrera (via carreras_raw)
  const materiasFiltradas = todasMaterias.filter(
    (m) => m.carreras && m.carreras.some((c) => c.id_carrera === carreraSel),
  );

  document.getElementById("secMaterias").style.display = "block";
  const lista = document.getElementById("materiasLista");

  if (!materiasFiltradas.length) {
    lista.innerHTML = `
      <div class="empty-hint" style="grid-column:1/-1">
        <iconify-icon icon="lucide:book-x"></iconify-icon>
        <p>No hay materias en la retícula de esta carrera.</p>
      </div>`;
  } else {
    lista.innerHTML = materiasFiltradas
      .map(
        (m) => `
      <div class="mat-card" onclick="seleccionarMateria('${m.clave_materia}', this)"
           data-clave="${m.clave_materia}">
        <div class="mc-clave">${m.clave_materia}</div>
        <div class="mc-nombre">${m.nombre_materia}</div>
      </div>`,
      )
      .join("");
  }

  document.getElementById("secGrupos").style.display = "none";
}

function seleccionarMateria(clave, el) {
  document
    .querySelectorAll(".mat-card")
    .forEach((c) => c.classList.remove("selected"));
  el.classList.add("selected");
  materiaSel = todasMaterias.find((m) => m.clave_materia === clave);
  grupoSel = null;
  document.getElementById("btnIrPaso3").disabled = true;
  renderGrupos();
}

function renderGrupos() {
  if (!materiaSel || !periodoSel) return;

  // Filtrar grupos por materia y periodo
  const grupos = todosGrupos.filter(
    (g) =>
      g.clave_materia === materiaSel.clave_materia &&
      g.id_periodo === periodoSel.id_periodo,
  );

  document.getElementById("secGrupos").style.display = "block";
  const lista = document.getElementById("gruposLista");

  if (!grupos.length) {
    lista.innerHTML = `
      <div class="empty-hint" style="grid-column:1/-1">
        <iconify-icon icon="lucide:layers-3"></iconify-icon>
        <p>No hay grupos de <strong>${materiaSel.nombre_materia}</strong>
           en el periodo seleccionado.</p>
      </div>`;
    return;
  }

  lista.innerHTML = grupos
    .map((g) => {
      const pct = Math.round(
        ((g.alumnos_inscritos || 0) / (g.limite_alumnos || 30)) * 100,
      );
      return `
      <div class="grp-card" onclick="seleccionarGrupo(${g.id_grupo}, this)"
           data-id="${g.id_grupo}">
        <div class="gc-id">Grupo #${g.id_grupo}</div>
        <div class="gc-maestro">${g.nombre_maestro || "—"}</div>
        <div class="gc-info">
          ${g.horario ? `<span><iconify-icon icon="lucide:clock"></iconify-icon>${g.horario}</span>` : ""}
          ${g.aula ? `<span><iconify-icon icon="lucide:map-pin"></iconify-icon>${g.aula}</span>` : ""}
        </div>
        <div class="gc-cap">
          <div class="cap-bar"><div class="cap-bar-fill" style="width:${pct}%"></div></div>
          <span style="white-space:nowrap">${g.alumnos_inscritos || 0}/${g.limite_alumnos || 30}</span>
        </div>
      </div>`;
    })
    .join("");
}

function seleccionarGrupo(id, el) {
  document
    .querySelectorAll(".grp-card")
    .forEach((c) => c.classList.remove("selected"));
  el.classList.add("selected");
  grupoSel = todosGrupos.find((g) => g.id_grupo === id);
  document.getElementById("btnIrPaso3").disabled = false;

  // Actualizar tracker
  document.getElementById("tc2val").textContent =
    `${materiaSel.clave_materia} · Grupo #${id}`;
}

// ── Paso 3: Alumnos ────────────────────────────────────────────────────────
function filtrarAlumnos() {
  const q = document.getElementById("buscarAlumno").value.toLowerCase();

  // Solo alumnos de la carrera elegida y no ya inscritos
  let lista = todosAlumnos.filter(
    (a) => a.id_carrera === carreraSel && !yaInscritos.has(a.no_control),
  );

  if (q) {
    lista = lista.filter(
      (a) =>
        a.no_control.toLowerCase().includes(q) ||
        `${a.nombre} ${a.apellido_paterno}`.toLowerCase().includes(q),
    );
  }

  renderTablaAlumnos(lista);
}

function renderTablaAlumnos(alumnos) {
  const tbody = document.getElementById("tablaAlumnos");
  if (!alumnos.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">
      Sin alumnos disponibles para esta carrera / grupo
    </td></tr>`;
    return;
  }
  tbody.innerHTML = alumnos
    .map((a) => {
      const checked = alumnosSel.has(a.no_control) ? "checked" : "";
      return `<tr>
        <td><input type="checkbox" ${checked}
          onchange="toggleAlumno('${a.no_control}', this)" /></td>
        <td><code>${a.no_control}</code></td>
        <td>${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ""}</td>
        <td style="font-size:0.8rem;color:var(--text-muted)">${a.correo_institucional || "—"}</td>
      </tr>`;
    })
    .join("");
}

function toggleAlumno(no_control, chk) {
  if (chk.checked) alumnosSel.add(no_control);
  else alumnosSel.delete(no_control);
  actualizarContadorAlumnos();
}

function actualizarContadorAlumnos() {
  const n = alumnosSel.size;
  document.getElementById("lblSel").textContent =
    `${n} alumno${n !== 1 ? "s" : ""} seleccionado${n !== 1 ? "s" : ""}`;
  document.getElementById("btnIrPaso4").disabled = n === 0;
  document.getElementById("tc3val").textContent =
    n > 0 ? `${n} alumno(s)` : "Pendiente";

  // Sincronizar chkTodos
  const allChks = document.querySelectorAll(
    "#tablaAlumnos input[type=checkbox]",
  );
  const chkTodos = document.getElementById("chkTodos");
  if (chkTodos && allChks.length > 0) {
    chkTodos.checked = allChks.length === n && n > 0;
    chkTodos.indeterminate = n > 0 && n < allChks.length;
  }
}

function seleccionarTodos() {
  document
    .querySelectorAll("#tablaAlumnos input[type=checkbox]")
    .forEach((c) => {
      c.checked = true;
      const nc = c.closest("tr").querySelector("code");
      if (nc) alumnosSel.add(nc.textContent);
    });
  actualizarContadorAlumnos();
}

function deseleccionarTodos() {
  alumnosSel.clear();
  document
    .querySelectorAll("#tablaAlumnos input[type=checkbox]")
    .forEach((c) => (c.checked = false));
  actualizarContadorAlumnos();
}

function toggleTodos(master) {
  if (master.checked) seleccionarTodos();
  else deseleccionarTodos();
}

// ── Paso 4: Confirmación ───────────────────────────────────────────────────
function poblarResumen() {
  document.getElementById("rs-periodo").textContent =
    periodoSel?.descripcion || "—";
  document.getElementById("rs-materia").textContent =
    materiaSel?.nombre_materia || "—";
  document.getElementById("rs-grupo").textContent =
    `#${grupoSel?.id_grupo} — ${grupoSel?.horario || ""}`;
  document.getElementById("rs-maestro").textContent =
    grupoSel?.nombre_maestro || "—";
  document.getElementById("rs-count").textContent = alumnosSel.size;

  // Carrera
  const carreraObj = todasCarreras.find((c) => c.id_carrera === carreraSel);
  document.getElementById("rs-carrera").textContent = carreraObj
    ? carreraObj.nombre_carrera
    : carreraSel;

  // Chips de alumnos
  const chips = document.getElementById("rs-alumnos");
  chips.innerHTML = [...alumnosSel]
    .map((nc) => {
      const a = todosAlumnos.find((x) => x.no_control === nc);
      const nombre = a ? `${a.nombre} ${a.apellido_paterno}` : nc;
      return `<span class="alumno-chip">
        <iconify-icon icon="lucide:user" style="font-size:0.7rem"></iconify-icon>
        ${nombre} <span style="opacity:0.6;margin-left:3px">(${nc})</span>
      </span>`;
    })
    .join("");

  document.getElementById("tc4val").textContent =
    `${alumnosSel.size} alumno(s)`;
}

async function confirmarInscripcion() {
  if (!grupoSel || alumnosSel.size === 0) return;
  const tipo = document.getElementById("tipoCurso").value;
  const btn = document.getElementById("btnConfirmar");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Inscribiendo…`;

  const payload = [...alumnosSel].map((nc) => ({
    no_control: nc,
    id_grupo: grupoSel.id_grupo,
    tipo_curso: tipo,
  }));

  try {
    const r = await fetch(`${API_URL}/api/inscripciones/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({ inscripciones: payload }),
    });
    const data = await r.json();
    if (r.ok) {
      const ok = data.insertados ?? payload.length;
      const err = data.errores?.length ?? 0;
      showToast(
        `✅ ${ok} alumno${ok !== 1 ? "s" : ""} inscrito${ok !== 1 ? "s" : ""}${err > 0 ? ` (${err} omitidos)` : ""}`,
        "success",
      );
      // Reset wizard
      resetWizard();
      await cargarInscripciones();
      await cargarGruposGlobal();
    } else {
      showToast(data.error || "Error al inscribir", "error");
    }
  } catch {
    showToast("Error de conexión", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="mdi:check-circle-outline"></iconify-icon> Inscribir alumnos`;
  }
}

function resetWizard() {
  periodoSel = null;
  carreraSel = null;
  materiaSel = null;
  grupoSel = null;
  alumnosSel.clear();
  yaInscritos.clear();
  document.getElementById("selCarrera").value = "";
  document.getElementById("secMaterias").style.display = "none";
  document.getElementById("secGrupos").style.display = "none";
  document.getElementById("tc1val").textContent = "Pendiente";
  document.getElementById("tc2val").textContent = "Pendiente";
  document.getElementById("tc3val").textContent = "Pendiente";
  document.getElementById("tc4val").textContent = "Pendiente";
  setStep(1);
}

// ── Tabla Inscripciones Recientes ──────────────────────────────────────────
async function cargarInscripciones() {
  try {
    const r = await fetch(`${API_URL}/api/inscripciones`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    todasInsc = await r.json();
    filtrarTablaInsc();
  } catch {}
}

function filtrarTablaInsc() {
  const grupo = document.getElementById("filtroGrupoInsc").value;
  const est = document.getElementById("filtroEstatusInsc").value;
  const q = (document.getElementById("buscarInsc").value || "").toLowerCase();
  const filtradas = todasInsc.filter((i) => {
    if (grupo && String(i.id_grupo) !== grupo) return false;
    if (est && i.estatus !== est) return false;
    if (q && !`${i.nombre_alumno} ${i.no_control}`.toLowerCase().includes(q))
      return false;
    return true;
  });
  renderTablaInsc(filtradas);
}

function renderTablaInsc(insc) {
  const tbody = document.getElementById("tablaInscripciones");
  tbody.innerHTML = "";
  if (!insc.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">
      Sin inscripciones encontradas
    </td></tr>`;
    return;
  }
  const colores = {
    Cursando: "badge-pendiente",
    Baja: "badge-np",
    Aprobado: "badge-aprobado",
    Reprobado: "badge-reprobado",
  };
  insc.forEach((i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${i.no_control}</code></td>
      <td>${i.nombre_alumno}</td>
      <td>${i.nombre_materia || "—"} <span style="color:var(--text-muted);font-size:0.78rem">#${i.id_grupo}</span></td>
      <td>${i.nombre_maestro || "—"}</td>
      <td style="font-size:0.8rem">${i.periodo || "—"}</td>
      <td><span class="badge-tipo">${i.tipo_curso || "—"}</span></td>
      <td><span class="badge ${colores[i.estatus] || "badge-pendiente"}">${i.estatus}</span></td>
      <td>
        <button class="btn-icon" title="Dar de baja"
          onclick="abrirModalBaja('${i.no_control}','${i.id_grupo}')">
          <iconify-icon icon="mdi:account-remove-outline"></iconify-icon>
        </button>
        <button class="btn-icon btn-del" title="Eliminar" style="margin-left:4px"
          onclick="eliminarInscripcion('${i.no_control}','${i.id_grupo}')">
          <iconify-icon icon="lucide:trash-2"></iconify-icon>
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ── Acciones de inscripción ────────────────────────────────────────────────
let bajaCtx = null;
function abrirModalBaja(no_control, id_grupo) {
  bajaCtx = { no_control, id_grupo };
  document.getElementById("modalBaja").classList.add("active");
  document.getElementById("btnConfirmarBaja").onclick = async () => {
    try {
      const r = await fetch(
        `${API_URL}/api/inscripciones/${bajaCtx.no_control}/${bajaCtx.id_grupo}/estatus`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({ estatus: "Baja" }),
        },
      );
      if (r.ok) {
        showToast("Baja registrada", "success");
        cerrarModal("modalBaja");
        await cargarInscripciones();
      } else {
        showToast("Error al dar de baja", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };
}

async function eliminarInscripcion(no_control, id_grupo) {
  if (
    !confirm(
      `¿Eliminar la inscripción de ${no_control} del grupo #${id_grupo}?`,
    )
  )
    return;
  try {
    const r = await fetch(
      `${API_URL}/api/inscripciones/${no_control}/${id_grupo}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      },
    );
    if (r.ok) {
      showToast("Inscripción eliminada", "success");
      await cargarInscripciones();
    } else {
      showToast("Error al eliminar", "error");
    }
  } catch {
    showToast("Error de conexión", "error");
  }
}

// ── CSV ────────────────────────────────────────────────────────────────────
let csvInscData = [];
function abrirModalCSVInscripcion() {
  document.getElementById("modalCSVInscripcion").classList.add("visible");
}

function soltarInsc(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) leerCSVInsc({ target: { files: [file] } });
}

function leerCSVInsc(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ({ target }) => {
    const lines = target.result
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const header = lines[0]
      .toLowerCase()
      .split(",")
      .map((h) => h.trim());
    const iNC = header.indexOf("no_control");
    const iGrp = header.indexOf("id_grupo");
    const iTipo = header.indexOf("tipo_curso");
    if (iNC === -1 || iGrp === -1) {
      showToast("CSV inválido: faltan columnas no_control o id_grupo", "error");
      return;
    }
    csvInscData = lines.slice(1).map((l) => {
      const cols = l.split(",");
      return {
        no_control: cols[iNC]?.trim(),
        id_grupo: parseInt(cols[iGrp]?.trim()),
        tipo_curso: cols[iTipo]?.trim() || "Ordinario",
      };
    });

    const preview = document.getElementById("csvPreviewInsc");
    preview.innerHTML = `<p style="font-size:0.8rem;color:var(--text-muted);margin:10px 0 4px">${csvInscData.length} inscripciones detectadas (primeros 5):</p>`;
    const pre = document.createElement("pre");
    pre.style.cssText =
      "font-size:0.76rem;background:var(--bg-app);padding:8px 10px;border-radius:6px;overflow:auto;max-height:120px";
    pre.textContent = csvInscData
      .slice(0, 5)
      .map((d) => `${d.no_control} → G#${d.id_grupo} (${d.tipo_curso})`)
      .join("\n");
    preview.appendChild(pre);
    document.getElementById("btnImportarInsc").disabled = false;
  };
  reader.readAsText(file);
}

async function importarCSVInsc() {
  if (!csvInscData.length) return;
  const btn = document.getElementById("btnImportarInsc");
  btn.disabled = true;
  btn.textContent = "Importando…";
  try {
    const r = await fetch(`${API_URL}/api/inscripciones/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({ inscripciones: csvInscData }),
    });
    const data = await r.json();
    const msg = document.getElementById("csvInscMsg");
    msg.style.display = "block";
    if (r.ok) {
      msg.style.color = "var(--success)";
      msg.textContent = `✓ ${data.insertados} inscripción(es) importada(s). ${data.errores?.length || 0} omitida(s).`;
      await cargarInscripciones();
    } else {
      msg.style.color = "var(--danger)";
      msg.textContent = data.error || "Error al importar";
    }
  } catch {
    showToast("Error de conexión", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<iconify-icon icon="lucide:upload"></iconify-icon> Importar`;
  }
}

async function exportarCSVInscripciones() {
  if (!todasInsc.length) {
    showToast("No hay inscripciones para exportar", "info");
    return;
  }
  const headers = [
    "no_control",
    "nombre_alumno",
    "id_grupo",
    "nombre_materia",
    "nombre_maestro",
    "periodo",
    "tipo_curso",
    "estatus",
  ];
  const rows = todasInsc.map((i) =>
    headers
      .map((h) => `"${(i[h] ?? "").toString().replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = "inscripciones_rca.csv";
  a.click();
}

// ── Helpers ────────────────────────────────────────────────────────────────
function cerrarModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("active", "visible");
}

function showToast(msg, tipo = "success") {
  // Usar la global si existe
  if (
    typeof window.showToast === "function" &&
    window.showToast !== showToast
  ) {
    return window.showToast(msg, tipo);
  }
  let c = document.getElementById("toast-container");
  if (!c) {
    c = document.createElement("div");
    c.id = "toast-container";
    document.body.appendChild(c);
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
  setTimeout(() => t.remove(), 3500);
}

// mostrarToast alias para compatibilidad
const mostrarToast = showToast;

const BASE = "http://localhost:3000";
const token = localStorage.getItem("token");
const rol = localStorage.getItem("rol");

if (!token || rol !== "alumno")
  window.location.href = "../../shared/pages/login.html";

function parsearToken(t) {
  try {
    return JSON.parse(atob(t.split(".")[1]));
  } catch {
    return null;
  }
}
const payload = parsearToken(token);
const no_control = payload?.id_referencia;

let todasInscripciones = [];

(async () => {
  await cargarDatosAlumno();
  await cargarInscripciones();
})();

async function cargarDatosAlumno() {
  try {
    const r = await fetch(`${BASE}/api/alumnos/${no_control}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      window.location.href = "../../shared/pages/login.html";
      return;
    }
    const a = await r.json();

    document.getElementById("heroNombre").textContent =
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno ?? ""}`.trim();
    document.getElementById("heroNo_control").textContent =
      `No. Control: ${a.no_control}`;
    document.getElementById("heroCarrera").textContent = a.id_carrera;
  } catch (_) {}
}

async function cargarInscripciones() {
  try {
    const r = await fetch(`${BASE}/api/inscripciones/alumno/${no_control}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error();
    todasInscripciones = await r.json();
  } catch (_) {
    // fallback a calificaciones directas
    await cargarCalificacionesFallback();
    return;
  }

  calcularStats();
  renderMateriasCursando();
  poblarFiltros();
  filtrarHistorial();
  poblarSelectGrupos();
}

// Fallback si la API de inscripciones no existe aún
async function cargarCalificacionesFallback() {
  try {
    const r = await fetch(`${BASE}/api/calificaciones/alumno/${no_control}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const califs = await r.json();
    const tbody = document.getElementById("tablaHistorial");
    if (!califs.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No hay calificaciones registradas aún.</td></tr>`;
      return;
    }
    tbody.innerHTML = califs
      .map(
        (c) => `
      <tr>
        <td>${c.nombre_unidad}</td>
        <td>—</td><td>—</td><td>—</td>
        <td><div class="cal-final ${(c.calificacion_unidad_final ?? 0) >= 60 ? "aprobado" : "reprobado"}">${c.calificacion_unidad_final ?? "Pendiente"}</div></td>
        <td><span class="badge-estatus ${c.estatus_unidad === "Aprobada" ? "badge-aprobado" : c.estatus_unidad === "Reprobada" ? "badge-reprobado" : "badge-pendiente"}">${c.estatus_unidad}</span></td>
      </tr>
    `,
      )
      .join("");
  } catch (_) {}
}

function calcularStats() {
  const aprobadas = todasInscripciones.filter(
    (i) => i.estatus_final === "Aprobado",
  ).length;
  const reprobadas = todasInscripciones.filter(
    (i) => i.estatus_final === "Reprobado",
  ).length;
  const cursando = todasInscripciones.filter(
    (i) => i.estatus === "Cursando",
  ).length;

  const notas = todasInscripciones
    .filter(
      (i) =>
        i.calificacion_oficial !== null && i.calificacion_oficial !== undefined,
    )
    .map((i) => parseFloat(i.calificacion_oficial));
  const prom = notas.length
    ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)
    : "—";

  document.getElementById("cntAprobadas").textContent = aprobadas;
  document.getElementById("cntReprobadas").textContent = reprobadas;
  document.getElementById("cntCursando").textContent = cursando;
  document.getElementById("promedioGeneral").textContent = prom;
}

function renderMateriasCursando() {
  const cursando = todasInscripciones.filter((i) => i.estatus === "Cursando");
  const grid = document.getElementById("gridMaterias");

  if (!cursando.length) {
    grid.innerHTML = `<div class="empty-state"><iconify-icon icon="mdi:book-off-outline"></iconify-icon><p>No tienes materias activas actualmente.</p></div>`;
    const ultimoPeriodo = todasInscripciones[0]?.periodo;
    if (ultimoPeriodo)
      document.getElementById("periodoActualBadge").textContent = ultimoPeriodo;
    return;
  }

  const periodos = [...new Set(cursando.map((i) => i.periodo).filter(Boolean))];
  if (periodos[0])
    document.getElementById("periodoActualBadge").textContent = periodos[0];

  grid.innerHTML = cursando
    .map((i) => {
      const cal = i.calificacion_oficial;
      const hasCal = cal !== null && cal !== undefined;
      const pct = hasCal ? Math.min(100, Math.max(0, parseFloat(cal))) : 0;
      const isAprobado = hasCal && parseFloat(cal) >= 70;
      const barColor = !hasCal
        ? "var(--border)"
        : isAprobado
          ? "var(--success)"
          : "var(--danger)";
      const calLabel = hasCal ? parseFloat(cal).toFixed(1) : "—";
      const calColor = !hasCal
        ? "var(--text-muted)"
        : isAprobado
          ? "var(--success)"
          : "var(--danger)";

      return `
    <div class="materia-card" onclick="seleccionarGrupo(${i.id_grupo})">
      <div class="materia-card-header">
        <iconify-icon icon="mdi:book-outline"></iconify-icon>
        <span class="badge-unidad">${i.clave_materia || ""}</span>
      </div>
      <div class="materia-card-nombre">${i.nombre_materia}</div>
      <div class="materia-card-info">
        <iconify-icon icon="lucide:graduation-cap"></iconify-icon> ${i.nombre_maestro}
      </div>
      <!-- barra de progreso de calificación -->
      <div style="margin-top:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:0.72rem;font-weight:600;color:var(--text-muted)">CALIFICACIÓN ACTUAL</span>
          <span style="font-size:0.82rem;font-weight:700;color:${calColor}">${calLabel}</span>
        </div>
        <div style="height:5px;background:var(--border);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:99px;transition:width 0.5s ease"></div>
        </div>
      </div>
      <div class="materia-card-footer" style="margin-top:8px">
        <span class="badge-estatus badge-pendiente">${i.tipo_curso || "Ordinario"}</span>
        <iconify-icon icon="lucide:chevron-right" style="margin-left:auto;color:var(--text-muted)"></iconify-icon>
      </div>
    </div>
  `;
    })
    .join("");
}

function poblarFiltros() {
  const periodos = [
    ...new Set(todasInscripciones.map((i) => i.periodo).filter(Boolean)),
  ];
  const sel = document.getElementById("filtroPeriodo");
  periodos.forEach(
    (p) => (sel.innerHTML += `<option value="${p}">${p}</option>`),
  );
}

function filtrarHistorial() {
  const filtroPer = document.getElementById("filtroPeriodo").value;
  const filtradas = todasInscripciones.filter(
    (i) => !filtroPer || i.periodo === filtroPer,
  );
  renderTablaHistorial(filtradas);
}

function renderTablaHistorial(insc) {
  const tbody = document.getElementById("tablaHistorial");
  tbody.innerHTML = "";
  if (!insc.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">Sin calificaciones registradas aún.</td></tr>`;
    return;
  }
  insc.forEach((i) => {
    const cal = i.calificacion_oficial;
    const est = i.estatus_final;
    const color =
      est === "Aprobado"
        ? "aprobado"
        : est === "Reprobado"
          ? "reprobado"
          : "pendiente";
    const badgeEst =
      est === "Aprobado"
        ? "badge-aprobado"
        : est === "Reprobado"
          ? "badge-reprobado"
          : "badge-pendiente";
    tbody.innerHTML += `
      <tr>
        <td><strong>${i.nombre_materia}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${i.clave_materia || ""}</span></td>
        <td style="font-size:0.82rem;color:var(--text-muted)">${i.periodo || "—"} ${i.anio || ""}</td>
        <td style="font-size:0.82rem">${i.nombre_maestro || "—"}</td>
        <td><span class="badge-estatus badge-guardado">${i.tipo_curso || "Ordinario"}</span></td>
        <td><div class="cal-final ${color}" style="display:inline-flex">${cal ?? "Pendiente"}</div></td>
        <td><span class="badge-estatus ${badgeEst}">${est || "En curso"}</span></td>
      </tr>
    `;
  });
}

function poblarSelectGrupos() {
  const sel = document.getElementById("filtroGrupoUnidades");
  todasInscripciones.forEach((i) => {
    sel.innerHTML += `<option value="${i.id_grupo}">${i.nombre_materia} — ${i.periodo || ""}</option>`;
  });
}

function seleccionarGrupo(id) {
  document.getElementById("filtroGrupoUnidades").value = id;
  cargarUnidades();
  document
    .getElementById("filtroGrupoUnidades")
    .closest(".card")
    .scrollIntoView({ behavior: "smooth" });
}

async function cargarUnidades() {
  const id_grupo = document.getElementById("filtroGrupoUnidades").value;
  const wrap = document.getElementById("tablaUnidadesWrap");
  if (!id_grupo) {
    wrap.innerHTML = `<div class="empty-state"><iconify-icon icon="mdi:clipboard-list-outline"></iconify-icon><p>Selecciona una materia</p></div>`;
    return;
  }
  wrap.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted)"><iconify-icon icon="mdi:loading" style="animation:spin 1s linear infinite"></iconify-icon></div>`;
  try {
    const r = await fetch(`${BASE}/api/calificaciones/alumno/${no_control}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const todas = await r.json();
    const delGrupo = todas.filter((c) => c.id_grupo == id_grupo);
    if (!delGrupo.length) {
      wrap.innerHTML = `<div class="empty-state"><iconify-icon icon="mdi:clipboard-off-outline"></iconify-icon><p>Aún no hay calificaciones de unidades para esta materia.</p></div>`;
      return;
    }
    const filas = delGrupo
      .map((c) => {
        const cal = c.calificacion_unidad_final;
        const hasCal = cal !== null && cal !== undefined;
        const pct = hasCal ? Math.min(100, Math.max(0, parseFloat(cal))) : 0;
        const color =
          c.estatus_unidad === "Aprobada"
            ? "aprobado"
            : c.estatus_unidad === "Reprobada"
              ? "reprobado"
              : "pendiente";
        const badgeClass =
          c.estatus_unidad === "Aprobada"
            ? "badge-aprobado"
            : c.estatus_unidad === "Reprobada"
              ? "badge-reprobado"
              : "badge-pendiente";
        const barColor =
          c.estatus_unidad === "Aprobada"
            ? "var(--success)"
            : c.estatus_unidad === "Reprobada"
              ? "var(--danger)"
              : "var(--border)";
        return `<tr style="cursor:pointer" onclick="toggleDesglose('${c.id_unidad}','${id_grupo}',this)">
          <td>
            <span style="margin-right:6px;font-size:0.7rem;color:var(--text-muted)">▶</span>
            <strong>${c.nombre_unidad}</strong>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:10px;min-width:120px">
              <div class="cal-final ${color}" style="display:inline-flex;min-width:44px">${hasCal ? parseFloat(cal).toFixed(1) : "—"}</div>
              <div style="flex:1;height:5px;background:var(--border);border-radius:99px;overflow:hidden;min-width:60px">
                <div style="height:100%;width:${pct}%;background:${barColor};border-radius:99px;transition:width 0.5s ease"></div>
              </div>
            </div>
          </td>
          <td><span class="badge-estatus ${badgeClass}">${c.estatus_unidad}</span></td>
        </tr>
        <tr id="desglose-${c.id_unidad}" style="display:none">
          <td colspan="3" style="padding:0">
            <div id="desglose-wrap-${c.id_unidad}" style="padding:12px 16px;background:var(--bg-alt,#f8fafc);border-bottom:1px solid var(--border)">
              <span style="color:var(--text-muted);font-size:0.82rem">Cargando desglose…</span>
            </div>
          </td>
        </tr>`;
      })
      .join("");
    wrap.innerHTML = `<div class="tabla-wrapper"><table>
      <thead><tr><th>Unidad <span style="font-size:0.72rem;color:var(--text-muted);font-weight:400">(click para ver detalle)</span></th><th>Calificación</th><th>Estatus</th></tr></thead>
      <tbody>${filas}</tbody>
    </table></div>`;
  } catch (_) {
    wrap.innerHTML = `<div class="empty-state"><p>No se pudo cargar el detalle.</p></div>`;
  }
}

async function toggleDesglose(id_unidad, id_grupo, rowEl) {
  const desgRow = document.getElementById(`desglose-${id_unidad}`);
  const wrap = document.getElementById(`desglose-wrap-${id_unidad}`);
  const arrow = rowEl.querySelector("span");
  if (!desgRow) return;

  if (desgRow.style.display !== "none") {
    desgRow.style.display = "none";
    if (arrow) arrow.textContent = "▶";
    return;
  }

  desgRow.style.display = "";
  if (arrow) arrow.textContent = "▼";

  try {
    const r = await fetch(
      `${BASE}/api/calificaciones/desglose/${no_control}/${id_grupo}/${id_unidad}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await r.json();
    if (!data.actividades?.length) {
      wrap.innerHTML = `<p style="font-size:0.82rem;color:var(--text-muted);margin:0">No hay actividades registradas en esta unidad.</p>`;
      return;
    }
    const filas = data.actividades
      .map((a) => {
        const np = a.estatus === "NP";
        const calColor = np
          ? "var(--text-muted)"
          : parseFloat(a.calificacion) >= 70
            ? "var(--success)"
            : "var(--danger)";
        return `<tr>
        <td style="font-size:0.82rem">${a.nombre_actividad}</td>
        <td style="font-size:0.78rem;text-align:center;color:var(--text-muted)">${a.ponderacion}%</td>
        <td style="text-align:center;font-weight:600;color:${calColor}">${np ? "NP" : a.calificacion}</td>
        <td style="text-align:center;font-size:0.78rem;color:var(--text-muted)">${a.aporte_ponderado} pts</td>
      </tr>`;
      })
      .join("");
    wrap.innerHTML = `
      <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Desglose de actividades</p>
      <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 8px;font-weight:600;color:var(--text-muted)">Actividad</th>
            <th style="text-align:center;padding:4px 8px;font-weight:600;color:var(--text-muted)">Peso</th>
            <th style="text-align:center;padding:4px 8px;font-weight:600;color:var(--text-muted)">Calificación</th>
            <th style="text-align:center;padding:4px 8px;font-weight:600;color:var(--text-muted)">Aporte</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
        <tfoot>
          <tr style="border-top:2px solid var(--border)">
            <td colspan="3" style="padding:6px 8px;font-weight:700;font-size:0.82rem;color:var(--text-main)">Promedio ponderado calculado</td>
            <td style="text-align:center;font-weight:700;color:${data.promedioCalculado >= 70 ? "var(--success)" : "var(--danger)"}">
              ${data.promedioCalculado.toFixed(1)}
            </td>
          </tr>
        </tfoot>
      </table>
      <p style="font-size:0.72rem;color:var(--text-muted);margin:8px 0 0">
        Fórmula: Σ (calificación × peso%) = promedio ponderado de la unidad
      </p>`;
  } catch (_) {
    wrap.innerHTML = `<p style="font-size:0.82rem;color:var(--danger);margin:0">No se pudo cargar el desglose.</p>`;
  }
}

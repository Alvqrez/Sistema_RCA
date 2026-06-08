const tk = () => localStorage.getItem("token");

let todosGrupos = [];
let reporteActual = null;
let alumnosRenderizados = [];

function toast(msg, tipo = "info") {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const t = document.createElement("div");
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

document.addEventListener("DOMContentLoaded", async () => {
  soloPermitido("administrador", "maestro");
  await Promise.all([poblarFiltroPeriodo(), cargarGrupos()]);
});

async function cargarGrupos() {
  try {
    const r = await fetch(`${API_URL}/api/reportes/grupos`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (!r.ok) throw new Error();
    todosGrupos = await r.json();
    filtrarGrupos();
  } catch {
    document.getElementById("gruposGrid").innerHTML =
      `<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--danger)">
        <iconify-icon icon="lucide:wifi-off"></iconify-icon> No se pudieron cargar los grupos
      </td></tr>`;
  }
}

async function poblarFiltroPeriodo() {
  try {
    const r = await fetch(`${API_URL}/api/periodos`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (!r.ok) throw new Error();
    const periodos = await r.json();
    const sel = document.getElementById("filtroPeriodo");
    sel.innerHTML = `<option value="">Todos los periodos</option>`;
    periodos.forEach((p) => {
      const etiqueta =
        p.estatus === "Vigente" ? " ✓" : p.estatus === "Proximo" ? " (próximo)" : "";
      sel.innerHTML += `<option value="${p.id_periodo}">${p.descripcion} (${p.anio})${etiqueta}</option>`;
    });
  } catch {
    const sel = document.getElementById("filtroPeriodo");
    const periodos = [
      ...new Map(todosGrupos.map((g) => [g.id_periodo, g.periodo])).entries(),
    ];
    periodos.forEach(([id, desc]) => {
      sel.innerHTML += `<option value="${id}">${desc ?? "Sin periodo"}</option>`;
    });
  }
}

function filtrarGrupos() {
  const q = document.getElementById("filtroGrupo").value.toLowerCase();
  const per = document.getElementById("filtroPeriodo").value;
  const est = document.getElementById("filtroEstatus").value;
  const datos = todosGrupos.filter((g) => {
    const matchQ =
      !q ||
      g.nombre_materia.toLowerCase().includes(q) ||
      (g.nombre_maestro ?? "").toLowerCase().includes(q);
    const matchP = !per || String(g.id_periodo) === per;
    const matchE = !est || g.estatus === est;
    return matchQ && matchP && matchE;
  });
  renderGruposGrid(datos);
}

function renderGruposGrid(grupos) {
  const tbody = document.getElementById("gruposGrid");
  const contador = document.getElementById("contadorGrupos");
  if (contador) contador.textContent = `${grupos.length} grupo${grupos.length !== 1 ? "s" : ""}`;

  if (!grupos.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--text-muted)">
      <iconify-icon icon="lucide:search-x"></iconify-icon><br/>Sin grupos que coincidan
    </td></tr>`;
    return;
  }

  const estatusColor = {
    Activo: "badge-success",
    Cerrado: "badge-warning",
    Cancelado: "badge-danger",
  };

  tbody.innerHTML = grupos
    .map(
      (g) => `
    <tr class="grupo-list-row" onclick="cargarReporte(${g.id_grupo})" id="grow-${g.id_grupo}">
      <td>
        <div class="grl-materia">${esc(g.nombre_materia)}</div>
        <div class="grl-clave">${esc(g.clave_materia ?? "")} · Grupo #${g.id_grupo}</div>
      </td>
      <td>
        <div class="grl-maestro"><iconify-icon icon="lucide:user" style="font-size:0.8rem;margin-right:4px"></iconify-icon>${esc(g.nombre_maestro ?? "—")}</div>
      </td>
      <td>
        <div class="grl-periodo"><iconify-icon icon="lucide:calendar" style="font-size:0.8rem;margin-right:4px"></iconify-icon>${esc(g.periodo ?? "—")} ${esc(g.anio ?? "")}</div>
      </td>
      <td style="text-align:center">
        <span class="badge ${estatusColor[g.estatus] ?? "badge-info"}">${esc(g.estatus ?? "—")}</span>
      </td>
      <td style="text-align:right">
        <iconify-icon icon="lucide:chevron-right" class="grl-arrow"></iconify-icon>
      </td>
    </tr>`,
    )
    .join("");
}

async function cargarReporte(id_grupo) {
  // Marcar fila seleccionada
  document.querySelectorAll(".grupo-list-row").forEach((r) => r.classList.remove("selected"));
  const row = document.getElementById(`grow-${id_grupo}`);
  if (row) row.classList.add("selected");

  try {
    const r = await fetch(`${API_URL}/api/reportes/grupo/${id_grupo}`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (!r.ok) throw new Error("No se pudo cargar el reporte");
    reporteActual = await r.json();
    mostrarReporte(reporteActual);
  } catch (e) {
    toast(e.message, "error");
  }
}

function mostrarReporte({ grupo, unidades, alumnos, stats }) {
  document.getElementById("reporteContainer").style.display = "block";
  document.getElementById("selectorCard").style.marginBottom = "20px";

  document.getElementById("infoMateria").textContent =
    `${grupo.nombre_materia} (${grupo.clave_materia})`;
  document.getElementById("infoMaestro").textContent = grupo.nombre_maestro ?? "—";
  document.getElementById("infoPeriodo").textContent =
    `${grupo.periodo ?? "—"} ${grupo.anio ?? ""}`;

  const estatusBadge = document.getElementById("infoEstatus");
  const colores = { Activo: "badge-success", Cerrado: "badge-warning", Cancelado: "badge-danger" };
  estatusBadge.className = `badge ${colores[grupo.estatus] ?? "badge-info"}`;
  estatusBadge.textContent = grupo.estatus ?? "—";

  document.getElementById("sTotal").textContent = stats.total;
  document.getElementById("sAprobados").textContent = stats.aprobados;
  document.getElementById("sReprobados").textContent = stats.reprobados;
  document.getElementById("sPendientes").textContent = stats.pendientes;
  document.getElementById("sPromedio").textContent = stats.promGrupo ?? "—";

  alumnosRenderizados = alumnos;
  renderTablaReporte(alumnos, unidades);
  document.getElementById("filtroAlumnoReporte").value = "";

  // Scroll al reporte
  document.getElementById("reporteContainer").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderTablaReporte(alumnos, unidades) {
  const thead = document.getElementById("headReporte");
  const tbody = document.getElementById("bodyReporte");
  const uns = (unidades ?? reporteActual?.unidades ?? []).map((u, i) => ({
    ...u,
    numero_unidad: u.numero_unidad ?? i + 1,
  }));

  thead.innerHTML = `<tr>
    <th>Alumno</th>
    <th>No. Control</th>
    ${uns.map((u) => `<th style="text-align:center">Unidad ${u.numero_unidad}<br><small style="font-weight:400;color:var(--text-muted)">${esc(u.nombre_unidad)}</small></th>`).join("")}
    <th style="text-align:center">Promedio</th>
    <th style="text-align:center">Cal. oficial</th>
    <th style="text-align:center">Estado</th>
  </tr>`;

  if (!alumnos.length) {
    tbody.innerHTML = `<tr><td colspan="${6 + uns.length}"><div class="empty-state">
      <iconify-icon icon="lucide:users-x"></iconify-icon><p>Sin alumnos inscritos</p></div></td></tr>`;
    return;
  }

  const estatusClase = { Aprobado: "badge-success", Reprobado: "badge-danger" };
  tbody.innerHTML = alumnos
    .map((a) => {
      const iniciales =
        `${a.nombre_completo.split(",")[1]?.trim()[0] ?? ""}${a.nombre_completo[0] ?? ""}`.toUpperCase();
      const calUnidades = uns
        .map((u) => {
          const uc = a.unidades?.[u.id_unidad];
          if (!uc) return `<td style="text-align:center;color:var(--text-muted)">—</td>`;
          const cls =
            uc.estatus === "Aprobada"
              ? "cal-aprobado"
              : uc.estatus === "Reprobada"
                ? "cal-reprobado"
                : "cal-pendiente";
          return `<td class="reporte-cal ${cls}">${uc.calificacion_unidad_final ?? "—"}</td>`;
        })
        .join("");

      const calFinal =
        a.calificacion_oficial != null
          ? `<td class="reporte-cal ${a.estatus_final === "Aprobado" ? "cal-aprobado" : "cal-reprobado"}">${a.calificacion_oficial}</td>`
          : `<td style="text-align:center;color:var(--text-muted)">—</td>`;

      const promUnidades =
        a.promedio_unidades != null
          ? `<td class="reporte-cal ${parseFloat(a.promedio_unidades) >= 70 ? "cal-aprobado" : "cal-reprobado"}">${parseFloat(a.promedio_unidades).toFixed(1)}</td>`
          : `<td style="text-align:center;color:var(--text-muted)">—</td>`;

      const badge = a.estatus_final
        ? `<span class="badge ${estatusClase[a.estatus_final] ?? "badge-warning"}">${a.estatus_final}</span>`
        : `<span class="badge badge-warning">Pendiente</span>`;

      return `<tr>
        <td><div class="avatar-cell">
          <div class="avatar">${esc(iniciales)}</div>
          <span style="font-size:0.875rem">${esc(a.nombre_completo)}</span>
        </div></td>
        <td><code>${a.no_control}</code></td>
        ${calUnidades}
        ${promUnidades}
        ${calFinal}
        <td style="text-align:center">${badge}</td>
      </tr>`;
    })
    .join("");
}

function filtrarTablaReporte() {
  const q = document.getElementById("filtroAlumnoReporte").value.toLowerCase();
  const filtrados = alumnosRenderizados.filter(
    (a) =>
      !q ||
      a.nombre_completo.toLowerCase().includes(q) ||
      a.no_control.toLowerCase().includes(q),
  );
  renderTablaReporte(filtrados);
}

function volverSelector() {
  document.getElementById("reporteContainer").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exportarReporteCSV() {
  // Si hay un reporte de grupo abierto → exportar ese reporte detallado
  if (reporteActual) {
    const { grupo, unidades, alumnos } = reporteActual;

    const cols = ["no_control", "nombre_completo", "estatus_inscripcion",
      ...unidades.map((u) => u.id_unidad.toString()),
      "promedio_unidades", "calificacion_oficial", "estatus_final",
    ];
    const headers = ["No. Control", "Nombre Completo", "Estatus",
      ...unidades.map((u) => u.nombre_unidad),
      "Promedio Unidades", "Calificación Oficial", "Estatus Final",
    ];

    const datos = alumnos.map((a) => {
      const row = {
        no_control: a.no_control,
        nombre_completo: a.nombre_completo,
        estatus_inscripcion: a.estatus_inscripcion ?? "",
        promedio_unidades: a.promedio_unidades ?? "",
        calificacion_oficial: a.calificacion_oficial ?? "",
        estatus_final: a.estatus_final ?? "Pendiente",
      };
      unidades.forEach((u) => {
        const uc = a.unidades?.[u.id_unidad];
        row[u.id_unidad.toString()] = uc?.calificacion_unidad_final ?? "";
      });
      return row;
    });

    exportarXLSX(cols, headers, datos, `reporte_${grupo.clave_materia}_${grupo.id_grupo}`);
    toast("Reporte exportado correctamente");
    return;
  }

  // Sin reporte abierto → exportar la lista de grupos actualmente visible
  const gruposVisibles = alumnosRenderizados.length > 0
    ? alumnosRenderizados
    : todosGrupos;

  if (!gruposVisibles.length) {
    toast("No hay grupos para exportar", "error");
    return;
  }

  const cols = ["clave_materia", "nombre_materia", "nombre_maestro", "periodo", "anio", "estatus"];
  const headers = ["Clave", "Materia", "Docente", "Periodo", "Año", "Estatus"];
  const datos = todosGrupos.map((g) => ({
    clave_materia: g.clave_materia,
    nombre_materia: g.nombre_materia,
    nombre_maestro: g.nombre_maestro,
    periodo: g.periodo,
    anio: g.anio,
    estatus: g.estatus,
  }));

  exportarXLSX(cols, headers, datos, `lista_grupos_${new Date().toISOString().slice(0, 10)}`);
  toast("Lista de grupos exportada correctamente");
}

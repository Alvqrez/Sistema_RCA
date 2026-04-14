const BASE = "http://localhost:3000";
const tk = () => localStorage.getItem("token");

let todosGrupos = [];
let reporteActual = null; // { grupo, unidades, alumnos, stats }
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
  // Carga periodos y grupos en paralelo
  await Promise.all([poblarFiltroPeriodo(), cargarGrupos()]);
});

async function cargarGrupos() {
  try {
    const r = await fetch(`${BASE}/api/reportes/grupos`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (!r.ok) throw new Error();
    todosGrupos = await r.json();
    filtrarGrupos(); // renderiza la grid
  } catch {
    document.getElementById("gruposGrid").innerHTML =
      `<div class="empty-state"><iconify-icon icon="lucide:wifi-off"></iconify-icon><p>No se pudieron cargar los grupos</p></div>`;
  }
}

async function poblarFiltroPeriodo() {
  try {
    const r = await fetch(`${BASE}/api/periodos`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    if (!r.ok) throw new Error();
    const periodos = await r.json();

    const sel = document.getElementById("filtroPeriodo");
    // Mantener la opción vacía inicial
    sel.innerHTML = `<option value="">Todos los periodos</option>`;
    periodos.forEach((p) => {
      const etiqueta =
        p.estatus === "Vigente"
          ? " ✓"
          : p.estatus === "Proximo"
            ? " (próximo)"
            : "";
      sel.innerHTML += `<option value="${p.id_periodo}">${p.descripcion} (${p.anio})${etiqueta}</option>`;
    });
  } catch {
    // Si falla la API de periodos, construye desde los grupos como fallback
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
  const datos = todosGrupos.filter((g) => {
    const matchQ =
      !q ||
      g.nombre_materia.toLowerCase().includes(q) ||
      (g.nombre_maestro ?? "").toLowerCase().includes(q);
    const matchP = !per || String(g.id_periodo) === per;
    return matchQ && matchP;
  });
  renderGruposGrid(datos);
}

function renderGruposGrid(grupos) {
  const grid = document.getElementById("gruposGrid");
  if (!grupos.length) {
    grid.innerHTML = `<div class="empty-state"><iconify-icon icon="lucide:search-x"></iconify-icon><p>Sin grupos que coincidan</p></div>`;
    return;
  }
  const estatusColor = {
    Activo: "badge-success",
    Cerrado: "badge-warning",
    Cancelado: "badge-danger",
  };
  grid.innerHTML = grupos
    .map(
      (g) => `
    <div class="group-card" onclick="cargarReporte(${g.id_grupo})">
      <h3>${g.nombre_materia}</h3>
      <p><iconify-icon icon="lucide:user"></iconify-icon> ${g.nombre_maestro ?? "—"}</p>
      <p style="margin-top:4px"><iconify-icon icon="lucide:calendar"></iconify-icon> ${g.periodo ?? "—"} ${g.anio ?? ""}</p>
      <span class="group-badge badge ${estatusColor[g.estatus] ?? "badge-info"}">${g.estatus ?? "—"}</span>
    </div>`,
    )
    .join("");
}

async function cargarReporte(id_grupo) {
  const grid = document.getElementById("gruposGrid");
  // marcar seleccionado
  grid
    .querySelectorAll(".group-card")
    .forEach((c) => c.classList.remove("selected"));
  const card = [...grid.querySelectorAll(".group-card")].find((c) =>
    c.getAttribute("onclick").includes(id_grupo),
  );
  if (card) card.classList.add("selected");

  try {
    const r = await fetch(`${BASE}/api/reportes/grupo/${id_grupo}`, {
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
  // Mostrar contenedor
  document.getElementById("reporteContainer").style.display = "block";
  document.getElementById("exportActions").style.display = "flex";
  document.getElementById("selectorCard").style.marginBottom = "20px";

  // Info del grupo
  document.getElementById("infoMateria").textContent =
    `${grupo.nombre_materia} (${grupo.clave_materia})`;
  document.getElementById("infoMaestro").textContent =
    grupo.nombre_maestro ?? "—";
  document.getElementById("infoPeriodo").textContent =
    `${grupo.periodo ?? "—"} ${grupo.anio ?? ""}`;
  const estatusBadge = document.getElementById("infoEstatus");
  const colores = {
    Activo: "badge-success",
    Cerrado: "badge-warning",
    Cancelado: "badge-danger",
  };
  estatusBadge.className = `badge ${colores[grupo.estatus] ?? "badge-info"}`;
  estatusBadge.textContent = grupo.estatus ?? "—";

  // Stats
  document.getElementById("sTotal").textContent = stats.total;
  document.getElementById("sAprobados").textContent = stats.aprobados;
  document.getElementById("sReprobados").textContent = stats.reprobados;
  document.getElementById("sPendientes").textContent = stats.pendientes;
  document.getElementById("sPromedio").textContent = stats.promGrupo ?? "—";

  alumnosRenderizados = alumnos;
  renderTablaReporte(alumnos, unidades);
  document.getElementById("filtroAlumnoReporte").value = "";
}

function renderTablaReporte(alumnos, unidades) {
  const thead = document.getElementById("headReporte");
  const tbody = document.getElementById("bodyReporte");
  // Agrega numero_unidad en cliente si no viene del servidor
  const uns = (unidades ?? reporteActual?.unidades ?? []).map((u, i) => ({
    ...u,
    numero_unidad: u.numero_unidad ?? i + 1,
  }));

  thead.innerHTML = `<tr>
        <th>Alumno</th>
        <th>No. Control</th>
        ${uns.map((u) => `<th style="text-align:center">Unidad ${u.numero_unidad}<br><small style="font-weight:400;color:var(--text-muted)">${u.nombre_unidad}</small></th>`).join("")}
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
          if (!uc)
            return `<td style="text-align:center;color:var(--text-muted)">—</td>`;
          const cls =
            uc.estatus === "Aprobada"
              ? "cal-aprobado"
              : uc.estatus === "Reprobada"
                ? "cal-reprobado"
                : "cal-pendiente";
          return `<td class="reporte-cal ${cls}">${uc.calificacion ?? "—"}</td>`;
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
        <div class="avatar">${iniciales}</div>
        <span style="font-size:0.875rem">${a.nombre_completo}</span>
      </div></td>
      <td><code>${a.matricula}</code></td>
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
      a.matricula.toLowerCase().includes(q),
  );
  renderTablaReporte(filtrados);
}

function volverSelector() {
  document.getElementById("reporteContainer").style.display = "none";
  document.getElementById("exportActions").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exportarReporteCSV() {
  if (!reporteActual) return;
  const { grupo, unidades, alumnos } = reporteActual;
  const colBase = ["matricula", "nombre_completo", "estatus_inscripcion"];
  const colUnidades = unidades.map((u) => u.nombre_unidad);
  const cols = [
    ...colBase,
    ...colUnidades,
    "promedio_unidades",
    "calificacion_oficial",
    "estatus_final",
  ];

  const rows = [cols.join(",")];
  alumnos.forEach((a) => {
    const unidadesVals = unidades.map((u) => {
      const uc = a.unidades?.[u.id_unidad];
      return uc?.calificacion ?? "";
    });
    rows.push(
      [
        a.matricula,
        `"${a.nombre_completo}"`,
        a.estatus_inscripcion ?? "",
        ...unidadesVals,
        a.promedio_unidades ?? "",
        a.calificacion_oficial ?? "",
        a.estatus_final ?? "Pendiente",
      ].join(","),
    );
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte_${grupo.clave_materia}_${grupo.id_grupo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Reporte exportado correctamente");
}

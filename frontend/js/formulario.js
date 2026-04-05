// =====================================================================
//  formulario.js — Lógica del Formulario de Evaluación
//  Guardar en: frontend/js/formulario.js
// =====================================================================

// ── CONSTANTES ────────────────────────────────────────────────────────
const RUBROS  = ['actividad', 'examen', 'asistencia', 'participacion'];
const LABELS  = {
  actividad:     'Actividades',
  examen:        'Examen',
  asistencia:    'Asistencia',
  participacion: 'Participación'
};
const COLORES = {
  actividad:     '#3b82f6',
  examen:        '#f59e0b',
  asistencia:    '#10b981',
  participacion: '#8b5cf6'
};

// ── ESTADO GLOBAL ─────────────────────────────────────────────────────
let estado = {
  grupoId:          null,
  nombreGrupo:      '',
  numUnidades:      3,
  configurado:      false,   // true cuando ya se guardó la configuración
  modoEdicion:      false,
  cambiosPendientes: false,
  unidadActiva:     0,       // índice 0-based de la unidad visible

  // ponderaciones[u] = { actividad, examen, asistencia, participacion }
  ponderaciones: [],

  // alumnos = [{ matricula, nombre }]
  alumnos: [],

  // calificaciones[u][matricula] = { actividad, examen, asistencia, participacion, bonus }
  calificaciones: [],
};

// ═══════════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  cargarGruposSelect();
});

async function cargarGruposSelect() {
  const sel = document.getElementById('selGrupo');
  try {
    // En producción reemplaza con:
    // const grupos = await apiGet('/api/grupos');
    const grupos = [
      { id_grupo: 1, nombre_materia: 'Cálculo Integral',  nombre_maestro: 'García López'   },
      { id_grupo: 2, nombre_materia: 'Álgebra Lineal',    nombre_maestro: 'Martínez Soto'  },
      { id_grupo: 3, nombre_materia: 'Programación I',    nombre_maestro: 'López Torres'   },
    ];
    grupos.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id_grupo;
      opt.textContent = `${g.nombre_materia} — ${g.nombre_maestro}`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.warn('No se pudo cargar grupos del API, usando datos de ejemplo.');
  }
}

// ── Cuando el maestro selecciona un grupo ─────────────────────────────
function cargarGrupo() {
  const sel = document.getElementById('selGrupo');
  const id  = sel.value;

  if (!id) {
    document.getElementById('emptyConfig').style.display        = 'block';
    document.getElementById('seccionPonderaciones').style.display = 'none';
    document.getElementById('seccionCalificaciones').style.display = 'none';
    document.getElementById('badgeGrupo').textContent = 'Sin grupo seleccionado';
    actualizarEstadoBadge('sin-config', 'Sin configurar');
    return;
  }

  estado.grupoId     = parseInt(id);
  estado.nombreGrupo = sel.options[sel.selectedIndex].text;

  document.getElementById('badgeGrupo').textContent               = estado.nombreGrupo;
  document.getElementById('emptyConfig').style.display            = 'none';
  document.getElementById('seccionPonderaciones').style.display   = 'block';

  cargarAlumnos();
  generarPonderaciones();
}

// ── Cargar alumnos del grupo ───────────────────────────────────────────
function cargarAlumnos() {
  // En producción reemplaza con:
  // const alumnos = await apiGet(`/api/grupos/${estado.grupoId}/alumnos`);
  estado.alumnos = [
    { matricula: '21VT0001', nombre: 'Pérez García, Juan'       },
    { matricula: '21VT0002', nombre: 'López Martínez, Ana'      },
    { matricula: '21VT0003', nombre: 'Ramírez Torres, Carlos'   },
    { matricula: '21VT0004', nombre: 'Hernández Cruz, María'    },
    { matricula: '21VT0005', nombre: 'González Reyes, Luis'     },
    { matricula: '21VT0006', nombre: 'Sánchez Morales, Diana'   },
  ];
}

// ═══════════════════════════════════════════════════════════════════════
//  PASO 1 — PONDERACIONES
// ═══════════════════════════════════════════════════════════════════════
function generarPonderaciones() {
  const n = parseInt(document.getElementById('numUnidades').value) || 3;
  estado.numUnidades = n;

  // Solo reinicia si aún no se ha configurado
  if (!estado.configurado) {
    estado.ponderaciones = [];
    for (let u = 0; u < n; u++) {
      estado.ponderaciones.push({ actividad: 25, examen: 50, asistencia: 15, participacion: 10 });
    }
  }

  renderTabsConfig(n);
  renderPanelesConfig(n);
  activarTabConfig(0);
}

function renderTabsConfig(n) {
  const cont = document.getElementById('tabsConfig');
  cont.innerHTML = '';
  for (let u = 0; u < n; u++) {
    const btn = document.createElement('button');
    btn.className   = 'tab-btn';
    btn.textContent = `Unidad ${u + 1}`;
    btn.id          = `tabCfg_${u}`;
    btn.onclick     = () => activarTabConfig(u);
    cont.appendChild(btn);
  }
}

function renderPanelesConfig(n) {
  const cont = document.getElementById('panelesConfig');
  cont.innerHTML = '';

  for (let u = 0; u < n; u++) {
    const pond  = estado.ponderaciones[u] || { actividad: 25, examen: 50, asistencia: 15, participacion: 10 };
    const panel = document.createElement('div');
    panel.className = 'ponderacion-panel';
    panel.id        = `panelCfg_${u}`;

    panel.innerHTML = `
      <div class="ponderacion-grid">
        ${RUBROS.map(r => `
          <div class="pond-item">
            <div class="pond-item-label">
              <span class="pond-dot" style="background:${COLORES[r]}"></span>
              ${LABELS[r]}
            </div>
            <div style="display:flex;align-items:baseline;gap:4px;">
              <input type="number" class="pond-input" min="0" max="100"
                     value="${pond[r]}"
                     data-unidad="${u}" data-rubro="${r}"
                     oninput="actualizarSuma(${u})" />
              <span class="pond-suffix">%</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="suma-bar warn" id="sumaBar_${u}">
        <iconify-icon icon="mdi:sigma"></iconify-icon>
        <span>Total: <strong id="sumaVal_${u}">100</strong>%</span>
        <span id="sumaMensaje_${u}" style="margin-left:auto;font-size:0.82rem;"></span>
      </div>
    `;

    cont.appendChild(panel);
    actualizarSuma(u);
  }
}

function activarTabConfig(idx) {
  estado.unidadActiva = idx;
  document.querySelectorAll('.tab-btn').forEach((b, i) =>
    b.classList.toggle('active', i === idx)
  );
  document.querySelectorAll('.ponderacion-panel').forEach((p, i) =>
    p.classList.toggle('active', i === idx)
  );
}

// ── Actualiza la barra de suma en tiempo real ─────────────────────────
function actualizarSuma(u) {
  let suma = 0;
  const inputs = document.querySelectorAll(`.pond-input[data-unidad="${u}"]`);
  inputs.forEach(inp => {
    const val = parseFloat(inp.value) || 0;
    estado.ponderaciones[u][inp.dataset.rubro] = val;
    suma += val;
  });

  const bar = document.getElementById(`sumaBar_${u}`);
  const val = document.getElementById(`sumaVal_${u}`);
  const msg = document.getElementById(`sumaMensaje_${u}`);
  val.textContent = suma.toFixed(1);

  if (Math.abs(suma - 100) < 0.01) {
    bar.className = 'suma-bar ok';
    bar.querySelector('iconify-icon').setAttribute('icon', 'mdi:check-circle');
    msg.textContent = '✓ Correcto';
  } else if (suma < 100) {
    bar.className = 'suma-bar warn';
    bar.querySelector('iconify-icon').setAttribute('icon', 'mdi:alert');
    msg.textContent = `Faltan ${(100 - suma).toFixed(1)}%`;
  } else {
    bar.className = 'suma-bar error';
    bar.querySelector('iconify-icon').setAttribute('icon', 'mdi:close-circle');
    msg.textContent = `Excede en ${(suma - 100).toFixed(1)}%`;
  }

  estado.cambiosPendientes = true;
}

// ── Valida que TODAS las unidades sumen 100% ──────────────────────────
function validarTodasPonderaciones() {
  for (let u = 0; u < estado.numUnidades; u++) {
    const pond = estado.ponderaciones[u];
    const suma = RUBROS.reduce((s, r) => s + (pond[r] || 0), 0);
    if (Math.abs(suma - 100) > 0.01) return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════
//  PASO 2 — TABLA DE CALIFICACIONES
// ═══════════════════════════════════════════════════════════════════════
function inicializarCalificaciones() {
  estado.calificaciones = [];
  for (let u = 0; u < estado.numUnidades; u++) {
    const mapa = {};
    estado.alumnos.forEach(a => {
      mapa[a.matricula] = { actividad: '', examen: '', asistencia: '', participacion: '', bonus: '' };
    });
    estado.calificaciones.push(mapa);
  }
}

function renderTabsTabla() {
  const cont = document.getElementById('tabsTabla');
  cont.innerHTML = '';
  for (let u = 0; u < estado.numUnidades; u++) {
    const btn = document.createElement('button');
    btn.className   = 'tab-unidad';
    btn.textContent = `Unidad ${u + 1}`;
    btn.id          = `tabTabla_${u}`;
    btn.onclick     = () => cambiarUnidadTabla(u);
    cont.appendChild(btn);
  }
}

function cambiarUnidadTabla(u) {
  guardarDatosTablaActual();
  estado.unidadActiva = u;
  document.querySelectorAll('.tab-unidad').forEach((b, i) =>
    b.classList.toggle('active', i === u)
  );
  renderTabla(u);
  actualizarResumenPond(u);
}

// ── Guarda en memoria los valores de la tabla antes de cambiar de tab ─
function guardarDatosTablaActual() {
  const u     = estado.unidadActiva;
  const tbody = document.getElementById('tbodyCalificaciones');
  if (!tbody) return;

  tbody.querySelectorAll('tr').forEach(tr => {
    const mat = tr.dataset.matricula;
    if (!mat) return;
    RUBROS.forEach(r => {
      const inp = tr.querySelector(`.cal-input[data-rubro="${r}"]`);
      if (inp) estado.calificaciones[u][mat][r] = inp.value;
    });
    const bonusInp = tr.querySelector('.bonus-input');
    if (bonusInp) estado.calificaciones[u][mat].bonus = bonusInp.value;
  });
}

// ── Renderiza la tabla para la unidad u ───────────────────────────────
function renderTabla(u) {
  const pond  = estado.ponderaciones[u];
  const thead = document.getElementById('theadCalificaciones');
  const tbody = document.getElementById('tbodyCalificaciones');

  thead.innerHTML = `
    <tr>
      <th class="col-alumno">Alumno / Matrícula</th>
      ${RUBROS.map(r => `
        <th class="col-${r}">
          ${LABELS[r]}
          <span class="th-pond">${pond[r]}%</span>
        </th>
      `).join('')}
      <th class="col-bonus">Bonus<span class="th-pond">pts extra</span></th>
      <th class="col-final">Calificación Final<span class="th-pond">calculada</span></th>
    </tr>
  `;

  tbody.innerHTML = '';
  estado.alumnos.forEach(a => {
    const cal = estado.calificaciones[u][a.matricula];
    const tr  = document.createElement('tr');
    tr.dataset.matricula = a.matricula;

    tr.innerHTML = `
      <td class="td-alumno">
        <div style="font-weight:600;">${a.nombre}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${a.matricula}</div>
      </td>
      ${RUBROS.map(r => `
        <td>
          <input class="cal-input" type="number" min="0" max="100"
                 placeholder="—"
                 data-rubro="${r}"
                 value="${cal[r]}"
                 oninput="calcularFila(this)" />
        </td>
      `).join('')}
      <td>
        <input class="bonus-input" type="number" min="0" max="30"
               placeholder="0"
               value="${cal.bonus}"
               oninput="calcularFila(this)" />
      </td>
      <td>
        <div class="cal-final pendiente" id="final_${a.matricula}_${u}">—</div>
      </td>
    `;
    tbody.appendChild(tr);

    // Si ya hay valores, calcular al cargar
    if (RUBROS.some(r => cal[r] !== '')) {
      calcularFilaPorMatricula(a.matricula, u);
    }
  });
}

// ── Recalcula la fila al escribir ─────────────────────────────────────
function calcularFila(inputEl) {
  const mat = inputEl.closest('tr').dataset.matricula;
  estado.cambiosPendientes = true;

  // Marcar en rojo si está fuera de rango
  if (inputEl.classList.contains('cal-input')) {
    const v = parseFloat(inputEl.value);
    inputEl.classList.toggle('invalid', !isNaN(v) && (v < 0 || v > 100));
  }

  calcularFilaPorMatricula(mat, estado.unidadActiva);
}

function calcularFilaPorMatricula(mat, u) {
  const tr = document.querySelector(`tr[data-matricula="${mat}"]`);
  if (!tr) return;

  const pond = estado.ponderaciones[u];
  let allEmpty = true;
  let calFinal = 0;

  RUBROS.forEach(r => {
    const inp = tr.querySelector(`.cal-input[data-rubro="${r}"]`);
    const v   = parseFloat(inp?.value) || 0;
    if (inp?.value !== '') allEmpty = false;
    calFinal += v * (pond[r] / 100);
  });

  const bonusInp = tr.querySelector('.bonus-input');
  const bonus    = parseFloat(bonusInp?.value) || 0;
  if (bonusInp?.value !== '') allEmpty = false;

  calFinal = Math.min(100, calFinal + bonus);
  calFinal = Math.round(calFinal * 100) / 100;

  const celda = document.getElementById(`final_${mat}_${u}`);
  if (!celda) return;

  if (allEmpty) {
    celda.className   = 'cal-final pendiente';
    celda.textContent = '—';
  } else {
    celda.className   = `cal-final ${calFinal >= 60 ? 'aprobado' : 'reprobado'}`;
    celda.textContent = calFinal.toFixed(1);
  }
}

// ── Chips de resumen de ponderación arriba de la tabla ───────────────
function actualizarResumenPond(u) {
  const pond = estado.ponderaciones[u];
  const cont = document.getElementById('resumenPond');
  cont.innerHTML = `
    <span class="info-chip">
      <iconify-icon icon="mdi:school-outline"></iconify-icon>Unidad ${u + 1}
    </span>
    ${RUBROS.map(r =>
      `<span class="pond-chip chip-${r.substring(0,3)}">${LABELS[r]} ${pond[r]}%</span>`
    ).join('')}
    <span class="pond-chip chip-bon">
      <iconify-icon icon="mdi:star-outline"></iconify-icon>Bonus +pts
    </span>
  `;
}

// ═══════════════════════════════════════════════════════════════════════
//  CONTROL DE MODALES
// ═══════════════════════════════════════════════════════════════════════
function pedirGuardarConfig() {
  if (!validarTodasPonderaciones()) {
    alert('⚠️ Todas las unidades deben sumar exactamente 100% antes de guardar.');
    return;
  }
  // Si ya estaba configurado, pide confirmación de modificación
  abrirModal(estado.configurado ? 'modalModificarConfig' : 'modalGuardarConfig');
}

function confirmarGuardarConfig() {
  cerrarModal('modalGuardarConfig');
  guardarConfiguracion();
}

function activarModoEdicionConfig() {
  cerrarModal('modalModificarConfig');
  document.getElementById('cardConfig').style.display            = 'block';
  document.getElementById('seccionPonderaciones').style.display  = 'block';
  estado.modoEdicion = true;
}

function pedirModificarConfig() {
  abrirModal('modalModificarConfig');
}

function pedirGuardarCalificaciones() {
  guardarDatosTablaActual();
  abrirModal('modalGuardarCal');
}

function confirmarGuardarCalificaciones() {
  cerrarModal('modalGuardarCal');
  // En producción: enviar al API
  // await apiPost('/api/calificaciones', { id_grupo: estado.grupoId, calificaciones: estado.calificaciones });
  console.log('Guardando calificaciones:', estado.calificaciones);
  alert('✅ Calificaciones guardadas correctamente.');
  estado.cambiosPendientes = false;
}

function pedirSalir() {
  if (estado.cambiosPendientes) {
    abrirModal('modalSalir');
  } else {
    confirmarSalir();
  }
}

function confirmarSalir() {
  cerrarModal('modalSalir');
  window.location.href = 'grupos.html';
}

function abrirModal(id)  { document.getElementById(id).classList.add('visible');    }
function cerrarModal(id) { document.getElementById(id).classList.remove('visible'); }

// Cerrar modal al hacer click fuera
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('visible');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  GUARDAR CONFIGURACIÓN → ACTIVAR TABLA
// ═══════════════════════════════════════════════════════════════════════
function guardarConfiguracion() {
  // En producción: await apiPost('/api/grupos/ponderaciones', { id_grupo: estado.grupoId, ponderaciones: estado.ponderaciones });
  console.log('Guardando configuración:', estado.ponderaciones);

  estado.configurado      = true;
  estado.cambiosPendientes = false;
  estado.modoEdicion      = false;

  actualizarEstadoBadge('configurado', 'Configurado');
  inicializarCalificaciones();

  // Ocultar config, mostrar tabla
  document.getElementById('seccionPonderaciones').style.display   = 'none';
  document.getElementById('emptyConfig').style.display            = 'none';
  document.getElementById('seccionCalificaciones').style.display  = 'block';

  // Bloquear selección de grupo y número de unidades
  document.getElementById('selGrupo').disabled    = true;
  document.getElementById('numUnidades').disabled = true;

  renderTabsTabla();
  cambiarUnidadTabla(0);
}

function actualizarEstadoBadge(cls, texto) {
  const badge = document.getElementById('estadoBadge');
  badge.className = `estado-badge ${cls}`;
  badge.innerHTML = `<span class="dot-live"></span>${texto}`;
}

// ── Aviso del navegador si se cierra con cambios pendientes ───────────
window.addEventListener('beforeunload', e => {
  if (estado.cambiosPendientes) {
    e.preventDefault();
    e.returnValue = '';
  }
});
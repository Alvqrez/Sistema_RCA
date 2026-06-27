// frontend/shared/js/notificaciones.js
// Motor unificado de notificaciones para RCA — admin, maestro y alumno
//
// USO desde cada página:
//   RCANotif.init({
//     btnId:        'btnNotifAdmin',       // botón campana
//     dropId:       'notifDropAdmin',      // panel dropdown
//     countId:      'notifCountAdmin',     // badge numérico en la campana
//     badgeId:      'notifDropBadge',      // badge dentro del panel
//     listId:       'notifDropListAdmin',  // contenedor de items
//     verTodasId:   'verTodasAdmin',       // enlace "Ver todas"
//     autoAlertasFn: async () => [...],   // función que devuelve alertas automáticas
//   });

(function (global) {
  "use strict";

  const DISMISSED_KEY = "rca_notifs_descartadas";
  const MAX_PREVIEW = 4;

  const COLORES = {
    danger:  { bg: "var(--danger-light)",  icon: "var(--danger)"  },
    warning: { bg: "var(--warning-light)", icon: "var(--warning)" },
    info:    { bg: "var(--primary-light)", icon: "var(--primary)" },
    success: { bg: "var(--success-light)", icon: "var(--success)" },
  };

  let _cfg = null;
  let _notifs = [];          // todas las notificaciones (DB + auto)
  let _mostrandoTodas = false;

  // ── localStorage: IDs descartados ────────────────────────────────────────
  function getDescartadas() {
    try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); }
    catch { return []; }
  }
  function addDescartada(id) {
    const d = getDescartadas();
    if (!d.includes(id)) { d.push(id); localStorage.setItem(DISMISSED_KEY, JSON.stringify(d)); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    if (!_cfg) return;
    const { listId, countId, badgeId, verTodasId } = _cfg;
    const listEl   = document.getElementById(listId);
    const countEl  = document.getElementById(countId);
    const badgeEl  = document.getElementById(badgeId);
    const verBtn   = document.getElementById(verTodasId);
    if (!listEl) return;

    const descartadas = getDescartadas();
    const visibles = _notifs.filter(n => !descartadas.includes(n._id));
    const alertas  = visibles.filter(n => n.tipo !== "success");

    // Actualizar badge de la campana
    if (countEl) {
      countEl.textContent = alertas.length || "";
      countEl.style.display = alertas.length ? "inline-block" : "none";
    }
    // Badge dentro del panel
    if (badgeEl) {
      badgeEl.textContent = alertas.length
        ? alertas.length + " alerta" + (alertas.length !== 1 ? "s" : "")
        : "";
      badgeEl.style.display = alertas.length ? "inline-block" : "none";
    }

    // Qué mostrar
    const aRenderizar = _mostrandoTodas ? visibles : visibles.slice(0, MAX_PREVIEW);
    const hayMas = visibles.length > MAX_PREVIEW;

    // Lista de notificaciones
    if (aRenderizar.length === 0) {
      listEl.innerHTML = `
        <div style="padding:24px 14px;text-align:center;color:var(--text-muted);font-size:0.83rem">
          <iconify-icon icon="lucide:check-circle" style="font-size:1.6rem;display:block;margin:0 auto 8px;color:var(--success)"></iconify-icon>
          Sin notificaciones pendientes
        </div>`;
    } else {
      listEl.innerHTML = aRenderizar.map(n => renderItem(n)).join("");
    }

    // Botón "Ver todas / Ver menos"
    if (verBtn) {
      if (!hayMas && !_mostrandoTodas) {
        verBtn.textContent = "Ver todas las alertas →";
        verBtn.style.display = "none";
      } else {
        verBtn.style.display = "inline";
        verBtn.textContent = _mostrandoTodas
          ? "▲ Ver menos"
          : `Ver todas (${visibles.length}) →`;
      }
    }
  }

  function renderItem(n) {
    const c = COLORES[n.tipo] || COLORES.info;
    const accionHTML = n.url
      ? `<a href="${n.url}" style="font-size:0.75rem;color:var(--primary);text-decoration:none;font-weight:600;white-space:nowrap">Ver →</a>`
      : "";
    return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border)">
        <span style="width:28px;height:28px;border-radius:8px;background:${c.bg};color:${c.icon};
                     display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">
          <iconify-icon icon="${n.icono}" style="font-size:0.95rem"></iconify-icon>
        </span>
        <div style="flex:1;min-width:0">
          ${n.titulo ? `<p style="font-size:0.8rem;font-weight:700;color:var(--text-main);margin:0 0 2px;line-height:1.3">${n.titulo}</p>` : ""}
          <p style="font-size:0.82rem;color:var(--text-muted);margin:0;line-height:1.4">${n.texto}</p>
          ${accionHTML}
        </div>
        <button
          onclick="RCANotif.descartar('${n._id}')"
          title="Descartar"
          style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:0.85rem;
                 padding:2px 4px;flex-shrink:0;line-height:1;margin-top:-1px;border-radius:4px;
                 transition:background 0.12s"
          onmouseover="this.style.background='var(--bg-app)'"
          onmouseout="this.style.background='none'"
          aria-label="Descartar notificación">✕</button>
      </div>`;
  }

  // ── Descartar ─────────────────────────────────────────────────────────────
  function descartar(id) {
    addDescartada(id);
    render();
  }

  // ── Toggle dropdown ───────────────────────────────────────────────────────
  function toggleDrop() {
    if (!_cfg) return;
    const drop = document.getElementById(_cfg.dropId);
    if (!drop) return;
    const visible = drop.style.display !== "none";
    drop.style.display = visible ? "none" : "block";
  }

  // ── Fetch notificaciones de la API ────────────────────────────────────────
  async function fetchDeServidor() {
    try {
      const tk = localStorage.getItem("token");
      if (!tk) return [];
      const r = await fetch(`${API_URL}/api/notificaciones`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      if (!r.ok) return [];
      const data = await r.json();
      return (data || []).map(n => ({
        _id:    `db_${n.id_notificacion}`,
        tipo:   n.tipo   || "info",
        icono:  n.icono  || "lucide:bell",
        titulo: n.titulo || "",
        texto:  n.mensaje,
        url:    n.url_accion || null,
      }));
    } catch { return []; }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  async function init(cfg) {
    _cfg = cfg;
    _mostrandoTodas = false;

    // Mostrar estado de carga
    const listEl = document.getElementById(cfg.listId);
    if (listEl) {
      listEl.innerHTML = `
        <div style="padding:20px 14px;text-align:center;color:var(--text-muted);font-size:0.82rem">
          <iconify-icon icon="lucide:loader-2" style="font-size:1.3rem;display:block;margin:0 auto 6px;
            animation:spin 1s linear infinite"></iconify-icon>
          Cargando alertas...
        </div>`;
    }

    // Botón campana — eliminar posibles onclick inline anteriores y adjuntar listener
    const btn = document.getElementById(cfg.btnId);
    if (btn) {
      btn.removeAttribute("onclick");
      btn.addEventListener("click", (e) => { e.stopPropagation(); toggleDrop(); });
    }

    // Cerrar al hacer click fuera
    document.addEventListener("click", (e) => {
      if (!_cfg) return;
      const btnEl  = document.getElementById(_cfg.btnId);
      const dropEl = document.getElementById(_cfg.dropId);
      if (dropEl && dropEl.style.display !== "none" &&
          btnEl && !btnEl.contains(e.target) && !dropEl.contains(e.target)) {
        dropEl.style.display = "none";
      }
    });

    // "Ver todas" toggle
    const verBtn = document.getElementById(cfg.verTodasId);
    if (verBtn) {
      verBtn.removeAttribute("href");
      verBtn.style.cursor = "pointer";
      verBtn.addEventListener("click", (e) => {
        e.preventDefault();
        _mostrandoTodas = !_mostrandoTodas;
        render();
      });
    }

    // Cargar notificaciones
    const [deServidor, autoAlertas] = await Promise.all([
      fetchDeServidor(),
      cfg.autoAlertasFn ? (async () => { try { return await cfg.autoAlertasFn(); } catch { return []; } })() : Promise.resolve([]),
    ]);

    _notifs = [...deServidor, ...autoAlertas];

    // Si no hay ninguna alerta real, agregar "todo bien"
    const hayAlertas = _notifs.some(n => n.tipo !== "success");
    if (!hayAlertas) {
      _notifs.push({
        _id:    "auto_ok",
        tipo:   "success",
        icono:  "lucide:check-circle",
        titulo: "",
        texto:  "Todo en orden. Sin alertas pendientes.",
        url:    null,
      });
    }

    render();
  }

  // ── API pública ───────────────────────────────────────────────────────────
  global.RCANotif = { init, descartar, render };

})(window);

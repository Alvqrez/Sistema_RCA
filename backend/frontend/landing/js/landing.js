/*
 * landing.js — Comportamientos compartidos: entradas al hacer scroll, menú móvil,
 * barra al desplazarse, pestañas de roles, formulario de contacto (mailto) y botones magnéticos.
 * Se carga en <head> (sin defer) para marcar .js antes del primer pintado.
 */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var CORREO = "alvqrez.dev@gmail.com";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function each(sel, fn, raiz) {
    Array.prototype.forEach.call((raiz || document).querySelectorAll(sel), fn);
  }

  /* ── Entradas escalonadas ─────────────────────────────────────────── */
  function reveals() {
    // Retraso individual sin estilos en línea: data-delay="2" → --i: 2
    each("[data-delay]", function (el) { el.style.setProperty("--i", el.getAttribute("data-delay")); });
    each("[data-reveal-group]", function (g) {
      Array.prototype.forEach.call(g.children, function (c, i) {
        if (!c.hasAttribute("data-reveal")) c.setAttribute("data-reveal", "");
        c.style.setProperty("--i", i);
      });
    });
    var items = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window) || reduce.matches) {
      each("[data-reveal]", function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });

    // Marcadores de estado por sección (para animaciones propias de cada concepto)
    var io2 = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-live"); io2.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    each("[data-live]", function (el) { io2.observe(el); });
  }

  /* ── Barra de navegación ──────────────────────────────────────────── */
  function nav() {
    var header = document.querySelector("[data-header]");
    if (!header) return;
    var centinela = document.createElement("div");
    centinela.setAttribute("aria-hidden", "true");
    centinela.style.cssText = "position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none;";
    document.body.prepend(centinela);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        header.classList.toggle("is-scrolled", !e[0].isIntersecting);
      }).observe(centinela);
    }

    var btn = header.querySelector("[data-menu-toggle]");
    var menu = document.getElementById(btn ? btn.getAttribute("aria-controls") : "");
    if (!btn || !menu) return;
    function abrir(v) {
      btn.setAttribute("aria-expanded", String(v));
      btn.setAttribute("aria-label", v ? "Cerrar menú" : "Abrir menú");
      header.classList.toggle("is-open", v);
      document.body.classList.toggle("menu-abierto", v);
    }
    btn.addEventListener("click", function () { abrir(btn.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) abrir(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("is-open")) { abrir(false); btn.focus(); }
    });
    window.matchMedia("(min-width: 960px)").addEventListener("change", function (m) { if (m.matches) abrir(false); });
  }

  /* ── Pestañas accesibles ──────────────────────────────────────────── */
  function tabs() {
    each("[role=tablist]", function (lista) {
      var botones = Array.prototype.slice.call(lista.querySelectorAll("[role=tab]"));
      function activar(b, foco) {
        botones.forEach(function (x) {
          var on = x === b;
          x.setAttribute("aria-selected", String(on));
          x.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(x.getAttribute("aria-controls"));
          if (panel) { panel.hidden = !on; panel.classList.toggle("is-active", on); }
        });
        if (foco) b.focus();
        // Los mockups ocultos no se miden: forzar reajuste
        window.dispatchEvent(new Event("resize"));
      }
      botones.forEach(function (b, i) {
        b.addEventListener("click", function () { activar(b); });
        b.addEventListener("keydown", function (e) {
          var n = null;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") n = botones[(i + 1) % botones.length];
          if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = botones[(i - 1 + botones.length) % botones.length];
          if (e.key === "Home") n = botones[0];
          if (e.key === "End") n = botones[botones.length - 1];
          if (n) { e.preventDefault(); activar(n, true); }
        });
      });
    });
  }

  /* ── Formulario de contacto: arma un correo, sin backend ─────────── */
  function contacto() {
    each("[data-contacto]", function (form) {
      var estado = form.querySelector("[data-estado]");
      form.setAttribute("novalidate", "");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = true;
        each("[required]", function (campo) {
          var err = document.getElementById(campo.getAttribute("aria-describedby").split(" ")[0]);
          var msg = "";
          if (!campo.value.trim()) msg = "Este campo es obligatorio.";
          else if (campo.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value.trim())) msg = "Escribe un correo válido, por ejemplo nombre@plantel.edu.mx.";
          campo.setAttribute("aria-invalid", msg ? "true" : "false");
          if (err) err.textContent = msg;
          if (msg && ok) { campo.focus(); ok = false; }
        }, form);
        if (!ok) return;

        var d = new FormData(form);
        var asunto = "Solicitud de información de Sistema RCA — " + d.get("institucion");
        var cuerpo =
          "Nombre: " + d.get("nombre") + "\n" +
          "Cargo: " + d.get("cargo") + "\n" +
          "Institución: " + d.get("institucion") + "\n" +
          "Correo de contacto: " + d.get("correo") + "\n\n" +
          (d.get("mensaje") || "Me interesa conocer Sistema RCA para nuestro plantel.");
        window.location.href = "mailto:" + CORREO + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
        if (estado) estado.textContent = "Abrimos tu aplicación de correo con el mensaje listo. Si no se abrió, escríbenos directamente a " + CORREO + ".";
      });
      form.addEventListener("input", function (e) {
        if (e.target.getAttribute("aria-invalid") === "true" && e.target.value.trim()) {
          e.target.setAttribute("aria-invalid", "false");
          var err = document.getElementById(e.target.getAttribute("aria-describedby").split(" ")[0]);
          if (err) err.textContent = "";
        }
      });
    });

    each("[data-copiar]", function (b) {
      var original = b.textContent;
      b.addEventListener("click", function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(CORREO).then(function () {
          b.textContent = "Correo copiado";
          setTimeout(function () { b.textContent = original; }, 2000);
        });
      });
    });
  }

  /* ── Botones magnéticos (solo puntero fino y sin reducción de movimiento) */
  function magneticos() {
    if (reduce.matches || !window.matchMedia("(pointer: fine)").matches) return;
    each("[data-magnetic]", function (el) {
      var raf = 0, x = 0, y = 0;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        x = (e.clientX - r.left - r.width / 2) * 0.18;
        y = (e.clientY - r.top - r.height / 2) * 0.28;
        if (!raf) raf = requestAnimationFrame(function () {
          el.style.transform = "translate3d(" + x + "px," + y + "px,0)";
          raf = 0;
        });
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  function iniciar() { reveals(); nav(); tabs(); contacto(); magneticos(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();

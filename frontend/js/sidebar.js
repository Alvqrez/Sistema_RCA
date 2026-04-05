// frontend/js/sidebar.js
// Se incluye en TODAS las páginas del sistema (excepto login y portalAlumno)

(function () {

    const rol    = localStorage.getItem("rol");
    const nombre = localStorage.getItem("nombre");
    const token  = localStorage.getItem("token");

    // Si no hay sesión, redirige al login
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Links según el rol
    const linksPorRol = {
        maestro: [
            { href: "alumnos.html",        texto: "Alumnos",        icono: "👤" },
            { href: "maestros.html",        texto: "Maestros",       icono: "🎓" },
            { href: "materias.html",        texto: "Materias",       icono: "📚" },
            { href: "grupos.html",          texto: "Grupos",         icono: "🏫" },
            { href: "calificaciones.html",  texto: "Calificaciones", icono: "📊" },
            { href: "unidades.html", texto: "Unidades", icono: "📋" },
        ],
        administrador: [
            { href: "admin.html",           texto: "Panel",          icono: "🛠️" },
            { href: "alumnos.html",         texto: "Alumnos",        icono: "👤" },
            { href: "maestros.html",        texto: "Maestros",       icono: "🎓" },
            { href: "materias.html",        texto: "Materias",       icono: "📚" },
            { href: "grupos.html",          texto: "Grupos",         icono: "🏫" },
        ]
    };

    const links = linksPorRol[rol] || [];

    // Detecta la página actual para marcar el link como activo
    const paginaActual = window.location.pathname.split("/").pop();

    // Construye el HTML del sidebar
    const linksHTML = links.map(link => {
        const activo = link.href === paginaActual ? "active" : "";
        return `<a href="${link.href}" class="${activo}">${link.icono} ${link.texto}</a>`;
    }).join("");

    const sidebarHTML = `
        <div class="sidebar-logo">
            <h2>RCA</h2>
            <span class="sidebar-usuario">${nombre || ""}</span>
        </div>
        <nav>${linksHTML}</nav>
        <button class="logout-btn" onclick="cerrarSesion()">
            🔒 Cerrar sesión
        </button>
    `;

    // Inyecta el sidebar en el aside que ya existe en cada página
    const aside = document.querySelector("aside.sidebar");
    if (aside) {
        aside.innerHTML = sidebarHTML;
    }

})();

// Función global de logout (disponible desde cualquier página)
function cerrarSesion() {
    localStorage.clear();
    window.location.href = "login.html";
}
// Rellena cualquier <select> con id dado con las carreras de la BD
async function cargarCarrerasEnSelect(selectId) {
  const token = localStorage.getItem("token");
  const select = document.getElementById(selectId);

  if (!select) return;

  try {
    const response = await fetch(`${BASE_URL}/api/carreras`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const carreras = await response.json();

    select.innerHTML = `<option value="">-- Selecciona una carrera --</option>`;

    carreras.forEach((c) => {
      select.innerHTML += `<option value="${c.id_carrera}">${c.nombre_carrera} (${c.id_carrera})</option>`;
    });
  } catch (e) {
    console.error("Error cargando carreras:", e);
  }
}

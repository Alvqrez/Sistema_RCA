// ─── exportUtils.js ──────────────────────────────────────────────────────────
// Utilidad compartida para exportar datos a XLSX con:
//   1. Soporte completo de acentos y caracteres especiales (UTF-8)
//   2. Autofit automático del ancho de cada columna
//
// Requiere SheetJS (xlsx) cargado antes en el HTML:
//   <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exporta un array de objetos a un archivo .xlsx con columnas autoajustadas.
 *
 * @param {string[]} cols      - Claves de las columnas (orden de aparición)
 * @param {string[]} headers   - Nombres legibles para la fila de encabezado
 * @param {object[]} datos     - Array de objetos con los datos
 * @param {string}   filename  - Nombre del archivo sin extensión
 * @param {Function} [formatFn] - Función opcional (col, val) => string para formatear valores
 */
function exportarXLSX(cols, headers, datos, filename, formatFn) {
  if (!window.XLSX) {
    console.error("SheetJS no está cargado. Agrega el script de xlsx en el HTML.");
    return;
  }

  // 1. Construir array de arrays: [encabezados, ...filas]
  const aoa = [headers];
  datos.forEach((row) => {
    aoa.push(
      cols.map((c) => {
        const val = formatFn ? formatFn(c, row[c]) : (row[c] ?? "");
        return val === null || val === undefined ? "" : String(val);
      })
    );
  });

  // 2. Calcular ancho óptimo por columna (máximo entre encabezado y datos)
  const colWidths = cols.map((_, colIdx) => {
    let max = 10; // ancho mínimo en caracteres
    aoa.forEach((fila) => {
      const cell = fila[colIdx];
      if (cell != null) {
        const len = String(cell).length;
        if (len > max) max = len;
      }
    });
    return { wch: Math.min(max + 2, 60) }; // +2 de padding, máx 60
  });

  // 3. Crear hoja y workbook
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");

  // 4. Descargar
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

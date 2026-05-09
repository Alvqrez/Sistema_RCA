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

// ─── parseCSVRobusto ──────────────────────────────────────────────────────────
// Parser CSV correcto que maneja:
//   - BOM (Byte Order Mark) al inicio del archivo
//   - Campos entre comillas con comas dentro: "Ingeniería, Sistemas"
//   - Saltos de línea \r\n (Windows) y \n (Unix)
//   - Comillas dobles escapadas dentro de un campo: ""valor""
//
// @param {string} texto  - Contenido crudo del archivo CSV
// @returns {{ headers: string[], rows: object[] }}
// ─────────────────────────────────────────────────────────────────────────────
function parseCSVRobusto(texto) {
  // 1. Quitar BOM si existe
  const sinBOM = texto.charCodeAt(0) === 0xFEFF ? texto.slice(1) : texto;

  // 2. Dividir en líneas respetando \r\n y \n
  const lineas = sinBOM.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lineas.length < 2) return { headers: [], rows: [] };

  // 3. Función interna para parsear una sola línea respetando comillas
  function parsearLinea(linea) {
    const campos = [];
    let actual = '';
    let dentroComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        if (dentroComillas && linea[i + 1] === '"') {
          // comilla escapada: "" → "
          actual += '"';
          i++;
        } else {
          dentroComillas = !dentroComillas;
        }
      } else if (c === ',' && !dentroComillas) {
        campos.push(actual.trim());
        actual = '';
      } else {
        actual += c;
      }
    }
    campos.push(actual.trim());
    return campos;
  }

  // 4. Primera línea = encabezados (en minúsculas para normalizar)
  const headers = parsearLinea(lineas[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));

  // 5. Resto = datos
  const rows = lineas.slice(1).map(linea => {
    const vals = parsearLinea(linea);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });

  return { headers, rows };
}

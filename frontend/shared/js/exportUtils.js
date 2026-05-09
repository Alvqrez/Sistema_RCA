// ─── exportUtils.js ──────────────────────────────────────────────────────────
// Requiere SheetJS cargado ANTES en el HTML (vía CDN o local):
//   <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
// ─────────────────────────────────────────────────────────────────────────────

// ── exportarXLSX ─────────────────────────────────────────────────────────────
// Exporta datos a .xlsx (con SheetJS) con columnas autoajustadas al contenido.
// Si SheetJS no está disponible, genera .csv como fallback.
// cols      → claves internas   ["no_control", "nombre", ...]
// headers   → nombres visibles  ["No. Control", "Nombre", ...]
// datos     → array de objetos
// filename  → sin extensión
// formatFn  → opcional (col, val) => string
function exportarXLSX(cols, headers, datos, filename, formatFn) {
  // Construir filas como array de arrays
  const filas = [headers];
  datos.forEach((row) => {
    filas.push(
      cols.map((c) => {
        const val = formatFn ? formatFn(c, row[c]) : (row[c] ?? "");
        return val === null || val === undefined ? "" : String(val);
      })
    );
  });

  // ── Ruta XLSX con SheetJS (columnas autoajustadas) ────────────────────────
  if (window.XLSX) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(filas);

    // Calcular ancho óptimo de cada columna según el contenido más largo
    const anchos = cols.map((_, ci) => {
      const maxLen = filas.reduce((max, fila) => {
        const celda = fila[ci] != null ? String(fila[ci]) : "";
        return Math.max(max, celda.length);
      }, 10); // mínimo 10 caracteres de ancho
      return { wch: Math.min(maxLen + 2, 80) }; // +2 margen, tope 80 chars
    });
    ws["!cols"] = anchos;

    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return;
  }

  // ── Fallback: CSV (cuando SheetJS no está cargado) ────────────────────────
  const escapar = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const bom = "\uFEFF";
  const csv = filas.map((fila) => fila.map(escapar).join(",")).join("\n");
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── leerArchivo ──────────────────────────────────────────────────────────────
// Acepta .csv O .xlsx/.xls y devuelve { headers, rows } de forma uniforme.
// Llama al callback cb(headers, rows) cuando termina.
// Si el archivo es Excel, lo convierte internamente a filas de objetos.
function leerArchivo(file, cb) {
  const nombre = file.name.toLowerCase();
  const esExcel = nombre.endsWith(".xlsx") || nombre.endsWith(".xls");

  if (esExcel) {
    // ── Leer como binario con SheetJS ────────────────────────────────────────
    if (!window.XLSX) {
      alert("SheetJS no está cargado. No se puede leer archivos Excel.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "binary", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Convertir a array de arrays
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (aoa.length < 2) { cb([], []); return; }

      const headers = aoa[0].map((h) =>
        String(h).trim().toLowerCase().replace(/\s+/g, "_")
      );
      const rows = aoa.slice(1)
        .filter((r) => r.some((v) => v !== "" && v !== null && v !== undefined))
        .map((r) => {
          const obj = {};
          headers.forEach((h, i) => {
            let v = r[i] ?? "";
            // Fechas: SheetJS devuelve Date cuando cellDates:true
            if (v instanceof Date) {
              const yy = v.getFullYear();
              const mm = String(v.getMonth() + 1).padStart(2, "0");
              const dd = String(v.getDate()).padStart(2, "0");
              v = `${dd}/${mm}/${yy}`;
            }
            obj[h] = String(v).trim();
          });
          return obj;
        });
      cb(headers, rows);
    };
    reader.readAsBinaryString(file);
  } else {
    // ── Leer como texto CSV ───────────────────────────────────────────────────
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCSVRobusto(e.target.result);
      cb(headers, rows);
    };
    reader.readAsText(file, "UTF-8");
  }
}

// ── parseCSVRobusto ───────────────────────────────────────────────────────────
// Parser CSV que maneja BOM, campos entre comillas, \r\n y comas dentro de campos.
function parseCSVRobusto(texto) {
  const sinBOM = texto.charCodeAt(0) === 0xFEFF ? texto.slice(1) : texto;
  const lineas = sinBOM.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lineas.length < 2) return { headers: [], rows: [] };

  function parsearLinea(linea) {
    const campos = [];
    let actual = "";
    let dentroComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        if (dentroComillas && linea[i + 1] === '"') { actual += '"'; i++; }
        else dentroComillas = !dentroComillas;
      } else if (c === "," && !dentroComillas) {
        campos.push(actual.trim());
        actual = "";
      } else {
        actual += c;
      }
    }
    campos.push(actual.trim());
    return campos;
  }

  const headers = parsearLinea(lineas[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_")
  );
  const rows = lineas.slice(1).map((linea) => {
    const vals = parsearLinea(linea);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
  return { headers, rows };
}

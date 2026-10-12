import ExcelJS from 'exceljs';

function fillWorksheet(worksheet, { rows, columns }) {
  worksheet.columns = (columns || []).map(({ header }) => ({
    header,
    key: header,
    width: Math.min(40, Math.max(14, String(header || '').length + 2)),
  }));

  for (const row of rows || []) {
    const out = {};
    for (const { key, header, format } of columns || []) {
      const raw = row[key];
      out[header] = format ? format(raw, row) : (raw ?? '');
    }
    worksheet.addRow(out);
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
}

/**
 * Exporta a .xlsx.
 * - Modo simple: { rows, columns, sheetName, fileNamePrefix }
 * - Multi-hoja: { sheets: [{ sheetName, rows, columns }], fileNamePrefix }
 */
export async function exportRowsToExcel({
  rows,
  sheetName,
  fileNamePrefix,
  columns,
  sheets,
}) {
  const workbook = new ExcelJS.Workbook();
  const allSheets =
    Array.isArray(sheets) && sheets.length
      ? sheets
      : [{ sheetName: sheetName || 'Datos', rows, columns }];

  for (const sheet of allSheets) {
    if (!sheet?.columns?.length) continue;
    const worksheet = workbook.addWorksheet(sheet.sheetName || 'Datos');
    fillWorksheet(worksheet, sheet);
  }

  if (workbook.worksheets.length === 0) {
    throw new Error('No hay hojas para exportar');
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

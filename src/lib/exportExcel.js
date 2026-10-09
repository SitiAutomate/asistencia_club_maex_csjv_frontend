import ExcelJS from 'exceljs';

/**
 * Exporta filas a un archivo .xlsx (ExcelJS empaquetado estático para evitar
 * "Failed to fetch dynamically imported module" en producción tras deploys).
 */
export async function exportRowsToExcel({ rows, sheetName, fileNamePrefix, columns }) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName || 'Datos');

  worksheet.columns = columns.map(({ header }) => ({ header, key: header, width: 20 }));

  for (const row of rows || []) {
    const out = {};
    for (const { key, header, format } of columns) {
      const raw = row[key];
      out[header] = format ? format(raw, row) : (raw ?? '');
    }
    worksheet.addRow(out);
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

export async function exportRowsToExcel({ rows, sheetName, fileNamePrefix, columns }) {
  const ExcelJS = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map(({ header }) => ({ header, key: header, width: 20 }));

  rows.forEach((row) => {
    const out = {};
    columns.forEach(({ key, header, format }) => {
      const raw = row[key];
      out[header] = format ? format(raw, row) : raw ?? '';
    });
    worksheet.addRow(out);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

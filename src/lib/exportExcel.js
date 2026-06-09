export async function exportRowsToExcel({ rows, sheetName, fileNamePrefix, columns }) {
  const XLSX = await import('xlsx');

  const sheetRows = rows.map((row) => {
    const out = {};
    columns.forEach(({ key, header, format }) => {
      const raw = row[key];
      out[header] = format ? format(raw, row) : raw ?? '';
    });
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const fileName = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCsv(column.label)).join(',');
  const body = rows.map((row) => (
    columns.map((column) => escapeCsv(row[column.key])).join(',')
  ));

  return [header, ...body].join('\n');
}

module.exports = { toCsv };

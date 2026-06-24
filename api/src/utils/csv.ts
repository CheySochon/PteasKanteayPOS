type CsvColumn = {
  key: string;
  label: string;
};

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map((col) => escapeCsv(col.label)).join(",");
  const body = rows.map((row) =>
    columns.map((col) => escapeCsv(row[col.key])).join(","),
  );
  return [header, ...body].join("\n");
}

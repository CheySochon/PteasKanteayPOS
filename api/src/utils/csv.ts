type CsvColumn = {
  key: string;
  label: string;
};

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const text = typeof value === "object" ? JSON.stringify(value) : (typeof value === "string" ? value : String(value));
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsvBuffer(rows: Record<string, unknown>[], columns: CsvColumn[]): Buffer {
  const header = columns.map((col) => escapeCsv(col.label)).join(",");
  const body = rows.map((row) =>
    columns.map((col) => escapeCsv(row[col.key])).join(","),
  );
  const csvString = [header, ...body].join("\r\n");
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const content = Buffer.from(csvString, "utf8");
  return Buffer.concat([bom, content]);
}

export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map((col) => escapeCsv(col.label)).join(",");
  const body = rows.map((row) =>
    columns.map((col) => escapeCsv(row[col.key])).join(","),
  );
  return "\uFEFF" + [header, ...body].join("\r\n");
}

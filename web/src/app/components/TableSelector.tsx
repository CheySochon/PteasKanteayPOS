"use client";

import type { DiningTable } from "../lib/types";

export default function TableSelector({
  tables,
  value,
  onChange,
}: {
  tables: DiningTable[];
  value?: number;
  onChange: (id?: number) => void;
}) {
  return (
    <select
      value={value || ""}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
    >
      <option value="">Walk-in / takeaway</option>
      {tables.map((table) => (
        <option key={table.id} value={table.id}>{table.name} · {table.zone}</option>
      ))}
    </select>
  );
}

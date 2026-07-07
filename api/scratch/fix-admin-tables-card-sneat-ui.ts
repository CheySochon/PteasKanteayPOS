import fs from "fs";

const pagePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/tables/page.tsx";
let content = fs.readFileSync(pagePath, "utf-8");

// Helper function to format order number into short tag
const shortOrderHelper = `function formatShortOrderNo(order: Order) {
  const raw = order.orderNumber || order.orderId || \`#\${order.id}\`;
  if (typeof raw === "string" && raw.startsWith("ORD-")) {
    const parts = raw.split("-");
    return \`#\${parts[parts.length - 1]}\`;
  }
  return raw;
}
`;

if (!content.includes("formatShortOrderNo")) {
  content = content.replace("export default function AdminTablesPage() {", `${shortOrderHelper}\nexport default function AdminTablesPage() {`);
}

// 1. Fix grid container to auto-fill compact 280px cards
content = content.replace(
  `className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"`,
  `className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(250px,280px))] items-start justify-start"`
);

// 2. Fix card container padding, width, and border
content = content.replace(
  `className={\`min-h-[200px] rounded border-2 p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 ease-out flex flex-col justify-between \${styles.border} \${styles.bg}\`}`,
  `className={\`w-full max-w-[280px] min-h-[190px] rounded-xl border-2 p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 ease-out flex flex-col justify-between \${styles.border} \${styles.bg}\`}`
);

// 3. Fix badge wrapping/clipping for AVAILABLE and SERVED / DIRTY
content = content.replace(
  `className={\`rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider \${styles.badge}\`}`,
  `className={\`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 \${styles.badge}\`}`
);

// 4. Fix order number to display short tag like #0025
content = content.replace(
  `<span className="font-bold text-[#696cff]">{order.orderNumber || order.orderId}</span>`,
  `<span className="font-bold text-[#696cff]">{formatShortOrderNo(order)}</span>`
);

fs.writeFileSync(pagePath, content);
console.log("Successfully updated AdminTablesPage cards to compact Sneat UI!");

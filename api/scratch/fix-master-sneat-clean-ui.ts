import fs from "fs";

const adminPagePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/page.tsx";
const topBarPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/components/TopBar.tsx";

// 1. Upgrade AdminPage StatCard and Recent Orders Table to Ultra-Clean Sneat UI
let adminContent = fs.readFileSync(adminPagePath, "utf-8");

// Helper function for short order number
const shortOrderHelper = `function formatShortOrderNo(order: Order) {
  const raw = order.orderNumber || order.orderId || \`#\${order.id}\`;
  if (typeof raw === "string" && raw.startsWith("ORD-")) {
    const parts = raw.split("-");
    return \`#\${parts[parts.length - 1]}\`;
  }
  return raw;
}
`;

if (!adminContent.includes("formatShortOrderNo")) {
  adminContent = adminContent.replace("export default function AdminPage() {", `${shortOrderHelper}\nexport default function AdminPage() {`);
}

// Replace Recent Order Number text
adminContent = adminContent.replace(
  `{order.orderNumber || order.orderId}`,
  `{formatShortOrderNo(order)}`
);

// Upgrade StatCard styling to 2XL rounded card with soft Sneat shadows
const oldStatCardReturn = `  return (
    <div
      className={\`rounded border p-4 shadow-sm \${
        dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-[#e5e7eb] bg-white"
      }\`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#a1acb8]">{label}</div>
          <div
            className={\`mt-1 text-2xl font-bold tracking-tight \${
              dark ? "text-slate-100" : "text-[#566a7f]"
            }\`}
          >
            <AnimatedCounter value={value} />
          </div>
        </div>

        <span className={\`rounded px-2.5 py-0.5 text-[11px] font-semibold \${tones[tone]}\`}>
          Live
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="text-xs font-semibold text-[#8592a3]">{note}</div>
        {miniChartData && (
          <div className="h-10 w-24 flex-shrink-0">
            <Line data={miniChartData} options={miniChartOptions} />
          </div>
        )}
      </div>
    </div>
  );`;

const newStatCardReturn = `  return (
    <div
      className={\`group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4.5 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg \${
        dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
      }\`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#a1acb8]">{label}</div>
          <div
            className={\`mt-1 text-2xl font-black tracking-tight \${
              dark ? "text-slate-100" : "text-[#566a7f]"
            }\`}
          >
            <AnimatedCounter value={value} />
          </div>
        </div>

        <span className={\`rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-sm \${tones[tone]}\`}>
          Live
        </span>
      </div>

      <div className="flex items-end justify-between gap-2 mt-2 pt-2.5 border-t border-slate-100 dark:border-[#3a3b53]">
        <div className="text-[11px] font-bold text-[#8592a3]">{note}</div>
        {miniChartData && (
          <div className="h-8 w-20 flex-shrink-0">
            <Line data={miniChartData} options={miniChartOptions} />
          </div>
        )}
      </div>
    </div>
  );`;

adminContent = adminContent.replace(oldStatCardReturn, newStatCardReturn);

// Upgrade main section card classes in AdminPage to 2XL rounded cards
adminContent = adminContent.replaceAll("className={`min-w-0 ${cardClass} p-4`}", "className={`min-w-0 ${cardClass} p-5 rounded-2xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)]`}");

fs.writeFileSync(adminPagePath, adminContent);

// 2. Upgrade TopBar quickLinks to sleek pill buttons
let topBarContent = fs.readFileSync(topBarPath, "utf-8");

topBarContent = topBarContent.replace(
  `className={\`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm \${textPrimary} \${menuHover}\`}`,
  `className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-[#566a7f] dark:text-[#c9d4ea] bg-[#eceef1]/60 dark:bg-[#3a3b53] hover:bg-[#696cff] hover:text-white transition-all shadow-sm"`
);

fs.writeFileSync(topBarPath, topBarContent);

console.log("Successfully polished AdminPage & TopBar to Ultra-Clean Sneat UI!");

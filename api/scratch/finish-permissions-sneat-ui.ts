import fs from "fs";

const path = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/permissions/page.tsx";
let code = fs.readFileSync(path, "utf-8");

// Upgrade container classes to rounded-2xl & shadow-[0_2px_6px_0_rgba(67,89,113,0.12)]
code = code.replaceAll(
  `rounded border p-4 shadow-sm flex flex-col h-[calc(100vh-210px)]`,
  `rounded-2xl border p-5 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] flex flex-col h-[calc(100vh-220px)]`
);

code = code.replaceAll(
  `rounded border p-4 shadow-sm \${surface} \${borderCol}`,
  `rounded-2xl border p-5 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] \${surface} \${borderCol}`
);

code = code.replaceAll(
  `rounded border p-5 shadow-sm \${surface} \${borderCol}`,
  `rounded-2xl border p-5 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] \${surface} \${borderCol}`
);

// Upgrade preset buttons to rounded-xl
code = code.replaceAll(
  `className="px-3 py-2 rounded text-xs font-bold`,
  `className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold shadow-sm`
);

// Upgrade user item cards to rounded-xl
code = code.replaceAll(
  `rounded border p-2.5 text-left transition`,
  `rounded-xl border p-3 text-left transition-all duration-200`
);

fs.writeFileSync(path, code);
console.log("Successfully upgraded PermissionsPage to 2XL Sneat Rounded Cards!");

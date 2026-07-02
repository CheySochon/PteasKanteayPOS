import fs from "fs";

const filePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/orders/page.tsx";
let content = fs.readFileSync(filePath, "utf-8");

// 1. Update Layout Variables
content = content.replace(
  /const surface = dark \? "bg-\[#111827\]" : "bg-white";/g,
  `const surface = dark ? "bg-[#2b2c40]" : "bg-white";`
);
content = content.replace(
  /const softSurface = dark \? "bg-\[#0f172a\]" : "bg-slate-50";/g,
  `const softSurface = dark ? "bg-[#232333]" : "bg-[#f5f5f9]";`
);
content = content.replace(
  /const borderCol = dark \? "border-slate-700\/70" : "border-slate-200";/g,
  `const borderCol = dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]";`
);
content = content.replace(
  /const textPrimary = dark \? "text-slate-100" : "text-slate-900";/g,
  `const textPrimary = dark ? "text-[#c9d4ea]" : "text-[#566a7f]";`
);
content = content.replace(
  /const textSecondary = dark \? "text-slate-400" : "text-slate-500";/g,
  `const textSecondary = dark ? "text-[#a1acb8]" : "text-[#a1acb8]";`
);

content = content.replace(
  /const cardClass = `rounded-xl border \$\{borderCol\} \$\{surface\} shadow-sm`;/g,
  `const cardClass = \`rounded border \${borderCol} \${surface} shadow-sm\`;`
);

// 2. Add animation class to the main wrapper
content = content.replace(
  /<div className="mx-auto w-full max-w-\[1400px\] px-4 py-4 lg:px-6">/g,
  `<div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6 animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">`
);

// 3. Add the keyframes to the end of the file before </main>
const endTag = `    </main>
  );
}`;
const animatedEndTag = `        <style>{\`
          @keyframes usersPageIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        \`}</style>
    </main>
  );
}`;
content = content.replace(endTag, animatedEndTag);

// 4. Update SummaryCard component
content = content.replace(
  /blue: "bg-blue-100 text-blue-700",\s*green: "bg-emerald-100 text-emerald-700",\s*red: "bg-red-100 text-red-700",\s*purple: "bg-purple-100 text-purple-700",/g,
  `blue: "bg-[#e7e7ff] text-[#696cff]",
    green: "bg-[#e8fadf] text-[#71dd37]",
    red: "bg-[#ffe0db] text-[#ff3e1d]",
    purple: "bg-[#f2e7ff] text-[#8553f4]",`
);

content = content.replace(
  /className=\{\`rounded-xl border p-4 shadow-sm \$\{\s*dark \? "border-slate-700\/70 bg-\\[#111827\\]" : "border-slate-200 bg-white"\s*\}\`\}/g,
  `className={\`rounded border p-4 shadow-sm \${dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-[#e5e7eb] bg-white"}\`}`
);

// 5. General rounded-xl to rounded
content = content.replace(/rounded-xl/g, 'rounded');
content = content.replace(/rounded-lg/g, 'rounded');

// 6. Fix blue-600 in the Kitchen Performance Chart
content = content.replace(/bg-blue-600/g, 'bg-[#696cff]');

fs.writeFileSync(filePath, content, "utf-8");
console.log("Orders page successfully updated with Sneat UI specs!");

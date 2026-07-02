import fs from "fs";

const filePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/settings/page.tsx";
let content = fs.readFileSync(filePath, "utf-8");

// 1. Re-declare theme color constants to match users/page.tsx
content = content.replace(
  /const surface = dark \? "bg-\[#171a23\]" : "bg-white";/g,
  `const surface = dark ? "bg-[#2b2c40]" : "bg-white";`
);
content = content.replace(
  /const softSurface = dark \? "bg-\[#1f2330\]" : "bg-slate-50";/g,
  `const softSurface = dark ? "bg-[#232333]" : "bg-[#f5f5f9]";`
);
content = content.replace(
  /const borderCol = dark \? "border-\[#2a2f3d\]" : "border-slate-200";/g,
  `const borderCol = dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]";`
);
content = content.replace(
  /const textPrimary = dark \? "text-slate-100" : "text-slate-950";/g,
  `const textPrimary = dark ? "text-[#566a7f]" : "text-[#566a7f]";`
);
content = content.replace(
  /const textSecondary = dark \? "text-slate-400" : "text-slate-500";/g,
  `const textSecondary = dark ? "text-slate-400" : "text-[#a1acb8]";`
);

// 2. Align input class styles
const oldInputClass = `  const inputClass = \`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 \${
    dark
      ? "border-[#2a2f3d] bg-[#11141c] text-slate-100 placeholder:text-slate-600"
      : "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
  }\`;`;

const newInputClass = `  const inputClass = \`w-full rounded border px-3.5 py-2.5 text-sm outline-none transition placeholder-[#b4bdc6] focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 \${
    dark
      ? "border-[#4e4f6e] bg-[#232333] text-slate-100"
      : "border-[#d9dee3] bg-white text-[#566a7f]"
  }\`;`;

if (content.includes(oldInputClass)) {
  content = content.replace(oldInputClass, newInputClass);
} else {
  // Let's do regex replace if spaces differ
  content = content.replace(/const inputClass = `w-full rounded-xl border px-3 py-2.5[\s\S]*?`;/g, newInputClass);
}

// 3. Align save changes button
content = content.replace(
  /className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-\[#696cff\] px-5 text-sm font-bold text-white shadow-sm shadow-\[#696cff\]\/20 transition hover:bg-\[#5f61e6\] disabled:cursor-not-allowed disabled:opacity-60"/g,
  `className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#696cff] px-5 text-sm font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60 shrink-0"`
);

// 4. Align upload image button
content = content.replace(
  /className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-\[#696cff\] px-4 text-sm font-bold text-white hover:bg-\[#5f61e6\]"/g,
  `className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded bg-[#696cff] px-4 text-xs font-semibold text-white hover:bg-[#5f61e6] active:scale-95 transition-all shadow-sm shadow-[#696cff]/10"`
);

// 5. Replace Panel rounded-2xl to rounded
content = content.replace(
  /section className=\{\`rounded-2xl border p-5 shadow-sm \${surface} \${borderCol}\`\}/g,
  `section className={\`rounded border p-5 shadow-sm \${surface} \${borderCol}\`}`
);
content = content.replace(
  /bg-\[#696cff\]\/10 text-\[#696cff\]/g,
  `bg-[#696cff]/10 text-[#696cff]`
);
content = content.replace(
  /rounded-xl/g,
  `rounded`
);

// 6. Update main wrapper layout to include softSurface background and page centering wrapper
const targetMainStart = `  return (
    <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8 animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
      <form onSubmit={submit} className="mx-auto max-w-7xl">`;

const newMainStart = `  return (
    <main className={\`flex-1 overflow-y-auto \${softSurface} p-6\`}>
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <form onSubmit={submit}>`;

content = content.replace(targetMainStart, newMainStart);

// 7. Update ending tag layout
const targetMainEnd = `      </form>

        <style>{\`
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
    );`;

const newMainEnd = `          </form>
        </div>
      </div>

      <style>{\`
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
  );`;

content = content.replace(targetMainEnd, newMainEnd);

fs.writeFileSync(filePath, content, "utf-8");
console.log("Settings page successfully updated with Users Dashboard UI specs!");

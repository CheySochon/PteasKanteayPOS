import fs from "fs";

const filePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/settings/page.tsx";
let content = fs.readFileSync(filePath, "utf-8");

// 1. Replace green theme colors with Sneat primary purple colors
content = content.replace(/#1D9E75/g, "#696cff");
content = content.replace(/#188a66/g, "#5f61e6");
content = content.replace(/shadow-emerald-600\/20/g, "shadow-[#696cff]/20");

// 2. Replace success alert classes with Sneat success green colors
content = content.replace(/border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700/g, "border-[#71dd37]/35 bg-[#e8fadf] px-4 py-3 text-sm font-bold text-[#71dd37]");

// 3. Inject loading state check and entrance animation keyframe class on the main wrapper
const originalReturn = `  return (
    <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8">`;

const animatedReturn = `  if (loading) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#696cff]" size={36} />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8 animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">`;

if (content.includes(originalReturn)) {
  content = content.replace(originalReturn, animatedReturn);
}

// 4. Inject keyframe key definition at the end before closing </main>
const originalEnd = `        </form>\n    </main>\n  );\n}`;
const animatedEnd = `        </form>\n\n      <style>{\`\n        @keyframes usersPageIn {\n          from {\n            opacity: 0;\n            transform: translateY(10px);\n          }\n          to {\n            opacity: 1;\n            transform: translateY(0);\n          }\n        }\n      \`}</style>\n    </main>\n  );\n}`;

if (content.includes(originalEnd)) {
  content = content.replace(originalEnd, animatedEnd);
} else {
  // Let's find other forms of ending
  const altOriginalEnd = `        </form>\n\n    </main>\n  );\n}`;
  if (content.includes(altOriginalEnd)) {
    content = content.replace(altOriginalEnd, animatedEnd);
  }
}

fs.writeFileSync(filePath, content, "utf-8");
console.log("Settings page successfully updated with Sneat UI styles and slide-up animations!");

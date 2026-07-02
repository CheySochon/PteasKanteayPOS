import fs from "fs";

const content = fs.readFileSync("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/menu/page.tsx", "utf-8");
const matches = content.match(/useEffect\([\s\S]*?\}\,\s*\[[\s\S]*?\]\)/g);
if (matches) {
  matches.forEach((m, i) => {
    console.log(`EFFECT ${i+1}:`);
    console.log(m.slice(0, 300) + (m.length > 300 ? "..." : ""));
  });
}

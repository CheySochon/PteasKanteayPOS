import fs from "fs";

const content = fs.readFileSync("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/tables/page.tsx", "utf-8");
const lines = content.split("\n");
let braces = 0;
let started = false;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("export default function TablesPage()")) {
    started = true;
  }
  if (started) {
    // count open and close braces
    const openMatches = line.match(/\{/g);
    const closeMatches = line.match(/\}/g);
    if (openMatches) braces += openMatches.length;
    if (closeMatches) braces -= closeMatches.length;
    if (braces === 0) {
      endLine = i + 1;
      break;
    }
  }
}

console.log(`TablesPage ends at line: ${endLine}`);
if (endLine !== -1) {
  for (let l = Math.max(1, endLine - 10); l <= endLine; l++) {
    console.log(`${l}: ${lines[l - 1]}`);
  }
}

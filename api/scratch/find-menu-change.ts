import fs from "fs";

const content = fs.readFileSync("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/menu/page.tsx", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.includes("pos-menu-view-change") || line.includes("reload") || line.includes("view")) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});

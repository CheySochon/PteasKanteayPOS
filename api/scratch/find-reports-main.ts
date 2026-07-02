import fs from "fs";

const content = fs.readFileSync("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/reports/page.tsx", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.includes("</header>") || (index > 450 && index < 600 && line.includes("<div"))) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});

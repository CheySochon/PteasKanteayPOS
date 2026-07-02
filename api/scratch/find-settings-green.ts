import fs from "fs";

const content = fs.readFileSync("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/settings/page.tsx", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.includes("1D9E75") || line.includes("188a66") || line.includes("emerald")) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});

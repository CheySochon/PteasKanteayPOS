import fs from "fs";

const content = fs.readFileSync("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/components/Sidebar.tsx", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.includes("260ms") || line.includes("transition")) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});

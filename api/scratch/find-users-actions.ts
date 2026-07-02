import fs from "fs";

const content = fs.readFileSync("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/users/page.tsx", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.includes("Edit3") || line.includes("actions") || line.includes("<tr") || line.includes("Action")) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});

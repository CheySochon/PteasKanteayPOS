import fs from "fs";

const filePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/page.tsx";
let content = fs.readFileSync(filePath, "utf-8");

content = content.replace(/borderDash: \[5, 5\],\s*/g, "");

fs.writeFileSync(filePath, content);
console.log("Fixed TS error!");

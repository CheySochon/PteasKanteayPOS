import fs from "fs";

const content = fs.readFileSync("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/menu/page.tsx", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.includes("export default function MenuPage") || line.includes("return (") || line.includes("tab === ") || line.includes("activeTab === ")) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});

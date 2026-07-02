import fs from "fs";

const content = fs.readFileSync("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/lib/api.ts", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.includes("uploadProductImage")) {
    console.log(`Line ${index + 1}`);
    for(let i=index; i<index+15; i++) {
       console.log(lines[i]);
    }
  }
});

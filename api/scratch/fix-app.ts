import fs from "fs";

const appPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/app.ts";
let content = fs.readFileSync(appPath, "utf-8");

content = content.replace(/import inventoryRouter from "\.\/routers\/inventory\.router\.js";\n/, "");
content = content.replace(/\s*app\.use\("\/api\/inventory", inventoryRouter\);\n/, "\n");

fs.writeFileSync(appPath, content);
console.log("Fixed app.ts");

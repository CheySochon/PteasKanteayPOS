import fs from "fs";

// 1. Delete inventory files
const filesToDelete = [
  "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/routers/inventory.router.ts",
  "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/controllers/inventory.controller.ts",
  "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/services/inventory.service.ts",
  "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/schemas/inventory.schema.ts",
];

for (const file of filesToDelete) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Deleted ${file}`);
  }
}

// 2. Remove from routers/index.ts
const routerPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/routers/index.ts";
if (fs.existsSync(routerPath)) {
  let routerContent = fs.readFileSync(routerPath, "utf-8");
  routerContent = routerContent.replace(/import inventoryRouter from "\.\/inventory\.router";\n/, "");
  routerContent = routerContent.replace(/\s*router\.use\("\/inventory", inventoryRouter\);\n/, "\n");
  fs.writeFileSync(routerPath, routerContent);
  console.log("Updated routers/index.ts");
}

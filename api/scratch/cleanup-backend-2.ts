import fs from "fs";

// app.ts
const appPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/app.ts";
if (fs.existsSync(appPath)) {
  let content = fs.readFileSync(appPath, "utf-8");
  content = content.replace(/import inventoryRouter from "\.\/routers\/inventory\.router";\n/, "");
  content = content.replace(/\s*app\.use\("\/api\/inventory", inventoryRouter\);\n/, "\n");
  fs.writeFileSync(appPath, content);
  console.log("Updated app.ts");
}

// setting.service.ts
const settingPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/services/setting.service.ts";
if (fs.existsSync(settingPath)) {
  let content = fs.readFileSync(settingPath, "utf-8");
  // Assuming there's a default setting for low_stock_threshold or similar
  content = content.replace(/\s*low_stock_threshold: \d+,?\n/g, "\n");
  fs.writeFileSync(settingPath, content);
  console.log("Updated setting.service.ts");
}

// product.service.ts
const productPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/services/product.service.ts";
if (fs.existsSync(productPath)) {
  let content = fs.readFileSync(productPath, "utf-8");
  // Remove includes for ingredients
  content = content.replace(/\s*ingredients: \{[\s\S]*?\},?\n/g, "\n");
  content = content.replace(/\s*ingredients: true,?\n/g, "\n");
  // Remove ingredient creation logic
  content = content.replace(/\s*if \(data\.ingredients && Array\.isArray\(data\.ingredients\)\) \{[\s\S]*?\}\s*\}\n/g, "\n");
  fs.writeFileSync(productPath, content);
  console.log("Updated product.service.ts");
}

// backup.service.ts
const backupPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/services/backup.service.ts";
if (fs.existsSync(backupPath)) {
  let content = fs.readFileSync(backupPath, "utf-8");
  content = content.replace(/\s*"Ingredient",\n/, "\n");
  content = content.replace(/\s*"ProductIngredient",\n/, "\n");
  content = content.replace(/\s*"StockMovement",\n/, "\n");
  fs.writeFileSync(backupPath, content);
  console.log("Updated backup.service.ts");
}

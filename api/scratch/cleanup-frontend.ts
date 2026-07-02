import fs from "fs";
import path from "path";

// 1. Delete inventory directory
const inventoryDir = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/inventory";
if (fs.existsSync(inventoryDir)) {
  fs.rmSync(inventoryDir, { recursive: true, force: true });
  console.log("Deleted admin/inventory directory");
}

// 2. types.ts
const typesPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/lib/types.ts";
if (fs.existsSync(typesPath)) {
  let content = fs.readFileSync(typesPath, "utf-8");
  content = content.replace(/export interface Ingredient \{[\s\S]*?\}\n/g, "");
  content = content.replace(/export interface ProductIngredient \{[\s\S]*?\}\n/g, "");
  content = content.replace(/export interface StockMovement \{[\s\S]*?\}\n/g, "");
  content = content.replace(/\s*ingredients\?: ProductIngredient\[\];\n/g, "\n");
  fs.writeFileSync(typesPath, content);
  console.log("Updated types.ts");
}

// 3. api.ts
const apiPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/lib/api.ts";
if (fs.existsSync(apiPath)) {
  let content = fs.readFileSync(apiPath, "utf-8");
  content = content.replace(/import type \{[\s\S]*?Ingredient, StockMovement,[\s\S]*?\} from "\.\/types";/, (match) => {
    return match.replace("Ingredient, StockMovement,", "");
  });
  content = content.replace(/export const getInventory[\s\S]*?\}\n\};\n/g, "");
  content = content.replace(/export const getLowStock[\s\S]*?\}\n\};\n/g, "");
  content = content.replace(/export const addIngredient[\s\S]*?\}\n\};\n/g, "");
  content = content.replace(/export const updateIngredient[\s\S]*?\}\n\};\n/g, "");
  content = content.replace(/export const deleteIngredient[\s\S]*?\}\n\};\n/g, "");
  content = content.replace(/export const addStockMovement[\s\S]*?\}\n\};\n/g, "");
  fs.writeFileSync(apiPath, content);
  console.log("Updated api.ts");
}

// 4. permissions.ts
const permPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/lib/permissions.ts";
if (fs.existsSync(permPath)) {
  let content = fs.readFileSync(permPath, "utf-8");
  content = content.replace(/\s*"inventory\.view": ".*",\n/g, "\n");
  content = content.replace(/\s*"inventory\.manage": ".*",\n/g, "\n");
  content = content.replace(/\s*inventory\.view: boolean;\n/g, "\n");
  content = content.replace(/\s*inventory\.manage: boolean;\n/g, "\n");
  fs.writeFileSync(permPath, content);
  console.log("Updated permissions.ts");
}

// 5. Sidebar.tsx
const sidebarPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/components/Sidebar.tsx";
if (fs.existsSync(sidebarPath)) {
  let content = fs.readFileSync(sidebarPath, "utf-8");
  content = content.replace(/\{ name: "Inventory", href: "\/admin\/inventory", icon: Box, requiredPermission: "inventory\.view" \},/g, "");
  fs.writeFileSync(sidebarPath, content);
  console.log("Updated Sidebar.tsx");
}

// 6. admin/page.tsx
const adminPagePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/page.tsx";
if (fs.existsSync(adminPagePath)) {
  let content = fs.readFileSync(adminPagePath, "utf-8");
  content = content.replace(/import \{.*?getLowStock.*?\} from "\.\.\/\.\.\/lib\/api";/g, (match) => {
    return match.replace("getLowStock,", "");
  });
  content = content.replace(/const \[lowStock, setLowStock\] = useState<Ingredient\[\]>\(\[\]\);\n/g, "");
  content = content.replace(/const stockRes = await getLowStock\(\);\n\s*setLowStock\(stockRes\);\n/g, "");
  // Remove low stock stat
  content = content.replace(/\{ label: t\.lowStock, value: lowStock\.length, tone: lowStock\.length > 0 \? "danger" : "good" \},/g, "");
  // Remove low stock section
  content = content.replace(/<div className=\{`min-w-0 \$\{cardClass\} p-4`\}>[\s\S]*?Low Stock Alerts[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, "</div>\n          </div>\n        </div>");
  fs.writeFileSync(adminPagePath, content);
  console.log("Updated admin/page.tsx");
}

// 7. menu/page.tsx
const menuPagePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/menu/page.tsx";
if (fs.existsSync(menuPagePath)) {
  let content = fs.readFileSync(menuPagePath, "utf-8");
  // Remove ingredient state & fetching
  content = content.replace(/const \[ingredients, setIngredients\] = useState<Ingredient\[\]>\(\[\]\);\n/g, "");
  content = content.replace(/const invRes = await getInventory\(\);\n\s*setIngredients\(invRes\);\n/g, "");
  // Remove ingredient selections from JSX (this might be tricky with regex, so we'll see if it builds)
  fs.writeFileSync(menuPagePath, content);
  console.log("Updated menu/page.tsx");
}


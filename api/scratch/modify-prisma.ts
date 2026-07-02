import fs from "fs";

const filePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/prisma/schema.prisma";
let content = fs.readFileSync(filePath, "utf-8");

// Remove enums
content = content.replace(/enum StockMovementType \{[\s\S]*?\}\n/, "");
content = content.replace(/\s*low_stock\n/, "\n");

// Remove relationships
content = content.replace(/\s*stockMovementsCreated StockMovement\[\] @relation\("StockMovementCreatedBy"\)\n/, "\n");
content = content.replace(/\s*ingredients\s+ProductIngredient\[\]\n/, "\n");
content = content.replace(/\s*stockMovements StockMovement\[\]\n/, "\n");

// Remove models
content = content.replace(/model Ingredient \{[\s\S]*?\}\n/, "");
content = content.replace(/model ProductIngredient \{[\s\S]*?\}\n/, "");
content = content.replace(/model StockMovement \{[\s\S]*?\}\n/, "");

fs.writeFileSync(filePath, content);
console.log("Prisma schema modified successfully.");

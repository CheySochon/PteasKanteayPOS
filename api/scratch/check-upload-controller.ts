import fs from "fs";
const text = fs.readFileSync("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src/controllers/product.controller.ts", "utf8");
console.log(text.substring(text.indexOf("export const uploadImage"), text.indexOf("export const uploadImage") + 500));

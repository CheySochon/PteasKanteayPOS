import fs from "fs";
import path from "path";

function searchDir(dir: string, term: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, term);
    } else if (file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".css")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.includes(term)) {
        console.log(`Found "${term}" in: ${fullPath}`);
      }
    }
  }
}

searchDir("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src", "usersPageIn");

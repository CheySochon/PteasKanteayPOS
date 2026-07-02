import fs from "fs";
import path from "path";

function searchDir(dir: string, term: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      searchDir(fullPath, term);
    } else if (fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(term)) {
        console.log(`Found in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(term)) {
            console.log(`  ${index + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/api/src", ".url()");

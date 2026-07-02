import fs from "fs";
import path from "path";

const filePath = path.join("d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/menu/page.tsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Add state
if (!content.includes("const [categoryQuery, setCategoryQuery]")) {
  content = content.replace(
    /const \[query, setQuery\] = useState\(""\);/,
    `const [query, setQuery] = useState("");\n  const [categoryQuery, setCategoryQuery] = useState("");`
  );
}

// 2. Add filteredCategories logic
if (!content.includes("const filteredCategories = useMemo")) {
  content = content.replace(
    /const filteredProducts = useMemo\(\(\) => \{/,
    `const filteredCategories = useMemo(() => {\n    const normalizedQuery = categoryQuery.trim().toLowerCase();\n    return categories.filter(category => \n      !normalizedQuery || category.name.toLowerCase().includes(normalizedQuery) || (category.description || "").toLowerCase().includes(normalizedQuery)\n    );\n  }, [categories, categoryQuery]);\n\n  const filteredProducts = useMemo(() => {`
  );
}

// 3. Add search UI to categories view
if (!content.includes("value={categoryQuery}")) {
  const categoriesViewStart = content.indexOf(`{categories.length} {t.categories}`);
  const categoriesEmptyStart = content.indexOf(`{categories.length === 0 ? (`);

  if (categoriesViewStart > -1 && categoriesEmptyStart > -1) {
    const searchUI = `
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#e5e7eb] dark:border-[#4e4f6e] pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#a1acb8]">
                {filteredCategories.length} {t.categories}
              </span>
              <div className="relative w-full sm:w-80">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  value={categoryQuery}
                  onChange={(event) => setCategoryQuery(event.target.value)}
                  placeholder="Search categories..."
                  className={\`h-10 w-full rounded border pl-10 pr-3 text-sm outline-none placeholder-[#b4bdc6] focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 transition-all duration-150 \${
                    dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                  }\`}
                />
              </div>
            </div>`;

    content = content.replace(
      /<div className="border-b border-\[#e5e7eb\] dark:border-\[#4e4f6e\] pb-3">\s*<span className="text-xs font-bold uppercase tracking-wider text-\[#a1acb8\]">\s*\{categories\.length\} \{t\.categories\}\s*<\/span>\s*<\/div>/,
      searchUI
    );
  }
}

// 4. Update the map to use filteredCategories
content = content.replace(
  /\{categories\.length === 0 \? \(/,
  `{filteredCategories.length === 0 ? (`
);

content = content.replace(
  /\{categories\.map\(\(category\) => \{/,
  `{filteredCategories.map((category) => {`
);

fs.writeFileSync(filePath, content);
console.log("Category search logic added successfully!");

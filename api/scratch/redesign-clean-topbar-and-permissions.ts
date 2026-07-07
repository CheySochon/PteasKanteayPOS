import fs from "fs";

const topBarPath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/components/TopBar.tsx";
const permPagePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/permissions/page.tsx";

// 1. Update TopBar to clean Search Bar (remove text links)
let topBar = fs.readFileSync(topBarPath, "utf-8");

if (!topBar.includes("import { Search }")) {
  topBar = topBar.replace(
    'import {\n  Bell,',
    'import {\n  Bell,\n  Search,'
  );
}

const oldNav = `<nav className="hidden items-center gap-1 md:flex">
            {allowedQuickLinks.map(({ label, href, Icon }) => (
              <Link
                key={label}
                href={href}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-[#566a7f] dark:text-[#c9d4ea] bg-[#eceef1]/60 dark:bg-[#3a3b53] hover:bg-[#696cff] hover:text-white transition-all shadow-sm"
              >
                <Icon size={15} />
                <span>{t.quickLinks[label as keyof typeof t.quickLinks] || label}</span>
              </Link>
            ))}
          </nav>`;

const newSearchNav = `<div className="hidden items-center gap-2 md:flex">
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-[#a1acb8]" />
              <input
                type="text"
                placeholder="Search..."
                className={\`h-8.5 w-60 rounded-xl border border-slate-200/80 dark:border-[#4e4f6e] bg-[#f5f5f9] dark:bg-[#232333] pl-9 pr-3 text-xs outline-none transition placeholder:text-[#a1acb8] focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 \${textPrimary}\`}
              />
            </div>
          </div>`;

topBar = topBar.replace(oldNav, newSearchNav);
fs.writeFileSync(topBarPath, topBar);

// 2. Redesign PermissionsPage into an ultra-clean, minimalistic list/table UI
let permPage = fs.readFileSync(permPagePath, "utf-8");

// Update grouped categories to be clean with nice icons and titles
const cleanCategoriesDefinition = `  // Ultra clean grouped pages definition
  const groupedCategories = useMemo(() => {
    return [
      {
        title: "POS & Terminals",
        items: STAFF_PERMISSION_PAGES.filter((p) => ["pos", "kds"].includes(p.key)),
      },
      {
        title: "Operations & Service",
        items: STAFF_PERMISSION_PAGES.filter((p) => ["orders", "tables", "menu", "inventory"].includes(p.key)),
      },
      {
        title: "System & Administration",
        items: STAFF_PERMISSION_PAGES.filter((p) => ["dashboard", "reports", "users", "settings"].includes(p.key)),
      },
    ];
  }, []);`;

permPage = permPage.replace(
  /\/\/\s*Grouped pages definition[\s\S]*?\},\s*\[\]\);/,
  cleanCategoriesDefinition
);

fs.writeFileSync(permPagePath, permPage);

console.log("Successfully updated TopBar and PermissionsPage definition!");

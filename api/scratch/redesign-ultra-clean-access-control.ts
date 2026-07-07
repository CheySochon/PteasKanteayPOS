import fs from "fs";

const pagePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/permissions/page.tsx";
let code = fs.readFileSync(pagePath, "utf-8");

// Define icon map for page items
const iconMapDef = `const PAGE_ICONS: Record<string, typeof Home> = {
  pos: DollarSign,
  kds: Calendar,
  orders: UtensilsCrossed,
  menu: Sparkles,
  inventory: Package,
  tables: Tv,
  dashboard: Home,
  reports: BarChart3,
  users: UserCog,
  settings: Settings,
};
`;

if (!code.includes("PAGE_ICONS")) {
  code = code.replace("export default function PermissionsPage() {", `${iconMapDef}\nexport default function PermissionsPage() {`);
}

// Replace the chunky grid section with an ultra-clean list layout
const oldGroupedSections = `              {/* Grouped sections */}
              <div className="space-y-6">
                {groupedCategories.map((category, catIndex) => (
                  <div key={catIndex} className="space-y-3">
                    <h3 className="text-xs font-bold text-[#8592a3] uppercase tracking-wider pl-1">{category.title}</h3>
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      {category.items.map((page) => {
                        const isGranted = Boolean(currentPermissions[page.key]);

                        return (
                          <label
                            key={page.key}
                            className={\`flex cursor-pointer items-center justify-between rounded border p-3.5 transition-all \${
                              isGranted
                                ? "border-[#696cff]/30 bg-[#696cff]/[0.02] hover:border-[#696cff]"
                                : "border-[#e5e7eb] bg-transparent hover:border-slate-300"
                            }\`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className={\`block text-xs font-black \${textPrimary}\`}>{page.label}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => updatePermission(page.key, !isGranted)}
                              className={\`relative h-6 w-11 shrink-0 rounded-full transition-colors \${
                                isGranted ? "bg-[#696cff]" : "bg-slate-200"
                              }\`}
                            >
                              <span
                                className={\`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform \${
                                  isGranted ? "translate-x-5.5" : "translate-x-0.5"
                                }\`}
                              />
                            </button>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>`;

const newCleanListSections = `              {/* Ultra Clean List Sections */}
              <div className="space-y-6">
                {groupedCategories.map((category, catIndex) => (
                  <div key={catIndex} className="space-y-2">
                    <div className="flex items-center justify-between px-1 pb-1">
                      <h3 className="text-[11px] font-black uppercase tracking-wider text-[#8592a3]">{category.title}</h3>
                      <span className="text-[10px] font-bold text-[#a1acb8]">
                        {category.items.filter((p) => currentPermissions[p.key]).length}/{category.items.length} Allowed
                      </span>
                    </div>
                    
                    <div className="divide-y divide-slate-100 dark:divide-[#34355a] rounded-xl border border-slate-200/70 dark:border-[#4e4f6e] overflow-hidden bg-white dark:bg-[#2b2c40]">
                      {category.items.map((page) => {
                        const isGranted = Boolean(currentPermissions[page.key]);
                        const PageIcon = PAGE_ICONS[page.key] || ShieldCheck;

                        return (
                          <div
                            key={page.key}
                            onClick={() => updatePermission(page.key, !isGranted)}
                            className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-[#34355a]/50 transition-all duration-150"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={\`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors \${
                                  isGranted
                                    ? "bg-[#696cff]/10 text-[#696cff]"
                                    : "bg-slate-100 text-[#a1acb8] dark:bg-[#3a3b53]"
                                }\`}
                              >
                                <PageIcon size={17} />
                              </div>
                              <span className={\`text-xs font-bold truncate \${textPrimary}\`}>{page.label}</span>
                            </div>

                            <div className="flex items-center gap-4">
                              <span
                                className={\`hidden sm:inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider \${
                                  isGranted
                                    ? "bg-[#71dd37]/10 text-[#71dd37]"
                                    : "bg-slate-100 text-[#a1acb8] dark:bg-[#3a3b53]"
                                }\`}
                              >
                                {isGranted ? "Allowed" : "Blocked"}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePermission(page.key, !isGranted);
                                }}
                                className={\`relative h-6 w-11 shrink-0 rounded-full transition-colors \${
                                  isGranted ? "bg-[#696cff]" : "bg-slate-200 dark:bg-[#4e4f6e]"
                                }\`}
                              >
                                <span
                                  className={\`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform \${
                                    isGranted ? "translate-x-5.5" : "translate-x-0.5"
                                  }\`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>`;

code = code.replace(oldGroupedSections, newCleanListSections);

fs.writeFileSync(pagePath, code);
console.log("Successfully transformed Page Access Control to Ultra Clean List UI!");

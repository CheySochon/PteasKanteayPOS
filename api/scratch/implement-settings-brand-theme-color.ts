import fs from "fs";

const pagePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/settings/page.tsx";
let content = fs.readFileSync(pagePath, "utf-8");

// Add Palette icon to imports if not present
if (!content.includes("Palette")) {
  content = content.replace("Building2,", "Building2,\n  Palette,");
}

// Add brandColor default
content = content.replace(
  `kitchenDisplayMode: "compact",`,
  `kitchenDisplayMode: "compact",\n  brandColor: "#696cff",`
);

const presetColorsBlock = `const PRESET_COLORS = [
  { name: "Sneat Purple", hex: "#696cff", bg: "bg-[#696cff]" },
  { name: "Emerald Mint", hex: "#10b981", bg: "bg-[#10b981]" },
  { name: "Sunset Orange", hex: "#f97316", bg: "bg-[#f97316]" },
  { name: "Ocean Blue", hex: "#0284c7", bg: "bg-[#0284c7]" },
  { name: "Rose Pink", hex: "#e11d48", bg: "bg-[#e11d48]" },
  { name: "Midnight Indigo", hex: "#6366f1", bg: "bg-[#6366f1]" },
];`;

if (!content.includes("PRESET_COLORS")) {
  content = content.replace("const DEFAULT_SETTINGS: AppSettings = {", `${presetColorsBlock}\n\nconst DEFAULT_SETTINGS: AppSettings = {`);
}

const themePanelJSX = `              <Panel
                Icon={Palette}
                title="Theme & Brand Accent Color"
                subtitle="Choose your restaurant's signature brand color across POS, Admin, and KDS."
                surface={surface}
                borderCol={borderCol}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              >
                <div className="space-y-4">
                  <div>
                    <label className={\`block text-xs font-bold uppercase tracking-wider mb-2.5 \${textSecondary}\`}>
                      Preset Sneat Palettes
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {PRESET_COLORS.map((preset) => {
                        const isSelected = (settings.brandColor || "#696cff").toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => {
                              update("brandColor", preset.hex);
                              localStorage.setItem("pos_brand_color", preset.hex);
                              window.dispatchEvent(new CustomEvent("pos-brand-color-change", { detail: preset.hex }));
                            }}
                            className={\`flex items-center gap-2 rounded-xl p-2.5 border transition-all text-left \${
                              isSelected
                                ? "border-[#696cff] bg-[#696cff]/10 font-bold text-[#696cff] shadow-sm"
                                : \`\${borderCol} \${softSurface} hover:border-[#696cff]/40\`
                            }\`}
                          >
                            <span className={\`h-4 w-4 rounded-full shrink-0 \${preset.bg} ring-2 ring-white dark:ring-[#2b2c40] shadow-sm\`}/>
                            <span className="text-xs truncate">{preset.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-[#3a3b53] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <label className={\`block text-xs font-bold uppercase tracking-wider mb-1 \${textSecondary}\`}>
                        Custom Brand Hex Code
                      </label>
                      <p className={\`text-xs \${textSecondary}\`}>
                        Enter an exact hex color or pick with custom color swatch
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center">
                        <input
                          type="color"
                          value={settings.brandColor || "#696cff"}
                          onChange={(e) => {
                            update("brandColor", e.target.value);
                            localStorage.setItem("pos_brand_color", e.target.value);
                            window.dispatchEvent(new CustomEvent("pos-brand-color-change", { detail: e.target.value }));
                          }}
                          className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        />
                      </div>
                      <input
                        type="text"
                        value={settings.brandColor || "#696cff"}
                        onChange={(e) => {
                          update("brandColor", e.target.value);
                          localStorage.setItem("pos_brand_color", e.target.value);
                          window.dispatchEvent(new CustomEvent("pos-brand-color-change", { detail: e.target.value }));
                        }}
                        className={\`w-28 rounded-lg border px-3 py-1.5 text-xs font-mono font-bold uppercase outline-none transition \${inputClass}\`}
                        placeholder="#696CFF"
                      />
                    </div>
                  </div>
                </div>
              </Panel>`;

content = content.replace(
  `              <Panel
                Icon={Bell}`,
  `${themePanelJSX}\n\n              <Panel\n                Icon={Bell}`
);

fs.writeFileSync(pagePath, content);
console.log("Successfully added Theme & Brand Accent Color Customizer to AdminSettingsPage!");

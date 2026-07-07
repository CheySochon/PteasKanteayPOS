import fs from "fs";

const permPagePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/permissions/page.tsx";
let code = fs.readFileSync(permPagePath, "utf-8");

// Add TopBar import if missing
if (!code.includes("import TopBar")) {
  code = code.replace(
    'import { getSettings, getUsers, updateSettings } from "../../../lib/api";',
    'import TopBar from "../../../components/TopBar";\nimport type { Language, NotificationItem } from "../../../components/TopBar";\nimport { getSettings, getUsers, updateSettings } from "../../../lib/api";'
  );
}

// Add state for language and notifications if needed
if (!code.includes("const [language, setLanguage] = useState")) {
  code = code.replace(
    "export default function PermissionsPage() {",
    `export default function PermissionsPage() {
  const [language, setLanguage] = useAppLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);`
  );
}

// Update the return statement to include TopBar at the top
const oldReturn = `  return (
    <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8 animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded bg-[#e7e7ff] px-3 py-1 text-xs font-bold text-[#696cff]">
              <ShieldCheck size={14} />
              {t.badge}
            </div>
            <h1 className={\`text-3xl font-bold tracking-tight \${textPrimary}\`}>{t.title}</h1>
            <p className={\`mt-1 text-sm \${textSecondary}\`}>{t.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={savePermissions}
            disabled={loading || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#696cff] px-5 text-sm font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60 shrink-0"
          >
            {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            {saving ? t.saving : t.save}
          </button>
        </div>`;

const newReturn = `  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-[#f5f5f9] dark:bg-[#232333]">
      <TopBar
        title={t.title}
        subtitle={t.subtitle}
        language={language}
        onLanguageChange={setLanguage}
        notifications={notifications}
        onClearNotifications={() => setNotifications([])}
        dark={dark}
      />
      <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mx-auto max-w-7xl">
          {/* Header Action Bar */}
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-[#2b2c40] p-4 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] border border-slate-200/80 dark:border-[#4e4f6e]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#696cff]/10 text-[#696cff]">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 className={\`text-lg font-black \${textPrimary}\`}>{t.title}</h1>
                <p className={\`text-xs \${textSecondary}\`}>{t.subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={savePermissions}
              disabled={loading || saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#696cff] px-6 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60 shrink-0"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? t.saving : t.save}
            </button>
          </div>`;

code = code.replace(oldReturn, newReturn);

fs.writeFileSync(permPagePath, code);
console.log("Successfully added TopBar to PermissionsPage!");

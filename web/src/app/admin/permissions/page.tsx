"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Save,
  ShieldCheck,
  UserRound,
  Users,
  Search,
  Sparkles,
  MonitorPlay,
  Tv,
  UtensilsCrossed,
  Package,
  Home,
  BarChart3,
  Settings,
  Key,
  RefreshCw,
  Unlock,
  Lock,
  Eye,
  EyeOff,
  UserCog,
  DollarSign,
  Calendar,
} from "lucide-react";
import TopBar from "../../../components/TopBar";
import type { Language, NotificationItem } from "../../../components/TopBar";
import { getSettings, getUsers, updateSettings } from "../../../lib/api";
import { setAppLanguage, useAppLanguage } from "../../../lib/language";
import { useAppTheme } from "../../../lib/theme";
import {
  DEFAULT_STAFF_PERMISSIONS,
  STAFF_PERMISSION_PAGES,
  StaffPermissionSettings,
  normalizePermissionSettings,
  permissionsForUser,
  serializePermissionSettings,
} from "../../../lib/permissions";
import type { User } from "../../../lib/types";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";

const TEXT = {
  en: {
    badge: "Access Control",
    title: "Permissions Manager",
    subtitle: "Grant or restrict screen access for restaurant staff dynamically.",
    staff: "Page Access Control",
    staffNote: "Configure exactly which sections are visible and accessible.",
    defaultStaff: "Default Staff",
    defaultStaffNote: "Fallback settings for newly registered staff.",
    userAccess: "Accounts",
    selectUser: "Select a user to edit",
    custom: "Custom",
    inherited: "Default",
    useDefault: "Reset to Default",
    inheritedNote: "This user is currently using the global fallback permissions. Toggling options below will automatically create a custom overrides profile.",
    save: "Save Permissions",
    saving: "Saving Changes...",
    saved: "Permissions updated successfully.",
    error: "Unable to update permissions.",
    searchUser: "Search staff accounts...",
    presets: "Permission Presets",
    presetFull: "Full Access",
    presetCashier: "Cashier Mode",
    presetKitchen: "Staff / Kitchen",
    presetNone: "No Access",
    previewTitle: "Sidebar Preview",
    previewSubtitle: "Real-time visibility mock",
    sidebarVisible: "Visible",
    sidebarHidden: "Hidden",
  },
  km: {
    badge: "Access Control",
    title: "Permissions Manager",
    subtitle: "Grant or restrict screen access for restaurant staff dynamically.",
    staff: "Page Access Control",
    staffNote: "Configure exactly which sections are visible and accessible.",
    defaultStaff: "Default Staff",
    defaultStaffNote: "Fallback settings for newly registered staff.",
    userAccess: "Accounts",
    selectUser: "Select a user to edit",
    custom: "Custom",
    inherited: "Default",
    useDefault: "Reset to Default",
    inheritedNote: "This user is currently using the global fallback permissions. Toggling options below will automatically create a custom overrides profile.",
    save: "Save Permissions",
    saving: "Saving Changes...",
    saved: "Permissions updated successfully.",
    error: "Unable to update permissions.",
    searchUser: "Search staff accounts...",
    presets: "Permission Presets",
    presetFull: "Full Access",
    presetCashier: "Cashier Mode",
    presetKitchen: "Staff / Kitchen",
    presetNone: "No Access",
    previewTitle: "Sidebar Preview",
    previewSubtitle: "Real-time visibility mock",
    sidebarVisible: "Visible",
    sidebarHidden: "Hidden",
  },
};

function storedUserId() {
  if (typeof window === "undefined") return undefined;
  try {
    return (JSON.parse(localStorage.getItem("pos_user") || "{}") as { id?: number }).id;
  } catch {
    return undefined;
  }
}

function userRoleName(user: User) {
  return typeof user.role === "string" ? user.role : user.role?.name || "Member";
}

function getAvatarColor(name: string) {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    "bg-[#e7e7ff] text-[#696cff]",     // Primary Purple
    "bg-[#e8fadf] text-[#71dd37]",     // Success Green
    "bg-[#ffe5e5] text-[#ff3e1d]",     // Danger Red
    "bg-[#fff2d6] text-[#ffab00]",     // Warning Orange
    "bg-[#d7f5fc] text-[#03c3ec]",     // Info Cyan
    "bg-[#eceef1] text-[#8592a3]",     // Muted Gray
  ];
  return colors[hash % colors.length];
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PAGE_ICONS: Record<string, typeof Home> = {
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

export default function PermissionsPage() {
  const language = useAppLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const t = TEXT[language || "en"];
  const [theme] = useAppTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("defaults");
  const [searchQuery, setSearchQuery] = useState("");
  const [permissionSettings, setPermissionSettings] = useState<StaffPermissionSettings>(() =>
    normalizePermissionSettings(DEFAULT_STAFF_PERMISSIONS)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useAutoDismiss(message, setMessage);
  useAutoDismiss(error, setError);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f8fafc]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/80";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";

  const currentPermissions = useMemo(() => {
    const normalized = normalizePermissionSettings(permissionSettings);
    if (selectedUserId === "defaults") return normalized.defaults;
    return normalized.users[selectedUserId] || normalized.defaults;
  }, [permissionSettings, selectedUserId]);

  const selectedUser = users.find((user) => String(user.id) === selectedUserId);
  const hasCustomPermissions = selectedUserId !== "defaults" && Boolean(permissionSettings.users?.[selectedUserId]);

  // Filter users list based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        userRoleName(user).toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  useEffect(() => {
    Promise.all([getSettings(), getUsers().catch(() => [])])
      .then(([settings, nextUsers]) => {
        const nextPermissions = normalizePermissionSettings(settings.staffPermissions);
        const sortedUsers = [...nextUsers].sort((a, b) => a.name.localeCompare(b.name));

        setUsers(sortedUsers);
        setPermissionSettings(nextPermissions);

        // Read userId parameter from URL search params client-side safely
        const params = new URLSearchParams(window.location.search);
        const userIdParam = params.get("userId");

        if (userIdParam && sortedUsers.some((u) => String(u.id) === userIdParam)) {
          setSelectedUserId(userIdParam);
        } else if (sortedUsers.length > 0) {
          setSelectedUserId(String(sortedUsers[0].id));
        }

        localStorage.setItem("pos_staff_permissions", JSON.stringify(permissionsForUser(storedUserId(), nextPermissions)));
        window.dispatchEvent(new Event("pos-permissions-change"));
      })
      .catch((err) => setError(err instanceof Error ? err.message : t.error))
      .finally(() => setLoading(false));
  }, [t.error]);

  async function savePermissions() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const next = await updateSettings({ staffPermissions: serializePermissionSettings(permissionSettings) });
      const normalized = normalizePermissionSettings(next.staffPermissions);

      setPermissionSettings(normalized);
      localStorage.setItem("pos_staff_permissions", JSON.stringify(permissionsForUser(storedUserId(), normalized)));
      window.dispatchEvent(new Event("pos-permissions-change"));
      setMessage(t.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setSaving(false);
    }
  }

  function updatePermission(permissionKey: string, checked: boolean) {
    setPermissionSettings((current) => {
      const normalized = normalizePermissionSettings(current);

      if (selectedUserId === "defaults") {
        const defaults = { ...normalized.defaults, [permissionKey]: checked };
        return { ...normalized, ...defaults, defaults };
      }

      return {
        ...normalized,
        users: {
          ...normalized.users,
          [selectedUserId]: {
            ...(normalized.users[selectedUserId] || normalized.defaults),
            [permissionKey]: checked,
          },
        },
      };
    });
  }

  function applyPreset(presetType: "full" | "cashier" | "staff" | "none") {
    let preset: Record<string, boolean> = {};

    switch (presetType) {
      case "full":
        preset = {
          dashboard: true,
          orders: true,
          menu: true,
          inventory: true,
          tables: true,
          reports: true,
          users: true,
          settings: true,
          pos: true,
          kds: true,
        };
        break;
      case "cashier":
        preset = {
          dashboard: true,
          orders: true,
          menu: false,
          inventory: false,
          tables: true,
          reports: false,
          users: false,
          settings: false,
          pos: true,
          kds: false,
        };
        break;
      case "staff":
        preset = {
          dashboard: true,
          orders: true,
          menu: true,
          inventory: true,
          tables: true,
          reports: false,
          users: false,
          settings: false,
          pos: false,
          kds: true,
        };
        break;
      case "none":
        preset = {
          dashboard: false,
          orders: false,
          menu: false,
          inventory: false,
          tables: false,
          reports: false,
          users: false,
          settings: false,
          pos: false,
          kds: false,
        };
        break;
    }

    setPermissionSettings((current) => {
      const normalized = normalizePermissionSettings(current);

      if (selectedUserId === "defaults") {
        return { ...normalized, defaults: preset };
      }

      return {
        ...normalized,
        users: {
          ...normalized.users,
          [selectedUserId]: preset,
        },
      };
    });
  }

  function clearUserOverride() {
    if (selectedUserId === "defaults") return;

    setPermissionSettings((current) => {
      const normalized = normalizePermissionSettings(current);
      const remainingUsers = Object.fromEntries(
        Object.entries(normalized.users).filter(([userId]) => userId !== selectedUserId)
      );

      return { ...normalized, users: remainingUsers };
    });
  }

  // Count active permissions
  const activeCount = useMemo(() => {
    return Object.values(currentPermissions).filter(Boolean).length;
  }, [currentPermissions]);

    // Ultra clean grouped pages definition
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
  }, []);

  // Mock sidebar configuration for live preview
  const mockSidebarItems = [
    { key: "dashboard", label: "Dashboard", icon: <Home size={15} /> },
    { key: "pos", label: "POS Terminal", icon: <DollarSign size={15} /> },
    { key: "orders", label: "Orders", icon: <UtensilsCrossed size={15} /> },
    { key: "menu", label: "Menu Catalog", icon: <Sparkles size={15} /> },
    { key: "inventory", label: "Inventory", icon: <Package size={15} /> },
    { key: "tables", label: "Tables", icon: <Tv size={15} /> },
    { key: "reports", label: "Reports", icon: <BarChart3 size={15} /> },
    { key: "users", label: "Users & Staff", icon: <UserCog size={15} /> },
    { key: "settings", label: "Settings", icon: <Settings size={15} /> },
    { key: "kds", label: "KDS (Kitchen)", icon: <Calendar size={15} /> },
  ];

  if (loading) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#696cff]" size={36} />
      </main>
    );
  }

  return (
    <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-[#f5f5f9]"}`}>
      <TopBar
        title={t.title}
        subtitle={t.subtitle}
        language={language}
        onLanguageChange={setAppLanguage}
        notifications={notifications}
        onClearNotifications={() => setNotifications([])}
        dark={dark}
      />
      
      <div className="flex-1 p-6 overflow-y-auto animate-[pageFadeIn_350ms_ease-out_both]">
        <div className="mx-auto w-full max-w-[1300px] flex flex-col lg:flex-row gap-6 items-stretch min-h-[calc(100vh-140px)]">
          
          {/* Column 1: Directory (Left Sidebar) */}
          <div className={`w-full lg:w-[290px] rounded-lg border p-5 flex flex-col shrink-0 transition-all duration-300 ${surface} ${borderCol} shadow-sm`}>
            <div className="mb-4">
              <h2 className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-slate-300" : "text-slate-500"}`}>
                Staff Accounts
              </h2>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 text-[#a1acb8]" size={14} />
              <input
                type="text"
                placeholder={t.searchUser}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`h-9 w-full rounded border pl-9 pr-4 text-xs font-medium outline-none transition-all duration-150 ${
                  dark 
                    ? "border-slate-800 bg-[#1e1e2d] focus:border-[#696cff]" 
                    : "border-slate-200 bg-slate-50/50 focus:border-[#696cff]"
                } ${textPrimary}`}
              />
            </div>

            {/* User List */}
            <div className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedUserId("defaults")}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded transition-all duration-150 text-left ${
                  selectedUserId === "defaults"
                    ? "bg-[#696cff]/10 text-[#696cff] font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Settings size={15} className={selectedUserId === "defaults" ? "text-[#696cff]" : "text-slate-400"} />
                <span className="text-xs">{t.defaultStaff}</span>
              </button>

              <div className={`h-px my-2.5 ${dark ? "bg-slate-800" : "bg-slate-100"}`} />

              {filteredUsers.map((user) => {
                const active = selectedUserId === String(user.id);
                const custom = Boolean(permissionSettings.users?.[String(user.id)]);
                const initials = getInitials(user.name);
                const avatarCol = getAvatarColor(user.name);

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(String(user.id))}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 rounded transition-all duration-150 text-left ${
                      active
                        ? "bg-[#696cff]/10 text-[#696cff] font-semibold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded text-xs font-bold ${avatarCol} shadow-sm`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`block text-xs truncate font-medium ${active ? "text-[#696cff] font-semibold" : ""}`}>
                          {user.name}
                        </span>
                        {custom && (
                          <span className="shrink-0 text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                            {t.custom}
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate leading-none">
                        {user.email}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: Workspace Settings (Right Area) */}
          <div className={`flex-1 rounded-lg border p-6 flex flex-col transition-all duration-300 ${surface} ${borderCol} shadow-sm`}>
            
            {/* Header / Active User profile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  selectedUserId === "defaults" ? "bg-emerald-500/10 text-emerald-500" : "bg-[#696cff]/10 text-[#696cff]"
                }`}>
                  {selectedUserId === "defaults" ? <Settings size={20} /> : <UserCog size={20} />}
                </div>
                <div>
                  <h1 className={`text-base font-bold ${dark ? "text-slate-100" : "text-[#566a7f]"}`}>
                    {selectedUserId === "defaults" ? t.defaultStaff : selectedUser?.name}
                  </h1>
                  <p className="text-xs text-[#a1acb8] mt-0.5 font-medium">
                    {selectedUserId === "defaults" 
                      ? "Configure fallback permissions for new accounts" 
                      : `Active account: ${userRoleName(selectedUser!)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {hasCustomPermissions && (
                  <button
                    type="button"
                    onClick={clearUserOverride}
                    className="h-8.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
                  >
                    {t.useDefault}
                  </button>
                )}

                <button
                  type="button"
                  onClick={savePermissions}
                  disabled={loading || saving}
                  className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded bg-[#696cff] px-5 text-xs font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </div>

            {/* Segmented Presets Control */}
            <div className="py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quick Presets
              </span>

              {/* Modern Cohesive Pill Selector */}
              <div className="inline-flex p-0.5 rounded-lg bg-slate-50 dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-800/80">
                {[
                  { key: "full", label: t.presetFull },
                  { key: "cashier", label: t.presetCashier },
                  { key: "staff", label: t.presetKitchen },
                  { key: "none", label: t.presetNone },
                ].map((item) => {
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => applyPreset(item.key as any)}
                      className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded border border-red-200 bg-red-500/5 px-5 py-3 text-xs font-semibold text-red-600 flex items-center gap-2.5 animate-[shake_300ms_ease-in-out]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                {error}
              </div>
            )}

            {message && (
              <div className="mt-4 rounded border border-emerald-200 bg-emerald-500/5 px-5 py-3 text-xs font-semibold text-emerald-600 flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {message}
              </div>
            )}

            {/* Access Matrix Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-6 mt-4 pr-1 custom-scrollbar">
              {groupedCategories.map((category) => {
                return (
                  <div key={category.title} className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block pb-1 border-b border-slate-100 dark:border-slate-800">
                      {category.title}
                    </span>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {category.items.map((page) => {
                        const isGranted = Boolean(currentPermissions[page.key]);
                        const PageIcon = PAGE_ICONS[page.key] || ShieldCheck;
                        
                        const friendlyName = 
                          page.key === "pos" ? "POS Register" :
                          page.key === "kds" ? "Kitchen Screen" :
                          page.key === "orders" ? "Orders List" :
                          page.key === "tables" ? "Dining Tables" :
                          page.key === "menu" ? "Menu Catalog" :
                          page.key === "inventory" ? "Inventory Manager" :
                          page.key === "dashboard" ? "Dashboard Stats" :
                          page.key === "reports" ? "Reports & Export" :
                          page.key === "users" ? "Staff Accounts" :
                          "System Settings";

                        return (
                          <div key={page.key} className="py-3 flex items-center justify-between group">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={isGranted ? "text-[#696cff]" : "text-slate-400"}>
                                <PageIcon size={16} />
                              </span>
                              <span className={`text-xs font-semibold ${isGranted ? (dark ? "text-slate-100" : "text-[#566a7f]") : "text-slate-400"}`}>
                                {friendlyName}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => updatePermission(page.key, !isGranted)}
                              className={`relative h-5 w-8.5 shrink-0 rounded-full transition-all duration-300 outline-none ${
                                isGranted ? "bg-[#696cff] shadow-sm" : "bg-slate-200 dark:bg-slate-700"
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-300 ${
                                  isGranted ? "left-4" : "left-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {selectedUserId !== "defaults" && !hasCustomPermissions && (
                <div className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1a1a26] px-4.5 py-3.5 text-xs text-slate-500 font-medium leading-relaxed">
                  💡 This user is inheriting default staff permissions. Toggling options will automatically create custom access overrides.
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
      <style>{`
        @keyframes pageFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(133, 146, 163, 0.2);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(133, 146, 163, 0.4);
        }
      `}</style>
    </main>
  );
}

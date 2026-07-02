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
import { getSettings, getUsers, updateSettings } from "../../../lib/api";
import { useAppLanguage } from "../../../lib/language";
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

export default function PermissionsPage() {
  const language = useAppLanguage();
  const t = TEXT[language];
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
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f5f5f9]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]";
  const textPrimary = dark ? "text-slate-100" : "text-[#566a7f]";
  const textSecondary = dark ? "text-slate-400" : "text-[#a1acb8]";

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

  // Grouped pages definition for beautiful layout
  const groupedCategories = useMemo(() => {
    return [
      {
        title: "💻 POS & KDS Terminals",
        items: STAFF_PERMISSION_PAGES.filter((p) => ["pos", "kds"].includes(p.key)),
      },
      {
        title: "🍔 Service & Stock",
        items: STAFF_PERMISSION_PAGES.filter((p) => ["orders", "tables", "menu", "inventory"].includes(p.key)),
      },
      {
        title: "📊 Management & Settings",
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
    { key: "reports", label: "Reports", icon: <BarChart3 size={15} /> },
    { key: "tables", label: "Tables", icon: <Tv size={15} /> },
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
    <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8 animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded bg-[#e7e7ff] px-3 py-1 text-xs font-bold text-[#696cff]">
              <ShieldCheck size={14} />
              {t.badge}
            </div>
            <h1 className={`text-3xl font-bold tracking-tight ${textPrimary}`}>{t.title}</h1>
            <p className={`mt-1 text-sm ${textSecondary}`}>{t.subtitle}</p>
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
        </div>

        {error && (
          <div className="mb-5 rounded border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        {/* Main Grid Layout */}
        <section className="grid gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_260px]">
          
          {/* Column 1: Search & User Accounts */}
          <div className={`rounded border p-4 shadow-sm flex flex-col h-[calc(100vh-210px)] ${surface} ${borderCol}`}>
            <div className="mb-4 flex items-center gap-2 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-[#e7e7ff] text-[#696cff]">
                <Users size={18} />
              </div>
              <div>
                <h2 className={`text-sm font-bold ${textPrimary}`}>{t.userAccess}</h2>
                <p className={`text-[11px] ${textSecondary}`}>{t.selectUser}</p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-2.5 text-[#8592a3]" size={15} />
              <input
                type="text"
                placeholder={t.searchUser}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`h-9 w-full rounded border pl-9 pr-3 text-xs outline-none border-[#d9dee3] focus:border-[#696cff] transition-all ${surface} ${textPrimary}`}
              />
            </div>

            {/* User List scrollable container */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              <button
                type="button"
                onClick={() => setSelectedUserId("defaults")}
                className={`flex w-full items-center gap-3 rounded border p-2.5 text-left transition ${
                  selectedUserId === "defaults"
                    ? "border-[#696cff] bg-[#696cff]/[0.08] text-[#696cff] font-semibold"
                    : `${borderCol} ${softSurface} ${textPrimary} hover:bg-[#eceef1]/40`
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#eceef1] text-[#8592a3]">
                  <Settings size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold leading-tight truncate">{t.defaultStaff}</span>
                  <span className="block text-[10px] text-[#8592a3] leading-tight truncate">Global configurations</span>
                </div>
              </button>

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
                    className={`flex w-full items-center gap-3 rounded border p-2.5 text-left transition ${
                      active
                        ? "border-[#696cff] bg-[#696cff]/[0.08] text-[#696cff] font-semibold"
                        : `${borderCol} ${softSurface} ${textPrimary} hover:bg-[#eceef1]/40`
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarCol}`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="block text-xs font-bold leading-tight truncate">{user.name}</span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold ${
                            custom ? "bg-[#e8fadf] text-[#71dd37]" : "bg-[#eceef1] text-[#8592a3]"
                          }`}
                        >
                          {custom ? t.custom : t.inherited}
                        </span>
                      </div>
                      <span className={`block text-[10px] leading-tight truncate ${active ? "text-[#696cff]/80" : textSecondary}`}>
                        {user.email}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: Presets & Grouped Permission Checklist */}
          <div className="space-y-5">
            {/* Presets Card */}
            <div className={`rounded border p-4 shadow-sm ${surface} ${borderCol}`}>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-[#ffab00]" />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${textPrimary}`}>{t.presets}</h3>
              </div>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => applyPreset("full")}
                  className="px-3 py-2 rounded text-xs font-bold bg-[#696cff]/[0.08] text-[#696cff] hover:bg-[#696cff]/[0.15] border border-[#696cff]/20 transition-all text-center"
                >
                  {t.presetFull}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("cashier")}
                  className="px-3 py-2 rounded text-xs font-bold bg-[#e8fadf] text-[#71dd37] hover:bg-[#e8fadf]/130 border border-[#71dd37]/20 transition-all text-center"
                >
                  {t.presetCashier}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("staff")}
                  className="px-3 py-2 rounded text-xs font-bold bg-[#d7f5fc] text-[#03c3ec] hover:bg-[#d7f5fc]/130 border border-[#03c3ec]/20 transition-all text-center"
                >
                  {t.presetKitchen}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("none")}
                  className="px-3 py-2 rounded text-xs font-bold bg-[#ffe5e5] text-[#ff3e1d] hover:bg-[#ffe5e5]/130 border border-[#ff3e1d]/20 transition-all text-center"
                >
                  {t.presetNone}
                </button>
              </div>
            </div>

            {/* Permission Options List */}
            <div className={`rounded border p-5 shadow-sm ${surface} ${borderCol}`}>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b pb-4 border-[#e5e7eb]/60">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded bg-[#eceef1] px-3 py-0.5 text-xs font-semibold text-[#8592a3]">
                    <UserRound size={12} />
                    {selectedUser ? selectedUser.name : t.defaultStaff}
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-base font-bold ${textPrimary}`}>{t.staff}</h2>
                    <span className="rounded bg-[#696cff]/10 text-[#696cff] px-2 py-0.5 text-[10px] font-bold">
                      {activeCount} / {STAFF_PERMISSION_PAGES.length} Enabled
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${textSecondary}`}>{t.staffNote}</p>
                </div>

                {hasCustomPermissions && (
                  <button
                    type="button"
                    onClick={clearUserOverride}
                    className="h-8 rounded border border-[#d9dee3] px-3 text-xs font-semibold text-[#ff3e1d] bg-[#ffe5e5]/40 hover:bg-[#ffe5e5] transition-all"
                  >
                    {t.useDefault}
                  </button>
                )}
              </div>

              {/* Grouped sections */}
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
                            className={`flex cursor-pointer items-center justify-between rounded border p-3.5 transition-all ${
                              isGranted
                                ? "border-[#696cff]/30 bg-[#696cff]/[0.02] hover:border-[#696cff]"
                                : "border-[#e5e7eb] bg-transparent hover:border-slate-300"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className={`block text-xs font-bold ${textPrimary}`}>{page.label}</span>
                              <span className="block text-[9.5px] text-[#a1acb8] font-semibold mt-0.5 truncate">{page.href}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => updatePermission(page.key, !isGranted)}
                              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                                isGranted ? "bg-[#696cff]" : "bg-slate-200"
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                  isGranted ? "translate-x-5.5" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {selectedUserId !== "defaults" && !hasCustomPermissions && (
                <div className="mt-6 rounded bg-[#e7e7ff]/30 text-[#696cff] border border-[#696cff]/20 px-4 py-3 text-xs font-medium">
                  {t.inheritedNote}
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Live Sidebar Preview (Super WOW feature!) */}
          <div className="hidden xl:block">
            <div className={`rounded border p-4 shadow-sm sticky top-6 ${surface} ${borderCol}`}>
              <div className="mb-4">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${textPrimary}`}>{t.previewTitle}</h3>
                <p className={`text-[10px] ${textSecondary}`}>{t.previewSubtitle}</p>
              </div>

              {/* Mini Mock Sidebar representation */}
              <div className="rounded border border-dashed p-3 border-[#e5e7eb] space-y-1.5 bg-[#f5f5f9]/20">
                {mockSidebarItems.map((item) => {
                  const isVisible = Boolean(currentPermissions[item.key]);

                  return (
                    <div
                      key={item.key}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all ${
                        isVisible
                          ? "bg-white text-[#566a7f] shadow-sm border border-slate-100"
                          : "opacity-40 line-through text-[#a1acb8]"
                      }`}
                    >
                      <div className={isVisible ? "text-[#696cff]" : "text-[#8592a3]"}>
                        {item.icon}
                      </div>
                      <span className="flex-1 truncate">{item.label}</span>
                      
                      {isVisible ? (
                        <Eye size={12} className="text-[#71dd37] shrink-0" />
                      ) : (
                        <EyeOff size={12} className="text-[#ff3e1d] shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </section>
      </div>

      <style>{`
        @keyframes usersPageIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

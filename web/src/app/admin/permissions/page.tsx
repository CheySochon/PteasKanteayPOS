"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck, UserRound, Users } from "lucide-react";
import { getSettings, getUsers, updateSettings } from "../../lib/api";
import { useAppLanguage } from "../../lib/language";
import { useAppTheme } from "../../lib/theme";
import {
  DEFAULT_STAFF_PERMISSIONS,
  STAFF_PERMISSION_PAGES,
  StaffPermissionSettings,
  normalizePermissionSettings,
  permissionsForUser,
  serializePermissionSettings,
} from "../../lib/permissions";
import type { User } from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";

const TEXT = {
  en: {
    badge: "Access Control",
    title: "Permissions",
    subtitle: "Select a user, then choose which pages they can see and open.",
    staff: "Page Permissions",
    staffNote: "Unticked pages are hidden from Staff and blocked by the route guard.",
    defaultStaff: "Default Staff",
    defaultStaffNote: "Fallback permissions for Staff users without a custom setup.",
    userAccess: "User Access",
    selectUser: "Select user",
    custom: "Custom",
    inherited: "Default",
    useDefault: "Use default",
    inheritedNote: "This user is using the default Staff permissions. Ticking a box here creates a custom setup for them.",
    save: "Save Permissions",
    saving: "Saving...",
    saved: "Permissions saved successfully.",
    error: "Unable to save permissions.",
  },
  km: {
    badge: "Access Control",
    title: "Permissions",
    subtitle: "Select a user, then choose which pages they can see and open.",
    staff: "Page Permissions",
    staffNote: "Unticked pages are hidden from Staff and blocked by the route guard.",
    defaultStaff: "Default Staff",
    defaultStaffNote: "Fallback permissions for Staff users without a custom setup.",
    userAccess: "User Access",
    selectUser: "Select user",
    custom: "Custom",
    inherited: "Default",
    useDefault: "Use default",
    inheritedNote: "This user is using the default Staff permissions. Ticking a box here creates a custom setup for them.",
    save: "Save Permissions",
    saving: "Saving...",
    saved: "Permissions saved successfully.",
    error: "Unable to save permissions.",
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

export default function PermissionsPage() {
  const language = useAppLanguage();
  const t = TEXT[language];
  const [theme] = useAppTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("defaults");
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
  const surface = dark ? "bg-[#171a23]" : "bg-white";
  const softSurface = dark ? "bg-[#1f2330]" : "bg-slate-50";
  const borderCol = dark ? "border-[#2a2f3d]" : "border-slate-200";
  const textPrimary = dark ? "text-slate-100" : "text-slate-950";
  const textSecondary = dark ? "text-slate-400" : "text-slate-500";

  const currentPermissions = useMemo(() => {
    const normalized = normalizePermissionSettings(permissionSettings);
    if (selectedUserId === "defaults") return normalized.defaults;

    return normalized.users[selectedUserId] || normalized.defaults;
  }, [permissionSettings, selectedUserId]);
  const selectedUser = users.find((user) => String(user.id) === selectedUserId);
  const hasCustomPermissions = selectedUserId !== "defaults" && Boolean(permissionSettings.users?.[selectedUserId]);

  useEffect(() => {
    Promise.all([getSettings(), getUsers().catch(() => [])])
      .then(([settings, nextUsers]) => {
        const nextPermissions = normalizePermissionSettings(settings.staffPermissions);
        const sortedUsers = [...nextUsers].sort((a, b) => a.name.localeCompare(b.name));

        setUsers(sortedUsers);
        setPermissionSettings(nextPermissions);
        if (sortedUsers.length > 0) {
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

  return (
    <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <ShieldCheck size={14} />
                {t.badge}
              </div>
              <h1 className={`text-3xl font-black tracking-tight ${textPrimary}`}>{t.title}</h1>
              <p className={`mt-1 text-sm ${textSecondary}`}>{t.subtitle}</p>
            </div>

            <button
              type="button"
              onClick={savePermissions}
              disabled={loading || saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              {saving ? t.saving : t.save}
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className={`rounded-2xl border p-4 shadow-sm ${surface} ${borderCol}`}>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className={`text-sm font-black ${textPrimary}`}>{t.userAccess}</h2>
                  <p className={`text-[11px] ${textSecondary}`}>{t.selectUser}</p>
                </div>
              </div>

              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className={`mb-3 h-11 w-full rounded-xl border px-3 text-sm font-bold outline-none ${borderCol} ${surface} ${textPrimary}`}
              >
                <option value="defaults">{t.defaultStaff}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {userRoleName(user)}
                  </option>
                ))}
              </select>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserId("defaults")}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                    selectedUserId === "defaults" ? "border-blue-200 bg-blue-50 text-blue-700" : `${borderCol} ${softSurface} ${textPrimary}`
                  }`}
                >
                  <span>
                    <span className="block text-sm font-black">{t.defaultStaff}</span>
                    <span className={`block text-[11px] ${selectedUserId === "defaults" ? "text-blue-600" : textSecondary}`}>
                      {t.defaultStaffNote}
                    </span>
                  </span>
                </button>

                {users.map((user) => {
                  const active = selectedUserId === String(user.id);
                  const custom = Boolean(permissionSettings.users?.[String(user.id)]);

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(String(user.id))}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                        active ? "border-blue-200 bg-blue-50 text-blue-700" : `${borderCol} ${softSurface} ${textPrimary}`
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{user.name}</span>
                        <span className={`block truncate text-[11px] ${active ? "text-blue-600" : textSecondary}`}>
                          {user.email}
                        </span>
                      </span>
                      <span
                        className={`ml-2 shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                          custom ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {custom ? t.custom : t.inherited}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`rounded-2xl border p-5 shadow-sm ${surface} ${borderCol}`}>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    <UserRound size={13} />
                    {selectedUser ? selectedUser.name : t.defaultStaff}
                  </div>
                  <h2 className={`text-base font-black ${textPrimary}`}>{t.staff}</h2>
                  <p className={`mt-1 text-xs ${textSecondary}`}>{t.staffNote}</p>
                </div>

                {hasCustomPermissions && (
                  <button
                    type="button"
                    onClick={clearUserOverride}
                    className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-500 hover:bg-slate-50"
                  >
                    {t.useDefault}
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {STAFF_PERMISSION_PAGES.map((page) => (
                  <label
                    key={page.key}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${borderCol} ${softSurface}`}
                  >
                    <div>
                      <div className={`text-sm font-black ${textPrimary}`}>{page.label}</div>
                      <div className={`text-[11px] ${textSecondary}`}>{page.href}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(currentPermissions[page.key])}
                      onChange={(event) => updatePermission(page.key, event.target.checked)}
                      className="h-5 w-5 accent-blue-600"
                    />
                  </label>
                ))}
              </div>

              {selectedUserId !== "defaults" && !hasCustomPermissions && (
                <div className={`mt-4 rounded-xl border px-4 py-3 text-xs font-semibold ${borderCol} ${softSurface} ${textSecondary}`}>
                  {t.inheritedNote}
                </div>
              )}
            </div>
          </section>
        </div>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  Edit3,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useAppTheme } from "../../lib/theme";
import {
  createUser,
  deleteUser,
  getRoles,
  getUsers,
  updateUser,
} from "../../lib/api";
import type { Role, User } from "../../lib/types";
import {
  getProfileImage,
  getProfileVersionSnapshot,
  getServerProfileVersionSnapshot,
  initials,
  profileAvatarClass,
  subscribeToProfileChanges,
} from "../../lib/profile";
import { useAutoDismiss } from "../../lib/useAutoDismiss";


type UserForm = {
  id?: number;
  name: string;
  email: string;
  password: string;
  roleName: string;
  isActive: boolean;
};

const EMPTY_FORM: UserForm = {
  name: "",
  email: "",
  password: "",
  roleName: "Staff",
  isActive: true,
};

export default function UsersPage() {
  const [theme] = useAppTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [currentUserId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;

    const storedUser = localStorage.getItem("pos_user");
    if (!storedUser) return null;

    try {
      const user = JSON.parse(storedUser) as { id?: number };
      return user.id || null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useAutoDismiss(message, setMessage);
  useAutoDismiss(error, setError);
  useSyncExternalStore(
    subscribeToProfileChanges,
    getProfileVersionSnapshot,
    getServerProfileVersionSnapshot,
  );

  const dark = theme === "dark";
  const surface = dark ? "bg-[#111827]" : "bg-white";
  const softSurface = dark ? "bg-[#0f172a]" : "bg-slate-50";
  const borderCol = dark ? "border-slate-700/70" : "border-slate-200";
  const textPrimary = dark ? "text-slate-100" : "text-slate-900";
  const textSecondary = dark ? "text-slate-400" : "text-slate-500";

  const cardClass = `rounded-xl border ${borderCol} ${surface} shadow-sm`;

  const inputClass = `w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-emerald-500 ${
    dark
      ? "border-slate-700/70 bg-[#0f172a] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
  }`;

  useEffect(() => {
    let mounted = true;

    Promise.all([getUsers(), getRoles()])
      .then(([userRows, roleRows]) => {
        if (!mounted) return;
        setUsers(userRows);
        setRoles(roleRows);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(
          err instanceof Error
            ? `${err.message}. Login as Admin to manage users.`
            : "Unable to load users",
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeUsers = useMemo(
    () => users.filter((user) => user.isActive).length,
    [users],
  );

  const adminUsers = useMemo(
    () =>
      users.filter((user) =>
        ["Super Admin", "Admin"].includes(roleName(user)),
      ).length,
    [users],
  );

  const roleOptions = useMemo(() => {
    if (roles.some((role) => role.name === form.roleName)) return roles;
    return [{ id: 0, name: form.roleName }, ...roles].filter((role) => role.name);
  }, [form.roleName, roles]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (form.id) {
        const body = {
          name: form.name,
          email: form.email,
          roleName: form.roleName,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        };

        const updated = await updateUser(form.id, body);

        setUsers((current) =>
          current.map((user) => (user.id === updated.id ? updated : user)),
        );

        setMessage("User updated successfully.");
      } else {
        const created = await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          roleName: form.roleName,
          isActive: form.isActive,
        });

        setUsers((current) => [created, ...current]);
        setMessage("User created successfully.");
      }

      closeUserModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user");
    } finally {
      setSaving(false);
    }
  }

  async function remove(user: User) {
    const ok = window.confirm(`Delete ${user.name}?`);
    if (!ok) return;

    setMessage("");
    setError("");

    try {
      await deleteUser(user.id);

      setUsers((current) => current.filter((entry) => entry.id !== user.id));

      if (form.id === user.id) closeUserModal();

      setMessage("User deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete user");
    }
  }

  async function toggleActive(user: User) {
    setMessage("");
    setError("");

    try {
      const updated = await updateUser(user.id, { isActive: !user.isActive });

      setUsers((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user");
    }
  }

  function edit(user: User) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      roleName: roleName(user) || "Staff",
      isActive: user.isActive,
    });

    setMessage("");
    setError("");
    setIsUserModalOpen(true);
  }

  function openCreateUserModal() {
    setForm(EMPTY_FORM);
    setMessage("");
    setError("");
    setIsUserModalOpen(true);
  }

  function closeUserModal() {
    setIsUserModalOpen(false);
    setForm(EMPTY_FORM);
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
          <div className="animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <section className={`mb-4 rounded-xl border p-4 shadow-sm ${surface} ${borderCol}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-600">
                  <ShieldCheck size={14} />
                  Access Control
                </div>

                <h1 className={`text-2xl font-bold tracking-tight ${textPrimary}`}>
                  Users
                </h1>

                <p className={`mt-1 text-sm ${textSecondary}`}>
                  Create staff accounts, assign roles, and manage access.
                </p>
              </div>

              <button
                onClick={openCreateUserModal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <Plus size={17} />
                New User
              </button>
            </div>
          </section>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          <section className="mb-4 grid animate-[usersSectionIn_560ms_cubic-bezier(0.16,1,0.3,1)_90ms_both] gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Total Users"
              value={users.length}
              dark={dark}
              tone="blue"
            />

            <SummaryCard
              label="Active Users"
              value={activeUsers}
              dark={dark}
              tone="green"
            />

            <SummaryCard
              label="Admins"
              value={adminUsers}
              dark={dark}
              tone="purple"
            />
          </section>

          <section className="grid animate-[usersSectionIn_620ms_cubic-bezier(0.16,1,0.3,1)_150ms_both] gap-4 xl:grid-cols-[1fr_360px]">
            <div className={`overflow-hidden ${cardClass}`}>
              <div
                className={`flex h-14 items-center justify-between border-b px-4 ${borderCol}`}
              >
                <div>
                  <h2 className={`text-base font-bold ${textPrimary}`}>
                    Team Members
                  </h2>
                  <p className={`hidden text-xs sm:block ${textSecondary}`}>
                    Admins can create, edit, deactivate, and delete users.
                  </p>
                </div>

                {loading && (
                  <Loader2 className="animate-spin text-emerald-600" size={18} />
                )}
              </div>

              {users.length === 0 && !loading ? (
                <div
                  className={`p-8 text-center text-sm ${textSecondary}`}
                >
                  No users to show
                </div>
              ) : (
                <div className={dark ? "divide-y divide-slate-700/70" : "divide-y divide-slate-100"}>
                  {users.map((user) => {
                    const isSelf = currentUserId === user.id;

                    return (
                      <div
                        key={user.id}
                        className={`grid gap-3 px-4 py-3 lg:grid-cols-[1fr_140px_130px_170px] lg:items-center ${
                          dark ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <TeamMemberAvatar user={user} />

                          <div className="min-w-0">
                            <div
                              className={`truncate text-sm font-bold ${textPrimary}`}
                            >
                              {user.name}
                            </div>
                            <div className={`truncate text-xs ${textSecondary}`}>
                              {user.email}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${roleBadge(
                            roleName(user),
                          )}`}
                        >
                          {roleName(user) || "Member"}
                        </span>

                        <button
                          disabled={isSelf}
                          onClick={() => toggleActive(user)}
                          className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            user.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {isSelf ? "You" : user.isActive ? "Active" : "Inactive"}
                        </button>

                        <div className="flex items-center gap-2 lg:justify-end">
                          <button
                            onClick={() => edit(user)}
                            className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-bold ${borderCol} ${softSurface} ${textPrimary}`}
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>

                          <button
                            disabled={isSelf}
                            onClick={() => remove(user)}
                            className="inline-flex h-8 items-center gap-2 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className={`${cardClass} p-4`}>
              <div className="mb-4">
                <h2 className={`text-base font-bold ${textPrimary}`}>
                  User Setup
                </h2>
                <p className={`mt-1 text-xs ${textSecondary}`}>
                  Add staff accounts from a dialog or use Edit on any team member.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateUserModal}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <Plus size={17} />
                New User
              </button>

              <div className={`mt-4 rounded-lg border p-3 ${borderCol} ${softSurface}`}>
                <div className={`text-sm font-bold ${textPrimary}`}>Access notes</div>
                <p className={`mt-1 text-xs leading-5 ${textSecondary}`}>
                  Admins can create, update, deactivate, and delete users. Inactive users cannot log in.
                </p>
              </div>
            </aside>
          </section>
          </div>
        </div>
      </main>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close user dialog"
            onClick={closeUserModal}
            className="absolute inset-0 bg-slate-950/30 animate-[userModalBackdrop_180ms_ease-out]"
          />

          <div className={`relative max-h-[calc(100vh-32px)] w-full max-w-lg overflow-y-auto rounded-2xl border p-5 shadow-2xl animate-[userModalIn_220ms_cubic-bezier(0.16,1,0.3,1)] ${surface} ${borderCol}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {form.id ? "Edit User" : "Create User"}
                </p>
                <h2 className={`mt-1 text-xl font-black ${textPrimary}`}>
                  {form.id ? form.name : "Add New User"}
                </h2>
                <p className={`mt-1 text-xs ${textSecondary}`}>
                  {form.id
                    ? "Leave password empty to keep it unchanged."
                    : "Password is required for new users."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeUserModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <Field label="Name">
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Email">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Password">
                <input
                  required={!form.id}
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Role">
                <select
                  value={form.roleName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      roleName: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  {(roleOptions.length
                    ? roleOptions
                    : [{ id: 0, name: "Staff" }]
                  ).map((role) => (
                    <option key={role.id || role.name} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </Field>

              <label
                className={`flex items-center justify-between rounded-lg border p-3 ${borderCol} ${softSurface}`}
              >
                <span>
                  <span className={`block text-sm font-bold ${textPrimary}`}>
                    Active Account
                  </span>
                  <span className={`block text-xs ${textSecondary}`}>
                    Inactive users cannot log in.
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-5 w-5 accent-emerald-600"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className={`h-11 flex-1 rounded-xl border px-4 text-sm font-bold ${borderCol} ${textSecondary}`}
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Save size={17} />
                  )}
                  {form.id ? "Save User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes userModalBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes userModalIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

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

        @keyframes usersSectionIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

function SummaryCard({
  label,
  value,
  dark,
  tone,
}: {
  label: string;
  value: number;
  dark: boolean;
  tone: "blue" | "green" | "purple";
}) {
  const tones = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        dark ? "border-slate-700/70 bg-[#111827]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div
            className={`mt-1 text-2xl font-bold tracking-tight ${
              dark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {value}
          </div>
        </div>

        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
          Live
        </span>
      </div>

      <div className="text-xs font-medium text-emerald-600">
        Access control
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function roleName(user: User) {
  return typeof user.role === "string" ? user.role : user.role?.name || "";
}

function roleBadge(role: string) {
  if (role === "Super Admin") return "bg-purple-100 text-purple-700";
  if (role === "Admin") return "bg-emerald-100 text-emerald-700";
  if (role === "Cashier") return "bg-blue-100 text-blue-700";
  if (role === "Staff") return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-600";
}

function TeamMemberAvatar({ user }: { user: User }) {
  const role = roleName(user) || "Member";
  const profileUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  const image = getProfileImage(profileUser);

  if (image) {
    return (
      <Image
        src={image}
        alt={user.name}
        width={40}
        height={40}
        unoptimized
        className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
      />
    );
  }

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white ${profileAvatarClass(
        role,
      )}`}
    >
      {user.name ? initials(user.name) : <UserRound size={18} />}
    </div>
  );
}

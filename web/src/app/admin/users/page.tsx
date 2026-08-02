"use client";

import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  UserX,
  ShieldAlert,
  MoreVertical,
  Download,
  Eye,
  EyeOff,
  Crown,
  CreditCard,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
import { useAppLanguage, setAppLanguage } from "../../../lib/language";
import TopBar from "../../../components/TopBar";
import { getSocket } from "../../../lib/socket";
import {
  createUser,
  deleteUser,
  getRoles,
  getUsers,
  updateUser,
} from "../../../lib/api";
import type { Role, User } from "../../../lib/types";
import {
  getProfileImage,
  getProfileVersionSnapshot,
  getServerProfileVersionSnapshot,
  initials,
  profileAvatarClass,
  subscribeToProfileChanges,
} from "../../../lib/profile";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";

type UserForm = {
  id?: number;
  name: string;
  email: string;
  password: string;
  pin: string;
  roleName: string;
  isActive: boolean;
};

const EMPTY_FORM: UserForm = {
  name: "",
  email: "",
  password: "",
  pin: "1234",
  roleName: "Cashier",
  isActive: true,
};

export default function UsersPage() {
  const [theme] = useAppTheme();
  const language = useAppLanguage();
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
  const [showModalPassword, setShowModalPassword] = useState(false);
  useAutoDismiss(message, setMessage);
  useAutoDismiss(error, setError);
  useSyncExternalStore(
    subscribeToProfileChanges,
    getProfileVersionSnapshot,
    getServerProfileVersionSnapshot,
  );

  // Search, Filters & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f8fafc]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/80";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";

  useEffect(() => {
    let mounted = true;

    Promise.all([getUsers(), getRoles()])
      .then(([userRows, roleRows]) => {
        if (!mounted) return;
        setUsers(userRows);
        setRoles(roleRows);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const socket = getSocket();
    if (socket) {
      function handleUserCreated(user: User) {
        setUsers((current) => [user, ...current.filter((u) => u.id !== user.id)]);
      }
      function handleUserUpdated(user: User) {
        setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, ...user } : u)));
      }
      function handleUserDeleted(data: { id: number }) {
        setUsers((current) => current.filter((u) => u.id !== data.id));
      }

      socket.on("user:created", handleUserCreated);
      socket.on("user:updated", handleUserUpdated);
      socket.on("user:deleted", handleUserDeleted);

      return () => {
        mounted = false;
        socket.off("user:created", handleUserCreated);
        socket.off("user:updated", handleUserUpdated);
        socket.off("user:deleted", handleUserDeleted);
      };
    }

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
    let customRoles: Array<{ id: number; name: string }> = [];
    try {
      customRoles = JSON.parse(localStorage.getItem("pos_custom_roles_list") || "[]");
    } catch {
      customRoles = [];
    }

    const combined = [...roles];
    customRoles.forEach((cr) => {
      if (cr.name && !combined.some((r) => r.name.toLowerCase() === cr.name.toLowerCase())) {
        combined.push({ id: cr.id, name: cr.name });
      }
    });

    if (form.roleName && !combined.some((role) => role.name === form.roleName)) {
      combined.unshift({ id: 0, name: form.roleName });
    }

    return combined.filter((role) => role.name);
  }, [form.roleName, roles]);

  // Apply filters
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const uRole = roleName(user);
      const matchesRole = !filterRole || uRole === filterRole;
      const matchesStatus =
        !filterStatus ||
        (filterStatus === "Active" && user.isActive) ||
        (filterStatus === "Inactive" && !user.isActive);
      const matchesSearch =
        !searchQuery ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [users, filterRole, filterStatus, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / limit) || 1;
  const startIndex = (currentPage - 1) * limit;
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(startIndex, startIndex + limit);
  }, [filteredUsers, startIndex, limit]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterStatus, limit]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const userEmail = form.email.trim() || `${form.name.toLowerCase().replace(/\s+/g, "")}.${form.roleName.toLowerCase()}@pos.local`;

      if (form.id) {
        const body = {
          name: form.name,
          email: userEmail,
          roleName: form.roleName,
          isActive: form.isActive,
          pin: form.pin || "1234",
          ...(form.password ? { password: form.password } : {}),
        };

        const updated = await updateUser(form.id, body as any);

        setUsers((current) =>
          current.map((user) => (user.id === updated.id ? updated : user)),
        );

        const socket = getSocket();
        if (socket) socket.emit("user:updated", updated);

        setMessage("User updated successfully.");
      } else {
        const created = await createUser({
          name: form.name,
          email: userEmail,
          password: form.password || "password123",
          roleName: form.roleName,
          isActive: form.isActive,
          pin: form.pin || "1234",
        } as any);

        setUsers((current) => [created, ...current]);

        const socket = getSocket();
        if (socket) socket.emit("user:created", created);

        setMessage("User created successfully.");
      }

      closeUserModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user");
    } finally {
      setSaving(false);
    }
  }

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  useEffect(() => {
    if (!deleteConfirmUser) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDeleteConfirmUser(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteConfirmUser]);

  async function confirmRemoveUser() {
    if (!deleteConfirmUser) return;
    const user = deleteConfirmUser;
    setDeleteConfirmUser(null);
    setMessage("");
    setError("");

    try {
      await deleteUser(user.id);
      setUsers((current) => current.filter((entry) => entry.id !== user.id));
      if (form.id === user.id) closeUserModal();

      const socket = getSocket();
      if (socket) socket.emit("user:deleted", { id: user.id });

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

      const socket = getSocket();
      if (socket) socket.emit("user:updated", updated);
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
      pin: (user as any).pin || (user.email.includes("cashier") ? "1234" : user.email.includes("staff") ? "5678" : "0000"),
      roleName: roleName(user) || "Cashier",
      isActive: user.isActive,
    });

    setMessage("");
    setError("");
    setShowModalPassword(false);
    setIsUserModalOpen(true);
  }

  function openCreateUserModal() {
    setForm(EMPTY_FORM);
    setMessage("");
    setError("");
    setShowModalPassword(false);
    setIsUserModalOpen(true);
  }

  function closeUserModal() {
    setIsUserModalOpen(false);
    setShowModalPassword(false);
    setForm(EMPTY_FORM);
  }

  return (
    <>


      <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-[#f5f5f9]"}`}>
        <TopBar
          title={language === "km" ? "បុគ្គលិក និងសិទ្ធិ" : "Staff & Roles"}
          subtitle={language === "km" ? "គ្រប់គ្រងគណនីបុគ្គលិក និងតួនាទី" : "Manage system users and their roles."}
          language={language}
          onLanguageChange={setAppLanguage}
          notifications={[]}
          dark={dark}
        />

        {/* Shared Tabs for Staff & Roles */}
        <div className={`px-4 pt-4 lg:px-8 flex items-center justify-between border-b shrink-0 ${dark ? "border-[#4e4f6e]" : "border-[#d9dee3]"}`}>
          <div className="mx-auto w-full max-w-[1600px] flex items-center justify-between">
            <div className="flex gap-6">
              <Link 
                href="/admin/users" 
                className={`pb-3 font-bold text-[14px] border-b-[3px] transition-colors border-[#0F522B] text-[#0F522B]`}
              >
                <span className="flex items-center gap-2"><UserRound size={16} /> {language === "km" ? "បញ្ជីបុគ្គលិក" : "User List"}</span>
              </Link>
              <Link 
                href="/admin/permissions" 
                className={`pb-3 font-semibold text-[14px] border-b-[3px] transition-colors border-transparent ${dark ? "text-[#a1acb8] hover:text-slate-200" : "text-[#566a7f] hover:text-[#0F522B]"}`}
              >
                <span className="flex items-center gap-2"><ShieldCheck size={16} /> {language === "km" ? "កំណត់សិទ្ធិ" : "Permissions"}</span>
              </Link>
            </div>

            {/* SUCCESS TOAST ALERT (Positioned inside Tab Bar on the right side with #696cff color) */}
            {message && (
              <div className="relative overflow-hidden flex items-center gap-2.5 px-4 py-1.5 mb-2 rounded-xl bg-[#696cff] text-white text-xs font-bold shadow-md shadow-[#696cff]/25 backdrop-blur-md border border-white/20 animate-[slideFromRight_350ms_cubic-bezier(0.16,1,0.3,1)]">
                <CheckCircle2 size={15} className="text-white shrink-0" />
                <span>{message}</span>
                {/* 3s Countdown Progress Bar */}
                <div className="absolute bottom-0 left-0 h-[2px] bg-white/70 animate-[toastProgress_3000ms_linear_forwards]" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">

            {/* Error Alert */}
            {error && (
              <div className="mb-6 rounded border border-red-150 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            {/* Table & Table Controls Container */}
            <section className={`rounded-2xl shadow-none overflow-hidden ${surface} border ${borderCol}`}>
              {/* Unified Controls & Filters Bar */}
              <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 dark:border-[#4e4f6e]/50">
                {/* Left Side: Limit, Search & Dropdown Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className={`h-9 rounded-lg border px-3 text-xs font-semibold outline-none focus:border-[#696cff] transition-all ${
                      dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                    }`}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search User..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`h-9 w-48 sm:w-56 rounded-lg border pl-3.5 pr-3 text-xs font-semibold outline-none placeholder-[#b4bdc6] focus:border-[#696cff] transition-all ${
                        dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                      }`}
                    />
                  </div>

                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className={`h-9 rounded-lg border px-3 text-xs font-semibold outline-none focus:border-[#696cff] transition-all ${
                      dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                    }`}
                  >
                    <option value="">All Roles</option>
                    {roles.map((role, idx) => (
                      <option key={`filter-role-${role.name}-${idx}`} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={`h-9 rounded-lg border px-3 text-xs font-semibold outline-none focus:border-[#696cff] transition-all ${
                      dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                    }`}
                  >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Right Side: Export & Add User */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-4 text-xs font-semibold hover:opacity-90 transition-all ${
                      dark ? "border-[#4e4f6e] text-slate-200 bg-[#232333]" : "border-[#d9dee3] text-[#8592a3] bg-[#eceef1]/60"
                    }`}
                  >
                    <Download size={14} />
                    Export
                  </button>

                  <button
                    type="button"
                    onClick={openCreateUserModal}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0F522B] px-4 text-xs font-semibold text-white shadow-sm shadow-[#0F522B]/20 hover:bg-[#0A3E20] active:scale-95 transition-all"
                  >
                    <Plus size={15} />
                    Add New User
                  </button>
                </div>
              </div>

              {/* Table wrapper */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className={`border-b ${borderCol} text-[11px] uppercase tracking-wider text-[#a1acb8] font-semibold bg-[#f5f5f9]/40 ${dark ? "bg-slate-800/10" : ""}`}>
                      <th className="px-5 py-3 w-12">
                        <input
                          type="checkbox"
                          className="h-4.5 w-4.5 rounded border-[#d9dee3] text-[#696cff] accent-[#696cff]"
                        />
                      </th>
                      <th className="px-5 py-3">User</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className={dark ? "divide-y divide-[#4e4f6e]" : "divide-y divide-[#f0f2f5]"}>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center">
                          <Loader2 className="animate-spin text-[#696cff] inline-block" size={24} />
                        </td>
                      </tr>
                    ) : paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`px-5 py-8 text-center text-sm ${textSecondary}`}>
                          No entries found
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => {
                        const isSelf = currentUserId === user.id;
                        const uRole = roleName(user) || "Member";
                        const isActive = user.isActive;

                        return (
                          <tr key={user.id} className={dark ? "hover:bg-[#34354f]" : "hover:bg-[#fcfcfd]"}>
                            <td className="px-5 py-3">
                              <input
                                type="checkbox"
                                className="h-4.5 w-4.5 rounded border-[#d9dee3] text-[#696cff] accent-[#696cff]"
                              />
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <TeamMemberAvatar user={user} />
                                <div className="min-w-0">
                                  <div className={`text-sm font-semibold truncate ${dark ? "text-slate-100" : "text-[#566a7f]"}`}>
                                    {user.name}
                                  </div>
                                  <div className="text-xs text-[#a1acb8] truncate">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2 text-sm text-[#566a7f] font-medium capitalize">
                                <RoleIcon role={uRole} />
                                <span className={dark ? "text-slate-200" : ""}>{uRole}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <button
                                disabled={isSelf}
                                onClick={() => toggleActive(user)}
                                className={`rounded px-2 py-1 text-xs font-semibold select-none transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isActive
                                    ? "bg-[#e8fadf] text-[#71dd37]"
                                    : "bg-[#eceef1] text-[#8592a3]"
                                }`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </button>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-center gap-3 text-[#8592a3]">
                                <button
                                  onClick={() => edit(user)}
                                  className="hover:text-[#696cff] transition-colors p-1"
                                  title="Edit User"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  disabled={isSelf}
                                  onClick={() => setDeleteConfirmUser(user)}
                                  className="hover:text-[#ff3e1d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed p-1"
                                  title="Delete User"
                                >
                                  <Trash2 size={15} />
                                </button>
                                <Link
                                  href={`/admin/permissions?userId=${user.id}`}
                                  className="hover:text-[#696cff] transition-colors p-1"
                                  title="Manage Permissions"
                                >
                                  <ShieldCheck size={15} />
                                </Link>
                                <button className="hover:text-slate-600 transition-colors p-1">
                                  <MoreVertical size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Pagination controls */}
              <div className={`flex flex-col gap-4 border-t p-5 sm:flex-row sm:items-center sm:justify-between ${borderCol}`}>
                <span className="text-xs text-[#a1acb8]">
                  Showing {filteredUsers.length ? startIndex + 1 : 0} to{" "}
                  {Math.min(startIndex + limit, filteredUsers.length)} of{" "}
                  {filteredUsers.length} entries
                </span>

                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`flex h-8 w-8 items-center justify-center rounded text-[#8592a3] border ${borderCol} hover:bg-slate-50 disabled:opacity-45 disabled:pointer-events-none`}
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className={`flex h-8 w-8 items-center justify-center rounded text-[#8592a3] border ${borderCol} hover:bg-slate-50 disabled:opacity-45 disabled:pointer-events-none`}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    const isActive = page === currentPage;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`flex h-8 w-8 items-center justify-center rounded text-sm font-semibold border ${
                          isActive
                            ? "bg-[#696cff] text-white border-[#696cff]"
                            : `text-[#8592a3] border-slate-200 hover:bg-slate-50 ${borderCol}`
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`flex h-8 w-8 items-center justify-center rounded text-[#8592a3] border ${borderCol} hover:bg-slate-50 disabled:opacity-45 disabled:pointer-events-none`}
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`flex h-8 w-8 items-center justify-center rounded text-[#8592a3] border ${borderCol} hover:bg-slate-50 disabled:opacity-45 disabled:pointer-events-none`}
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Sneat Modal for User Create/Edit */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px] animate-[userModalBackdrop_180ms_ease-out]">
          <div className={`relative max-h-[calc(100vh-32px)] w-full max-w-md overflow-y-auto rounded shadow-2xl border p-6 animate-[userModalIn_220ms_cubic-bezier(0.16,1,0.3,1)] ${surface} ${borderCol}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {form.id ? "Edit User" : "Create User"}
                </p>
                <h2 className={`mt-1 text-xl font-bold ${textPrimary}`}>
                  {form.id ? form.name : "Add New User"}
                </h2>
                <p className={`mt-1 text-xs text-[#a1acb8]`}>
                  {form.id
                    ? "Update user account information."
                    : "Enter details to create a new user account."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeUserModal}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d9dee3] text-slate-400 hover:text-slate-600 outline-none"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#566a7f] mb-1.5 font-bold">
                  Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className={`w-full rounded border px-3.5 py-2 text-sm outline-none focus:border-[#696cff] ${
                    dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#566a7f] mb-1.5 font-bold">
                  Email
                </label>
                <input
                  required={["Admin", "Super Admin", "Manager"].includes(form.roleName)}
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="user@pos.local"
                  className={`w-full rounded border px-3.5 py-2 text-sm outline-none focus:border-[#696cff] ${
                    dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                  }`}
                />
              </div>

              {/* Show Password field ONLY for Admin / Manager roles */}
              {["Admin", "Super Admin", "Manager"].includes(form.roleName) && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#566a7f] mb-1.5 font-bold">
                    Admin Password
                  </label>
                  <div className="relative">
                    <input
                      required={!form.id}
                      type={showModalPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder={form.id ? "•••••••• (Leave blank to keep current)" : "••••••••"}
                      className={`w-full rounded border pl-3.5 pr-10 py-2 text-sm outline-none focus:border-[#696cff] ${
                        dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-[#8592a3] hover:text-[#696cff] transition-colors p-0.5"
                      title={showModalPassword ? "Hide Password" : "Show Password"}
                    >
                      {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#566a7f] mb-1.5 font-bold">
                  POS 4-Digit PIN Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={form.pin}
                    onChange={(event) => {
                      const clean = event.target.value.replace(/\D/g, "").slice(0, 4);
                      setForm((current) => ({
                        ...current,
                        pin: clean,
                      }));
                    }}
                    placeholder="1234"
                    className={`w-full rounded border px-3.5 py-2 text-sm font-mono font-bold tracking-widest outline-none focus:border-[#696cff] ${
                      dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#566a7f] mb-1.5 font-bold">
                  Role
                </label>
                <select
                  value={form.roleName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      roleName: event.target.value,
                    }))
                  }
                  className={`w-full rounded border px-3.5 py-2 text-sm outline-none focus:border-[#696cff] ${
                    dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                  }`}
                >
                  {(roleOptions.length
                    ? roleOptions
                    : [{ id: 0, name: "Staff" }]
                  ).map((role, idx) => (
                    <option key={`form-role-${role.name}-${idx}`} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-4.5 w-4.5 rounded border-[#d9dee3] text-[#696cff] focus:ring-[#696cff] accent-[#696cff]"
                  />
                  Active Account
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className={`h-10 flex-1 rounded border px-4 text-sm font-semibold hover:bg-slate-50 transition-colors ${
                    dark ? "border-[#4e4f6e] text-slate-300" : "border-[#d9dee3] text-[#8592a3]"
                  }`}
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded bg-[#696cff] px-4 text-sm font-semibold text-white hover:bg-[#5f61e6] active:bg-[#5859d0] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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

        {deleteConfirmUser && (
          <div
            onClick={() => setDeleteConfirmUser(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] p-4 animate-[userModalBackdrop_200ms_ease-out_both] cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm overflow-hidden rounded-xl border p-6 text-center shadow-2xl animate-[userModalIn_250ms_cubic-bezier(0.16,1,0.3,1)_both] cursor-default ${dark ? "bg-[#1f2130] border-[#383a50] text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Trash2 size={26} />
              </div>

              <h3 className="text-lg font-black tracking-tight">
                {language === "km" ? "បញ្ជាក់ការលុបគណនី" : "Delete User Account?"}
              </h3>
              <p className={`mt-2 text-xs font-medium ${textSecondary}`}>
                {language === "km"
                  ? `តើអ្នកពិតជាចង់លុបគណនី "${deleteConfirmUser.name}" មែនទេ? ទិន្នន័យនេះមិនអាចត្រឡប់មកវិញបានទេ។`
                  : `Are you sure you want to delete user "${deleteConfirmUser.name}"? This action cannot be undone.`}
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUser(null)}
                  className={`flex-1 rounded-lg border py-2.5 text-xs font-bold transition-all ${dark ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {language === "km" ? "បោះបង់" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveUser}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95 transition-all shadow-sm shadow-red-600/20"
                >
                  {language === "km" ? "លុបចោល" : "Delete"}
                </button>
              </div>
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
        @keyframes slideFromRight {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastProgress {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
    </>
  );
}

// Sneat statistics summary card
function SneatSummaryCard({
  label,
  value,
  subtitle,
  percent,
  percentTone,
  icon,
  iconColor,
  iconBg,
  surface,
  borderCol,
  textPrimary,
  textSecondary,
}: {
  label: string;
  value: string;
  subtitle: string;
  percent: string;
  percentTone: "green" | "red";
  icon: ReactNode;
  iconColor: string;
  iconBg: string;
  surface: string;
  borderCol: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <div className={`rounded-2xl p-5 shadow-none border ${surface} ${borderCol} flex justify-between items-start`}>
      <div className="space-y-1.5">
        <span className={`text-[13px] font-semibold ${textPrimary}`}>{label}</span>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-semibold tracking-tight ${darkColorText(textPrimary)}`}>{value}</span>
          <span className={`text-[13px] font-semibold ${percentTone === "green" ? "text-[#71dd37]" : "text-[#ff3e1d]"}`}>
            ({percent})
          </span>
        </div>
        <p className="text-[12px] text-[#a1acb8] font-medium">{subtitle}</p>
      </div>
      <div className={`h-10 w-10 rounded flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
    </div>
  );
}

function darkColorText(val: string) {
  return val.includes("text-slate-100") ? "text-slate-100" : "text-[#566a7f]";
}

function RoleIcon({ role }: { role: string }) {
  if (role === "Super Admin" || role === "Admin") {
    return <Crown size={14} className="text-[#696cff] shrink-0" />;
  }
  if (role === "Cashier") {
    return <CreditCard size={14} className="text-[#03c3ec] shrink-0" />;
  }
  if (role === "Staff") {
    return <ChefHat size={14} className="text-[#ffab00] shrink-0" />;
  }
  return <UserRound size={14} className="text-[#8592a3] shrink-0" />;
}

function roleName(user: User) {
  return typeof user.role === "string" ? user.role : user.role?.name || "";
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
        width={38}
        height={38}
        unoptimized
        className="h-[38px] w-[38px] shrink-0 rounded-full object-cover border border-slate-100"
      />
    );
  }

  return (
    <div
      className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${profileAvatarClass(
        role,
      )}`}
    >
      {user.name ? initials(user.name) : <UserRound size={16} />}
    </div>
  );
}

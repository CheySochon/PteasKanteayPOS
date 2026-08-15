"use client";

import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
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
  Camera,
  Mail,
  Lock,
  Phone,
  Briefcase,
  Sliders,
  Package,
  Utensils,
  UserPlus,
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
  apiOrigin,
  uploadUserImage,
} from "../../../lib/api";
import type { Role, User } from "../../../lib/types";
import {
  getProfileImage,
  getProfileVersionSnapshot,
  getServerProfileVersionSnapshot,
  initials,
  profileAvatarClass,
  subscribeToProfileChanges,
  saveProfileImage,
  clearProfileImage,
  profileRoleClass,
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
  imageUrl?: string;
  phone?: string;
  designation?: string;
};

const EMPTY_FORM: UserForm = {
  name: "",
  email: "",
  password: "",
  pin: "1234",
  roleName: "Cashier",
  isActive: true,
  imageUrl: "",
  phone: "",
  designation: "",
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
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

  // Sort users so that Admins are always first (far left)
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aRole = roleName(a).toUpperCase();
      const bRole = roleName(b).toUpperCase();
      const aIsAdmin = aRole === "ADMIN";
      const bIsAdmin = bRole === "ADMIN";
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;
      return 0;
    });
  }, [filteredUsers]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedUsers.length / limit) || 1;
  const startIndex = (currentPage - 1) * limit;
  const paginatedUsers = useMemo(() => {
    return sortedUsers.slice(startIndex, startIndex + limit);
  }, [sortedUsers, startIndex, limit]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterStatus, limit]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    // ── Token Guard: ensure real JWT before calling API ──────────────
    const currentToken = typeof window !== "undefined" ? localStorage.getItem("pos_token") : null;
    const isRealToken = currentToken && currentToken.startsWith("eyJ");
    if (!isRealToken) {
      setError("⚠️ Session expired or invalid. Please login with your Admin Email & Password at /login to perform this action.");
      setSaving(false);
      return;
    }
    // ─────────────────────────────────────────────────────────────────

    try {
      const userEmail = form.email.trim() || `${form.name.toLowerCase().replace(/\s+/g, "")}.${form.roleName.toLowerCase()}@pos.local`;

      if (form.id) {
        const body = {
          name: form.name,
          email: userEmail,
          roleName: form.roleName,
          isActive: form.isActive,
          pin: form.pin || "1234",
          imageUrl: form.imageUrl || "",
          ...(form.password ? { password: form.password } : {}),
        };

        const updated = await updateUser(form.id, body as any);

        setUsers((current) =>
          current.map((user) => (user.id === updated.id ? updated : user)),
        );

        // Update local session if the user edited their own account details
        if (typeof window !== "undefined") {
          const currentUserRaw = localStorage.getItem("pos_user");
          if (currentUserRaw) {
            try {
              const cur = JSON.parse(currentUserRaw);
              if (cur.id === updated.id || (cur.email && cur.email.trim().toLowerCase() === updated.email.trim().toLowerCase())) {
                const mergedUser = { 
                  ...cur, 
                  ...updated,
                  role: typeof updated.role === "string" ? updated.role : updated.role?.name || updated.roleName || cur.role
                };
                localStorage.setItem("pos_user", JSON.stringify(mergedUser));
                window.dispatchEvent(new Event("pos-auth-change"));
              }
            } catch {}
          }
        }

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
          imageUrl: form.imageUrl || "",
        } as any);

        setUsers((current) => [created, ...current]);

        const socket = getSocket();
        if (socket) socket.emit("user:created", created);

        setMessage("User created successfully.");
      }

      closeUserModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save user";
      if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("403")) {
        setError("⚠️ Invalid session. Please logout and login again with Admin Email & Password.");
      } else {
        setError(msg);
      }
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

  // Close action menu on click or scroll
  useEffect(() => {
    const handleClose = () => setActionMenuOpen(null);
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, []);

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
    const uRole = roleName(user) || "Cashier";
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      pin: (user as any).pin || (user.email.includes("cashier") ? "1234" : user.email.includes("staff") ? "5678" : "0000"),
      roleName: uRole,
      isActive: user.isActive,
      imageUrl: user.imageUrl || "",
    });

    const userRoleObj = roles.find((r) => r.name === uRole);
    const initialPerms = [
      { key: "dashboard", view: userRoleObj?.permissions?.find((x: any) => x.key === "dashboard")?.view },
      { key: "pos", view: userRoleObj?.permissions?.find((x: any) => x.key === "menu")?.view },
      { key: "orders", view: userRoleObj?.permissions?.find((x: any) => x.key === "orders")?.view },
      { key: "customer_display", view: uRole.toLowerCase().includes("admin") || uRole.toLowerCase().includes("manager") || uRole.toLowerCase().includes("cashier") },
      { key: "kds", view: uRole.toLowerCase().includes("admin") || uRole.toLowerCase().includes("manager") || uRole.toLowerCase().includes("staff") || uRole.toLowerCase().includes("chef") },
      { key: "order_status", view: true },
      { key: "order_stage", view: true },
      { key: "kitchen_workflow", view: uRole.toLowerCase().includes("admin") || uRole.toLowerCase().includes("manager") || uRole.toLowerCase().includes("staff") || uRole.toLowerCase().includes("chef") },
      { key: "reservations", view: true },
      { key: "view_bookings", view: true },
      { key: "manage_bookings", view: uRole.toLowerCase().includes("admin") || uRole.toLowerCase().includes("manager") },
      { key: "customer_directory", view: true },
      { key: "view_customer_profiles", view: true },
      { key: "manage_customer_profiles", view: uRole.toLowerCase().includes("admin") || uRole.toLowerCase().includes("manager") },
      { key: "invoices", view: uRole.toLowerCase().includes("admin") || uRole.toLowerCase().includes("manager") || uRole.toLowerCase().includes("cashier") },
      { key: "void_invoices", view: uRole.toLowerCase().includes("admin") || uRole.toLowerCase().includes("manager") },
      { key: "invoice_audit", view: uRole.toLowerCase().includes("admin") || uRole.toLowerCase().includes("manager") },
      { key: "loyalty", view: true },
    ].filter(x => x.view).map(x => x.key);

    setSelectedPerms(initialPerms);
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
    setSelectedPerms(["pos", "orders", "customer_display", "order_status", "invoices", "loyalty"]); // Default Cashier
    setIsUserModalOpen(true);
  }

  function closeUserModal() {
    setIsUserModalOpen(false);
    setShowModalPassword(false);
    setForm(EMPTY_FORM);
    setSelectedPerms([]);
  }

  function handleExport() {
    if (users.length === 0) return;
    
    // Header columns
    const headers = ["ID", "Name", "Email", "Role", "Status", "Created At"];
    
    // Rows
    const rows = users.map(user => [
      user.id,
      user.name,
      user.email,
      roleName(user) || "Cashier",
      user.isActive ? "Active" : "Inactive",
      user.createdAt ? new Date(user.createdAt).toISOString() : ""
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    // Download trigger
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `staff_users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>


      <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-white"}`}>
        <TopBar
          title={language === "km" ? "បុគ្គលិក និងសិទ្ធិ" : "Staff & Roles"}
          subtitle=""
          language={language}
          onLanguageChange={setAppLanguage}
          notifications={[]}
          dark={dark}
        />

        <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 pt-2.5 pb-5">
          <div className="mx-auto w-full max-w-[1720px]">

            {/* Floating Top Success/Error Toast Alerts */}
            <div className="fixed top-6 left-0 right-0 z-[99999] flex flex-col items-center justify-center pointer-events-none px-4 gap-2">
              {message && (
                <div className="pointer-events-auto flex items-center gap-3 py-2.5 px-4.5 rounded-xl bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-[13px] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200/50 dark:border-slate-800 animate-[dropFromTop_400ms_cubic-bezier(0.16,1,0.3,1)]">
                  <div className="h-5 w-5 rounded-full bg-[#48cf38] flex items-center justify-center text-white shrink-0">
                    <Check size={11} strokeWidth={4.5} className="text-white" />
                  </div>
                  <span>{message}</span>
                </div>
              )}

              {error && (
                <div className="pointer-events-auto flex items-center gap-3 py-2.5 px-4.5 rounded-xl bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-[13px] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200/50 dark:border-slate-800 animate-[dropFromTop_400ms_cubic-bezier(0.16,1,0.3,1)]">
                  <div className="h-5 w-5 rounded-full bg-[#f43f5e] flex items-center justify-center text-white shrink-0">
                    <X size={11} strokeWidth={4.5} className="text-white" />
                  </div>
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Title & "+ New" Button Header */}
            <div className="flex items-center gap-3 mb-4">
              <h1 className={`text-2xl font-normal ${dark ? "text-slate-100" : "text-slate-800"}`}>{language === "km" ? "បុគ្គលិក" : "Users"}</h1>
              <button
                type="button"
                onClick={openCreateUserModal}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all cursor-pointer ${
                  dark ? "border-[#3b3c54] bg-[#2b2c40] text-slate-200 hover:bg-[#34354e]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Plus size={14} className="text-[#55a060] stroke-[2.2]" />
                {language === "km" ? "ថ្មី" : "New"}
              </button>
            </div>

              {/* Grid Wrapper */}
              <div className="pt-1 pb-4">
                {loading ? (
                  <div className="flex h-64 w-full items-center justify-center">
                    <Loader2 className="animate-spin text-[#696cff]" size={32} />
                  </div>
                ) : sortedUsers.length === 0 ? (
                  <div className={`py-12 text-center text-sm ${textSecondary}`}>
                    No entries found
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
                    {sortedUsers.map((user) => {
                      const isSelf = currentUserId === user.id;
                      const uRole = roleName(user) || "Member";
                      const isActive = user.isActive;
                      const imageUrl = user.imageUrl ? resolveImageUrl(user.imageUrl) : "";
                      const image = imageUrl || getProfileImage({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: uRole,
                        isActive: user.isActive,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                      });

                      const roleObj = roles.find((r) => r.name === uRole);
                      const scopes = roleObj && Array.isArray(roleObj.permissions)
                        ? roleObj.permissions.filter((p: any) => p.view).map((p: any) => String(p.key || "").toUpperCase())
                        : ["DASHBOARD", "ORDERS", "POS", "KITCHEN_DISPLAY", "RESERVATIONS", "SETTINGS"];

                      const isAdmin = uRole.toUpperCase() === "ADMIN";

                      return (
                        <div
                          key={user.id}
                          className={`w-full max-w-[320px] min-h-[440px] h-[440px] rounded-3xl border p-4 flex flex-col items-center text-center relative transition-all duration-200 hover:shadow-lg justify-between ${
                            dark
                              ? "border-[#3b3c54] bg-[#2b2c40]"
                              : "border-slate-200/80 bg-white"
                          }`}
                        >
                          <div className="flex flex-col items-center w-full">
                            {/* Big Circular Avatar */}
                            <div className="mt-2 shrink-0">
                              {image ? (
                                <img
                                  src={image}
                                  alt={user.name}
                                  className={`h-20 w-20 rounded-full object-cover border shadow-xs ${
                                    dark ? "border-[#3b3c54]" : "border-slate-200"
                                  }`}
                                />
                              ) : (
                                <div className={`flex h-20 w-20 items-center justify-center rounded-full border shadow-inner ${
                                  dark ? "bg-[#232333] border-[#3b3c54] text-slate-400" : "bg-slate-100 border-slate-200 text-slate-400"
                                }`}>
                                  <UserRound size={32} className="stroke-[1.5]" />
                                </div>
                              )}
                            </div>

                            {/* User Name & Role */}
                            <h3 className={`text-base font-bold mt-3.5 truncate max-w-full ${dark ? "text-slate-100" : "text-slate-800"}`}>
                              {user.name}
                            </h3>
                            <span className={`text-[11px] font-extrabold tracking-wider uppercase mt-1 px-2.5 py-0.5 rounded-full border ${
                              dark
                                ? "bg-[#232333] border-[#3b3c54] text-[#55a060]"
                                : "bg-emerald-50 border-emerald-200/60 text-[#55a060]"
                            }`}>
                              {uRole}
                            </span>

                            {/* Email */}
                            <div className={`flex items-center justify-center gap-1.5 text-xs mt-2.5 truncate max-w-full ${
                              dark ? "text-slate-400" : "text-slate-500"
                            }`}>
                              <Mail size={13} className="shrink-0 stroke-[1.8]" />
                              <span className="truncate">{user.email}</span>
                            </div>

                            {/* Scopes Section for non-Admins */}
                            {!isAdmin && (
                              <div className="w-full text-left mt-4">
                                <span className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                                  dark ? "text-slate-400" : "text-slate-500"
                                }`}>
                                  SCOPES:
                                </span>
                                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1 select-none no-scrollbar">
                                  {scopes.map((scope, idx) => (
                                    <span
                                      key={idx}
                                      className={`text-[9.5px] font-bold tracking-wide px-2.5 py-1 rounded-lg border uppercase ${
                                        dark
                                          ? "bg-[#232333] border-[#3b3c54] text-slate-300"
                                          : "bg-slate-50 border-slate-200/80 text-slate-600"
                                      }`}
                                    >
                                      {scope}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons at bottom for non-Admins */}
                          {!isAdmin && (
                            <div className={`w-full flex items-center justify-between gap-2 mt-5 pt-3.5 border-t ${
                              dark ? "border-[#3b3c54]" : "border-slate-100"
                            }`}>
                              <button
                                type="button"
                                onClick={() => edit(user)}
                                className={`flex-1 h-9 flex items-center justify-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                                  dark
                                    ? "bg-[#232333] border-[#3b3c54] text-slate-200 hover:bg-[#34354e]"
                                    : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                Edit User
                              </button>
                              <button
                                type="button"
                                onClick={() => edit(user)}
                                className={`flex-1 h-9 flex items-center justify-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                                  dark
                                    ? "bg-[#232333] border-[#3b3c54] text-slate-200 hover:bg-[#34354e]"
                                    : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                Reset Password
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmUser(user)}
                                className={`flex-1 h-9 flex items-center justify-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                                  dark
                                    ? "bg-rose-950/30 border-rose-900/50 text-rose-400 hover:bg-rose-900/40"
                                    : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                                }`}
                              >
                                Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

          </div>
        </div>
      </main>

      {/* Redesigned User Modal Create/Edit matching mock */}
      {isUserModalOpen && (() => {
        const allPermissionsList = [
          { key: "dashboard", label: "Dashboard Overview" },
          { key: "pos", label: "Point of Sale (POS)" },
          { key: "customer_display", label: "Customer Facing Display" },
          { key: "kds", label: "Kitchen Display System (KDS)" },
          { key: "order_status", label: "Order Status Board" },
          { key: "order_stage", label: "Order Stage Updates" },
          { key: "orders", label: "Orders Management" },
          { key: "kitchen_workflow", label: "Kitchen Workflow" },
          { key: "reservations", label: "Reservations Module" },
          { key: "view_bookings", label: "View Bookings" },
          { key: "manage_bookings", label: "Manage Bookings" },
          { key: "customer_directory", label: "Customer Directory" },
          { key: "view_customer_profiles", label: "View Customer Profiles" },
          { key: "manage_customer_profiles", label: "Manage Customer Profiles" },
          { key: "invoices", label: "Invoices & Billing" },
          { key: "void_invoices", label: "Void Invoices" },
          { key: "invoice_audit", label: "Invoice Audit Log" },
          { key: "loyalty", label: "Loyalty & Memberships" },
        ];

        const handleRoleSelect = (roleName: string) => {
          setForm((curr) => ({ ...curr, roleName }));
          let keys: string[] = [];
          const rLower = roleName.toLowerCase();
          if (rLower.includes("manager") || rLower.includes("store") || rLower.includes("admin")) {
            keys = allPermissionsList.map((p) => p.key);
          } else if (rLower.includes("cashier")) {
            keys = ["pos", "orders", "customer_display", "order_status", "invoices", "loyalty"];
          } else if (rLower.includes("staff") || rLower.includes("chef") || rLower.includes("kitchen")) {
            keys = ["kds", "kitchen_workflow", "order_status", "order_stage"];
          } else if (rLower.includes("waiter") || rLower.includes("waitstaff")) {
            keys = ["pos", "view_bookings", "manage_bookings", "reservations"];
          } else if (rLower.includes("inventory")) {
            keys = ["dashboard", "orders", "invoices"];
          }
          setSelectedPerms(keys);
        };

        const togglePerm = (key: string) => {
          setSelectedPerms((curr) => {
            const next = curr.includes(key) ? curr.filter((k) => k !== key) : [...curr, key];
            return next;
          });
          setForm((curr) => ({ ...curr, roleName: "Custom" }));
        };

        const selectAll = () => {
          setSelectedPerms(allPermissionsList.map((p) => p.key));
          setForm((curr) => ({ ...curr, roleName: "Custom" }));
        };

        const deselectAll = () => {
          setSelectedPerms([]);
          setForm((curr) => ({ ...curr, roleName: "Custom" }));
        };

        const rolesList = [
          { id: "cashier", label: "Cashier", role: "Cashier", icon: CreditCard },
          { id: "kitchen_chef", label: "Kitchen Chef", role: "Staff", icon: ChefHat },
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px] animate-[userModalBackdrop_180ms_ease-out]">
            <div
              className="relative max-h-[calc(100vh-32px)] w-full max-w-4xl overflow-y-auto no-scrollbar rounded-[28px] shadow-2xl border px-12 py-6 animate-[userModalIn_220ms_cubic-bezier(0.16,1,0.3,1)] bg-white dark:bg-[#1e293b] border-slate-100 dark:border-slate-800"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none"
              }}
            >
              <style>{`
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-6">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <UserPlus size={18} className="stroke-[2.2] text-[#5cb85c] shrink-0" />
                  <span className="text-[17px] font-bold text-slate-600 dark:text-slate-200 leading-none flex items-center">
                    {form.id ? (language === "km" ? "កែប្រែគណនី" : "Edit User") : (language === "km" ? "បន្ថែមគណនីថ្មី" : "Add New User")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer outline-none flex items-center justify-center"
                >
                  <X size={18} className="stroke-[1.8]" />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                
                {/* DETAILS & CREDENTIALS SECTION */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 px-10 py-4 bg-white dark:bg-[#1e293b] space-y-4">
                  <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    <UserRound size={12} className="stroke-[2.5]" />
                    Details & Credentials
                  </div>

                  {/* Profile image upload matching mockup */}
                  <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-[#f8f9fa] dark:bg-[#232333]/30 w-full max-w-[240px] mx-auto">
                    <div className="relative mb-2 group">
                      {uploadingImage ? (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#232333]">
                          <Loader2 className="animate-spin text-[#696cff]" size={16} />
                        </div>
                      ) : form.imageUrl ? (
                        <img
                          src={resolveImageUrl(form.imageUrl)}
                          alt="Avatar Preview"
                          className="h-12 w-12 rounded-full object-cover border border-[#696cff]/20 shadow-sm"
                        />
                      ) : (
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-black text-white ${profileAvatarClass(form.roleName)}`}>
                          {initials(form.name || "User")}
                        </div>
                      )}
                      <label className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/40 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={14} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingImage(true);
                            setError("");
                            try {
                              const res = await uploadUserImage(file);
                              setForm((current) => ({ ...current, imageUrl: res.imageUrl }));
                            } catch (err: any) {
                              setError(err?.message || "Failed to upload image.");
                            } finally {
                              setUploadingImage(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer rounded-xl bg-slate-150/70 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-650 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                        {uploadingImage ? "Uploading..." : "Change Image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingImage(true);
                            setError("");
                            try {
                              const res = await uploadUserImage(file);
                              setForm((current) => ({ ...current, imageUrl: res.imageUrl }));
                            } catch (err: any) {
                              setError(err?.message || "Failed to upload image.");
                            } finally {
                              setUploadingImage(false);
                            }
                          }}
                        />
                      </label>
                      {form.imageUrl && (
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                          className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-all disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                        Name - (Required)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <UserRound size={13} className="stroke-[1.8]" />
                        </div>
                        <input
                          required
                          value={form.name}
                          onChange={(e) => setForm((curr) => ({ ...curr, name: e.target.value }))}
                          placeholder="Enter Full Name here..."
                          className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8f9fa] dark:bg-[#232333]/30 pl-8 pr-3 text-xs outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-755 dark:text-slate-150 placeholder-slate-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                        Email - (Required)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail size={13} className="stroke-[1.8]" />
                        </div>
                        <input
                          required
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((curr) => ({ ...curr, email: e.target.value }))}
                          placeholder="Enter Email here..."
                          className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8f9fa] dark:bg-[#232333]/30 pl-8 pr-3 text-xs outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-755 dark:text-slate-150 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password, Phone, Designation */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                        Password - {form.id ? "(Optional)" : "(Required)"}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock size={13} className="stroke-[1.8]" />
                        </div>
                        <input
                          required={!form.id}
                          type={showModalPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => setForm((curr) => ({ ...curr, password: e.target.value }))}
                          placeholder="Enter Password here..."
                          className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8f9fa] dark:bg-[#232333]/30 pl-8 pr-9 text-xs outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-755 dark:text-slate-150 placeholder-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowModalPassword((prev) => !prev)}
                          className="absolute right-2.5 top-0 bottom-0 my-auto text-slate-400 hover:text-slate-650 transition-colors p-0.5 flex items-center"
                        >
                          {showModalPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                        Phone
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone size={13} className="stroke-[1.8]" />
                        </div>
                        <input
                          value={form.phone || ""}
                          onChange={(e) => setForm((curr) => ({ ...curr, phone: e.target.value }))}
                          placeholder="Enter Phone Number here..."
                          className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8f9fa] dark:bg-[#232333]/30 pl-8 pr-3 text-xs outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-755 dark:text-slate-150 placeholder-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                        Designation
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Briefcase size={13} className="stroke-[1.8]" />
                        </div>
                        <input
                          value={form.designation || ""}
                          onChange={(e) => setForm((curr) => ({ ...curr, designation: e.target.value }))}
                          placeholder="Enter Designation here..."
                          className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8f9fa] dark:bg-[#232333]/30 pl-8 pr-3 text-xs outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-755 dark:text-slate-150 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ROLE ASSIGNMENT SECTION */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 bg-white dark:bg-[#1e293b] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <ShieldAlert size={12} className="stroke-[2.5]" />
                      Role Assignment
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Select a role template or customize permissions below
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-md mt-2">
                    {rolesList.map((item) => {
                      const IconComp = item.icon;
                      const isSelected = form.roleName === item.role;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleRoleSelect(item.role)}
                          className={`flex items-center justify-center gap-1.5 h-9 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-600 text-white border-emerald-600 font-semibold"
                              : "border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-650 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                          }`}
                        >
                          <IconComp size={13} className={`shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                          <span className="text-[10px] uppercase tracking-wider whitespace-nowrap">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PERMISSIONS & SCOPES SECTION */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 bg-white dark:bg-[#1e293b] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-2 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <ShieldCheck size={12} className="stroke-[2.5]" />
                        Permissions & Scopes
                      </div>
                      <span className="rounded bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
                        {selectedPerms.length} / {allPermissionsList.length} Selected
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-emerald-600 font-semibold select-none">
                      <button type="button" onClick={selectAll} className="hover:underline cursor-pointer">Select All</button>
                      <span className="text-slate-200">|</span>
                      <button type="button" onClick={deselectAll} className="hover:underline cursor-pointer">Deselect All</button>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto no-scrollbar pr-1"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none"
                    }}
                  >
                    <style>{`
                      .no-scrollbar::-webkit-scrollbar {
                        display: none;
                      }
                    `}</style>
                    {allPermissionsList.map((perm) => {
                      const isChecked = selectedPerms.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          onClick={() => togglePerm(perm.key)}
                          className={`flex items-center gap-1.5 px-3 h-8 rounded-full border transition-all cursor-pointer select-none ${
                            isChecked
                              ? "border-emerald-500/70 bg-emerald-50/20 text-emerald-600 dark:text-emerald-450 font-medium"
                              : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-white dark:bg-[#1e293b]/20 hover:bg-slate-50/80"
                          }`}
                        >
                          <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                            isChecked
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-355 bg-white dark:bg-slate-800 text-transparent"
                          }`}>
                            <Check size={8} strokeWidth={5.0} className="text-white" />
                          </div>
                          <span className="text-[10px] font-semibold">{perm.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={closeUserModal}
                    className="h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Close
                  </button>

                  <button
                    disabled={saving}
                    className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/10 hover:shadow-emerald-750/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
          <div
            onClick={() => setDeleteConfirmUser(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer animate-[userModalBackdrop_200ms_ease-out_both]"
            style={{ background: "rgba(10,12,24,0.65)", backdropFilter: "blur(2px)" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm cursor-default overflow-hidden rounded-2xl animate-[userModalIn_250ms_cubic-bezier(0.16,1,0.3,1)_both]"
              style={{
                background: "linear-gradient(160deg, #1c1e30 0%, #14161f 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "#dc2626", boxShadow: "0 2px 8px rgba(220,38,38,0.25)" }}>
                  <Trash2 size={20} className="text-white" />
                </div>
                <h3 className="text-[15px] font-bold text-white leading-snug">
                  {language === "km" ? "បញ្ជាក់ការលុបគណនី" : "Delete User Account?"}
                </h3>
                <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {language === "km"
                    ? `តើអ្នកពិតជាចង់លុបគណនី "${deleteConfirmUser.name}" មែនតើ? តិន្នន័យនើមិនអាចត្រលប់មកវិញបានតើ។`
                    : `Are you sure you want to delete user "${deleteConfirmUser.name}"? This action cannot be undone.`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 px-6 py-5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUser(null)}
                  className="flex-1 h-10 rounded-xl text-xs font-medium transition-colors duration-150 hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.65)" }}
                >
                  {language === "km" ? "បោះបង់" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveUser}
                  className="flex-1 h-10 rounded-xl text-xs font-semibold text-white transition-opacity duration-150 hover:opacity-90 active:opacity-75"
                  style={{ background: "#dc2626", boxShadow: "0 2px 6px rgba(220,38,38,0.2)" }}
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
  const imageUrl = user.imageUrl ? resolveImageUrl(user.imageUrl) : "";
  const image = imageUrl || getProfileImage({
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });

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

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${apiOrigin}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

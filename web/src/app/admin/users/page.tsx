"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  MoreVertical,
  Download,
  Eye,
  EyeOff,
  Crown,
  CreditCard,
  ChefHat,
  Camera,
  Mail,
  Lock,
  KeyRound,
  Phone,
  Briefcase,
  Sliders,
  RefreshCw,
  Search,
  Columns,
  Grid,
  UsersRound,
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
import { useAppLanguage } from "../../../lib/language";
import AnimatedToast from "../../../components/AnimatedToast";
import { getSocket } from "../../../lib/socket";
import {
  createUser,
  deleteUser,
  getRoles,
  getUsers,
  updateUser,
  apiOrigin,
  uploadUserImage,
  getAdminGroups,
} from "../../../lib/api";
import type { Role, User } from "../../../lib/types";
import {
  getProfileImage,
  initials,
} from "../../../lib/profile";

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

const ALL_PERMISSIONS_LIST = [
  { key: "dashboard", label: "Dashboard Overview" },
  { key: "pos", label: "Point of Sale (POS)" },
  { key: "orders", label: "Orders Management" },
  { key: "kds", label: "Kitchen Display System (KDS)" },
  { key: "tables", label: "Tables Management" },
  { key: "invoices", label: "Invoices & Billing" },
  { key: "menu", label: "Menu Catalog" },
  { key: "inventory", label: "Inventory & Stock" },
  { key: "reports", label: "Reports & Analytics" },
  { key: "users", label: "Staff & Roles" },
  { key: "settings", label: "System Settings" },
];

const EMPTY_FORM: UserForm = {
  name: "",
  email: "",
  password: "",
  pin: "",
  roleName: "Admin Group (Standard)",
  isActive: true,
  imageUrl: "",
  phone: "",
  designation: "",
};

export default function AdminUsersPage() {
  const [theme] = useAppTheme();
  const language = useAppLanguage();
  const dark = theme === "dark";

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Click outside listener for action dropdown
  useEffect(() => {
    const handleClose = () => setActionMenuOpen(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  // Fetch Users, Roles & Admin Groups from PostgreSQL DB API
  const fetchUsersAndRoles = async (forceRefresh = false) => {
    try {
      const [fetchedUsers, fetchedRoles, fetchedGroups] = await Promise.all([
        getUsers(forceRefresh),
        getRoles(),
        getAdminGroups(),
      ]);
      setUsers(fetchedUsers);
      setRoles(fetchedRoles);
      setGroups(fetchedGroups);
    } catch (err) {
      setError("Failed to load staff accounts & admin groups from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles(true);

    const socket = getSocket();
    const handleSocketUpdate = () => fetchUsersAndRoles(true);
    if (socket) {
      socket.on("user:created", handleSocketUpdate);
      socket.on("user:updated", handleSocketUpdate);
      socket.on("user:deleted", handleSocketUpdate);
      socket.on("group:created", handleSocketUpdate);
      socket.on("group:updated", handleSocketUpdate);
      socket.on("group:deleted", handleSocketUpdate);
    }

    return () => {
      if (socket) {
        socket.off("user:created", handleSocketUpdate);
        socket.off("user:updated", handleSocketUpdate);
        socket.off("user:deleted", handleSocketUpdate);
        socket.off("group:created", handleSocketUpdate);
        socket.off("group:updated", handleSocketUpdate);
        socket.off("group:deleted", handleSocketUpdate);
      }
    };
  }, []);

  // Refresh Handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsersAndRoles(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setMessage("Staff list refreshed.");
    }, 400);
  };

  // Helper for Role Name
  const roleName = (user: User) => {
    if (typeof user.role === "string") return user.role;
    if (user.role && typeof user.role === "object" && user.role.name) return user.role.name;
    return user.roleName || "Cashier";
  };

  // Filter out Root / Super Admin Group so normal staff assignment never shows Root group
  const assignableGroups = useMemo(() => {
    return groups.filter((g) => {
      const gName = (typeof g === "string" ? g : g?.name || "").toLowerCase().trim();
      return !gName.includes("super admin") && !gName.includes("root");
    });
  }, [groups]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.id).includes(q) ||
        roleName(u).toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Select / Deselect All Checkboxes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(users.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Toggle Single Checkbox
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const validIds = selectedIds.filter((id) => id !== 1);
    if (validIds.length === 0) {
      setError("Super Admin (ID 1) is protected and cannot be deleted.");
      return;
    }

    try {
      await Promise.all(validIds.map((id) => deleteUser(id)));
      setUsers((prev) => prev.filter((u) => !validIds.includes(u.id)));
      setSelectedIds([]);
      setMessage(`${validIds.length} staff users deleted successfully.`);
      const socket = getSocket();
      if (socket) socket.emit("user:deleted", { count: validIds.length });
    } catch {
      setError("Failed to delete selected users.");
    }
  };

  // Delete Single User
  const handleDeleteUser = async (user: User) => {
    if (user.id === 1) {
      setError("Super Admin (ID 1) is a protected system owner and cannot be deleted.");
      return;
    }

    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSelectedIds((prev) => prev.filter((id) => id !== user.id));
      setMessage(`User "${user.name}" deleted.`);
      const socket = getSocket();
      if (socket) socket.emit("user:deleted", { id: user.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete user");
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingUserId(null);
    const defaultRole = assignableGroups.length > 0 ? assignableGroups[0].name : "Admin Group (Standard)";
    setForm({
      ...EMPTY_FORM,
      roleName: defaultRole,
    });
    setShowModalPassword(false);
    setSelectedPerms(["dashboard", "pos", "orders", "tables", "invoices", "menu"]);
    setIsUserModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (user: User) => {
    if (user.id === 1) {
      setError("Super Admin (ID 1) is a protected system owner and cannot be edited.");
      return;
    }
    const uRole = roleName(user) || "Cashier";
    setEditingUserId(user.id);
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      pin: (user as any).pin || (user.email.includes("cashier") ? "1234" : "5678"),
      roleName: uRole,
      isActive: user.isActive,
      imageUrl: user.imageUrl || "",
      phone: (user as any).phone || "",
    });

    let userPerms = (user as any)?.permissions || (typeof user.role === "object" ? (user.role as any)?.permissions : null);
    if (typeof userPerms === "string") {
      try { userPerms = JSON.parse(userPerms); } catch {}
    }
    const permKeys = Array.isArray(userPerms)
      ? userPerms.map((p) => (typeof p === "string" ? p : p.key))
      : ["dashboard", "pos", "orders", "tables", "invoices", "menu"];
    setSelectedPerms(permKeys);
    setIsUserModalOpen(true);
  };

  // Submit Modal
  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    try {
      if (editingUserId) {
        // Edit User
        const updated = await updateUser(editingUserId, {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password ? form.password : undefined,
          pin: form.pin ? form.pin.trim() : undefined,
          roleName: form.roleName,
          isActive: form.isActive,
          imageUrl: form.imageUrl || undefined,
        });

        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? { ...u, ...updated } : u)));
        setMessage(`User "${form.name}" updated successfully.`);
        const socket = getSocket();
        if (socket) socket.emit("user:updated", updated);
      } else {
        // Create User
        const created = await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password || "123456",
          pin: form.pin ? form.pin.trim() : "1234",
          roleName: form.roleName,
          isActive: form.isActive,
          imageUrl: form.imageUrl || undefined,
        });

        setUsers((prev) => [created, ...prev]);
        setMessage(`User "${form.name}" created successfully.`);
        const socket = getSocket();
        if (socket) socket.emit("user:created", created);
      }

      setIsUserModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user");
    }
  };

  // Format Date Helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "--";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "--";
    return d.toISOString().replace("T", " ").substring(0, 19);
  };

  return (
    <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-white"}`}>
      
      {/* Toast Notifications */}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <AnimatedToast message={message} onClose={() => setMessage("")} type="success" />
        </div>
      )}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <AnimatedToast message={error} onClose={() => setError("")} type="error" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 pt-2.5 pb-5">
        <div className="mx-auto w-full max-w-[1720px] space-y-4">
          
          {/* Header Title with "+ New User" Button */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <h1 className={`text-2xl font-normal ${dark ? "text-slate-100" : "text-slate-800"}`}>
              {language === "km" ? "បុគ្គលិក (Admin & Staff)" : "Admin & Staff Users"}
            </h1>
            <button
              type="button"
              onClick={openCreateModal}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all cursor-pointer ${
                dark ? "border-[#3b3c54] bg-[#2b2c40] text-slate-200 hover:bg-[#34354e]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Plus size={14} className="text-[#55a060] stroke-[2.2]" />
              {language === "km" ? "ថ្មី" : "New User"}
            </button>
          </div>

          {/* MAIN TABLE PANEL MATCHING TARGET SCREENSHOT media_1787653557137.png */}
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${dark ? "bg-[#2b2c40] border-[#4e4f6e]" : "bg-white border-slate-200/90"}`}>
            
            {/* TOP ACTION TOOLBAR MATCHING TARGET SCREENSHOT */}
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
              dark ? "border-[#4e4f6e] bg-[#232333]/50" : "border-slate-200/80 bg-slate-50/50"
            }`}>
              
              {/* Left Action Buttons: 🔄 Refresh, 🟢 + Add, 🔴 Delete */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* 🔄 Refresh Icon Button */}
                <button
                  type="button"
                  onClick={handleRefresh}
                  title="Refresh Users List"
                  className={`h-8 w-8 flex items-center justify-center rounded-lg transition cursor-pointer ${
                    dark ? "bg-[#1e293b] hover:bg-[#334155] text-slate-200" : "bg-[#2d3748] hover:bg-[#1a202c] text-white"
                  }`}
                >
                  <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                </button>

                {/* 🟢 + Add Button */}
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="h-8 px-3.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Plus size={14} />
                  + Add
                </button>

                {/* 🔴 🗑️ Delete Button */}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.length === 0}
                  className="h-8 px-3.5 rounded-lg bg-[#f43f5e] hover:bg-[#e11d48] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  Delete {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
                </button>
              </div>

              {/* Right Tools: Search & Utility Icons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className={`h-8 w-full rounded-lg border pl-8 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-[#55a060] ${
                      dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-300 bg-white text-slate-800"
                    }`}
                  />
                </div>

                {/* Utility Icons Toolbar (Columns / Grid / Users) */}
                <div className="flex items-center border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                  <button
                    type="button"
                    title="Columns view"
                    className="h-8 w-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Columns size={14} />
                  </button>
                  <button
                    type="button"
                    title="Grid view"
                    className="h-8 w-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l border-slate-200 dark:border-slate-700"
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    type="button"
                    title="User filter"
                    className="h-8 w-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l border-slate-200 dark:border-slate-700"
                  >
                    <UsersRound size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* TABLE MATRIX MATCHING TARGET SCREENSHOT media_1787653557137.png */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-slate-700 dark:text-slate-300 font-semibold ${
                    dark ? "bg-[#232333]/80 border-[#4e4f6e]" : "bg-slate-50 border-slate-200/80"
                  }`}>
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={users.length > 0 && selectedIds.length === users.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 text-[#55a060] focus:ring-[#55a060] cursor-pointer h-4 w-4"
                      />
                    </th>
                    <th className="py-3 px-4 w-16 font-bold">ID</th>
                    <th className="py-3 px-4 font-bold">Username</th>
                    <th className="py-3 px-4 font-bold">Nickname</th>
                    <th className="py-3 px-4 font-bold">Group</th>
                    <th className="py-3 px-4 font-bold">Email</th>
                    <th className="py-3 px-4 w-28 font-bold">Status</th>
                    <th className="py-3 px-4 w-44 font-bold">Login time</th>
                    <th className="py-3 px-4 w-28 text-right font-bold">Operate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Loader2 className="animate-spin inline mr-2" size={18} />
                        Loading staff users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-normal">
                        No user accounts found matching search query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelected = selectedIds.includes(user.id);
                      const uRole = roleName(user) || "Cashier";
                      const usernameStr = user.email.split("@")[0] || `user_${user.id}`;
                      const matchedGroup = groups.find((g) => g.name === uRole || g.name.toLowerCase().includes(uRole.toLowerCase()) || String(g.id) === String((user as any).groupId));
                      const groupBadgeName = matchedGroup ? matchedGroup.name : (uRole === "Super Admin" ? "Super Admin Group" : uRole === "Admin" ? "Admin Group" : `${uRole} Group`);

                      return (
                        <tr
                          key={user.id}
                          className={`transition-colors ${
                            isSelected
                              ? dark ? "bg-[#55a060]/10" : "bg-emerald-50/50"
                              : dark ? "hover:bg-[#232333]/50" : "hover:bg-slate-50/70"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(user.id)}
                              className="rounded border-slate-300 text-[#55a060] focus:ring-[#55a060] cursor-pointer h-4 w-4"
                            />
                          </td>

                          {/* ID */}
                          <td className="py-3.5 px-4 font-normal text-slate-500 dark:text-slate-400">
                            {user.id}
                          </td>

                          {/* Username */}
                          <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-200">
                            {usernameStr}
                          </td>

                          {/* Nickname */}
                          <td className="py-3.5 px-4 font-normal text-slate-600 dark:text-slate-300">
                            {user.name}
                          </td>

                          {/* Group (Clean Fit Badge) */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#2b303a] text-slate-100 dark:bg-slate-700 dark:text-slate-100 shadow-2xs">
                              {groupBadgeName}
                            </span>
                          </td>

                          {/* Email */}
                          <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                            {user.email}
                          </td>

                          {/* Status (● Normal) */}
                          <td className="py-3.5 px-4">
                            {user.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Normal
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                Disabled
                              </span>
                            )}
                          </td>

                          {/* Login time */}
                          <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                            {formatDate(user.createdAt)}
                          </td>

                          {/* Operate / Actions (Inventory Stock Style Action Menu Dropdown) */}
                          <td className="py-3.5 px-4 text-right relative">
                            {user.id === 1 ? null : (
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuOpen(actionMenuOpen === user.id ? null : user.id);
                                  }}
                                  className={`h-7 w-7 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                                    dark
                                      ? "text-slate-400 hover:bg-[#34354c] hover:text-slate-200"
                                      : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 border border-slate-200/60"
                                  }`}
                                >
                                  <MoreVertical size={16} />
                                </button>

                                {actionMenuOpen === user.id && (
                                  <div
                                    className={`absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border p-1.5 text-left shadow-xl ${
                                      dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/90 bg-white"
                                    } animate-[userModalIn_150ms_cubic-bezier(0.16,1,0.3,1)]`}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActionMenuOpen(null);
                                        openEditModal(user);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#34354e] transition-colors cursor-pointer"
                                    >
                                      <Edit3 size={13} className="text-cyan-500 stroke-[2]" />
                                      <span>{language === "km" ? "កែប្រែ" : "Edit User"}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActionMenuOpen(null);
                                        handleDeleteUser(user);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    >
                                      <Trash2 size={13} className="text-rose-500 stroke-[2]" />
                                      <span>{language === "km" ? "លុប" : "Delete User"}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className={`p-4 border-t text-xs font-normal text-slate-500 dark:text-slate-400 ${
              dark ? "border-[#4e4f6e] bg-[#232333]/30" : "border-slate-100 bg-slate-50/30"
            }`}>
              Showing 1 to {filteredUsers.length} of {users.length} rows
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-[userModalBackdrop_180ms_ease-out]">
          <div className={`relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-xl ${
            dark ? "bg-[#1a1b26] border-slate-800 text-slate-100" : "bg-white border-slate-100 text-slate-800"
          }`}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <UsersRound className="text-[#55a060]" size={18} />
                {editingUserId ? "Edit Staff User" : "Create New Staff User"}
              </h3>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-600 dark:text-slate-300">Name (Nickname) *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Chon (Cashier)"
                  className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                    dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-600 dark:text-slate-300">Email (Username) *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. cashier@pos.local"
                  className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                    dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-600 dark:text-slate-300">Password</label>
                  <div className="relative">
                    <input
                      type={showModalPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editingUserId ? "Leave empty to keep" : "Default 123456"}
                      className={`w-full h-9 rounded-xl border pl-3 pr-9 text-xs outline-none focus:border-[#55a060] ${
                        dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer p-0.5"
                      title={showModalPassword ? "Hide password" : "Show password"}
                    >
                      {showModalPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-600 dark:text-slate-300">Group / Role</label>
                  <select
                    value={form.roleName}
                    onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                    className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                      dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  >
                    {assignableGroups.length > 0 ? (
                      assignableGroups.map((g) => (
                        <option key={g.id || g.name} value={g.name}>
                          {g.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Admin Group (Standard)">Admin Group (Standard)</option>
                        <option value="Admin Update Group">Admin Update Group</option>
                        <option value="Cashier & POS Team">Cashier & POS Team</option>
                        <option value="Kitchen & KDS Team">Kitchen & KDS Team</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="font-bold text-slate-600 dark:text-slate-300">Account Status</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={form.isActive}
                      onChange={() => setForm({ ...form, isActive: true })}
                      className="text-[#55a060] focus:ring-[#55a060]"
                    />
                    <span>Active</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={!form.isActive}
                      onChange={() => setForm({ ...form, isActive: false })}
                      className="text-slate-400 focus:ring-slate-400"
                    />
                    <span>Disabled</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#55a060] hover:bg-[#488e52] text-white text-xs font-bold shadow-sm"
                >
                  {editingUserId ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

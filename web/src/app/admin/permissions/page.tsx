"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
  Crown,
  CreditCard,
  ChefHat,
} from "lucide-react";
import TopBar from "../../../components/TopBar";
import Link from "next/link";
import { getUsers, getRoles, createRole as apiCreateRole, updateRole as apiUpdateRole, deleteRole as apiDeleteRole } from "../../../lib/api";
import { setAppLanguage, useAppLanguage } from "../../../lib/language";
import { useAppTheme } from "../../../lib/theme";
import type { User } from "../../../lib/types";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";

type MatrixItem = {
  key: string;
  label: string;
  category: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  supportsCreate?: boolean;
  supportsEdit?: boolean;
  supportsDelete?: boolean;
};

type CustomRoleItem = {
  id: number;
  name: string;
  description: string;
  userCount?: number;
  matrix?: MatrixItem[];
};

const DEFAULT_ROLES_LIST: CustomRoleItem[] = [
  {
    id: 1,
    name: "Administrator",
    description: "Full system access & administration",
    userCount: 1,
  },
  {
    id: 2,
    name: "POS Cashier",
    description: "Point of sale & order processing",
    userCount: 1,
  },
  {
    id: 3,
    name: "Kitchen Staff",
    description: "Kitchen display system & order status",
    userCount: 0,
  },
];

const DEFAULT_MATRIX_ITEMS: MatrixItem[] = [
  { key: "dashboard", label: "Dashboard", category: "PAGE / MENU", view: true, create: false, edit: false, delete: false, supportsCreate: false, supportsEdit: false, supportsDelete: false },
  { key: "orders", label: "Orders", category: "PAGE / MENU", view: true, create: true, edit: true, delete: true },
  { key: "menu", label: "Menu List", category: "MENU CATALOG", view: true, create: true, edit: true, delete: true },
  { key: "categories", label: "Categories", category: "MENU CATALOG", view: true, create: true, edit: true, delete: true },
  { key: "tables", label: "Tables", category: "MENU CATALOG", view: true, create: true, edit: true, delete: true },
  { key: "users", label: "Staff & Roles", category: "MENU CATALOG", view: true, create: true, edit: true, delete: true },
  { key: "settings", label: "Settings", category: "MENU CATALOG", view: true, create: true, edit: true, delete: true },
];

function getRoleBadge(roleName: string, dark: boolean) {
  const name = roleName.toLowerCase();
  if (name.includes("admin")) {
    return {
      icon: <Crown size={16} />,
      colors: dark
        ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/10"
        : "bg-indigo-50 text-indigo-600 border border-indigo-100",
    };
  }
  if (name.includes("cashier")) {
    return {
      icon: <CreditCard size={16} />,
      colors: dark
        ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/10"
        : "bg-cyan-50 text-cyan-600 border border-cyan-100",
    };
  }
  if (name.includes("kitchen") || name.includes("chef") || name.includes("staff")) {
    return {
      icon: <ChefHat size={16} />,
      colors: dark
        ? "bg-amber-500/15 text-amber-400 border border-amber-500/10"
        : "bg-amber-50 text-amber-600 border border-amber-100",
    };
  }
  return {
    icon: <Shield size={16} />,
    colors: dark
      ? "bg-purple-500/15 text-purple-400 border border-purple-500/10"
      : "bg-purple-50 text-purple-600 border border-purple-100",
  };
}

export default function PermissionsPage() {
  const language = useAppLanguage();
  const [theme] = useAppTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useAutoDismiss(message, setMessage);
  useAutoDismiss(error, setError);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";

  // Roles list loaded from database
  const [roles, setRoles] = useState<CustomRoleItem[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [roleNameInput, setRoleNameInput] = useState("");
  const [roleDescInput, setRoleDescInput] = useState("");
  const [roleMatrix, setRoleMatrix] = useState<MatrixItem[]>(DEFAULT_MATRIX_ITEMS);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [usersData, rolesData] = await Promise.all([
          getUsers(),
          getRoles(),
        ]);
        setUsers(usersData);
        const mapped = rolesData.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description || "",
          permissions: r.permissions || [],
          matrix: Array.isArray(r.permissions) ? r.permissions : DEFAULT_MATRIX_ITEMS,
        }));
        setRoles(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roles and users");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Calculate user counts dynamically
  const rolesWithUserCounts = useMemo(() => {
    return roles.map((role) => {
      const count = users.filter((u) => {
        const uRoleName = typeof u.role === "string" ? u.role : u.role?.name || "Member";
        return uRoleName.toLowerCase() === role.name.toLowerCase();
      }).length;
      return { ...role, userCount: count || role.userCount || 0 };
    });
  }, [roles, users]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return rolesWithUserCounts;
    const q = searchQuery.toLowerCase();
    return rolesWithUserCounts.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }, [rolesWithUserCounts, searchQuery]);

  function openCreateModal() {
    setEditingRoleId(null);
    setRoleNameInput("");
    setRoleDescInput("");
    setRoleMatrix(DEFAULT_MATRIX_ITEMS);
    setIsModalOpen(true);
  }

  function openEditModal(role: CustomRoleItem) {
    setEditingRoleId(role.id);
    setRoleNameInput(role.name);
    setRoleDescInput(role.description);

    if (role.matrix && role.matrix.length > 0) {
      setRoleMatrix(role.matrix);
    } else if (role.name === "Administrator" || role.name === "Admin") {
      setRoleMatrix(
        DEFAULT_MATRIX_ITEMS.map((m) => ({
          ...m,
          view: true,
          create: m.supportsCreate !== false,
          edit: m.supportsEdit !== false,
          delete: m.supportsDelete !== false,
        }))
      );
    } else {
      setRoleMatrix(DEFAULT_MATRIX_ITEMS);
    }

    setIsModalOpen(true);
  }

  async function deleteRole(roleId: number) {
    try {
      setLoading(true);
      await apiDeleteRole(roleId);
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      setMessage(language === "km" ? "លុប Role រួចរាល់" : "Role deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setLoading(false);
    }
  }

  async function saveRole() {
    if (!roleNameInput.trim()) {
      setError(language === "km" ? "សូមបញ្ចូលឈ្មោះ Role" : "Please enter a role name");
      return;
    }

    const trimmedName = roleNameInput.trim();
    const currentMatrix = [...roleMatrix];
    const desc = roleDescInput.trim();

    try {
      setLoading(true);
      if (editingRoleId !== null) {
        const updated = await apiUpdateRole(editingRoleId, {
          name: trimmedName,
          description: desc,
          permissions: currentMatrix,
        });
        setRoles((prev) =>
          prev.map((r) =>
            r.id === editingRoleId
              ? {
                  id: updated.id,
                  name: updated.name,
                  description: updated.description || "",
                  permissions: updated.permissions,
                  matrix: Array.isArray(updated.permissions) ? updated.permissions : currentMatrix,
                }
              : r
          )
        );
        setMessage(language === "km" ? `កែសម្រួល Role "${trimmedName}" រួចរាល់` : `Role "${trimmedName}" updated!`);
      } else {
        const created = await apiCreateRole({
          name: trimmedName,
          description: desc || "Custom staff access role",
          permissions: currentMatrix,
        });
        setRoles((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            description: created.description || "",
            permissions: created.permissions,
            matrix: Array.isArray(created.permissions) ? created.permissions : currentMatrix,
            userCount: 0,
          },
        ]);
        setMessage(language === "km" ? `បង្កើត Role "${trimmedName}" រួចរាល់` : `Role "${trimmedName}" created!`);
      }

      // Save permissions map to localStorage for session cache fallback
      const staffPermissions: Record<string, boolean> = {};
      currentMatrix.forEach((item) => {
        staffPermissions[item.key] = item.view;
        staffPermissions[`${item.key}_create`] = item.create;
        staffPermissions[`${item.key}_edit`] = item.edit;
        staffPermissions[`${item.key}_delete`] = item.delete;
      });
      localStorage.setItem("pos_staff_permissions", JSON.stringify(staffPermissions));

      window.dispatchEvent(new Event("pos-permissions-change"));
      window.dispatchEvent(new Event("pos-roles-change"));
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-white"}`}>
      <TopBar
        title={language === "km" ? "គ្រប់គ្រងតួនាទី និងសិទ្ធិ" : "Role Management"}
        subtitle=""
        language={language}
        onLanguageChange={setAppLanguage}
        notifications={[]}
        dark={dark}
      />

      {/* Navigation Tabs */}
      <div className={`px-4 pt-4 lg:px-8 flex border-b shrink-0 ${dark ? "border-[#4e4f6e]" : "border-[#d9dee3]"}`}>
        <div className="mx-auto w-full max-w-[1600px] flex gap-6">
          <Link
            href="/admin/users"
            className={`pb-3 font-semibold text-[14px] border-b-[3px] transition-colors border-transparent ${
              dark ? "text-[#a1acb8] hover:text-slate-200" : "text-[#566a7f] hover:text-[#696cff]"
            }`}
          >
            <span className="flex items-center gap-2">
              <UserRound size={16} /> {language === "km" ? "បញ្ជីបុគ្គលិក" : "User List"}
            </span>
          </Link>
          <Link
            href="/admin/permissions"
            className="pb-3 font-bold text-[14px] border-b-[3px] border-[#696cff] text-[#696cff]"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} /> {language === "km" ? "កំណត់សិទ្ធិ" : "Permissions"}
            </span>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto w-full max-w-[1600px] space-y-4">
          {/* Alerts */}
          {error && (
            <div className="rounded border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-semibold text-emerald-700">
              {message}
            </div>
          )}

          {/* Controls Bar: Search & Add Role */}
          <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${surface} ${borderCol}`}>
            <div className="relative w-full sm:w-72 flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-slate-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder={language === "km" ? "ស្វែងរកតាមឈ្មោះ Role..." : "Search roles..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`h-9.5 w-full rounded-xl border pl-11 pr-4 text-xs font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 ${
                  dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200/80 bg-white text-slate-800"
                }`}
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#696cff] hover:bg-[#5f61e6] shadow-sm shadow-[#696cff]/20 px-4 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>{language === "km" ? "បន្ថែម Role" : "Add Role"}</span>
            </button>
          </div>

          {/* Simple Clean Role Table */}
          <div className={`rounded-xl border overflow-hidden ${surface} ${borderCol}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    dark ? "bg-[#232333]/80 text-slate-400 border-b border-[#4e4f6e]/50" : "bg-[#f5f5f9] text-[#566a7f] border-b border-slate-100"
                  }`}
                >
                  <tr>
                    <th className="px-5 py-3 w-16">NO.</th>
                    <th className="px-5 py-3 w-[45%]">ROLE NAME</th>
                    <th className="px-5 py-3 text-center w-[25%]">USERS</th>
                    <th className="px-5 py-3 text-right w-[20%]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-semibold">
                        <Loader2 className="animate-spin inline mr-2 text-[#696cff]" size={16} />
                        Loading...
                      </td>
                    </tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-semibold">
                        No roles found.
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((role, idx) => (
                      <tr key={role.id} className={`border-b last:border-b-0 ${dark ? "border-[#4e4f6e]/30 hover:bg-[#232333]/30" : "border-slate-100 hover:bg-slate-50/40"} transition-colors duration-200`}>
                        <td className="px-5 py-4 font-semibold text-slate-400 dark:text-slate-500">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3.5">
                            {(() => {
                              const badge = getRoleBadge(role.name, dark);
                              return (
                                <div className={`flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl transition-all ${badge.colors}`}>
                                  {badge.icon}
                                </div>
                              );
                            })()}
                            <div className="min-w-0">
                              <div className={`text-[13px] font-extrabold tracking-tight ${dark ? "text-slate-100" : "text-[#566a7f]"}`}>{role.name}</div>
                              <div className="text-[11px] text-[#a1acb8] font-semibold mt-0.5 truncate max-w-xs">{role.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide border transition-all ${
                            dark
                              ? "bg-[#696cff]/10 text-[#8285ff] border-[#696cff]/20"
                              : "bg-[#696cff]/10 text-[#696cff] border-[#696cff]/20"
                          }`}>
                            <Users size={11} />
                            <span>{role.userCount} {role.userCount === 1 ? "User" : "Users"}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-[#8592a3]">
                            <button
                              type="button"
                              onClick={() => openEditModal(role)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#696cff]/10 hover:text-[#696cff] transition-all duration-200 hover:scale-105 active:scale-95"
                              title={language === "km" ? "កែសម្រួល" : "Edit Role"}
                            >
                              <Edit3 size={14} />
                            </button>

                            {role.name !== "Administrator" && (
                              <button
                                type="button"
                                onClick={() => deleteRole(role.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#ff3e1d]/10 hover:text-[#ff3e1d] transition-all duration-200 hover:scale-105 active:scale-95"
                                title={language === "km" ? "លុប" : "Delete Role"}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Simple Pagination Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-[#a1acb8]">
              <div>
                {language === "km"
                  ? `បង្ហាញ ១ – ${filteredRoles.length} នៃ ${filteredRoles.length} តួនាទី`
                  : `Showing 1 to ${filteredRoles.length} of ${filteredRoles.length} entries`}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 dark:border-slate-800 opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="inline-flex h-7 px-2.5 items-center justify-center rounded bg-[#696cff] text-white text-xs font-bold shadow-sm shadow-[#696cff]/20">
                  1/1
                </span>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 dark:border-slate-800 opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SIMPLE CLEAN ADD / EDIT ROLE MODAL */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-[540px] max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border p-5 shadow-lg cursor-default ${
              dark ? "bg-[#1f2130] border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#696cff]/10 text-[#696cff] dark:bg-indigo-500/15 dark:text-indigo-400">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className={`text-[15px] font-bold text-[#566a7f] dark:text-slate-200 ${language === "km" ? "font-khmer" : ""}`}>
                    {editingRoleId !== null
                      ? language === "km" ? "កែសម្រួល Role" : "Edit Role"
                      : language === "km" ? "បន្ថែម Role ថ្មី" : "Add New Role"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto space-y-4 py-3.5 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#a1acb8]">
                    ROLE NAME *
                  </label>
                  <input
                    type="text"
                    value={roleNameInput}
                    onChange={(e) => setRoleNameInput(e.target.value)}
                    placeholder="e.g. Cashier..."
                    className={`h-9.5 w-full rounded-lg border px-3.5 text-xs font-bold outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:border-[#696cff] ${
                      dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#a1acb8]">
                    DESCRIPTION
                  </label>
                  <input
                    type="text"
                    value={roleDescInput}
                    onChange={(e) => setRoleDescInput(e.target.value)}
                    placeholder="Describe role..."
                    className={`h-9.5 w-full rounded-lg border px-3.5 text-xs font-bold outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:border-[#696cff] ${
                      dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  />
                </div>
              </div>

              {/* 1-Click Quick Preset Selector for Easy Use */}
              <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-bold text-[#8592a3] dark:text-slate-400 pl-1">
                  Quick Presets:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setRoleMatrix((prev) =>
                        prev.map((r) => ({
                          ...r,
                          view: true,
                          create: r.supportsCreate !== false,
                          edit: r.supportsEdit !== false,
                          delete: r.supportsDelete !== false,
                        }))
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#696cff]/10 text-[10.5px] font-bold text-[#696cff] dark:text-[#8083ff] hover:bg-[#696cff]/20 transition-all cursor-pointer"
                  >
                    Full Access
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRoleMatrix((prev) =>
                        prev.map((r) => ({
                          ...r,
                          view: true,
                          create: false,
                          edit: false,
                          delete: false,
                        }))
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    View Only
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRoleMatrix((prev) =>
                        prev.map((r) => ({
                          ...r,
                          view: false,
                          create: false,
                          edit: false,
                          delete: false,
                        }))
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 text-[10.5px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* CRUD Matrix Grid */}
              <div className={`rounded-xl border overflow-hidden ${dark ? "border-slate-800 bg-slate-900/30" : "border-slate-200 bg-white"}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] uppercase font-bold tracking-wider text-[#a1acb8] ${dark ? "border-slate-800 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                      <th className="px-3.5 py-2.5 w-[40%]">PAGE / MENU</th>
                      <th className="px-2 py-2.5 text-center w-[15%]">VIEW</th>
                      <th className="px-2 py-2.5 text-center w-[15%]">CREATE</th>
                      <th className="px-2 py-2.5 text-center w-[15%]">EDIT</th>
                      <th className="px-2 py-2.5 text-center w-[15%]">DELETE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {roleMatrix.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-3.5 py-2 text-[12px] font-semibold text-[#566a7f] dark:text-slate-300">
                          {item.label}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={item.view}
                            onChange={() => {
                              setRoleMatrix((prev) =>
                                prev.map((r) => (r.key === item.key ? { ...r, view: !r.view } : r))
                              );
                            }}
                            className="h-4 w-4 accent-[#696cff] cursor-pointer"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          {item.supportsCreate !== false ? (
                            <input
                              type="checkbox"
                              checked={item.create}
                              onChange={() => {
                                setRoleMatrix((prev) =>
                                  prev.map((r) => (r.key === item.key ? { ...r, create: !r.create } : r))
                                );
                              }}
                              className="h-4 w-4 accent-[#696cff] cursor-pointer"
                            />
                          ) : null}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {item.supportsEdit !== false ? (
                            <input
                              type="checkbox"
                              checked={item.edit}
                              onChange={() => {
                                setRoleMatrix((prev) =>
                                  prev.map((r) => (r.key === item.key ? { ...r, edit: !r.edit } : r))
                                );
                              }}
                              className="h-4 w-4 accent-[#696cff] cursor-pointer"
                            />
                          ) : null}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {item.supportsDelete !== false ? (
                            <input
                              type="checkbox"
                              checked={item.delete}
                              onChange={() => {
                                setRoleMatrix((prev) =>
                                  prev.map((r) => (r.key === item.key ? { ...r, delete: !r.delete } : r))
                                );
                              }}
                              className="h-4 w-4 accent-[#696cff] cursor-pointer"
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              >
                {language === "km" ? "បោះបង់" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={saveRole}
                className="h-9 flex items-center gap-1.5 rounded-lg bg-[#696cff] hover:bg-[#5f61e6] px-6 text-xs font-bold text-white shadow-sm shadow-[#696cff]/20 transition-colors"
              >
                <Check size={15} />
                <span>{language === "km" ? "រក្សាទុក" : "Save"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

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
} from "lucide-react";
import TopBar from "../../../components/TopBar";
import Link from "next/link";
import { getUsers } from "../../../lib/api";
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

  // Custom Roles state with localStorage persistence
  const [roles, setRoles] = useState<CustomRoleItem[]>(() => {
    if (typeof window === "undefined") return DEFAULT_ROLES_LIST;
    try {
      const stored = localStorage.getItem("pos_custom_roles_list");
      return stored ? JSON.parse(stored) : DEFAULT_ROLES_LIST;
    } catch {
      return DEFAULT_ROLES_LIST;
    }
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [roleNameInput, setRoleNameInput] = useState("");
  const [roleDescInput, setRoleDescInput] = useState("");
  const [roleMatrix, setRoleMatrix] = useState<MatrixItem[]>(DEFAULT_MATRIX_ITEMS);

  useEffect(() => {
    getUsers()
      .then((data) => setUsers(data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
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

  function deleteRole(roleId: number) {
    setRoles((prev) => {
      const updated = prev.filter((r) => r.id !== roleId);
      localStorage.setItem("pos_custom_roles_list", JSON.stringify(updated));
      return updated;
    });
    setMessage(language === "km" ? "លុប Role រួចរាល់" : "Role deleted");
  }

  function saveRole() {
    if (!roleNameInput.trim()) {
      setError(language === "km" ? "សូមបញ្ចូលឈ្មោះ Role" : "Please enter a role name");
      return;
    }

    const trimmedName = roleNameInput.trim();
    const currentMatrix = [...roleMatrix];

    setRoles((prev) => {
      let updated: CustomRoleItem[];
      if (editingRoleId !== null) {
        updated = prev.map((r) =>
          r.id === editingRoleId
            ? { ...r, name: trimmedName, description: roleDescInput.trim(), matrix: currentMatrix }
            : r
        );
      } else {
        const newRole: CustomRoleItem = {
          id: Date.now(),
          name: trimmedName,
          description: roleDescInput.trim() || "Custom staff access role",
          userCount: 0,
          matrix: currentMatrix,
        };
        updated = [...prev, newRole];
      }
      localStorage.setItem("pos_custom_roles_list", JSON.stringify(updated));
      return updated;
    });

    // Save permissions map for system enforcement
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

    setMessage(
      editingRoleId !== null
        ? language === "km" ? `កែសម្រួល Role "${trimmedName}" រួចរាល់` : `Role "${trimmedName}" updated!`
        : language === "km" ? `បង្កើត Role "${trimmedName}" រួចរាល់` : `Role "${trimmedName}" created!`
    );
    setIsModalOpen(false);
  }

  return (
    <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-[#f5f5f9]"}`}>
      <TopBar
        title={language === "km" ? "គ្រប់គ្រងតួនាទី និងសិទ្ធិ" : "Role Management"}
        subtitle={language === "km" ? "គ្រប់គ្រងសិទ្ធិប្រើប្រាស់របស់បុគ្គលិក" : "Manage staff access levels and screen permissions."}
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
              dark ? "text-[#a1acb8] hover:text-slate-200" : "text-[#566a7f] hover:text-[#0F522B]"
            }`}
          >
            <span className="flex items-center gap-2">
              <UserRound size={16} /> {language === "km" ? "បញ្ជីបុគ្គលិក" : "User List"}
            </span>
          </Link>
          <Link
            href="/admin/permissions"
            className="pb-3 font-bold text-[14px] border-b-[3px] border-[#0F522B] text-[#0F522B]"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} /> {language === "km" ? "កំណត់សិទ្ធិ" : "Permissions"}
            </span>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
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
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder={language === "km" ? "ស្វែងរកតាមឈ្មោះ Role..." : "Search roles..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`h-9 w-full rounded-lg border pl-9 pr-4 text-xs font-semibold outline-none transition-colors placeholder:text-slate-400 focus:border-[#0F522B] ${
                  dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-white text-slate-800"
                }`}
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0F522B] hover:bg-[#0A3E20] px-4 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>{language === "km" ? "បន្ថែម Role" : "Add Role"}</span>
            </button>
          </div>

          {/* Simple Clean Role Table */}
          <div className={`rounded-xl border overflow-hidden ${surface} ${borderCol}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] uppercase tracking-wider font-bold text-slate-400 ${dark ? "border-slate-800 bg-slate-800/40" : "border-slate-200/80 bg-slate-50"}`}>
                    <th className="px-5 py-3 w-16">NO.</th>
                    <th className="px-5 py-3 w-[45%]">ROLE NAME</th>
                    <th className="px-5 py-3 text-center w-[25%]">USERS</th>
                    <th className="px-5 py-3 text-right w-[20%]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-semibold">
                        <Loader2 className="animate-spin inline mr-2 text-[#0F522B]" size={16} />
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
                      <tr key={role.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors h-14">
                        <td className="px-5 py-3 font-bold text-slate-400">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              <Shield size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-bold ${textPrimary}`}>{role.name}</div>
                              <div className="text-[11px] text-slate-400 truncate max-w-xs font-medium">{role.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Users size={12} className="text-slate-400" />
                            {role.userCount} {role.userCount === 1 ? "User" : "Users"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(role)}
                              className="inline-flex h-7 px-2.5 items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Edit3 size={13} className="text-slate-500" />
                              {language === "km" ? "កែសម្រួល" : "Edit"}
                            </button>

                            {role.name !== "Administrator" && (
                              <button
                                type="button"
                                onClick={() => deleteRole(role.id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={13} />
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
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400">
              <div>
                SHOWING 1 – {filteredRoles.length} OF {filteredRoles.length}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 dark:border-slate-800 opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="inline-flex h-7 px-2.5 items-center justify-center rounded bg-[#0F522B] text-white text-xs font-bold">
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
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0F522B]/10 text-[#0F522B] dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className={`text-sm font-extrabold text-slate-900 dark:text-white ${language === "km" ? "font-khmer" : ""}`}>
                    {editingRoleId !== null
                      ? language === "km" ? "កែសម្រួល Role" : "Edit Role"
                      : language === "km" ? "បន្ថែម Role ថ្មី" : "Add New Role"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Configure role name and granular screen permissions.
                  </p>
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
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    ROLE NAME *
                  </label>
                  <input
                    type="text"
                    value={roleNameInput}
                    onChange={(e) => setRoleNameInput(e.target.value)}
                    placeholder="e.g. Cashier..."
                    className={`h-9.5 w-full rounded-xl border px-3.5 text-xs font-bold outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:border-[#0F522B] ${
                      dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    DESCRIPTION
                  </label>
                  <input
                    type="text"
                    value={roleDescInput}
                    onChange={(e) => setRoleDescInput(e.target.value)}
                    placeholder="Describe role..."
                    className={`h-9.5 w-full rounded-xl border px-3.5 text-xs font-bold outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:border-[#0F522B] ${
                      dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  />
                </div>
              </div>

              {/* 1-Click Quick Preset Selector for Easy Use */}
              <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-1">
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
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-[10.5px] font-bold text-[#0F522B] dark:text-emerald-400 border border-slate-200/80 dark:border-slate-600 hover:bg-slate-100 transition-colors shadow-2xs"
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
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-600 hover:bg-slate-100 transition-colors shadow-2xs"
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
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-[10.5px] font-bold text-red-600 dark:text-red-400 border border-slate-200/80 dark:border-slate-600 hover:bg-red-50 transition-colors shadow-2xs"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* CRUD Matrix Grid */}
              <div className={`rounded-xl border overflow-hidden ${dark ? "border-slate-800 bg-slate-900/30" : "border-slate-200 bg-white"}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] uppercase font-bold text-slate-400 ${dark ? "border-slate-800 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                      <th className="px-3.5 py-2.5 w-[40%]">PAGE / MENU</th>
                      <th className="px-2 py-2.5 text-center w-[15%]">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setRoleMatrix((prev) => prev.map((r) => ({ ...r, view: checked })));
                            }}
                            className="h-3.5 w-3.5 accent-[#0F522B]"
                          />
                          VIEW
                        </label>
                      </th>
                      <th className="px-2 py-2.5 text-center w-[15%]">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setRoleMatrix((prev) => prev.map((r) => r.supportsCreate !== false ? { ...r, create: checked } : r));
                            }}
                            className="h-3.5 w-3.5 accent-[#0F522B]"
                          />
                          CREATE
                        </label>
                      </th>
                      <th className="px-2 py-2.5 text-center w-[15%]">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setRoleMatrix((prev) => prev.map((r) => r.supportsEdit !== false ? { ...r, edit: checked } : r));
                            }}
                            className="h-3.5 w-3.5 accent-[#0F522B]"
                          />
                          EDIT
                        </label>
                      </th>
                      <th className="px-2 py-2.5 text-center w-[15%]">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setRoleMatrix((prev) => prev.map((r) => r.supportsDelete !== false ? { ...r, delete: checked } : r));
                            }}
                            className="h-3.5 w-3.5 accent-[#0F522B]"
                          />
                          DELETE
                        </label>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {roleMatrix.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {item.label}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.view}
                            onChange={() => {
                              setRoleMatrix((prev) =>
                                prev.map((r) => (r.key === item.key ? { ...r, view: !r.view } : r))
                              );
                            }}
                            className="h-4 w-4 accent-[#0F522B] cursor-pointer"
                          />
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {item.supportsCreate !== false ? (
                            <input
                              type="checkbox"
                              checked={item.create}
                              onChange={() => {
                                setRoleMatrix((prev) =>
                                  prev.map((r) => (r.key === item.key ? { ...r, create: !r.create } : r))
                                );
                              }}
                              className="h-4 w-4 accent-[#0F522B] cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300 font-bold">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {item.supportsEdit !== false ? (
                            <input
                              type="checkbox"
                              checked={item.edit}
                              onChange={() => {
                                setRoleMatrix((prev) =>
                                  prev.map((r) => (r.key === item.key ? { ...r, edit: !r.edit } : r))
                                );
                              }}
                              className="h-4 w-4 accent-[#0F522B] cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300 font-bold">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {item.supportsDelete !== false ? (
                            <input
                              type="checkbox"
                              checked={item.delete}
                              onChange={() => {
                                setRoleMatrix((prev) =>
                                  prev.map((r) => (r.key === item.key ? { ...r, delete: !r.delete } : r))
                                );
                              }}
                              className="h-4 w-4 accent-[#0F522B] cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300 font-bold">—</span>
                          )}
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
                className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              >
                {language === "km" ? "បោះបង់" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={saveRole}
                className="h-9 flex items-center gap-1.5 rounded-xl bg-[#0F522B] hover:bg-[#0A3E20] px-6 text-xs font-bold text-white shadow-sm shadow-[#0F522B]/20 transition-colors"
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

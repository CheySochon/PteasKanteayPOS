"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  UsersRound,
  Plus,
  Trash2,
  RefreshCw,
  Edit3,
  Search,
  Check,
  X,
  ChevronRight,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  Columns,
  Grid,
  Download,
  FolderTree,
  MoreVertical,
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
import { useAppLanguage } from "../../../lib/language";
import AnimatedToast from "../../../components/AnimatedToast";
import { getSocket } from "../../../lib/socket";
import { getAdminGroups, saveAdminGroups } from "../../../lib/api";

export type AdminGroup = {
  id: number;
  parentId: number;
  name: string;
  status: "Normal" | "Disabled";
  description?: string;
  permissions?: string[];
};



export type SystemPermissionModule = {
  key: string;
  label: string;
  subPermissions?: Array<{ key: string; label: string }>;
};

const SYSTEM_POS_MODULES: SystemPermissionModule[] = [
  {
    key: "dashboard",
    label: "Dashboard & Analytics",
    subPermissions: [
      { key: "dashboard_view", label: "View" },
      { key: "dashboard_add", label: "Add" },
      { key: "dashboard_edit", label: "Edit" },
      { key: "dashboard_delete", label: "Delete" },
    ],
  },
  {
    key: "pos",
    label: "Point of Sale (POS Terminal)",
    subPermissions: [
      { key: "pos_view", label: "View" },
      { key: "pos_add", label: "Add" },
      { key: "pos_edit", label: "Edit" },
      { key: "pos_delete", label: "Delete" },
    ],
  },
  {
    key: "orders",
    label: "Orders Management",
    subPermissions: [
      { key: "orders_view", label: "View" },
      { key: "orders_add", label: "Add" },
      { key: "orders_edit", label: "Edit" },
      { key: "orders_delete", label: "Delete" },
    ],
  },
  {
    key: "kitchen",
    label: "Kitchen Display System (KDS)",
    subPermissions: [
      { key: "kitchen_view", label: "View" },
      { key: "kitchen_add", label: "Add" },
      { key: "kitchen_edit", label: "Edit" },
      { key: "kitchen_delete", label: "Delete" },
    ],
  },
  {
    key: "tables",
    label: "Tables & Floor Plan",
    subPermissions: [
      { key: "tables_view", label: "View" },
      { key: "tables_add", label: "Add" },
      { key: "tables_edit", label: "Edit" },
      { key: "tables_delete", label: "Delete" },
    ],
  },
  {
    key: "menu",
    label: "Menu & Dish Catalog",
    subPermissions: [
      { key: "menu_view", label: "View" },
      { key: "menu_add", label: "Add" },
      { key: "menu_edit", label: "Edit" },
      { key: "menu_delete", label: "Delete" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory & Raw Stock",
    subPermissions: [
      { key: "inventory_view", label: "View" },
      { key: "inventory_add", label: "Add" },
      { key: "inventory_edit", label: "Edit" },
      { key: "inventory_delete", label: "Delete" },
    ],
  },
  {
    key: "reports",
    label: "Reports & Analytics",
    subPermissions: [
      { key: "reports_view", label: "View" },
      { key: "reports_add", label: "Add" },
      { key: "reports_edit", label: "Edit" },
      { key: "reports_delete", label: "Delete" },
    ],
  },
  {
    key: "auth",
    label: "Auth & Team Management",
    subPermissions: [
      { key: "auth_view", label: "View" },
      { key: "auth_add", label: "Add" },
      { key: "auth_edit", label: "Edit" },
      { key: "auth_delete", label: "Delete" },
    ],
  },
  {
    key: "settings",
    label: "System Settings",
    subPermissions: [
      { key: "settings_view", label: "View" },
      { key: "settings_add", label: "Add" },
      { key: "settings_edit", label: "Edit" },
      { key: "settings_delete", label: "Delete" },
    ],
  },
];

export const ALL_PERM_KEYS = SYSTEM_POS_MODULES.flatMap((m) => [
  m.key,
  ...(m.subPermissions ? m.subPermissions.map((s) => s.key) : []),
]);

const DEFAULT_GROUPS: AdminGroup[] = [
  { id: 1, parentId: 0, name: "Super Admin Group (Root)", status: "Normal", description: "Root system owner & Super Admin primary group", permissions: ALL_PERM_KEYS },
  { id: 2, parentId: 1, name: "Admin Group (Standard)", status: "Normal", description: "Regular Admin & Store Management group", permissions: ALL_PERM_KEYS },
  { id: 3, parentId: 2, name: "Admin Update Group", status: "Normal", description: "Regular Admin updates & maintenance team group", permissions: ALL_PERM_KEYS },
  { id: 4, parentId: 2, name: "Cashier & POS Team", status: "Normal", description: "Front-of-house cashier operations team", permissions: ["dashboard", "dashboard_view", "pos", "pos_view", "pos_add", "pos_edit", "orders", "orders_view", "tables", "tables_view"] },
  { id: 5, parentId: 2, name: "Kitchen & KDS Team", status: "Normal", description: "Kitchen chef & food service team", permissions: ["dashboard", "dashboard_view", "kitchen", "kitchen_view", "kitchen_add", "kitchen_edit", "orders", "orders_view"] },
];

export default function GroupsPage() {
  const [theme] = useAppTheme();
  const language = useAppLanguage();
  const dark = theme === "dark";

  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    const handleClose = () => setActionMenuOpen(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null);
  const [formParentId, setFormParentId] = useState<number>(0);
  const [formName, setFormName] = useState("");
  const [formStatus, setFormStatus] = useState<"Normal" | "Disabled">("Normal");
  const [formDesc, setFormDesc] = useState("");
  const [selectedPermList, setSelectedPermList] = useState<string[]>(ALL_PERM_KEYS);
  const [isExpandedAll, setIsExpandedAll] = useState<boolean>(true);

  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/90";
  const textPrimary = dark ? "text-slate-100" : "text-slate-800";
  const textSecondary = dark ? "text-slate-400" : "text-slate-500";

  // Load Groups from PostgreSQL DB API & WebSocket listener
  const loadGroups = async (forceRefresh = false) => {
    try {
      const data = await getAdminGroups(forceRefresh);
      if (Array.isArray(data) && data.length > 0) {
        setGroups(data);
        return;
      }
    } catch {}

    setGroups(DEFAULT_GROUPS);
  };

  useEffect(() => {
    loadGroups();

    const socket = getSocket();
    if (socket) {
      const handleSocketUpdate = () => loadGroups(true);
      socket.on("group:updated", handleSocketUpdate);
      socket.on("group:created", handleSocketUpdate);
      socket.on("group:deleted", handleSocketUpdate);

      return () => {
        socket.off("group:updated", handleSocketUpdate);
        socket.off("group:created", handleSocketUpdate);
        socket.off("group:deleted", handleSocketUpdate);
      };
    }
  }, []);

  const saveGroupsToStorage = async (
    nextGroups: AdminGroup[],
    eventName: "group:created" | "group:updated" | "group:deleted" = "group:updated"
  ) => {
    setGroups(nextGroups);
    try {
      await saveAdminGroups(nextGroups);
      const socket = getSocket();
      if (socket) {
        socket.emit("group:updated", nextGroups);
        socket.emit(eventName, nextGroups);
      }
    } catch {
      setError("Failed to save admin groups to database.");
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadGroups(true).finally(() => {
      setIsRefreshing(false);
      setMessage("Group list refreshed from database.");
    });
  };

  // Open Create Modal
  const openCreateModal = (parentGroupId: number = 0) => {
    setEditingGroup(null);
    setFormParentId(parentGroupId);
    setFormName("");
    setFormStatus("Normal");
    setFormDesc("");
    setSelectedPermList(ALL_PERM_KEYS);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (group: AdminGroup) => {
    if (group.id === 1) {
      setError("Root Super Admin Group (ID 1) is a protected system owner group and cannot be edited.");
      return;
    }
    setEditingGroup(group);
    setFormParentId(group.parentId);
    setFormName(group.name);
    setFormStatus(group.status);
    setFormDesc(group.description || "");
    setSelectedPermList(group.permissions && Array.isArray(group.permissions) ? group.permissions : ALL_PERM_KEYS);
    setIsModalOpen(true);
  };

  // Submit Modal
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingGroup) {
      // Edit
      const updated = groups.map((g) =>
        g.id === editingGroup.id
          ? {
              ...g,
              parentId: formParentId,
              name: formName.trim(),
              status: formStatus,
              description: formDesc.trim(),
              permissions: selectedPermList,
            }
          : g
      );
      saveGroupsToStorage(updated, "group:updated");
      setMessage(`Group "${formName}" updated successfully.`);
    } else {
      // Create
      const newId = groups.length > 0 ? Math.max(...groups.map((g) => g.id)) + 1 : 1;
      const newGroup: AdminGroup = {
        id: newId,
        parentId: formParentId,
        name: formName.trim(),
        status: formStatus,
        description: formDesc.trim(),
        permissions: selectedPermList,
      };
      saveGroupsToStorage([...groups, newGroup], "group:created");
      setMessage(`Group "${formName}" created successfully.`);
    }

    setIsModalOpen(false);
  };

  // Single Delete
  const handleDeleteSingle = (group: AdminGroup) => {
    if (group.id === 1) {
      setError("Root Super Admin Group (ID 1) is protected and cannot be deleted.");
      return;
    }
    const next = groups.filter((g) => g.id !== group.id);
    saveGroupsToStorage(next, "group:deleted");
    setSelectedIds((prev) => prev.filter((id) => id !== group.id));
    setMessage(`Group "${group.name}" deleted.`);
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const idsToDelete = selectedIds.filter((id) => id !== 1);
    const next = groups.filter((g) => !idsToDelete.includes(g.id));
    saveGroupsToStorage(next, "group:deleted");
    setSelectedIds([]);
    setMessage(`${idsToDelete.length} groups deleted successfully.`);
  };

  // Select / Deselect All
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(groups.map((g) => g.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Toggle single selection
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Compute Tree Hierarchy Representation for table rendering
  const treeNodes = useMemo(() => {
    let result: Array<AdminGroup & { level: number; prefix: string }> = [];

    // Helper function to calculate tree depth and prefix line graphics (├─, └─, │ ├─)
    function buildTree(parentId: number, level: number, parentPrefix: string) {
      const children = groups.filter((g) => g.parentId === parentId);
      children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        let prefix = "";

        if (level > 0) {
          prefix = parentPrefix + (isLast ? "└─ " : "├─ ");
        }

        result.push({
          ...child,
          level,
          prefix,
        });

        // Recursively build children
        const childParentPrefix = parentPrefix + (isLast ? "   " : "│  ");
        buildTree(child.id, level + 1, childParentPrefix);
      });
    }

    // Start from top-level parentId === 0
    buildTree(0, 0, "");

    // Include orphan groups if parent doesn't exist
    groups.forEach((g) => {
      if (!result.some((r) => r.id === g.id)) {
        result.push({ ...g, level: 0, prefix: "" });
      }
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          String(g.id).includes(q) ||
          String(g.parentId).includes(q)
      );
    }

    return result;
  }, [groups, searchQuery]);

  return (
    <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-white"}`}>
      
      {/* Floating Success/Error Toasts */}
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
          
          {/* Title & "+ New Group" Button Header matching POS System standard */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <h1 className={`text-2xl font-normal ${dark ? "text-slate-100" : "text-slate-800"}`}>
              {language === "km" ? "ក្រុមបុគ្គលិក" : "Admin Groups"}
            </h1>
            <button
              type="button"
              onClick={() => openCreateModal()}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all cursor-pointer ${
                dark ? "border-[#3b3c54] bg-[#2b2c40] text-slate-200 hover:bg-[#34354e]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Plus size={14} className="text-[#55a060] stroke-[2.2]" />
              {language === "km" ? "ថ្មី" : "New Group"}
            </button>
          </div>

          {/* Main White Card Container */}
          <div className={`rounded-2xl border ${surface} ${borderCol} shadow-none overflow-hidden`}>
          
          {/* Top Action Toolbar (Matching User Screenshot Exactly!) */}
          <div className={`p-4 border-b ${borderCol} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
            
            {/* Left Action Buttons: Refresh (Blue), + Add (Green), Delete (Red) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Refresh Button (Blue/Indigo) */}
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh group list"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#4f46e5] text-white hover:bg-[#4338ca] transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
              </button>

              {/* + Add Button (Green) */}
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#55a060] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#488c52] transition-all cursor-pointer active:scale-95"
              >
                <Plus size={15} strokeWidth={2.5} />
                Add
              </button>

              {/* Delete Selected Button (Red) */}
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#ef4444] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#dc2626] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
              >
                <Trash2 size={15} />
                Delete {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
              </button>
            </div>

            {/* Right Tools: Search Bar & Column Options */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID or Group Name..."
                  className={`h-9 w-full rounded-xl border pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-[#55a060] ${
                    dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                />
              </div>

              {/* Utility Icons Toolbar (Column / Grid / Export) */}
              <div className="flex items-center border rounded-xl overflow-hidden border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  title="Columns view"
                  className="h-9 w-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Columns size={15} />
                </button>
                <button
                  type="button"
                  title="Grid view"
                  className="h-9 w-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-l border-slate-200 dark:border-slate-700"
                >
                  <Grid size={15} />
                </button>
                <button
                  type="button"
                  title="Export Data"
                  className="h-9 w-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-l border-slate-200 dark:border-slate-700"
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Tree Table List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-slate-700 dark:text-slate-300 font-semibold ${dark ? "bg-[#232333]/80 border-[#4e4f6e]" : "bg-slate-50/80 border-slate-200/80"}`}>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={groups.length > 0 && selectedIds.length === groups.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-[#55a060] focus:ring-[#55a060] cursor-pointer h-4 w-4"
                    />
                  </th>
                  <th className="py-3 px-4 w-16 font-bold">ID</th>
                  <th className="py-3 px-4 w-44 font-bold">Parent Group</th>
                  <th className="py-3 px-4 font-bold">Group Name & Hierarchy</th>
                  <th className="py-3 px-4 font-bold">Description</th>
                  <th className="py-3 px-4 w-32 font-bold">Status</th>
                  <th className="py-3 px-4 w-28 text-right font-bold">Operate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {treeNodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-normal">
                      No admin groups found.
                    </td>
                  </tr>
                ) : (
                  treeNodes.map((node) => {
                    const isSelected = selectedIds.includes(node.id);
                    const parentGroup = groups.find((g) => g.id === node.parentId);
                    const parentLabel = node.parentId === 0 ? "Root / System" : (parentGroup ? parentGroup.name : `Group #${node.parentId}`);

                    return (
                      <tr
                        key={node.id}
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
                            onChange={() => handleToggleSelect(node.id)}
                            className="rounded border-slate-300 text-[#55a060] focus:ring-[#55a060] cursor-pointer h-4 w-4"
                          />
                        </td>

                        {/* ID */}
                        <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                          {node.id}
                        </td>

                        {/* Parent Group Name */}
                        <td className="py-3.5 px-4 font-medium text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                          {parentLabel}
                        </td>

                        {/* Name (Tree Branch Graphics ├─, └─) */}
                        <td className={`py-3.5 px-4 font-normal ${textPrimary}`}>
                          <span className="font-mono text-slate-400 dark:text-slate-500 mr-1 select-none">
                            {node.prefix}
                          </span>
                          <span className={node.level === 0 ? "font-semibold text-slate-800 dark:text-slate-100" : ""}>
                            {node.name}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {node.description || "-"}
                        </td>

                        {/* Status (● Normal) */}
                        <td className="py-3.5 px-4">
                          {node.status === "Normal" ? (
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

                        {/* Operate / Actions (Inventory Stock Style Action Menu Dropdown) */}
                        <td className="py-3.5 px-4 text-right relative">
                          {node.id === 1 ? null : (
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuOpen(actionMenuOpen === node.id ? null : node.id);
                                }}
                                className={`h-7 w-7 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                                  dark
                                    ? "text-slate-400 hover:bg-[#34354c] hover:text-slate-200"
                                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 border border-slate-200/60"
                                }`}
                              >
                                <MoreVertical size={16} />
                              </button>

                              {actionMenuOpen === node.id && (
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
                                      openCreateModal(node.id);
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#34354e] transition-colors cursor-pointer"
                                  >
                                    <Plus size={14} className="text-[#55a060] stroke-[2.2]" />
                                    <span>{language === "km" ? "បន្ថែមក្រុមរង" : "Add Sub-group"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionMenuOpen(null);
                                      openEditModal(node);
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#34354e] transition-colors cursor-pointer"
                                  >
                                    <Edit3 size={13} className="text-cyan-500 stroke-[2]" />
                                    <span>{language === "km" ? "កែប្រែ" : "Edit Group"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionMenuOpen(null);
                                      handleDeleteSingle(node);
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={13} className="text-rose-500 stroke-[2]" />
                                    <span>{language === "km" ? "លុប" : "Delete Group"}</span>
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
        </div>
      </div>
    </div>

      {/* ADD / EDIT GROUP MODAL MATCHING TARGET SCREENSHOT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 animate-[userModalBackdrop_180ms_ease-out]">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl overflow-hidden rounded-xl shadow-2xl border border-slate-700 bg-white dark:bg-[#1a1b26] animate-[userModalIn_200ms_cubic-bezier(0.16,1,0.3,1)]"
          >
            {/* Dark Navy Window Top Bar matching screenshot */}
            <div className="bg-[#2c3748] dark:bg-[#1e293b] text-white px-4 py-2.5 flex items-center justify-between select-none">
              <span className="text-sm font-semibold tracking-wide">
                {editingGroup ? "Edit" : "Add"}
              </span>
              <div className="flex items-center gap-3 text-slate-300">
                <button type="button" className="hover:text-white transition cursor-pointer text-xs font-mono">_</button>
                <button type="button" className="hover:text-white transition cursor-pointer text-xs font-mono">□</button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="hover:text-rose-400 transition cursor-pointer text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleModalSubmit} className="p-6 md:p-8 space-y-6 text-xs text-slate-700 dark:text-slate-200">
              
              {/* Parent Field Row */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                <label className="w-24 text-right text-[#10b981] font-semibold shrink-0">
                  Parent:
                </label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(Number(e.target.value))}
                  className="flex-1 h-9 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs outline-none focus:border-[#10b981] text-slate-800 dark:text-slate-100"
                >
                  <option value={0}>Root System</option>
                  {groups
                    .filter((g) => !editingGroup || g.id !== editingGroup.id)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Name Field Row */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                <label className="w-24 text-right text-slate-500 font-semibold shrink-0">
                  Name:
                </label>
                <input
                  required
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter group name..."
                  className="flex-1 h-9 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs outline-none focus:border-[#10b981] text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Permission Checkbox Tree Row */}
              <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
                <label className="w-24 text-right text-slate-500 font-semibold shrink-0 pt-1">
                  Permission:
                </label>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPermList.length === ALL_PERM_KEYS.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermList(ALL_PERM_KEYS);
                          } else {
                            setSelectedPermList([]);
                          }
                        }}
                        className="rounded border-slate-300 text-[#10b981] focus:ring-[#10b981]"
                      />
                      <span>Check all</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isExpandedAll}
                        onChange={(e) => setIsExpandedAll(e.target.checked)}
                        className="rounded border-slate-300 text-[#10b981] focus:ring-[#10b981]"
                      />
                      <span>Expand all</span>
                    </label>
                  </div>

                  {/* Connector Tree List ├─ for System POS Modules */}
                  <div className="space-y-2 pt-1 pl-1 border-l border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto pr-1">
                    {SYSTEM_POS_MODULES.map((mod) => {
                      const modKeys = [mod.key, ...(mod.subPermissions ? mod.subPermissions.map((s) => s.key) : [])];
                      const isModChecked = modKeys.every((k) => selectedPermList.includes(k));

                      return (
                        <div key={mod.key} className="space-y-1">
                          {/* Module Header */}
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                            <span className="font-mono text-slate-400 select-none">├─</span>
                            <input
                              type="checkbox"
                              checked={isModChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPermList((curr) => Array.from(new Set([...curr, ...modKeys])));
                                } else {
                                  setSelectedPermList((curr) => curr.filter((k) => !modKeys.includes(k)));
                                }
                              }}
                              className="rounded border-slate-300 text-[#10b981] focus:ring-[#10b981] cursor-pointer"
                            />
                            <span
                              className="cursor-pointer hover:text-[#10b981] transition-colors"
                              onClick={() => {
                                if (isModChecked) {
                                  setSelectedPermList((curr) => curr.filter((k) => !modKeys.includes(k)));
                                } else {
                                  setSelectedPermList((curr) => Array.from(new Set([...curr, ...modKeys])));
                                }
                              }}
                            >
                              {mod.label}
                            </span>
                          </div>

                          {/* Sub-permissions */}
                          {isExpandedAll && mod.subPermissions && (
                            <div className="pl-6 space-y-1 border-l border-slate-200/60 dark:border-slate-800/60 ml-2">
                              {mod.subPermissions.map((sub) => {
                                const isSubChecked = selectedPermList.includes(sub.key);
                                return (
                                  <div key={sub.key} className="flex items-center gap-2 text-[11.5px] font-normal text-slate-600 dark:text-slate-400">
                                    <span className="font-mono text-slate-400 select-none">├──</span>
                                    <input
                                      type="checkbox"
                                      checked={isSubChecked}
                                      onChange={() => {
                                        setSelectedPermList((curr) =>
                                          curr.includes(sub.key)
                                            ? curr.filter((k) => k !== sub.key)
                                            : [...curr, sub.key]
                                        );
                                      }}
                                      className="rounded border-slate-300 text-[#10b981] focus:ring-[#10b981] cursor-pointer"
                                    />
                                    <span
                                      className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                                      onClick={() => {
                                        setSelectedPermList((curr) =>
                                          curr.includes(sub.key)
                                            ? curr.filter((k) => k !== sub.key)
                                            : [...curr, sub.key]
                                        );
                                      }}
                                    >
                                      {sub.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status Radio Row */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 pt-2">
                <label className="w-24 text-right text-slate-500 font-semibold shrink-0">
                  Status:
                </label>
                <div className="flex items-center gap-6 text-xs font-medium">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="formStatus"
                      value="Normal"
                      checked={formStatus === "Normal"}
                      onChange={() => setFormStatus("Normal")}
                      className="text-[#10b981] focus:ring-[#10b981]"
                    />
                    <span>Normal</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="formStatus"
                      value="Disabled"
                      checked={formStatus === "Disabled"}
                      onChange={() => setFormStatus("Disabled")}
                      className="text-slate-400 focus:ring-slate-400"
                    />
                    <span>Hidden</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {editingGroup ? "Save Changes" : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

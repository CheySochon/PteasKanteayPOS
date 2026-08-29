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
import {
  getAdminGroups,
  createAdminGroupApi,
  updateAdminGroupApi,
  deleteAdminGroupApi,
  getCategorizedPermissionsApi,
} from "../../../lib/api";

export type AdminGroup = {
  id: number;
  parentId: number;
  parentName?: string;
  name: string;
  status: "Normal" | "Disabled";
  description?: string;
  permission_ids?: number[];
  permission_codes?: string[];
  permissions?: string[];
  userCount?: number;
  permissionCount?: number;
};

export type SystemPermissionModule = {
  key: string;
  label: string;
  subPermissions?: Array<{ key: string; label: string; id?: number }>;
};

const SYSTEM_POS_MODULES: SystemPermissionModule[] = [
  {
    key: "dashboard",
    label: "Dashboard & Analytics",
    subPermissions: [
      { key: "dashboard.view", label: "View Dashboard" },
      { key: "dashboard.add", label: "Add Widgets" },
      { key: "dashboard.edit", label: "Edit Dashboard Layout" },
      { key: "dashboard.delete", label: "Delete Widgets" },
    ],
  },
  {
    key: "pos",
    label: "Point of Sale (POS Terminal)",
    subPermissions: [
      { key: "pos.order.create", label: "View POS Terminal & Create Order (Add)" },
      { key: "pos.payment.process", label: "Process Payment & Discounts (Edit)" },
      { key: "pos.invoice.void", label: "Void Invoice / Refund (Delete)" },
    ],
  },
  {
    key: "orders",
    label: "Orders Management",
    subPermissions: [
      { key: "orders.view", label: "View Orders List" },
      { key: "orders.add", label: "Add Manual Order" },
      { key: "orders.edit", label: "Edit / Update Order Status" },
      { key: "orders.delete", label: "Delete / Cancel Order" },
    ],
  },
  {
    key: "kitchen",
    label: "Kitchen Display System (KDS)",
    subPermissions: [
      { key: "kitchen.view", label: "View Kitchen Screen" },
      { key: "kitchen.add", label: "Add Ticket / Dispatch" },
      { key: "kitchen.edit", label: "Edit / Update Cooking Status" },
      { key: "kitchen.delete", label: "Clear / Delete Ticket" },
    ],
  },
  {
    key: "tables",
    label: "Tables & Floor Plan",
    subPermissions: [
      { key: "tables.view", label: "View Tables & Floor Plan" },
      { key: "tables.add", label: "Add Table / Zone" },
      { key: "tables.edit", label: "Edit Table Layout & Status" },
      { key: "tables.delete", label: "Delete Table / Zone" },
    ],
  },
  {
    key: "menu",
    label: "Menu & Dish Catalog",
    subPermissions: [
      { key: "menu.view", label: "View Menu Items & Categories" },
      { key: "menu.add", label: "Add Dish / Category" },
      { key: "menu.edit", label: "Edit Price & Dish Details" },
      { key: "menu.delete", label: "Delete Dish / Category" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory & Stock",
    subPermissions: [
      { key: "inventory.view", label: "View Stock Items" },
      { key: "inventory.add", label: "Add Stock Entry" },
      { key: "inventory.edit", label: "Edit Stock Quantity & Unit" },
      { key: "inventory.delete", label: "Delete Stock Record" },
    ],
  },
  {
    key: "reports",
    label: "Reports & Analytics",
    subPermissions: [
      { key: "reports.view", label: "View Sales & Analytics Reports" },
      { key: "reports.add", label: "Add / Generate Report" },
      { key: "reports.edit", label: "Edit Report Filters" },
      { key: "reports.delete", label: "Delete / Clear Logs" },
    ],
  },
  {
    key: "users",
    label: "Staff & Team Management",
    subPermissions: [
      { key: "users.view", label: "View Staff & Access Groups" },
      { key: "users.add", label: "Add Staff User / Group" },
      { key: "users.edit", label: "Edit Staff User & Permissions" },
      { key: "users.delete", label: "Delete Staff User / Group" },
    ],
  },
  {
    key: "settings",
    label: "System Settings & Backups",
    subPermissions: [
      { key: "settings.view", label: "View System Settings" },
      { key: "settings.add", label: "Add Integration / Config" },
      { key: "settings.edit", label: "Edit System Settings" },
      { key: "settings.delete", label: "Delete Config / Backup" },
    ],
  },
];

const ALL_PERM_KEYS = SYSTEM_POS_MODULES.flatMap((m) => [
  m.key,
  ...(m.subPermissions ? m.subPermissions.map((s) => s.key) : []),
]);

const DEFAULT_GROUPS: AdminGroup[] = [
  { id: 1, parentId: 0, name: "Admin", status: "Normal", description: "Full system administration & configuration access", permissions: ALL_PERM_KEYS, userCount: 1, permissionCount: 8 },
  { id: 2, parentId: 1, name: "Store Manager", status: "Normal", description: "Store management with reports and catalog rights", permissions: ALL_PERM_KEYS, userCount: 0, permissionCount: 6 },
  { id: 3, parentId: 2, name: "Supervisor", status: "Normal", description: "Shift supervisor with order & discount void rights", permissions: ["pos.order.create", "pos.payment.process", "pos.discount.apply", "pos.invoice.void"], userCount: 0, permissionCount: 4 },
  { id: 4, parentId: 2, name: "Cashier", status: "Normal", description: "Front-of-house cashier operations team", permissions: ["pos.order.create", "pos.payment.process"], userCount: 1, permissionCount: 2 },
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null);
  const [formParentId, setFormParentId] = useState<number>(0);
  const [formName, setFormName] = useState("");
  const [formStatus, setFormStatus] = useState<"Normal" | "Disabled">("Normal");
  const [formDesc, setFormDesc] = useState("");
  const [selectedPermList, setSelectedPermList] = useState<string[]>(ALL_PERM_KEYS);
  const [isExpandedAll, setIsExpandedAll] = useState<boolean>(true);

  // Delete Confirm Modal State
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<AdminGroup | null>(null);

  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/90";
  const textPrimary = dark ? "text-slate-100" : "text-slate-800";

  useEffect(() => {
    const handleClose = () => {
      setActionMenuOpen(null);
      setActionMenuPos(null);
    };
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, []);

  const loadGroups = async (forceRefresh = false) => {
    try {
      const data = await getAdminGroups(forceRefresh);
      if (Array.isArray(data)) {
        setGroups(data);
      }
    } catch {}
  };

  useEffect(() => {
    loadGroups(true);

    const socket = getSocket();
    if (socket) {
      const handleSocketUpdate = () => loadGroups(true);

      socket.on("groups:updated", handleSocketUpdate);
      socket.on("group:created", handleSocketUpdate);
      socket.on("group:updated", handleSocketUpdate);
      socket.on("group:deleted", handleSocketUpdate);
      socket.on("user:created", handleSocketUpdate);
      socket.on("user:updated", handleSocketUpdate);

      return () => {
        socket.off("groups:updated", handleSocketUpdate);
        socket.off("group:created", handleSocketUpdate);
        socket.off("group:updated", handleSocketUpdate);
        socket.off("group:deleted", handleSocketUpdate);
        socket.off("user:created", handleSocketUpdate);
        socket.off("user:updated", handleSocketUpdate);
      };
    }
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadGroups(true).finally(() => {
      setIsRefreshing(false);
      setMessage("Group list refreshed.");
    });
  };

  const openCreateModal = (parentGroupId: number = 0) => {
    setEditingGroup(null);
    setFormParentId(parentGroupId);
    setFormName("");
    setFormStatus("Normal");
    setFormDesc("");
    setSelectedPermList(ALL_PERM_KEYS);
    setIsModalOpen(true);
  };

  const openEditModal = (group: AdminGroup) => {
    if (group.id === 1) {
      setError("Root Admin Group (ID 1) is a protected system owner group.");
      return;
    }
    setEditingGroup(group);
    setFormParentId(group.parentId || 0);
    setFormName(group.name);
    setFormStatus(group.status || "Normal");
    setFormDesc(group.description || "");
    setSelectedPermList(
      group.permission_codes || group.permissions || ALL_PERM_KEYS
    );
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingGroup) {
        await updateAdminGroupApi(editingGroup.id, {
          name: formName.trim(),
          description: formDesc.trim(),
          permission_codes: selectedPermList,
          parent_id: formParentId,
          status: formStatus,
        });
        setMessage(`Group "${formName}" updated successfully.`);
      } else {
        await createAdminGroupApi({
          name: formName.trim(),
          description: formDesc.trim(),
          permission_codes: selectedPermList,
          parent_id: formParentId,
          status: formStatus,
        });
        setMessage(`Group "${formName}" created successfully.`);
      }
      await loadGroups(true);
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to save group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteGroup = (group: AdminGroup) => {
    if (group.id === 1) {
      setError("Root Admin Group (ID 1) is protected and cannot be deleted.");
      return;
    }
    setDeleteConfirmGroup(group);
  };

  const executeDeleteGroup = async (cascade = false) => {
    if (!deleteConfirmGroup) return;

    const groupToDelete = deleteConfirmGroup;
    setDeleteConfirmGroup(null);

    try {
      await deleteAdminGroupApi(groupToDelete.id, cascade).catch((err) => {
        if (err?.message?.toLowerCase().includes("not found")) {
          return { success: true };
        }
        throw err;
      });
      setMessage(`Group "${groupToDelete.name}" deleted.`);
      setSelectedIds((prev) => prev.filter((id) => id !== groupToDelete.id));
      setGroups((prev) => prev.filter((g) => g.id !== groupToDelete.id));
      await loadGroups(true).catch(() => null);
    } catch (err: any) {
      setError(err?.message || "Failed to delete group.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const idsToDelete = selectedIds.filter((id) => id !== 1);
    try {
      for (const id of idsToDelete) {
        await deleteAdminGroupApi(id, true).catch(() => null);
      }
      setSelectedIds([]);
      setMessage(`${idsToDelete.length} group(s) deleted.`);
      await loadGroups(true);
    } catch (err: any) {
      setError(err?.message || "Bulk delete failed.");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(groups.map((g) => g.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const treeNodes = useMemo(() => {
    let result: Array<AdminGroup & { level: number; prefix: string }> = [];

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

        const childParentPrefix = parentPrefix + (isLast ? "   " : "│  ");
        buildTree(child.id, level + 1, childParentPrefix);
      });
    }

    buildTree(0, 0, "");

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
          (g.description && g.description.toLowerCase().includes(q))
      );
    }

    return result;
  }, [groups, searchQuery]);


  return (
    <main className={`flex-1 overflow-y-auto ${dark ? "bg-[#232333]" : "bg-[#f8faf9]"}`}>
      
      {/* Toast notifications */}
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

      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
        
        {/* Header Title matching Profile & Users Page */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className={`text-2xl font-medium tracking-normal ${textPrimary}`}>
            {language === "km" ? "ក្រុមបុគ្គលិក (Admin Groups)" : "Admin Groups"}
          </h1>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#478851] text-white px-4 text-xs font-bold shadow-sm shadow-[#55a060]/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            {language === "km" ? "បន្ថែមក្រុមថ្មី" : "New Group"}
          </button>
        </div>

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Total Groups */}
          <div className={`rounded-2xl border p-5 ${dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-200/60"} shadow-none flex items-center justify-between`}>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1">Total Admin Groups</div>
              <div className={`text-2xl font-extrabold ${dark ? "text-slate-100" : "text-slate-800"}`}>{groups.length}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#696cff]/10 text-[#696cff] shrink-0">
              <FolderTree size={18} />
            </div>
          </div>

          {/* Card 2: Root & Admin Groups */}
          <div className={`rounded-2xl border p-5 ${dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-200/60"} shadow-none flex items-center justify-between`}>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1">System Groups</div>
              <div className={`text-2xl font-extrabold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                {groups.filter((g) => g.parentId === 0 || g.id === 1).length}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Shield size={18} />
            </div>
          </div>

          {/* Card 3: Sub / Role Groups */}
          <div className={`rounded-2xl border p-5 ${dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-200/60"} shadow-none flex items-center justify-between`}>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1">Sub / Role Groups</div>
              <div className={`text-2xl font-extrabold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                {groups.filter((g) => g.parentId !== 0 && g.id !== 1).length}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-[#03c3ec] shrink-0">
              <Layers size={18} />
            </div>
          </div>

          {/* Card 4: Active Status */}
          <div className={`rounded-2xl border p-5 ${dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-200/60"} shadow-none flex items-center justify-between`}>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1">Active Groups</div>
              <div className={`text-2xl font-extrabold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                {groups.filter((g) => g.status === "Normal" || !g.status).length}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#696cff]/10 text-[#696cff] shrink-0">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </div>

        {/* Main Card Container */}
        <div className={`rounded-2xl border ${dark ? "bg-[#2b2c40] border-[#4e4f6e]" : "bg-white border-slate-200/90"} shadow-xs overflow-hidden`}>
          
          {/* Top Action Toolbar */}
          <div className={`p-4 border-b ${dark ? "border-[#4e4f6e] bg-[#232333]/50" : "border-slate-200/80 bg-slate-50/50"} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
            
            {/* Left Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh group list"
                className={`h-8 w-8 flex items-center justify-center rounded-lg transition cursor-pointer ${
                  dark ? "bg-[#1e293b] hover:bg-[#334155] text-slate-200" : "bg-[#2d3748] hover:bg-[#1a202c] text-white"
                }`}
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              </button>

              <button
                type="button"
                onClick={() => openCreateModal()}
                className="h-8 px-3.5 rounded-lg bg-[#55a060] hover:bg-[#488c52] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add
              </button>

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

            {/* Right Tools: Search Bar & Views */}
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

              <div className="flex items-center border rounded-xl overflow-hidden border-slate-200 dark:border-slate-700 shrink-0">
                <button type="button" title="Columns view" className="h-9 w-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Columns size={15} />
                </button>
                <button type="button" title="Grid view" className="h-9 w-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-l border-slate-200 dark:border-slate-700">
                  <Grid size={15} />
                </button>
                <button type="button" title="Export Data" className="h-9 w-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-l border-slate-200 dark:border-slate-700">
                  <Download size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto pb-24 min-h-[360px]">
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
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(node.id)}
                            className="rounded border-slate-300 text-[#55a060] focus:ring-[#55a060] cursor-pointer h-4 w-4"
                          />
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                          {node.id}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                          {parentLabel}
                        </td>

                        <td className={`py-3.5 px-4 font-normal ${textPrimary}`}>
                          <span className="font-mono text-slate-400 dark:text-slate-500 mr-1 select-none">
                            {node.prefix}
                          </span>
                          <span className={node.level === 0 ? "font-semibold text-slate-800 dark:text-slate-100" : ""}>
                            {node.id === 1 || node.name.toLowerCase() === "admin" ? "Admin Group" : node.name}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {node.description || "-"}
                        </td>

                        <td className="py-3.5 px-4">
                          {node.status === "Normal" || !node.status ? (
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

                        <td className="py-3.5 px-4 text-right">
                          {node.id === 1 ? null : (
                            <div className="inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (actionMenuOpen === node.id) {
                                    setActionMenuOpen(null);
                                    setActionMenuPos(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const openUpwards = rect.bottom + 160 > window.innerHeight;
                                    setActionMenuPos({
                                      top: openUpwards ? undefined : rect.bottom + 4,
                                      bottom: openUpwards ? window.innerHeight - rect.top + 4 : undefined,
                                      left: Math.max(10, rect.right - 176),
                                    });
                                    setActionMenuOpen(node.id);
                                  }
                                }}
                                className={`h-7 w-7 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                                  dark
                                    ? "text-slate-400 hover:bg-[#34354c] hover:text-slate-200"
                                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 border border-slate-200/60"
                                }`}
                              >
                                <MoreVertical size={16} />
                              </button>

                              {actionMenuOpen === node.id && actionMenuPos && (
                                <div
                                  style={{
                                    position: "fixed",
                                    top: actionMenuPos.top !== undefined ? `${actionMenuPos.top}px` : undefined,
                                    bottom: actionMenuPos.bottom !== undefined ? `${actionMenuPos.bottom}px` : undefined,
                                    left: `${actionMenuPos.left}px`,
                                  }}
                                  className={`z-[9999] w-44 rounded-xl border p-1.5 text-left shadow-2xl ${
                                    dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/90 bg-white"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionMenuOpen(null);
                                      setActionMenuPos(null);
                                      openCreateModal(node.id);
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#34354e] transition-colors cursor-pointer"
                                  >
                                    <Plus size={14} className="text-[#55a060] stroke-[2.2]" />
                                    <span>Add Sub-group</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionMenuOpen(null);
                                      setActionMenuPos(null);
                                      openEditModal(node);
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#34354e] transition-colors cursor-pointer"
                                  >
                                    <Edit3 size={13} className="text-cyan-500 stroke-[2]" />
                                    <span>Edit Group</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionMenuOpen(null);
                                      setActionMenuPos(null);
                                      confirmDeleteGroup(node);
                                    }}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={13} className="text-rose-500 stroke-[2]" />
                                    <span>Delete Group</span>
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

      {/* CREATE / EDIT GROUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl overflow-hidden rounded-xl shadow-2xl border border-slate-700 bg-white dark:bg-[#1a1b26]"
          >
            <div className="bg-[#2c3748] dark:bg-[#1e293b] text-white px-4 py-2.5 flex items-center justify-between select-none">
              <span className="text-sm font-semibold tracking-wide">
                {editingGroup ? "Edit Group" : "Add Group"}
              </span>
              <div className="flex items-center gap-3 text-slate-300">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="hover:text-rose-400 transition cursor-pointer text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 md:p-8 space-y-6 text-xs text-slate-700 dark:text-slate-200">
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

              <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
                <label className="w-24 text-right text-slate-500 font-semibold shrink-0 pt-1">
                  Description:
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Enter group description..."
                  className="flex-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs outline-none focus:border-[#10b981] text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
                <label className="w-24 text-right text-slate-500 font-semibold shrink-0 pt-1">
                  Permissions:
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

                  <div className="space-y-2 pt-1 pl-1 border-l border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto pr-1">
                    {SYSTEM_POS_MODULES.map((mod) => {
                      const modKeys = [mod.key, ...(mod.subPermissions ? mod.subPermissions.map((s) => s.key) : [])];
                      const isModChecked = modKeys.every((k) => selectedPermList.includes(k));

                      return (
                        <div key={mod.key} className="space-y-1">
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
                    <span>Disabled</span>
                  </label>
                </div>
              </div>

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
                  disabled={isSubmitting}
                  className="px-5 py-1.5 rounded bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingGroup ? "Save Changes" : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1b26] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertCircle size={24} />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Confirm Delete Group
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete group <strong>"{deleteConfirmGroup.name}"</strong>?
              {deleteConfirmGroup.userCount && deleteConfirmGroup.userCount > 0 ? (
                <span className="block mt-2 text-rose-500 font-semibold">
                  ⚠️ Warning: {deleteConfirmGroup.userCount} user(s) are currently assigned to this group.
                </span>
              ) : null}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmGroup(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteGroup(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

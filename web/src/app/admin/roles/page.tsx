"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Search,
  Check,
  X,
  ChevronRight,
  Columns,
  Grid,
  Download,
  UsersRound,
  LayoutDashboard,
  Settings,
  Store,
  UserRound,
  FileText,
  ReceiptText,
  ChefHat,
  Armchair,
  Boxes,
  CreditCard,
  SlidersHorizontal,
  MoreHorizontal,
  MoreVertical,
  FolderTree,
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
import { useAppLanguage } from "../../../lib/language";
import AnimatedToast from "../../../components/AnimatedToast";
import { getRoles, updateRole, createRole, deleteRole, getSystemRules, saveSystemRules } from "../../../lib/api";
import type { Role } from "../../../lib/types";
import { getSocket } from "../../../lib/socket";

export type SystemRule = {
  id: number;
  title: string;
  name: string;
  iconName: string;
  weigh: number;
  status: "Normal" | "Disabled";
  ismenu: boolean;
};

const DEFAULT_RULES: SystemRule[] = [
  { id: 1, title: "Dashboard", name: "dashboard", iconName: "LayoutDashboard", weigh: 143, status: "Normal", ismenu: true },
  { id: 2, title: "General Settings", name: "general", iconName: "Settings", weigh: 137, status: "Normal", ismenu: true },
  { id: 5, title: "Auth & Users", name: "auth", iconName: "UsersRound", weigh: 99, status: "Normal", ismenu: true },
  { id: 4, title: "POS Terminal", name: "pos", iconName: "Store", weigh: 45, status: "Normal", ismenu: true },
  { id: 66, title: "Staff Management", name: "user", iconName: "UserRound", weigh: 35, status: "Normal", ismenu: true },
  { id: 384, title: "Sales Reports", name: "reports", iconName: "FileText", weigh: 30, status: "Normal", ismenu: true },
  { id: 403, title: "Orders History", name: "orders", iconName: "ReceiptText", weigh: 25, status: "Normal", ismenu: true },
  { id: 409, title: "Kitchen (KDS)", name: "kitchen", iconName: "ChefHat", weigh: 20, status: "Normal", ismenu: true },
  { id: 422, title: "Dining Tables", name: "tables", iconName: "Armchair", weigh: 15, status: "Normal", ismenu: true },
  { id: 441, title: "Inventory Stock", name: "inventory", iconName: "Boxes", weigh: 10, status: "Normal", ismenu: true },
  { id: 447, title: "Invoices & Payments", name: "payments", iconName: "CreditCard", weigh: 5, status: "Normal", ismenu: true },
];

function getRuleIcon(iconName: string) {
  switch (iconName) {
    case "LayoutDashboard": return LayoutDashboard;
    case "Settings": return Settings;
    case "UsersRound": return UsersRound;
    case "Store": return Store;
    case "UserRound": return UserRound;
    case "FileText": return FileText;
    case "ReceiptText": return ReceiptText;
    case "ChefHat": return ChefHat;
    case "Armchair": return Armchair;
    case "Boxes": return Boxes;
    case "CreditCard": return CreditCard;
    default: return SlidersHorizontal;
  }
}

export default function RolesPage() {
  const [theme] = useAppTheme();
  const language = useAppLanguage();
  const dark = theme === "dark";

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("Super Admin");
  const [rules, setRules] = useState<SystemRule[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    const handleClose = () => setActionMenuOpen(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  // Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SystemRule | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formName, setFormName] = useState("");
  const [formWeigh, setFormWeigh] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<"Normal" | "Disabled">("Normal");
  const [formIsmenu, setFormIsmenu] = useState<boolean>(true);

  // Load Rules & Roles from Backend PostgreSQL DB API & WebSockets with SWR Cache
  const loadRolesData = async (forceRefresh = false) => {
    try {
      const fetchedRoles = await getRoles();
      if (Array.isArray(fetchedRoles) && fetchedRoles.length > 0) {
        setRoles(fetchedRoles);
      }
    } catch {}

    try {
      const dbRules = await getSystemRules(forceRefresh);
      if (Array.isArray(dbRules) && dbRules.length > 0) {
        setRules(dbRules);
        return;
      }
    } catch {}

    setRules(DEFAULT_RULES);
  };

  const saveRulesToStorage = async (nextRules: SystemRule[]) => {
    setRules(nextRules);
    try {
      await saveSystemRules(nextRules);
      const socket = getSocket();
      if (socket) {
        socket.emit("roles:updated", nextRules);
        socket.emit("permissions:updated", nextRules);
        socket.emit("rules:updated", nextRules);
      }
    } catch {
      setError("Failed to save rules to database.");
    }
  };

  useEffect(() => {
    loadRolesData();

    const socket = getSocket();
    if (socket) {
      socket.on("roles:updated", () => loadRolesData(true));
      socket.on("permissions:updated", () => loadRolesData(true));
      socket.on("rules:updated", () => loadRolesData(true));
    }

    return () => {
      if (socket) {
        socket.off("roles:updated", loadRolesData);
        socket.off("permissions:updated", loadRolesData);
        socket.off("rules:updated", loadRolesData);
      }
    };
  }, []);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRolesData(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setMessage("Rule permissions refreshed from database.");
    }, 400);
  };

  // Toggle single rule Ismenu
  const toggleIsmenu = (id: number) => {
    const next = rules.map((r) => (r.id === id ? { ...r, ismenu: !r.ismenu } : r));
    saveRulesToStorage(next);
  };

  // Toggle All rules Ismenu
  const toggleAllIsmenu = () => {
    const allEnabled = rules.every((r) => r.ismenu);
    const next = rules.map((r) => ({ ...r, ismenu: !allEnabled }));
    saveRulesToStorage(next);
    setMessage(allEnabled ? "Disabled all menu permissions." : "Enabled all menu permissions.");
  };

  // Select / Deselect All Checkboxes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRuleIds(rules.map((r) => r.id));
    } else {
      setSelectedRuleIds([]);
    }
  };

  // Toggle Single Checkbox
  const handleToggleSelect = (id: number) => {
    setSelectedRuleIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedRuleIds.length === 0) return;
    const next = rules.filter((r) => !selectedRuleIds.includes(r.id));
    saveRulesToStorage(next);
    setSelectedRuleIds([]);
    setMessage(`${selectedRuleIds.length} rules removed.`);
  };

  // Single Delete
  const handleDeleteRule = (id: number) => {
    const next = rules.filter((r) => r.id !== id);
    saveRulesToStorage(next);
    setSelectedRuleIds((prev) => prev.filter((i) => i !== id));
    setMessage("Rule deleted successfully.");
  };

  // Save Permissions to Backend DB
  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      const matchedRole = roles.find((r) => r.name.toLowerCase() === selectedRole.toLowerCase());
      if (matchedRole && matchedRole.id) {
        await updateRole(matchedRole.id, { permissions: rules as any }).catch(() => null);
      }

      localStorage.setItem(`pos_role_rules_${selectedRole.toLowerCase()}`, JSON.stringify(rules));
      
      const socket = getSocket();
      if (socket) socket.emit("permissions:updated", { role: selectedRole, rules });

      setMessage(`Permissions & Rules updated successfully for "${selectedRole}".`);
      setError("");
    } catch {
      setError("Failed to save rules permissions.");
    } finally {
      setSaving(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingRule(null);
    setFormTitle("");
    setFormName("");
    setFormWeigh(0);
    setFormStatus("Normal");
    setFormIsmenu(true);
    setIsRuleModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (rule: SystemRule) => {
    setEditingRule(rule);
    setFormTitle(rule.title);
    setFormName(rule.name);
    setFormWeigh(rule.weigh);
    setFormStatus(rule.status);
    setFormIsmenu(rule.ismenu);
    setIsRuleModalOpen(true);
  };

  // Submit Modal
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingRule) {
      const next = rules.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              title: formTitle.trim(),
              name: formName.trim().toLowerCase() || formTitle.trim().toLowerCase(),
              weigh: formWeigh,
              status: formStatus,
              ismenu: formIsmenu,
            }
          : r
      );
      saveRulesToStorage(next);
      setMessage(`Rule "${formTitle}" updated.`);
    } else {
      const newId = rules.length > 0 ? Math.max(...rules.map((r) => r.id)) + 1 : 1;
      const newRule: SystemRule = {
        id: newId,
        title: formTitle.trim(),
        name: formName.trim().toLowerCase() || formTitle.trim().toLowerCase(),
        iconName: "SlidersHorizontal",
        weigh: formWeigh,
        status: formStatus,
        ismenu: formIsmenu,
      };
      const next = [...rules, newRule];
      saveRulesToStorage(next);
      setMessage(`Rule "${formTitle}" created.`);
    }
    setIsRuleModalOpen(false);
  };

  // Filtered Rules List
  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return rules;
    const q = searchQuery.toLowerCase();
    return rules.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        String(r.id).includes(q)
    );
  }, [rules, searchQuery]);

  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/90";

  return (
    <main className={`flex-1 overflow-y-auto ${dark ? "bg-[#232333]" : "bg-[#f8faf9]"}`}>
      
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

      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
        
        {/* Page Breadcrumb & Title */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-400">
              <Link href="/admin/users" className="hover:text-[#55a060] transition-colors">Auth & Users</Link>
              <ChevronRight size={12} />
              <span className="text-[#55a060]">Rule</span>
            </div>
            <h1 className={`text-2xl font-medium tracking-normal text-[#2c3e50] dark:text-slate-100 mb-1`}>
              {language === "km" ? "សិទ្ធិប្រព័ន្ធ (Rules & Matrix)" : "Rules & Matrix"}
            </h1>
            <p className="text-xs text-slate-400 font-normal">
              {language === "km" ? "កំណត់ច្បាប់សិទ្ធិប្រើប្រាស់តាមម៉ូឌុល និងមុខងារប្រព័ន្ធ POS" : "Configure module access rules and granular feature permissions."}
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#478851] text-white px-4 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            {language === "km" ? "បន្ថែមសិទ្ធិថ្មី" : "New Rule"}
          </button>
        </div>

        {/* TOP KPI CARDS (Matching Admin Log Style) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Card 1: Total Rules */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-[#55a060]/10 text-[#55a060] dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "ច្បាប់សិទ្ធិសរុប" : "Total System Rules"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {rules.length}
              </div>
            </div>
          </div>

          {/* Card 2: Menu Modules */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "ម៉ូឌុលមេនូ (Menu Modules)" : "Menu Modules"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {rules.filter((r) => r.ismenu).length}
              </div>
            </div>
          </div>

          {/* Card 3: Active Status */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "សិទ្ធិសកម្ម" : "Active Rules"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {rules.filter((r) => r.status === "Normal" || !r.status).length}
              </div>
            </div>
          </div>

          {/* Card 4: Action Permissions */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "សិទ្ធិរង (Sub Permissions)" : "Sub Permissions"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {rules.filter((r) => !r.ismenu).length}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN RULE TABLE PANEL */}
        <div className={`rounded-2xl border ${dark ? "bg-[#2b2c40] border-[#4e4f6e]" : "bg-white border-slate-200/90"} shadow-xs overflow-hidden`}>
          
          {/* TOP ACTION TOOLBAR */}
          <div className={`p-4 border-b ${dark ? "border-[#4e4f6e] bg-[#232333]/50" : "border-slate-200/80 bg-slate-50/50"} flex flex-wrap items-center justify-between gap-3`}>
            
            {/* Left Action Buttons Toolbar matching screenshot buttons */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* 🔄 Refresh Icon Button (Dark Navy Square/Pill) */}
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh Rules List"
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

              {/* 🔵 ✏️ Edit Button */}
              <button
                type="button"
                onClick={() => {
                  if (selectedRuleIds.length === 1) {
                    const rule = rules.find((r) => r.id === selectedRuleIds[0]);
                    if (rule) openEditModal(rule);
                  } else {
                    setError("Please select exactly 1 rule to edit.");
                  }
                }}
                className="h-8 px-3.5 rounded-lg bg-[#06b6d4] hover:bg-[#0891b2] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Edit3 size={13} />
                Edit
              </button>

              {/* 🔴 🗑️ Delete Button */}
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedRuleIds.length === 0}
                className="h-8 px-3.5 rounded-lg bg-[#f43f5e] hover:bg-[#e11d48] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-40"
              >
                <Trash2 size={13} />
                Delete {selectedRuleIds.length > 0 ? `(${selectedRuleIds.length})` : ""}
              </button>

              {/* ⚙️ More Dropdown Button */}
              <button
                type="button"
                className={`h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  dark ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-750" : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <MoreHorizontal size={14} />
                More
              </button>

              {/* 🔴 + Toggle all Button */}
              <button
                type="button"
                onClick={toggleAllIsmenu}
                className="h-8 px-3.5 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Plus size={14} />
                Toggle all
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
                  placeholder="Search rules..."
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

          {/* TABLE MATRIX MATCHING TARGET SCREENSHOT */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-slate-700 dark:text-slate-300 font-semibold ${
                  dark ? "bg-[#232333]/80 border-[#4e4f6e]" : "bg-slate-50 border-slate-200/80"
                }`}>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={rules.length > 0 && selectedRuleIds.length === rules.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-[#55a060] focus:ring-[#55a060] cursor-pointer h-4 w-4"
                    />
                  </th>
                  <th className="py-3 px-4 w-16 font-bold">ID</th>
                  <th className="py-3 px-4 w-40 font-bold">Title</th>
                  <th className="py-3 px-4 w-16 text-center font-bold">Icon</th>
                  <th className="py-3 px-4 font-bold">Name</th>
                  <th className="py-3 px-4 w-24 text-center font-bold">Weigh</th>
                  <th className="py-3 px-4 w-28 font-bold">Status</th>
                  <th className="py-3 px-4 w-24 text-center font-bold">Ismenu</th>
                  <th className="py-3 px-4 w-32 text-center font-bold">Operate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-normal">
                      No system rules found matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => {
                    const isSelected = selectedRuleIds.includes(rule.id);
                    const RuleIcon = getRuleIcon(rule.iconName);

                    return (
                      <tr
                        key={rule.id}
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
                            onChange={() => handleToggleSelect(rule.id)}
                            className="rounded border-slate-300 text-[#55a060] focus:ring-[#55a060] cursor-pointer h-4 w-4"
                          />
                        </td>

                        {/* ID */}
                        <td className="py-3.5 px-4 font-normal text-slate-500 dark:text-slate-400">
                          {rule.id}
                        </td>

                        {/* Title (▸ Title) */}
                        <td className="py-3.5 px-4 font-normal text-slate-700 dark:text-slate-200">
                          <span className="text-slate-400 mr-1.5 select-none">▸</span>
                          {rule.title}
                        </td>

                        {/* Icon */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <RuleIcon size={13} />
                          </div>
                        </td>

                        {/* Name (lowercase identifier e.g. dashboard, general) */}
                        <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                          {rule.name}
                        </td>

                        {/* Weigh */}
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-600 dark:text-slate-300">
                          {rule.weigh}
                        </td>

                        {/* Status (● Normal) */}
                        <td className="py-3.5 px-4">
                          {rule.status === "Normal" ? (
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

                        {/* Ismenu Toggle Switch */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleIsmenu(rule.id)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              rule.ismenu ? "bg-[#10b981]" : "bg-slate-300 dark:bg-slate-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                rule.ismenu ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>

                        {/* Operate / Actions (Inventory Stock Style Action Menu Dropdown) */}
                        <td className="py-3.5 px-4 text-center relative">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpen(actionMenuOpen === rule.id ? null : rule.id);
                              }}
                              className={`h-7 w-7 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                                dark
                                  ? "text-slate-400 hover:bg-[#34354c] hover:text-slate-200"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 border border-slate-200/60"
                              }`}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {actionMenuOpen === rule.id && (
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
                                    openCreateModal();
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#34354e] transition-colors cursor-pointer"
                                >
                                  <Plus size={14} className="text-[#55a060] stroke-[2.2]" />
                                  <span>{language === "km" ? "បន្ថែមសិទ្ធិរង" : "Add Sub-rule"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuOpen(null);
                                    openEditModal(rule);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#34354e] transition-colors cursor-pointer"
                                >
                                  <Edit3 size={13} className="text-cyan-500 stroke-[2]" />
                                  <span>{language === "km" ? "កែប្រែ" : "Edit Rule"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuOpen(null);
                                    handleDeleteRule(rule.id);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={13} className="text-rose-500 stroke-[2]" />
                                  <span>{language === "km" ? "លុប" : "Delete Rule"}</span>
                                </button>
                              </div>
                            )}
                          </div>
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

      {/* CREATE / EDIT RULE MODAL */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-[2px] animate-[userModalBackdrop_180ms_ease-out]">
          <div className={`relative w-full max-w-md rounded-2xl p-6 shadow-xl border ${
            dark ? "bg-[#1e293b] border-slate-800" : "bg-white border-slate-100"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FolderTree size={18} className="text-[#55a060]" />
                {editingRule ? "Edit Rule Permission" : "Add New System Rule"}
              </h3>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Dashboard, Orders..."
                  className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                    dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Permission Code (Name)</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. dashboard, orders..."
                  className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                    dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Weigh (Priority)</label>
                  <input
                    type="number"
                    value={formWeigh}
                    onChange={(e) => setFormWeigh(Number(e.target.value))}
                    className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                      dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "Normal" | "Disabled")}
                    className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                      dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Ismenu Visible</label>
                <button
                  type="button"
                  onClick={() => setFormIsmenu(!formIsmenu)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    formIsmenu ? "bg-[#10b981]" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      formIsmenu ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#55a060] hover:bg-[#488e52] text-white text-xs font-bold shadow-sm"
                >
                  {editingRule ? "Save Changes" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

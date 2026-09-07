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
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  FileText,
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
  profileAvatarClass,
  compressImageBase64,
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
  roleName: "Admin Update",
  isActive: true,
  imageUrl: "",
  phone: "",
  designation: "",
};

export default function AdminUsersPage() {
  const [theme] = useAppTheme();
  const language = useAppLanguage();
  const dark = theme === "dark";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/90";

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableFilter, setTableFilter] = useState<"all" | "admin" | "cashier" | "active">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  const openViewModal = (user: User) => {
    setViewingUser(user);
  };

  // Click outside and scroll listener for action dropdown
  useEffect(() => {
    const handleClose = () => {
      setActionMenuOpen(null);
      setActionMenuPos(null);
      setIsExportMenuOpen(false);
    };
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
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
    const handleAuthLogin = (data: any) => {
      const targetId = Number(data?.userId || data?.id);
      const timeISO = data?.loginTime || data?.updatedAt || new Date().toISOString();
      if (targetId) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetId ? { ...u, updatedAt: timeISO, lastLoginAt: timeISO } as any : u))
        );
      }
      fetchUsersAndRoles(true);
    };

    if (socket) {
      socket.on("user:created", handleSocketUpdate);
      socket.on("user:updated", handleSocketUpdate);
      socket.on("user:deleted", handleSocketUpdate);
      socket.on("group:created", handleSocketUpdate);
      socket.on("group:updated", handleSocketUpdate);
      socket.on("group:deleted", handleSocketUpdate);
      socket.on("auth:login", handleAuthLogin);
      socket.on("user:login", handleAuthLogin);
    }

    return () => {
      if (socket) {
        socket.off("user:created", handleSocketUpdate);
        socket.off("user:updated", handleSocketUpdate);
        socket.off("user:deleted", handleSocketUpdate);
        socket.off("group:created", handleSocketUpdate);
        socket.off("group:updated", handleSocketUpdate);
        socket.off("group:deleted", handleSocketUpdate);
        socket.off("auth:login", handleAuthLogin);
        socket.off("user:login", handleAuthLogin);
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

  // Filter out Root / Super Admin Group (ID 1 / "Admin") so staff creation/editing never shows Root Super Admin group
  const assignableGroups = useMemo(() => {
    return groups.filter((g) => {
      const gId = typeof g === "object" && g !== null ? Number(g.id) : 0;
      if (gId === 1) return false;
      const gName = (typeof g === "string" ? g : g?.name || "").toLowerCase().trim();
      return gName !== "admin" && gName !== "super admin" && gName !== "super_admin" && !gName.includes("root");
    });
  }, [groups]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    let result = users;

    if (tableFilter === "admin") {
      result = result.filter(
        (u) => roleName(u).toLowerCase().includes("admin") || roleName(u).toLowerCase().includes("super")
      );
    } else if (tableFilter === "cashier") {
      result = result.filter(
        (u) => !roleName(u).toLowerCase().includes("admin") && !roleName(u).toLowerCase().includes("super")
      );
    } else if (tableFilter === "active") {
      result = result.filter((u) => u.isActive);
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.id).includes(q) ||
        roleName(u).toLowerCase().includes(q)
    );
  }, [users, searchQuery, tableFilter]);

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

  // Export Excel / CSV
  const handleExportExcel = () => {
    if (users.length === 0) return;
    const headers = ["No.", "Staff Name", "Group / Role", "Email", "Status", "Last Login Time"];
    const rows = filteredUsers.map((u, idx) => {
      const uRole = roleName(u) || "Cashier";
      const statusText = u.isActive ? "Normal" : "Disabled";
      const loginTimeText = formatDate((u as any).lastLoginAt || u.updatedAt || u.createdAt);
      return [
        idx + 1,
        `"${u.name.replace(/"/g, '""')}"`,
        `"${uRole.replace(/"/g, '""')}"`,
        `"${u.email.replace(/"/g, '""')}"`,
        statusText,
        `"${loginTimeText}"`,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(language === "km" ? "ទាញយក File CSV បុគ្គលិកជោគជ័យ!" : "Staff directory CSV downloaded successfully.");
  };

  // Export PDF Document
  const handleExportPDF = async () => {
    if (users.length === 0) return;
    try {
      const jsPDFModule = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const jsPDF = jsPDFModule.default || jsPDFModule;
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF();
      const nowStr = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      // Document Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("STAFF DIRECTORY REPORT", 14, 18);

      // Report Meta
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated: ${nowStr}   |   Total Staff Accounts: ${users.length}   |   Active: ${users.filter((u) => u.isActive).length}`,
        14,
        25
      );

      const tableRows = filteredUsers.map((u, idx) => [
        String(idx + 1),
        u.name || "-",
        roleName(u) || "Cashier",
        u.email || "-",
        u.isActive ? "Normal" : "Disabled",
        formatDate((u as any).lastLoginAt || u.updatedAt || u.createdAt),
      ]);

      autoTable(doc, {
        startY: 30,
        head: [["No.", "Staff Name", "Group / Role", "Email", "Status", "Last Login Time"]],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [85, 160, 96], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`staff_directory_${new Date().toISOString().slice(0, 10)}.pdf`);
      setMessage(language === "km" ? "ទាញយក File PDF បុគ្គលិកជោគជ័យ!" : "Staff directory PDF report downloaded successfully.");
    } catch (err) {
      console.error("PDF export failed:", err);
      setError(language === "km" ? "បរាជ័យក្នុងការទាញយក PDF" : "Failed to generate PDF document.");
    }
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

    // Security Check: Enforce minimum 8 characters for password
    if (!editingUserId) {
      if (!form.password || form.password.length < 8) {
        setError(language === "km" ? "ពាក្យសម្ងាត់ត្រូវតែមានយ៉ាងហោចណាស់ 8 តួអក្សរ!" : "Password must be at least 8 characters long!");
        return;
      }
    } else {
      if (form.password && form.password.length < 8) {
        setError(language === "km" ? "ពាក្យសម្ងាត់ត្រូវតែមានយ៉ាងហោចណាស់ 8 តួអក្សរ!" : "Password must be at least 8 characters long!");
        return;
      }
    }

    try {
      let resultUser: any = null;
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

        resultUser = updated;
        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? { ...u, ...updated } : u)));
        setMessage(`User "${form.name}" updated successfully.`);
        const socket = getSocket();
        if (socket) socket.emit("user:updated", updated);
      } else {
        // Create User
        const created = await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          pin: form.pin ? form.pin.trim() : "1234",
          roleName: form.roleName,
          isActive: form.isActive,
          imageUrl: form.imageUrl || undefined,
        });

        resultUser = created;
        setUsers((prev) => [created, ...prev]);
        setMessage(`User "${form.name}" created successfully.`);
        const socket = getSocket();
        if (socket) socket.emit("user:created", created);
      }

      if (resultUser) {
        const normName = form.name.trim().toLowerCase();
        const normEmail = form.email.trim().toLowerCase();
        if (form.imageUrl) {
          localStorage.setItem(`pos_profile_image_${normName}`, form.imageUrl);
          localStorage.setItem(`pos_profile_image_${normEmail}`, form.imageUrl);
          if (resultUser.id) localStorage.setItem(`pos_profile_image_${resultUser.id}`, form.imageUrl);
        } else {
          localStorage.removeItem(`pos_profile_image_${normName}`);
          localStorage.removeItem(`pos_profile_image_${normEmail}`);
          if (resultUser.id) localStorage.removeItem(`pos_profile_image_${resultUser.id}`);
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("pos-profile-change"));
          window.dispatchEvent(new Event("pos-user-change"));
        }
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
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <main className={`flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${dark ? "bg-[#232333]" : "bg-[#f8faf9]"}`}>
      
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
              <span className="text-[#55a060]">{language === "km" ? "គ្រប់គ្រងបុគ្គលិក" : "Staff Management"}</span>
            </div>
            <h1 className={`text-2xl font-medium tracking-normal text-[#2c3e50] dark:text-slate-100 mb-1`}>
              {language === "km" ? "គ្រប់គ្រងបុគ្គលិក (Staff Management)" : "Staff Management"}
            </h1>
            <p className="text-xs text-slate-400 font-normal">
              {language === "km" ? "គ្រប់គ្រងគណនីបុគ្គលិក កំណត់ត្រាសិទ្ធិ និង PIN លក់ POS" : "Manage staff accounts, access permissions, and POS PIN entry."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExportMenuOpen((prev) => !prev);
                }}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  dark ? "border-[#3b3c54] bg-[#2b2c40] text-[#55a060] hover:bg-[#34354e]" : "border-emerald-200 bg-emerald-50/60 text-[#55a060] hover:bg-emerald-100/60"
                }`}
              >
                <Download size={14} />
                <span>{language === "km" ? "ទាញយកទិន្នន័យ (Export)" : "Export"}</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isExportMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isExportMenuOpen && (
                <div
                  className={`absolute right-0 top-full mt-1.5 z-30 w-52 rounded-xl border p-2 shadow-lg transition-all animate-[dropdownScale_150ms_ease-out] ${
                    dark ? "border-slate-700 bg-[#232333] text-slate-200" : "border-slate-200/90 bg-white text-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handleExportExcel();
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors text-left cursor-pointer ${
                      dark ? "hover:bg-slate-800/70 text-slate-100" : "hover:bg-slate-50 text-[#2c3e50]"
                    }`}
                  >
                    <Download size={15} className="text-[#55a060] shrink-0" />
                    <span>{language === "km" ? "ទាញយក CSV" : "Download CSV"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handleExportPDF();
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors text-left cursor-pointer ${
                      dark ? "hover:bg-slate-800/70 text-slate-100" : "hover:bg-slate-50 text-[#2c3e50]"
                    }`}
                  >
                    <FileText size={15} className="text-[#55a060] shrink-0" />
                    <span>{language === "km" ? "ទាញយក PDF (.pdf)" : "Download PDF (.pdf)"}</span>
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#478851] text-white px-4 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              {language === "km" ? "បន្ថែមថ្មី" : "New User"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Card 1: Total Staff Accounts */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-[#55a060]/10 text-[#55a060] dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UsersRound size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "គណនីបុគ្គលិកសរុប" : "Total Staff Accounts"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {users.length}
              </div>
            </div>
          </div>

          {/* Card 2: Admins & Managers */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Crown size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "អ្នកគ្រប់គ្រង (Admins & Managers)" : "Admins & Managers"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {users.filter((u) => roleName(u).toLowerCase().includes("admin") || roleName(u).toLowerCase().includes("super")).length}
              </div>
            </div>
          </div>

          {/* Card 3: Cashiers & Staff */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "អ្នកគិតលុយ (Cashiers & Staff)" : "Cashiers & Staff"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {users.filter((u) => !roleName(u).toLowerCase().includes("admin") && !roleName(u).toLowerCase().includes("super")).length}
              </div>
            </div>
          </div>

          {/* Card 4: Active Status */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "គណនីសកម្ម" : "Active Status"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {users.filter((u) => u.isActive).length}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN TABLE PANEL */}
          <div className={`rounded-2xl border shadow-sm overflow-visible relative ${dark ? "bg-[#2b2c40] border-[#4e4f6e]" : "bg-white border-slate-200/90"}`}>
            
            {/* TOP ACTION TOOLBAR */}
            <div className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
              dark ? "border-[#4e4f6e] bg-[#232333]/50" : "border-slate-200/80 bg-slate-50/50"
            }`}>
              
              {/* Left Section: Table Title */}
              <div className="flex items-center gap-2">
                <UsersRound size={16} className="text-[#55a060]" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {language === "km" ? "បញ្ជីបុគ្គលិក" : "Staff Directory"}
                </h2>
                <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {filteredUsers.length}
                </span>
              </div>

              {/* Right Tools: Filter Dropdown, Search Users, Refresh Button */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                
                {/* Filter Dropdown */}
                <div className="relative">
                  <select
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value as any)}
                    className={`h-8 rounded-lg border px-3 pr-7 text-xs outline-none transition cursor-pointer font-medium focus:border-[#55a060] ${
                      dark ? "border-slate-700 bg-[#232333] text-slate-200" : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    <option value="all">{language === "km" ? "ក្រុមទាំងអស់ (All Groups)" : "All Roles & Groups"}</option>
                    <option value="admin">{language === "km" ? "អ្នកគ្រប់គ្រង (Admins & Managers)" : "Admins & Managers"}</option>
                    <option value="cashier">{language === "km" ? "អ្នកគិតលុយ (Cashiers & Staff)" : "Cashiers & Staff"}</option>
                    <option value="active">{language === "km" ? "គណនីសកម្ម (Active Only)" : "Active Accounts Only"}</option>
                  </select>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === "km" ? "ស្វែងរកបុគ្គលិក..." : "Search users..."}
                    className={`h-8 w-full rounded-lg border pl-8 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-[#55a060] ${
                      dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-300 bg-white text-slate-800"
                    }`}
                  />
                </div>

                {/* 🔄 Refresh Icon Button (Far Right) */}
                <button
                  type="button"
                  onClick={handleRefresh}
                  title="Refresh Staff List"
                  className={`h-8 w-8 flex items-center justify-center rounded-lg border transition cursor-pointer shrink-0 ${
                    dark
                      ? "border-slate-700 bg-[#232333] text-slate-200 hover:bg-[#34354e]"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#55a060]" : "text-slate-600 dark:text-slate-300"} />
                </button>
              </div>
            </div>

            {/* TABLE MATRIX MATCHING TARGET SCREENSHOT media_1787653557137.png */}
            <div className="overflow-x-auto max-w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-slate-700 dark:text-slate-300 font-semibold ${
                    dark ? "bg-[#232333]/80 border-[#4e4f6e]" : "bg-slate-50 border-slate-200/80"
                  }`}>
                    <th className="py-3.5 pl-6 pr-3 w-16 font-bold">No.</th>
                    <th className="py-3.5 px-4 font-bold">Nickname</th>
                    <th className="py-3.5 px-4 font-bold">Group</th>
                    <th className="py-3.5 px-4 font-bold">Email</th>
                    <th className="py-3.5 px-4 w-28 font-bold">Status</th>
                    <th className="py-3.5 px-4 w-44 font-bold">Login time</th>
                    <th className="py-3.5 pr-6 pl-4 w-28 text-right font-bold">Operate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Loader2 className="animate-spin inline mr-2" size={18} />
                        Loading staff users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-normal">
                        No user accounts found matching search query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, idx) => {
                      const isSelected = selectedIds.includes(user.id);
                      const uRole = roleName(user) || "Cashier";
                      const matchedGroup = groups.find((g) => g.name === uRole || g.name.toLowerCase().includes(uRole.toLowerCase()) || String(g.id) === String((user as any).groupId));
                      const isRootSuperAdmin = user.id === 1 || (user.email && user.email.toLowerCase() === "cheychon258@gmail.com");
                      const groupBadgeName = isRootSuperAdmin
                        ? "Admin Group"
                        : (matchedGroup?.name || uRole || "Cashier Group");
                      const hasPinConfigured = Boolean((user as any).pin || (user as any).hasPin);
                      const avatarUrl = user.imageUrl || getProfileImage({ id: user.id, name: user.name, email: user.email, role: uRole });

                      return (
                        <tr
                          key={user.id}
                          className={`transition-colors ${
                            isSelected
                              ? dark ? "bg-[#55a060]/10" : "bg-emerald-50/50"
                              : dark ? "hover:bg-[#232333]/50" : "hover:bg-slate-50/70"
                          }`}
                        >
                          {/* No. (Sequential Index 1, 2, 3...) */}
                          <td className="py-3.5 pl-6 pr-3 font-semibold text-slate-500 dark:text-slate-400">
                            {idx + 1}
                          </td>

                          {/* Nickname with Avatar */}
                          <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-200">
                            <div className="flex items-center gap-2.5">
                              {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={avatarUrl}
                                  alt={user.name}
                                  className="h-7 w-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${profileAvatarClass(user.name)}`}>
                                  {initials(user.name)}
                                </div>
                              )}
                              <span>{user.name}</span>
                            </div>
                          </td>

                          {/* Group (Theme Matched Badge with Role Icons) */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              groupBadgeName.toLowerCase().includes("admin") || groupBadgeName.toLowerCase().includes("super")
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-[#55a060] border border-emerald-200 dark:border-emerald-800"
                                : groupBadgeName.toLowerCase().includes("cashier")
                                ? "bg-cyan-50 dark:bg-cyan-950/40 text-[#03c3ec] border border-cyan-200 dark:border-cyan-800"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}>
                              {groupBadgeName.toLowerCase().includes("admin") || groupBadgeName.toLowerCase().includes("super") ? (
                                <Crown size={12} className="text-[#55a060] shrink-0" />
                              ) : groupBadgeName.toLowerCase().includes("cashier") ? (
                                <CreditCard size={12} className="text-[#03c3ec] shrink-0" />
                              ) : groupBadgeName.toLowerCase().includes("kitchen") ? (
                                <ChefHat size={12} className="text-amber-500 shrink-0" />
                              ) : (
                                <ShieldCheck size={12} className="text-slate-400 shrink-0" />
                              )}
                              <span>{groupBadgeName}</span>
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
                            {formatDate((user as any).lastLoginAt || user.updatedAt || user.createdAt)}
                          </td>

                          {/* Operate / Actions (Inventory Stock Style Action Menu Dropdown) */}
                          <td className="py-3.5 pr-6 pl-4 text-right relative">
                            {user.id === 1 ? null : (
                              <div className="inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (actionMenuOpen === user.id) {
                                      setActionMenuOpen(null);
                                      setActionMenuPos(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const openUpwards = rect.bottom > (window.innerHeight - 220);
                                      const menuWidth = 176;
                                      const targetLeft = rect.right - menuWidth - 4;
                                      const maxLeft = typeof window !== "undefined" ? window.innerWidth - menuWidth - 28 : targetLeft;
                                      const calculatedLeft = Math.max(16, Math.min(maxLeft, targetLeft));
                                      setActionMenuPos({
                                        top: openUpwards ? undefined : Math.min(rect.bottom + 4, window.innerHeight - 130),
                                        bottom: openUpwards ? Math.max(16, window.innerHeight - rect.top + 4) : undefined,
                                        left: calculatedLeft,
                                      });
                                      setActionMenuOpen(user.id);
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

                                {actionMenuOpen === user.id && actionMenuPos && (
                                  <div
                                    style={{
                                      position: "fixed",
                                      top: actionMenuPos.top !== undefined ? `${actionMenuPos.top}px` : undefined,
                                      bottom: actionMenuPos.bottom !== undefined ? `${actionMenuPos.bottom}px` : undefined,
                                      left: `${actionMenuPos.left}px`,
                                    }}
                                    className={`z-[99999] w-44 rounded-xl border p-1.5 text-left shadow-2xl ${
                                      dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/90 bg-white"
                                    } animate-[userModalIn_150ms_cubic-bezier(0.16,1,0.3,1)]`}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActionMenuOpen(null);
                                        setActionMenuPos(null);
                                        openViewModal(user);
                                      }}
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#34354e] transition-colors cursor-pointer"
                                    >
                                      <Eye size={13} className="text-blue-500 stroke-[2]" />
                                      <span>{language === "km" ? "មើលព័ត៌មាន" : "View User"}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActionMenuOpen(null);
                                        setActionMenuPos(null);
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
                                        setActionMenuPos(null);
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
            <div className={`px-6 py-3.5 border-t text-xs font-normal text-slate-500 dark:text-slate-400 ${
              dark ? "border-[#4e4f6e] bg-[#232333]/30" : "border-slate-100 bg-slate-50/30"
            }`}>
              Showing 1 to {filteredUsers.length} of {users.length} rows
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
                <span>{editingUserId ? "Edit Staff User" : "Create New Staff User"}</span>
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
              {/* Profile Image / Avatar Upload & Staff ID */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <label className="block font-bold mb-1.5 text-slate-600 dark:text-slate-300">
                    {language === "km" ? "រូបថតប្រូហ្វាល (Profile Picture)" : "Profile Picture (Avatar)"}
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                      {form.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.imageUrl.startsWith("data:") || form.imageUrl.startsWith("http") ? form.imageUrl : `${apiOrigin}${form.imageUrl}`}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{(form.name || "U")[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const compressed = await compressImageBase64(reader.result as string, 256, 0.75);
                              setForm({ ...form, imageUrl: compressed });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="staff-avatar-upload"
                      />
                      <label
                        htmlFor="staff-avatar-upload"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#232333] px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#34354e] transition cursor-pointer shadow-2xs"
                      >
                        <Camera size={14} className="text-[#55a060]" />
                        {form.imageUrl ? (language === "km" ? "ប្តូររូបថត" : "Change Photo") : (language === "km" ? "ជ្រើសរើសរូបថត" : "Upload Photo")}
                      </label>
                      {form.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, imageUrl: "" })}
                          className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer ml-1"
                        >
                          {language === "km" ? "លុបរូប" : "Remove"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Staff ID Badge (Right side of Upload Image) */}
                {editingUserId && (
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Staff ID
                    </span>
                    <div className={`inline-flex h-9 items-center px-3.5 rounded-xl border font-mono text-xs font-bold shadow-2xs ${
                      dark
                        ? "border-emerald-800/80 bg-emerald-950/40 text-emerald-400"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}>
                      #{editingUserId}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-600 dark:text-slate-300">Name (Nickname) *</label>
                  {editingUserId && (
                    <span className="text-[10.5px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      {language === "km" ? "មិនអាចកែប្រែបានទេ" : "Locked / Read-Only"}
                    </span>
                  )}
                </div>
                <input
                  required
                  type="text"
                  disabled={Boolean(editingUserId)}
                  readOnly={Boolean(editingUserId)}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Chon (Cashier)"
                  className={`w-full h-9 rounded-xl border px-3 text-xs outline-none ${
                    editingUserId
                      ? "cursor-not-allowed opacity-70 bg-slate-100 dark:bg-[#1a1b26] border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-medium"
                      : dark
                      ? "border-slate-700 bg-[#232333] text-slate-100 focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060]"
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-600 dark:text-slate-300">
                      {language === "km" ? "ពាក្យសម្ងាត់ (Password)" : "Password"} {!editingUserId && "*"}
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {language === "km" ? "យ៉ាងហោច 8 តួ" : "Min 8 chars"}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showModalPassword ? "text" : "password"}
                      value={form.password}
                      minLength={8}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editingUserId ? "Leave empty to keep (Min. 8 chars)" : "At least 8 characters"}
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
                  <label className="block font-bold mb-1 text-slate-600 dark:text-slate-300">POS PIN (4 Digits)</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={4}
                      value={form.pin}
                      onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
                      placeholder="e.g. 1234"
                      className={`w-full h-9 rounded-xl border pl-8 pr-3 text-xs outline-none focus:border-[#55a060] font-mono tracking-wider ${
                        dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                      }`}
                    />
                    <KeyRound size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
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
                      <option value="Admin Update">Admin Update</option>
                      <option value="Cashier Group">Cashier Group</option>
                      <option value="Store Manager">Store Manager</option>
                      <option value="Kitchen & KDS Team">Kitchen & KDS Team</option>
                    </>
                  )}
                </select>
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

      {/* VIEW USER DETAILS MODAL */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-[userModalBackdrop_180ms_ease-out]">
          <div className={`relative w-full max-w-md overflow-hidden rounded-2xl border shadow-xl ${
            dark ? "bg-[#1a1b26] border-slate-800 text-slate-100" : "bg-white border-slate-100 text-slate-800"
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                  {viewingUser.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewingUser.imageUrl.startsWith("data:") || viewingUser.imageUrl.startsWith("http") ? viewingUser.imageUrl : `${apiOrigin}${viewingUser.imageUrl}`}
                      alt={viewingUser.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{initials(viewingUser.name)}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {viewingUser.name}
                  </h3>
                  <div className="text-[11px] font-medium text-slate-400">
                    {roleName(viewingUser)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${dark ? "border-slate-800 bg-[#232333]" : "border-slate-100 bg-slate-50"}`}>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    {language === "km" ? "ឈ្មោះបុគ្គលិក" : "Full Name"}
                  </div>
                  <div className="font-bold text-slate-700 dark:text-slate-200">
                    {viewingUser.name}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${dark ? "border-slate-800 bg-[#232333]" : "border-slate-100 bg-slate-50"}`}>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    {language === "km" ? "តួនាទី / Group" : "Group / Role"}
                  </div>
                  <div className="font-bold text-[#55a060]">
                    {roleName(viewingUser)}
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${dark ? "border-slate-800 bg-[#232333]" : "border-slate-100 bg-slate-50"}`}>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  {language === "km" ? "អាសយដ្ឋានអ៊ីមែល" : "Email Address"}
                </div>
                <div className="font-mono font-medium text-slate-700 dark:text-slate-200 truncate">
                  {viewingUser.email}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${dark ? "border-slate-800 bg-[#232333]" : "border-slate-100 bg-slate-50"}`}>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    {language === "km" ? "ស្ថានភាពគណនី" : "Account Status"}
                  </div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${viewingUser.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {viewingUser.isActive ? "Active (Normal)" : "Disabled"}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${dark ? "border-slate-800 bg-[#232333]" : "border-slate-100 bg-slate-50"}`}>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    {language === "km" ? "POS PIN Code" : "POS PIN Code"}
                  </div>
                  <div className="font-bold text-slate-700 dark:text-slate-200">
                    {(viewingUser as any).pin || (viewingUser as any).hasPin ? "Configured (****)" : "Not Set"}
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${dark ? "border-slate-800 bg-[#232333]" : "border-slate-100 bg-slate-50"}`}>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  {language === "km" ? "ចូលប្រព័ន្ធចុងក្រោយ (Last Login)" : "Last Login Time"}
                </div>
                <div className="font-mono text-slate-600 dark:text-slate-300">
                  {formatDate((viewingUser as any).lastLoginAt || viewingUser.updatedAt || viewingUser.createdAt)}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1a1b26]">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                {language === "km" ? "បិទ" : "Close"}
              </button>
              {viewingUser.id !== 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const u = viewingUser;
                    setViewingUser(null);
                    openEditModal(u);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#55a060] hover:bg-[#478851] rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 size={13} />
                  {language === "km" ? "កែប្រែទិន្នន័យ" : "Edit Profile"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

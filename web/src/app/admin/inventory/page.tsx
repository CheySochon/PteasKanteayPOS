"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import TopBar from "../../../components/TopBar";
import { request } from "../../../lib/api";
import { useAppTheme } from "../../../lib/theme";
import { getSocket } from "../../../lib/socket";
import {
  Boxes,
  Check,
  X,
  Search,
  Plus,
  Clock,
  Loader2,
  MoreVertical,
  Settings,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpDown,
  ListFilter,
  Layers,
  Sparkles,
  Package,
  Leaf,
  MinusCircle,
  LayoutGrid,
  Pencil,
  Trash2,
} from "lucide-react";

type InventoryItem = {
  id: number;
  name: string;
  unit: string;
  trackStock: boolean;
  basePrice: number;
  categoryId: number;
  category: { id: number; name: string };
  inventory?: {
    quantity: string | number;
    minStock: string | number;
    updatedAt: string;
  } | null;
  updatedAt: string;
};

type StockMovement = {
  id: number;
  productId: number;
  type: "restock" | "sale" | "damage" | "adjustment" | "return" | "expired";
  quantity: string | number;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
  product: {
    id: number;
    name: string;
    unit: string;
  };
  user: {
    id: number;
    name: string;
    email?: string;
  } | null;
};

const TEXT = {
  en: {
    title: "Inventory Stock",
    dashboard: "Dashboard",
    searchPlaceholder: "Search items...",
    addStockBtn: "Add Stock Items",
    movementsBtn: "Stock Movements",
    allStock: "All Stock Items",
    available: "Available Items",
    lowStock: "Low Stock Items",
    outOfStock: "Out of Stock Items",
    colItem: "Item",
    colCurrent: "Current Stock",
    colMin: "Min Stock",
    colStatus: "Stock Status",
    colUpdated: "Updated On",
    colActions: "Actions",
    inStockBadge: "In Stock",
    lowStockBadge: "Low Stock",
    outOfStockBadge: "Out of Stock",
    adjustStockTitle: "Adjust Stock Level",
    settingsTitle: "Inventory Settings",
    productSelect: "Select Product",
    adjType: "Adjustment Type",
    quantity: "Quantity Change",
    notes: "Notes / Remarks",
    minStockThreshold: "Minimum Stock Threshold",
    unitOfMeasure: "Unit of Measurement",
    trackStockToggle: "Enable Stock Tracking",
    save: "Save Changes",
    cancel: "Cancel",
    adjustSuccess: "Stock adjusted successfully",
    settingsSuccess: "Settings updated successfully",
    typeRestock: "Restock",
    typeSale: "Sale Deduction",
    typeDamage: "Damage/Loss",
    typeAdjustment: "Manual Adjustment",
    typeReturn: "Customer Return",
    typeExpired: "Expired Stock",
    colType: "Type",
    colReference: "Reference ID",
    colOperator: "Operator",
    loading: "Loading inventory data...",
    noMovements: "No stock movements recorded yet.",
    noProducts: "No products found matching your search.",
    allProducts: "All Products",
  },
  km: {
    title: "គ្រប់គ្រងស្តុក",
    dashboard: "ផ្ទាំងគ្រប់គ្រង",
    searchPlaceholder: "ស្វែងរកទំនិញ...",
    addStockBtn: "បន្ថែមទំនិញក្នុងស្តុក",
    movementsBtn: "ការផ្លាស់ប្តូរស្តុក",
    allStock: "មុខទំនិញទាំងអស់",
    available: "មុខទំនិញមានក្នុងស្តុក",
    lowStock: "មុខទំនិញស្តុកទាប",
    outOfStock: "មុខទំនិញដាច់ស្តុក",
    colItem: "ទំនិញ",
    colCurrent: "ស្តុកបច្ចុប្បន្ន",
    colMin: "ស្តុកអប្បបរមា",
    colStatus: "ស្ថានភាពស្តុក",
    colUpdated: "បានធ្វើបច្ចុប្បន្នភាព",
    colActions: "សកម្មភាព",
    inStockBadge: "មានក្នុងស្តុក",
    lowStockBadge: "ស្តុកទាប",
    outOfStockBadge: "ដាច់ស្តុក",
    adjustStockTitle: "កែសម្រួលកម្រិតស្តុក",
    settingsTitle: "ការកំណត់ស្តុកទំនិញ",
    productSelect: "ជ្រើសរើសទំនិញ",
    adjType: "ប្រភេទការកែសម្រួល",
    quantity: "ចំនួនកែប្រែស្តុក",
    notes: "កំណត់ចំណាំ / ហេតុផល",
    minStockThreshold: "កម្រិតស្តុកអប្បបរមា",
    unitOfMeasure: "ខ្នាតរង្វាស់ (ឯកតា)",
    trackStockToggle: "បើកការតាមដានស្តុក",
    save: "រក្សាទុកការផ្លាស់ប្តូរ",
    cancel: "បោះបង់",
    adjustSuccess: "បានកែសម្រួលស្តុកដោយជោគជ័យ",
    settingsSuccess: "បានធ្វើបច្ចុប្បន្នភាពការកំណត់ដោយជោគជ័យ",
    typeRestock: "បញ្ចូលស្តុកថ្មី",
    typeSale: "ដកចេញតាមការលក់",
    typeDamage: "ខូចខាត / បាត់បង់",
    typeAdjustment: "កែសម្រួលដោយដៃ",
    typeReturn: "អតិថិជនបង្វិលចូល",
    typeExpired: "ហួសកាលកំណត់",
    colType: "ប្រភេទ",
    colReference: "ឯកសារយោង",
    colOperator: "អ្នកប្រតិបត្តិ",
    loading: "កំពុងផ្ទុកទិន្នន័យស្តុក...",
    noMovements: "មិនទាន់មានការផ្លាស់ប្តូរស្តុកនៅឡើយទេ។",
    noProducts: "រកមិនឃើញទំនិញដែលត្រូវនឹងការស្វែងរករបស់អ្នកទេ។",
    allProducts: "ទំនិញទាំងអស់",
  },
};

function subscribeToLanguageChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-language-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-language-change", onStoreChange);
  };
}

function getLanguageSnapshot(): "en" | "km" {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem("pos_language") === "km" ? "km" : "en";
}

function getServerLanguageSnapshot(): "en" | "km" {
  return "en";
}

function setDashboardLanguage(language: "en" | "km") {
  localStorage.setItem("pos_language", language);
  window.dispatchEvent(new Event("pos-language-change"));
}

export default function InventoryPage() {
  const [theme] = useAppTheme();
  const language = useSyncExternalStore(
    subscribeToLanguageChanges,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );

  const t = TEXT[language];
  const dark = theme === "dark";

  // Data State
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // UI State
  const [activeTab, setActiveTab] = useState<"dashboard" | "movements">("dashboard");
  const [filterType, setFilterType] = useState<"all" | "available" | "low" | "out">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);

  // Modals State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  // Form Fields
  const [addName, setAddName] = useState("");
  const [addUnit, setAddUnit] = useState("pc");
  const [addQuantity, setAddQuantity] = useState("");
  const [addMinStock, setAddMinStock] = useState("");

  const [adjProductId, setAdjProductId] = useState("");
  const [adjType, setAdjType] = useState<"IN" | "OUT">("IN");
  const [adjQty, setAdjQty] = useState("");
  const [adjNotes, setAdjNotes] = useState("");

  const [settingsProductId, setSettingsProductId] = useState("");
  const [settingsTrackStock, setSettingsTrackStock] = useState(false);
  const [settingsMinStock, setSettingsMinStock] = useState("");
  const [settingsUnit, setSettingsUnit] = useState("pc");
  const [settingsName, setSettingsName] = useState("");
  const [settingsQuantity, setSettingsQuantity] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const [deleteProductName, setDeleteProductName] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const invData = await request<InventoryItem[]>("/inventory");
      const movementsData = await request<StockMovement[]>("/inventory/transactions");
      setProducts(invData);
      setMovements(movementsData);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen to real-time events via Socket.io with background polling backup
  useEffect(() => {
    const handleUpdate = () => {
      // Fetch updated stock levels and transaction lists silently in the background
      request<InventoryItem[]>("/inventory").then(setProducts).catch(console.error);
      request<StockMovement[]>("/inventory/transactions").then(setMovements).catch(console.error);
    };

    // Polling backup every 3 seconds for guaranteed real-time updates
    const interval = setInterval(handleUpdate, 3000);

    const socket = getSocket();
    if (socket) {
      socket.on("inventory:updated", handleUpdate);
      socket.on("order:created", handleUpdate);
      socket.on("order:updated", handleUpdate);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off("inventory:updated", handleUpdate);
        socket.off("order:created", handleUpdate);
        socket.off("order:updated", handleUpdate);
      }
    };
  }, []);

  // Show Toast Auto-Dismiss
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Click outside or scroll to close action menu
  useEffect(() => {
    const handleClose = () => setActionMenuOpen(null);
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, []);

  // Helpers for Status Calculation
  const getProductStockStatus = (p: InventoryItem) => {
    if (!p.trackStock) return "available";
    const qty = Number(p.inventory?.quantity ?? 0);
    const min = Number(p.inventory?.minStock ?? 0);
    if (qty <= 0) return "out";
    if (qty <= min) return "low";
    return "available";
  };

  // Metrics Count
  const metrics = useMemo(() => {
    const total = products.length;
    let available = 0;
    let low = 0;
    let out = 0;

    products.forEach((p) => {
      const status = getProductStockStatus(p);
      if (status === "available") available++;
      else if (status === "low") low++;
      else if (status === "out") out++;
    });

    return { total, available, low, out };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search Filter
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        // Metric Card Filter
        const status = getProductStockStatus(p);
        if (filterType === "available" && status !== "available") return false;
        if (filterType === "low" && status !== "low") return false;
        if (filterType === "out" && status !== "out") return false;

        return true;
      });
  }, [products, filterType, searchQuery]);

  // Handle Form Submissions
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProductId) return;

    setSubmitting(true);
    setError("");

    const originalQty = Math.abs(Number(adjQty));
    const finalQty = adjType === "IN" ? originalQty : -originalQty;
    const dbType = adjType === "IN" ? "restock" : "damage";

    try {
      await request("/inventory/adjust", {
        method: "POST",
        body: {
          productId: Number(adjProductId),
          type: dbType,
          quantity: finalQty,
          notes: adjNotes,
        },
      });

      setSuccessMessage(t.adjustSuccess);
      setIsAdjustModalOpen(false);
      fetchData();

      // Reset Form
      setAdjQty("");
      setAdjNotes("");
    } catch (err: any) {
      setError(err?.message || "Failed to adjust stock");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      await request("/inventory/item", {
        method: "POST",
        body: {
          name: addName.trim(),
          unit: addUnit,
          quantity: Number(addQuantity || 0),
          minStock: Number(addMinStock || 0),
        },
      });

      setSuccessMessage("Stock item created successfully");
      setIsAddModalOpen(false);
      fetchData();

      // Reset Form
      setAddName("");
      setAddUnit("pc");
      setAddQuantity("");
      setAddMinStock("");
    } catch (err: any) {
      setError(err?.message || "Failed to create stock item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsProductId) return;

    setSubmitting(true);
    setError("");

    try {
      await request("/inventory/settings", {
        method: "PUT",
        body: {
          productId: Number(settingsProductId),
          trackStock: true,
          minStock: Number(settingsMinStock),
          unit: settingsUnit,
          name: settingsName,
          quantity: Number(settingsQuantity),
        },
      });

      setSuccessMessage(t.settingsSuccess);
      setIsSettingsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to update settings");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = (productId: number, productName: string) => {
    setDeleteProductId(productId);
    setDeleteProductName(productName);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteProductId) return;

    setSubmitting(true);
    setError("");

    try {
      await request(`/products/${deleteProductId}`, {
        method: "DELETE",
      });

      setSuccessMessage("Stock item deleted successfully");
      setIsDeleteModalOpen(false);
      setDeleteProductId(null);
      setDeleteProductName("");
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete item");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Adjust Modal from table row
  const openAdjustModal = (product: InventoryItem) => {
    setSelectedProduct(product);
    setAdjProductId(String(product.id));
    setAdjType("IN");
    setIsAdjustModalOpen(true);
  };

  // Open Settings Modal from table row
  const openSettingsModal = (product: InventoryItem) => {
    setSelectedProduct(product);
    setSettingsProductId(String(product.id));
    setSettingsTrackStock(product.trackStock);
    setSettingsMinStock(String(product.inventory?.minStock ?? 0));
    setSettingsUnit(product.unit || "pc");
    setSettingsName(product.name || "");
    setSettingsQuantity(String(product.inventory?.quantity ?? 0));
    setIsSettingsModalOpen(true);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).replace(/am/i, "AM").replace(/pm/i, "PM");
  };

  // Theme Helpers
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const bgMain = dark ? "bg-[#232333]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-100";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";
  const inputClass = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-200 ${
    dark
      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#696cff] focus:bg-white"
  }`;

  return (
    <main className={`flex-1 overflow-y-auto ${bgMain} ${language === "km" ? "font-khmer" : ""}`}>
      <TopBar
        title={t.title}
        subtitle=""
        language={language}
        onLanguageChange={setDashboardLanguage}
        notifications={[]}
        onClearNotifications={() => {}}
        dark={dark}
      />

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="fixed top-6 left-0 right-0 z-[99999] flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto flex items-center gap-3 py-2.5 px-4.5 rounded-xl bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-[13px] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100/80 dark:border-slate-800 animate-[dropFromTop_400ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="h-5 w-5 rounded-full bg-[#48cf38] flex items-center justify-center text-white shrink-0">
              <Check size={11} strokeWidth={4.5} className="text-white" />
            </div>
            <span>{successMessage}</span>
          </div>
          <style>{`
            @keyframes dropFromTop {
              0% { transform: translateY(-150%); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1600px] px-5 pt-3 pb-6">
        {/* Error Alert matching screenshot top placement */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300 animate-[fadeIn_200ms_ease-out]">
            <X size={16} className="text-red-500 shrink-0 stroke-[2.5]" />
            <span>{error}</span>
          </div>
        )}

        {/* Title and Action Buttons (Moved Up) */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-normal text-slate-800 dark:text-white">Inventory Stock</h1>
            <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1.5 text-xs font-medium">
              <LayoutGrid size={13} />
              Dashboard
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "dashboard" && (
              <div className="relative min-w-[240px]">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded-xl border pl-10 pr-4 py-2 text-xs outline-none transition-all ${
                    dark
                      ? "border-[#4e4f6e] bg-[#2b2c40] text-white focus:border-[#696cff]"
                      : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff]"
                  }`}
                />
              </div>
            )}

            <button
              onClick={() => {
                setAddName("");
                setAddUnit("pc");
                setAddQuantity("");
                setAddMinStock("");
                setIsAddModalOpen(true);
              }}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                dark
                  ? "border-[#4e4f6e] bg-[#2b2c40] text-slate-200 hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Plus size={14} />
              {t.addStockBtn}
            </button>

            <button
              onClick={() => setActiveTab(activeTab === "dashboard" ? "movements" : "dashboard")}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "movements"
                  ? "bg-[#696cff] border-[#696cff] text-white"
                  : dark
                  ? "border-[#4e4f6e] bg-[#2b2c40] text-slate-200 hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Clock size={14} />
              {t.movementsBtn}
            </button>
          </div>
        </div>

        {/* Metric Summary Cards (Always visible) */}
        {activeTab === "dashboard" && (
          <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Stock items */}
            <div
              onClick={() => setFilterType("all")}
              className={`cursor-pointer rounded-2xl border-l-[4px] border-l-[#8a99ad] border py-3 px-5 ${surface} flex items-center gap-4 transition-all hover:shadow-md ${
                filterType === "all" ? "border-[#696cff] shadow-sm" : `${borderCol}`
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 shrink-0">
                <Package size={18} />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t.allStock}
                </div>
                <div className={`text-2xl font-bold text-slate-800 dark:text-slate-100`}>{metrics.total}</div>
              </div>
            </div>

            {/* Available items */}
            <div
              onClick={() => setFilterType("available")}
              className={`cursor-pointer rounded-2xl border-l-[4px] border-l-[#71dd37] border py-3 px-5 ${surface} flex items-center gap-4 transition-all hover:shadow-md ${
                filterType === "available" ? "border-[#71dd37] shadow-sm" : `${borderCol}`
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Leaf size={18} />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t.available}
                </div>
                <div className={`text-2xl font-bold text-emerald-600 dark:text-emerald-400`}>{metrics.available}</div>
              </div>
            </div>

            {/* Low Stock items */}
            <div
              onClick={() => setFilterType("low")}
              className={`cursor-pointer rounded-2xl border-l-[4px] border-l-[#ff9f43] border py-3 px-5 ${surface} flex items-center gap-4 transition-all hover:shadow-md ${
                filterType === "low" ? "border-[#ff9f43] shadow-sm" : `${borderCol}`
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t.lowStock}
                </div>
                <div className={`text-2xl font-bold text-amber-600 dark:text-amber-400`}>{metrics.low}</div>
              </div>
            </div>

            {/* Out of Stock items */}
            <div
              onClick={() => setFilterType("out")}
              className={`cursor-pointer rounded-2xl border-l-[4px] border-l-[#ff3e1d] border py-3 px-5 ${surface} flex items-center gap-4 transition-all hover:shadow-md ${
                filterType === "out" ? "border-[#ff3e1d] shadow-sm" : `${borderCol}`
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 shrink-0">
                <MinusCircle size={18} />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t.outOfStock}
                </div>
                <div className={`text-2xl font-bold text-rose-600 dark:text-rose-400`}>{metrics.out}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator or Content */}
        {loading ? (
          <div className="flex h-96 w-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#696cff]" />
            <span className="text-sm font-bold text-slate-400">{t.loading}</span>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" ? (
              /* Products Stock Level List Table */
              <div className={`overflow-hidden rounded-2xl border ${borderCol} ${surface}`}>
                <div className="overflow-auto max-h-[480px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className={`${dark ? "bg-[#2b2c40] border-[#4e4f6e]/50" : "bg-[#f8f9fa] border-slate-100"} border-b text-xs font-semibold text-slate-500`}>
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">{t.colItem}</th>
                        <th className="px-6 py-4">{t.colCurrent}</th>
                        <th className="px-6 py-4">{t.colMin}</th>
                        <th className="px-6 py-4">{t.colStatus}</th>
                        <th className="px-6 py-4">{t.colUpdated}</th>
                        <th className="px-6 py-4 text-right">{t.colActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#4e4f6e]/40">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                            {searchQuery ? t.noProducts : (language === "km" ? "មិនទាន់មានទំនិញក្នុងស្តុកនៅឡើយទេ។ សូមចុច \"+ បន្ថែមទំនិញក្នុងស្តុក\" ដើម្បីចុះឈ្មោះទំនិញថ្មី។" : "No stock items found. Click \"+ Add Stock Items\" to register new stock.")}
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p, idx) => {
                          const status = getProductStockStatus(p);
                          const qty = p.inventory?.quantity !== undefined ? Number(p.inventory.quantity) : 0;
                          const min = p.inventory?.minStock !== undefined ? Number(p.inventory.minStock) : 0;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-[#34354c]/20 transition-colors">
                              <td className="px-6 py-4.5 text-xs text-slate-400 font-bold">
                                {products.length - idx}
                              </td>
                              <td className="px-6 py-4.5">
                                <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                                  {p.name}
                                </div>
                              </td>
                              <td className="px-6 py-4.5 text-sm text-slate-600 dark:text-slate-300">
                                {p.trackStock ? (
                                  <span>
                                    {qty.toFixed(4)} {p.unit}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">Unlimited</span>
                                )}
                              </td>
                              <td className="px-6 py-4.5 text-sm text-slate-600 dark:text-slate-300">
                                {p.trackStock ? (
                                  <span>
                                    {min.toFixed(4)} {p.unit}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4.5">
                                {!p.trackStock ? (
                                  <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-500">
                                    No Tracking
                                  </span>
                                ) : status === "available" ? (
                                  <span className="inline-flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    {t.inStockBadge}
                                  </span>
                                ) : status === "low" ? (
                                  <span className="inline-flex items-center rounded-lg bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                    {t.lowStockBadge}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-lg bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 animate-pulse">
                                    {t.outOfStockBadge}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {p.inventory?.updatedAt ? formatDate(p.inventory.updatedAt) : formatDate(p.updatedAt)}
                              </td>
                              <td className="px-6 py-4.5 text-right relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (actionMenuOpen === p.id) {
                                      setActionMenuOpen(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const dropHeight = 126;
                                      const top = rect.bottom + 4 + dropHeight > window.innerHeight ? rect.top - 4 - dropHeight : rect.bottom + 4;
                                      const left = rect.right - 200;
                                      setDropdownCoords({ top, left });
                                      setActionMenuOpen(p.id);
                                    }
                                  }}
                                  className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-[#34354c] text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  <MoreVertical size={16} />
                                </button>

                                {/* Fixed Viewport-Relative Dropdown Menu */}
                                {actionMenuOpen === p.id && dropdownCoords && (
                                  <div
                                    style={{
                                      position: "fixed",
                                      top: `${dropdownCoords.top}px`,
                                      left: `${dropdownCoords.left}px`,
                                    }}
                                    className="z-50 w-[200px] rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-[#2b2c40] shadow-xl p-1.5 text-left animate-[printerScaleIn_100ms_ease-out]"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => openAdjustModal(p)}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap"
                                    >
                                      <Plus size={14} className="text-slate-400 stroke-[2.5]" />
                                      {language === "km" ? "បញ្ចូល/ដកស្តុក" : "Add Stock Movement"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openSettingsModal(p)}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap"
                                    >
                                      <Pencil size={12} className="text-slate-400" />
                                      {language === "km" ? "កែប្រែព័ត៌មាន" : "Update Item"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(p.id, p.name)}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors whitespace-nowrap"
                                    >
                                      <Trash2 size={13} className="text-red-400" />
                                      {language === "km" ? "លុបទំនិញ" : "Delete Item"}
                                    </button>
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
            ) : (
              /* Stock Movements (Transaction Log) */
              <div className={`overflow-hidden rounded-2xl border ${borderCol} ${surface}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`${dark ? "bg-[#34354c]/60" : "bg-[#f8f9fa]"} text-xs font-semibold text-slate-500 border-b dark:border-slate-800`}>
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">Item</th>
                        <th className="px-6 py-4">Quantity</th>
                        <th className="px-6 py-4">Movement</th>
                        <th className="px-6 py-4">Date & Time</th>
                        <th className="px-6 py-4">Remarks</th>
                        <th className="px-6 py-4">Updated By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#4e4f6e]/40">
                      {movements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                            {t.noMovements}
                          </td>
                        </tr>
                      ) : (
                        movements.map((move, idx) => {
                          const quantityVal = Number(move.quantity);
                          const isPositive = quantityVal > 0;

                          return (
                            <tr key={move.id} className="hover:bg-slate-50/50 dark:hover:bg-[#34354c]/20 transition-colors text-slate-700 dark:text-slate-300 text-sm">
                              <td className="px-6 py-4.5 text-xs text-slate-400 font-bold">
                                {movements.length - idx}
                              </td>
                              <td className="px-6 py-4.5">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {move.product?.name || "Deleted Product"}
                                </div>
                              </td>
                              <td className="px-6 py-4.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {parseFloat(Math.abs(quantityVal).toFixed(4))}
                                </span>{" "}
                                <span className="text-xs text-slate-400 font-medium ml-0.5">{move.product?.unit}</span>
                              </td>
                              <td className="px-6 py-4.5">
                                {isPositive ? (
                                  <span className="inline-flex items-center rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                                    IN
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                                    OUT
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {formatDate(move.createdAt)}
                              </td>
                              <td className="px-6 py-4.5 text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs truncate">
                                {move.notes || move.referenceId || "-"}
                              </td>
                              <td className="px-6 py-4.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                                {move.user?.email || move.user?.name || "System"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-md rounded-3xl border ${borderCol} ${surface} shadow-2xl p-7 relative`}>
            <button
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-500 hover:bg-rose-100 transition-colors"
            >
              <X size={16} className="stroke-[2.5]" />
            </button>

            <h2 className={`text-base font-black ${textPrimary} mb-5`}>
              Add New Stock Movement
            </h2>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              {/* Product Select (if not predefined) */}
              {!selectedProduct && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Product Select
                  </label>
                  <select
                    value={adjProductId}
                    onChange={(e) => setAdjProductId(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                        : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                    }`}
                    required
                  >
                    <option value="">-- Product Select --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Movement Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Movement Type
                </label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as any)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                      : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                  }`}
                  required
                >
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="Enter Quantity to add..."
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                      : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                  }`}
                  required
                />
              </div>

              {/* Remarks (optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Remarks (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Shipment details, manual adjustment reason etc..."
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                      : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                  }`}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-emerald-700/30 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-md rounded-3xl border ${borderCol} ${surface} shadow-2xl p-7 relative`}>
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-500 hover:bg-rose-100 transition-colors"
            >
              <X size={16} className="stroke-[2.5]" />
            </button>

            <h2 className={`text-base font-black ${textPrimary} mb-5`}>
              Add Stock Item
            </h2>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Item Name
                </label>
                <input
                  type="text"
                  placeholder="Item Name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                      : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                  }`}
                  required
                />
              </div>

              {/* Unit Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Unit
                </label>
                <select
                  value={addUnit}
                  onChange={(e) => setAddUnit(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                      : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                  }`}
                  required
                >
                  <option value="pc">Piece (pc)</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="g">Gram (g)</option>
                  <option value="ml">Milliliter (ml)</option>
                  <option value="l">Liter (l)</option>
                </select>
              </div>

              {/* Quantity and Min Stock Inline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Current Stock Qty
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Enter Current Stock Qty..."
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                        : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Min Stock Qty
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Enter Min Stock Qty..."
                    value={addMinStock}
                    onChange={(e) => setAddMinStock(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                        : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Full Width Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-[#71bf73] py-3 text-sm font-bold text-white hover:bg-[#60ab62] transition-colors disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Item Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-md rounded-3xl border ${borderCol} ${surface} shadow-2xl p-7 relative`}>
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-500 hover:bg-rose-100 transition-colors"
            >
              <X size={16} className="stroke-[2.5]" />
            </button>

            <h2 className={`text-base font-black ${textPrimary} mb-5`}>
              Update Item
            </h2>

            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Item Name
                </label>
                <input
                  type="text"
                  placeholder="Item Name"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                      : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                  }`}
                  required
                />
              </div>

              {/* Unit Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Unit
                </label>
                <select
                  value={settingsUnit}
                  onChange={(e) => setSettingsUnit(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                      : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                  }`}
                  required
                >
                  <option value="pc">Piece (pc)</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="g">Gram (g)</option>
                  <option value="ml">Milliliter (mL)</option>
                  <option value="l">Liter (l)</option>
                </select>
              </div>

              {/* Quantity and Min Stock Inline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Current Stock Qty
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Enter Current Stock Qty..."
                    value={settingsQuantity}
                    onChange={(e) => setSettingsQuantity(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                        : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Min Stock Qty
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="Enter Min Stock Qty..."
                    value={settingsMinStock}
                    onChange={(e) => setSettingsMinStock(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#696cff]"
                        : "border-slate-200 bg-white text-slate-800 focus:border-[#696cff] focus:ring-1 focus:ring-[#696cff]"
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-emerald-700/30 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-md rounded-3xl border ${borderCol} ${surface} shadow-2xl p-7 relative`}>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} className="stroke-[2.5]" />
            </button>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 shrink-0">
                <AlertTriangle size={24} className="stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <h2 className={`text-lg font-bold ${textPrimary} mb-1`}>
                  Delete Item
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete this item? This action is irreversible. 🛑 ✋
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className={`rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={submitting}
                className="rounded-2xl bg-[#e52e2e] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-650/20 transition-all hover:bg-red-700 hover:shadow-red-700/30 disabled:opacity-50"
              >
                {submitting ? "Deleting..." : "Yes, Delete!"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

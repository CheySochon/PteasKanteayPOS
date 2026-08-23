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

    // Polling backup every 30 seconds for guaranteed real-time updates
    const interval = setInterval(handleUpdate, 30000);

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

  // Click outside to close action menu
  useEffect(() => {
    const handleClose = () => setActionMenuOpen(null);
    window.addEventListener("click", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
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


      <div className="mx-auto w-full max-w-[1720px] px-3.5 sm:px-4 pt-3 pb-6 ">
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
            <h1 className={`text-2xl font-normal ${dark ? "text-slate-100" : "text-slate-800"}`}>{t.title}</h1>
            <span className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              dark ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300" : "bg-slate-100 text-slate-500"
            }`}>
              <LayoutGrid size={13} />
              {t.dashboard}
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
                      ? "border-[#3b3c54] bg-[#2b2c40] text-slate-100 placeholder:text-slate-400 focus:border-[#696cff]"
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
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                dark
                  ? "border-[#3b3c54] bg-[#2b2c40] text-slate-200 hover:bg-[#34354e]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Plus size={14} />
              {t.addStockBtn}
            </button>

            <button
              onClick={() => setActiveTab(activeTab === "dashboard" ? "movements" : "dashboard")}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "movements"
                  ? "bg-[#696cff] border-[#696cff] text-white"
                  : dark
                  ? "border-[#3b3c54] bg-[#2b2c40] text-slate-200 hover:bg-[#34354e]"
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
                filterType === "all" ? "border-[#696cff] shadow-sm" : dark ? "border-[#3b3c54]" : "border-slate-100"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 shrink-0">
                <Package size={18} />
              </div>
              <div>
                <div className={`text-xs font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  {t.allStock}
                </div>
                <div className={`text-xl font-bold ${dark ? "text-slate-100" : "text-slate-800"}`}>{metrics.total}</div>
              </div>
            </div>

            {/* Available items */}
            <div
              onClick={() => setFilterType("available")}
              className={`cursor-pointer rounded-2xl border-l-[4px] border-l-[#71dd37] border py-3 px-5 ${surface} flex items-center gap-4 transition-all hover:shadow-md ${
                filterType === "available" ? "border-[#71dd37] shadow-sm" : dark ? "border-[#3b3c54]" : "border-slate-100"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Leaf size={18} />
              </div>
              <div>
                <div className={`text-xs font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  {t.available}
                </div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.available}</div>
              </div>
            </div>

            {/* Low Stock items */}
            <div
              onClick={() => setFilterType("low")}
              className={`cursor-pointer rounded-2xl border-l-[4px] border-l-[#ff9f43] border py-3 px-5 ${surface} flex items-center gap-4 transition-all hover:shadow-md ${
                filterType === "low" ? "border-[#ff9f43] shadow-sm" : dark ? "border-[#3b3c54]" : "border-slate-100"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50/50 dark:bg-amber-950/40 border border-amber-100/50 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <div className={`text-xs font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  {t.lowStock}
                </div>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{metrics.low}</div>
              </div>
            </div>

            {/* Out of Stock items */}
            <div
              onClick={() => setFilterType("out")}
              className={`cursor-pointer rounded-2xl border-l-[4px] border-l-[#ff3e1d] border py-3 px-5 ${surface} flex items-center gap-4 transition-all hover:shadow-md ${
                filterType === "out" ? "border-[#ff3e1d] shadow-sm" : dark ? "border-[#3b3c54]" : "border-slate-100"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50/50 dark:bg-rose-950/40 border border-rose-100/50 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
                <MinusCircle size={18} />
              </div>
              <div>
                <div className={`text-xs font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  {t.outOfStock}
                </div>
                <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{metrics.out}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator or Content */}
        {loading ? (
          <div className="flex h-96 w-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#696cff]" />
            <span className="text-xs font-bold text-slate-400">{t.loading}</span>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" ? (
              /* Products Stock Level List Table */
              <div className={`overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54]" : "border-slate-200/80"} ${surface}`}>
                <div className="overflow-auto max-h-[540px] min-h-[240px] pb-24 no-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className={`${dark ? "bg-[#2b2c40] border-[#3b3c54] text-slate-400" : "bg-[#f8f9fa] border-slate-100 text-slate-500"} border-b text-[11px] font-bold uppercase tracking-wider whitespace-nowrap`}>
                        <th className="px-5 py-3 w-12 text-center">#</th>
                        <th className="px-6 py-3 min-w-[180px]">{t.colItem}</th>
                        <th className="px-6 py-3 min-w-[130px]">{t.colCurrent}</th>
                        <th className="px-6 py-3 min-w-[130px]">{t.colMin}</th>
                        <th className="px-6 py-3 min-w-[140px]">{t.colStatus}</th>
                        <th className="px-6 py-3 min-w-[160px]">{t.colUpdated}</th>
                        <th className="px-6 py-3 min-w-[120px] text-right pr-6">{t.colActions}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${dark ? "divide-[#3b3c54]" : "divide-slate-100"}`}>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-xs font-medium text-slate-400">
                            {searchQuery ? t.noProducts : (language === "km" ? "មិនទាន់មានទំនិញក្នុងស្តុកនៅឡើយទេ។ សូមចុច \"+ បន្ថែមទំនិញក្នុងស្តុក\" ដើម្បីចុះឈ្មោះទំនិញថ្មី។" : "No stock items found. Click \"+ Add Stock Items\" to register new stock.")}
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p, idx) => {
                          const status = getProductStockStatus(p);
                          const qty = p.inventory?.quantity !== undefined ? Number(p.inventory.quantity) : 0;
                          const min = p.inventory?.minStock !== undefined ? Number(p.inventory.minStock) : 0;
                          const isBottomRow = idx > 0 && idx >= filteredProducts.length - 2;

                          return (
                            <tr key={p.id} className={`transition-colors ${dark ? "hover:bg-[#34354c]/40 text-slate-200" : "hover:bg-slate-50/50 text-slate-700"}`}>
                              <td className={`px-6 py-3 text-xs font-bold ${dark ? "text-slate-400" : "text-slate-400"}`}>
                                {products.length - idx}
                              </td>
                              <td className="px-6 py-3">
                                <div className={`font-semibold text-xs ${dark ? "text-slate-100" : "text-slate-800"}`}>
                                  {p.name}
                                </div>
                              </td>
                              <td className={`px-6 py-3 text-xs font-medium ${dark ? "text-slate-200" : "text-slate-600"}`}>
                                {p.trackStock ? (
                                  <span>
                                    {qty.toFixed(4)} {p.unit}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">Unlimited</span>
                                )}
                              </td>
                              <td className={`px-6 py-3 text-xs font-medium ${dark ? "text-slate-200" : "text-slate-600"}`}>
                                {p.trackStock ? (
                                  <span>
                                    {min.toFixed(4)} {p.unit}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                {!p.trackStock ? (
                                  <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                                    dark ? "bg-[#3b3c54] text-slate-300" : "bg-slate-100 text-slate-500"
                                  }`}>
                                    No Tracking
                                  </span>
                                ) : status === "available" ? (
                                  <span className="inline-flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    {t.inStockBadge}
                                  </span>
                                ) : status === "low" ? (
                                  <span className="inline-flex items-center rounded-lg bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    {t.lowStockBadge}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-lg bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 animate-pulse">
                                    {t.outOfStockBadge}
                                  </span>
                                )}
                              </td>
                              <td className={`px-6 py-3 text-[11px] font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
                                {p.inventory?.updatedAt ? formatDate(p.inventory.updatedAt) : formatDate(p.updatedAt)}
                              </td>
                              <td className="px-6 py-3 text-center min-w-[120px] whitespace-nowrap relative">
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionMenuOpen(actionMenuOpen === p.id ? null : p.id);
                                    }}
                                    className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                                      dark ? "text-slate-400 hover:bg-[#34354c] hover:text-slate-200" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                    }`}
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {actionMenuOpen === p.id && (
                                    <div
                                      className={`absolute right-0 ${
                                        isBottomRow ? "bottom-full mb-1" : "top-full mt-1"
                                      } z-[99999] w-[190px] rounded-2xl border p-1.5 text-left shadow-xl ${
                                        dark ? "border-[#3b3c54] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionMenuOpen(null);
                                          openAdjustModal(p);
                                        }}
                                        className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                                          dark ? "text-slate-200 hover:bg-[#34354e]" : "text-slate-600 hover:bg-slate-50"
                                        }`}
                                      >
                                        <Plus size={14} className="text-slate-400 stroke-[2.5]" />
                                        {language === "km" ? "បញ្ចូល/ដកស្តុក" : "Add Stock Movement"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionMenuOpen(null);
                                          openSettingsModal(p);
                                        }}
                                        className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                                          dark ? "text-slate-200 hover:bg-[#34354e]" : "text-slate-600 hover:bg-slate-50"
                                        }`}
                                      >
                                        <Pencil size={12} className="text-slate-400" />
                                        {language === "km" ? "កែប្រែព័ត៌មាន" : "Update Item"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionMenuOpen(null);
                                          handleDeleteItem(p.id, p.name);
                                        }}
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                                      >
                                        <Trash2 size={13} className="text-red-400" />
                                        {language === "km" ? "លុបទំនិញ" : "Delete Item"}
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
            ) : (
              /* Stock Movements Log Table */
              <div className={`overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54]" : "border-slate-200/80"} ${surface}`}>
                <div className="overflow-auto max-h-[540px] no-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${dark ? "bg-[#2b2c40] border-[#3b3c54] text-slate-400" : "bg-[#f8f9fa] border-slate-100 text-slate-500"}`}>
                        <th className="px-6 py-3">#</th>
                        <th className="px-6 py-3">Item</th>
                        <th className="px-6 py-3">Quantity</th>
                        <th className="px-6 py-3">Movement</th>
                        <th className="px-6 py-3">Date &amp; Time</th>
                        <th className="px-6 py-3">Remarks</th>
                        <th className="px-6 py-3">Updated By</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${dark ? "divide-[#3b3c54]" : "divide-slate-100"}`}>
                      {movements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-xs font-medium text-slate-400">
                            {t.noMovements}
                          </td>
                        </tr>
                      ) : (
                        movements.map((move, idx) => {
                          const quantityVal = Number(move.quantity);
                          const isPositive = quantityVal > 0;

                          return (
                            <tr key={move.id} className={`transition-colors ${dark ? "hover:bg-[#34354c]/40 text-slate-200" : "hover:bg-slate-50/50 text-slate-700"}`}>
                              <td className={`px-6 py-3 text-xs font-bold ${dark ? "text-slate-400" : "text-slate-400"}`}>
                                {movements.length - idx}
                              </td>
                              <td className="px-6 py-3">
                                <div className={`font-semibold text-xs ${dark ? "text-slate-100" : "text-slate-800"}`}>
                                  {move.product?.name || "Deleted Product"}
                                </div>
                              </td>
                              <td className="px-6 py-3">
                                <span className={`font-semibold text-xs ${dark ? "text-slate-200" : "text-slate-700"}`}>
                                  {parseFloat(Math.abs(quantityVal).toFixed(4))}
                                </span>{" "}
                                <span className="text-[11px] text-slate-400 font-medium ml-0.5">{move.product?.unit}</span>
                              </td>
                              <td className="px-6 py-3">
                                {isPositive ? (
                                  <span className="inline-flex items-center rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                                    IN
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                                    OUT
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                {formatDate(move.createdAt)}
                              </td>
                              <td className="px-6 py-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium max-w-xs truncate">
                                {move.notes || move.referenceId || "-"}
                              </td>
                              <td className="px-6 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-md rounded-2xl border ${borderCol} ${surface} shadow-xl p-6 relative`}>
            <button
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-500 hover:bg-rose-100 transition-colors"
            >
              <X size={15} className="stroke-[2.5]" />
            </button>

            <h2 className={`text-base font-bold ${textPrimary} mb-4`}>
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
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                        : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
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
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
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
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
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
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
                  }`}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#55a060] hover:bg-[#46894f] py-2.5 text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-md rounded-2xl border ${borderCol} ${surface} shadow-xl p-6 relative`}>
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-500 hover:bg-rose-100 transition-colors"
            >
              <X size={15} className="stroke-[2.5]" />
            </button>

            <h2 className={`text-base font-bold ${textPrimary} mb-4`}>
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
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
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
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
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
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                        : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
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
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                        : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Full Width Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#46894f] py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-md rounded-2xl border ${borderCol} ${surface} shadow-xl p-6 relative`}>
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-500 hover:bg-rose-100 transition-colors"
            >
              <X size={15} className="stroke-[2.5]" />
            </button>

            <h2 className={`text-base font-bold ${textPrimary} mb-4`}>
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
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
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
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
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
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                        : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
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
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                        : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#55a060] hover:bg-[#46894f] py-2.5 text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-md rounded-2xl border ${borderCol} ${surface} shadow-xl p-6 relative`}>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={15} className="stroke-[2.5]" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 shrink-0">
                <AlertTriangle size={22} className="stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <h2 className={`text-base font-bold ${textPrimary} mb-1`}>
                  Delete Item
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete this item? This action is irreversible.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className={`rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 px-5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={submitting}
                className="rounded-xl bg-[#e52e2e] hover:bg-red-700 px-5 py-2 text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
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

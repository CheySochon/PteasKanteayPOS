"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "../../../components/TopBar";
import {
  request,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrderStock,
  getCategories,
} from "../../../lib/api";
import { useAppTheme } from "../../../lib/theme";
import { resolveCategoryName } from "../../../lib/language";
import { getSocket } from "../../../lib/socket";
import AnimatedToast from "../../../components/AnimatedToast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  Download,
  Truck,
  FileText,
  CheckCircle,
  ShoppingBag,
  RotateCw,
  ChevronDown,
} from "lucide-react";

type InventoryItem = {
  id: number;
  name: string;
  unit: string;
  trackStock: boolean;
  basePrice: number;
  categoryId: number;
  category: { id: number; name: string };
  supplierId?: number | null;
  supplier?: { id: number; name: string } | null;
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
  previousQty?: number;
  balanceQty?: number;
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

type SupplierItem = {
  id: number;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt?: string;
};

type PurchaseOrderItem = {
  id: number;
  productId: number;
  quantity: string | number;
  unitCost: string | number;
  totalCost: string | number;
  product: {
    id: number;
    name: string;
    unit: string;
  };
};

type PurchaseOrder = {
  id: number;
  poNumber: string;
  supplierId: number;
  status: "draft" | "ordered" | "received" | "cancelled";
  orderDate: string;
  expectedDeliveryDate?: string | null;
  totalAmount: string | number;
  notes?: string | null;
  supplier: SupplierItem;
  items: PurchaseOrderItem[];
};

const TEXT = {
  en: {
    title: "Inventory Stock",
    dashboard: "Dashboard",
    searchPlaceholder: "Search items...",
    addStockBtn: "Add Stock Items",
    movementsBtn: "Stock Movements",
    suppliersBtn: "Suppliers",
    poBtn: "Purchase Orders",
    exportCsv: "Export CSV",
    allCategories: "All Categories",
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
    suppliersBtn: "អ្នកផ្គត់ផ្គង់",
    poBtn: "ប័ណ្ណបញ្ជាទិញ (PO)",
    exportCsv: "ទាញយក CSV",
    allCategories: "ប្រភេទទំនិញទាំងអស់",
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

function formatStockQuantity(value: number | string): string {
  const num = Number(value || 0);
  if (isNaN(num)) return "0";
  return Number.isInteger(num) ? num.toString() : Number(num.toFixed(2)).toString();
}

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
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // UI State
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const typeParam = searchParams.get("type");
  const [activeTab, setActiveTab] = useState<"dashboard" | "movements" | "suppliers" | "po">(
    tabParam === "suppliers" || tabParam === "movements" || tabParam === "po" ? (tabParam as any) : "dashboard"
  );
  const [filterType, setFilterType] = useState<"all" | "available" | "low" | "out" | "tracked">("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>(typeParam || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [trackStockOnly, setTrackStockOnly] = useState<boolean>(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [supplierActionMenuOpen, setSupplierActionMenuOpen] = useState<number | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    function syncTabFromQuery() {
      const currentTab = new URLSearchParams(window.location.search).get("tab") || tabParam;
      if (currentTab === "suppliers") {
        setActiveTab("suppliers");
      } else if (currentTab === "movements") {
        setActiveTab("movements");
      } else if (currentTab === "po") {
        setActiveTab("po");
      } else if (currentTab === "dashboard") {
        setActiveTab("dashboard");
      }
    }

    syncTabFromQuery();

    function handleViewChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail === "supplier" || detail === "suppliers") setActiveTab("suppliers");
      else if (detail === "history" || detail === "movements") setActiveTab("movements");
      else if (detail === "po") setActiveTab("po");
      else if (detail === "inventory" || detail === "dashboard") setActiveTab("dashboard");
    }

    window.addEventListener("pos-inventory-view-change", handleViewChange);
    window.addEventListener("popstate", syncTabFromQuery);

    return () => {
      window.removeEventListener("pos-inventory-view-change", handleViewChange);
      window.removeEventListener("popstate", syncTabFromQuery);
    };
  }, [tabParam, typeParam]);

  // Modals State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  // Supplier Form
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierCompany, setSupplierCompany] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");

  const openAddSupplierModal = () => {
    setEditingSupplier(null);
    setSupplierName("");
    setSupplierCompany("");
    setSupplierPhone("");
    setSupplierEmail("");
    setSupplierAddress("");
    setIsSupplierModalOpen(true);
  };

  const openEditSupplierModal = (s: SupplierItem) => {
    setEditingSupplier(s);
    setSupplierName(s.name || "");
    setSupplierCompany(s.companyName || "");
    setSupplierPhone(s.phone || "");
    setSupplierEmail(s.email || "");
    setSupplierAddress(s.address || "");
    setIsSupplierModalOpen(true);
  };

  // PO Form
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poItems, setPoItems] = useState<Array<{ productId: number; quantity: number; unitCost: number }>>([]);

  // Form Fields
  const [addName, setAddName] = useState("");
  const [addUnit, setAddUnit] = useState("pc");
  const [addQuantity, setAddQuantity] = useState("");
  const [addMinStock, setAddMinStock] = useState("");
  const [addSupplierId, setAddSupplierId] = useState("");
  const [addCategoryId, setAddCategoryId] = useState("");

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
  const [settingsSupplierId, setSettingsSupplierId] = useState("");
  const [settingsCategoryId, setSettingsCategoryId] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const [deleteProductName, setDeleteProductName] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Fetch initial data
  const fetchData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [invData, movementsData, suppliersData, poData, categoriesData] = await Promise.all([
        request<InventoryItem[]>("/inventory"),
        request<StockMovement[]>("/inventory/transactions"),
        getSuppliers(),
        getPurchaseOrders(),
        getCategories(),
      ]);

      setProducts(invData || []);
      setMovements(movementsData || []);
      setSuppliers(suppliersData || []);
      setPurchaseOrders(poData || []);
      setCategories(categoriesData || []);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to load inventory data");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const handleSocketRefresh = () => fetchData(false);

    const socket = getSocket();
    if (socket) {
      socket.on("inventory:updated", handleSocketRefresh);
      socket.on("stock:adjusted", handleSocketRefresh);
      socket.on("stock:movement", handleSocketRefresh);
      socket.on("order:new", handleSocketRefresh);
      socket.on("order:created", handleSocketRefresh);
      socket.on("order:updated", handleSocketRefresh);
    }

    return () => {
      if (socket) {
        socket.off("inventory:updated", handleSocketRefresh);
        socket.off("stock:adjusted", handleSocketRefresh);
        socket.off("stock:movement", handleSocketRefresh);
        socket.off("order:new", handleSocketRefresh);
        socket.off("order:created", handleSocketRefresh);
        socket.off("order:updated", handleSocketRefresh);
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
    const handleClose = () => {
      setActionMenuOpen(null);
      setSupplierActionMenuOpen(null);
    };
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

  const trackedProducts = useMemo(() => {
    return products;
  }, [products]);

  // Metrics Count
  const metrics = useMemo(() => {
    const total = trackedProducts.length;
    let available = 0;
    let low = 0;
    let out = 0;

    trackedProducts.forEach((p) => {
      const status = getProductStockStatus(p);
      if (status === "available") available++;
      else if (status === "low") low++;
      else if (status === "out") out++;
    });

    return { total, available, low, out };
  }, [trackedProducts]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return trackedProducts.filter((p) => {
      // Search Filter
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Category Filter
      if (selectedCategory !== "all" && String(p.categoryId) !== String(selectedCategory)) {
        return false;
      }

      // Supplier Filter
      if (selectedSupplier !== "all" && String(p.supplierId) !== String(selectedSupplier)) {
        return false;
      }

      // Metric Card & Stock Status Filter
      const status = getProductStockStatus(p);
      if (filterType === "available" && status !== "available") return false;
      if (filterType === "low" && status !== "low") return false;
      if (filterType === "out" && status !== "out") return false;
      if (filterType === "tracked" && !p.trackStock) return false;

      return true;
    });
  }, [trackedProducts, filterType, searchQuery, selectedCategory, selectedSupplier]);

  // Movements enriched with calculated Previous Qty and Balance Qty audit ledger
  const movementsWithAudit = useMemo(() => {
    const productCurrentQtyMap: Record<number, number> = {};
    products.forEach((p) => {
      productCurrentQtyMap[p.id] = Number(p.inventory?.quantity ?? 0);
    });

    const productMovementsMap: Record<number, number[]> = {};
    movements.forEach((m, idx) => {
      const pid = m.productId;
      if (!productMovementsMap[pid]) productMovementsMap[pid] = [];
      productMovementsMap[pid].push(idx);
    });

    const enriched = movements.map((m) => ({ ...m, previousQty: 0, balanceQty: 0 }));

    Object.keys(productMovementsMap).forEach((pidStr) => {
      const pid = Number(pidStr);
      let runningQty = productCurrentQtyMap[pid] ?? 0;
      const indices = productMovementsMap[pid];

      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        const changeQty = Number(movements[idx].quantity || 0);
        const balanceQty = runningQty;
        const previousQty = balanceQty - changeQty;

        enriched[idx].balanceQty = balanceQty;
        enriched[idx].previousQty = previousQty;

        runningQty = previousQty;
      }
    });

    return enriched;
  }, [movements, products]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    return movementsWithAudit.filter((m) => {
      if (movementTypeFilter !== "all" && m.type !== movementTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const prodName = m.product?.name?.toLowerCase() || "";
        const notes = m.notes?.toLowerCase() || "";
        const userName = m.user?.name?.toLowerCase() || m.user?.email?.toLowerCase() || "";
        const refId = m.referenceId?.toLowerCase() || "";
        if (!prodName.includes(q) && !notes.includes(q) && !userName.includes(q) && !refId.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [movementsWithAudit, movementTypeFilter, searchQuery]);

  // Movement Stats Summary
  const movementStats = useMemo(() => {
    let totalRestock = 0;
    let totalSale = 0;
    let totalDamage = 0;
    let totalAdjustment = 0;

    movements.forEach((m) => {
      const q = Math.abs(Number(m.quantity || 0));
      if (m.type === "restock") totalRestock += q;
      else if (m.type === "sale") totalSale += q;
      else if (m.type === "damage" || m.type === "expired") totalDamage += q;
      else totalAdjustment += q;
    });

    return {
      count: movements.length,
      totalRestock,
      totalSale,
      totalDamage,
      totalAdjustment,
    };
  }, [movements]);

  // Export CSV Function (with UTF-8 BOM for Excel)
  const exportToCsv = () => {
    if (activeTab === "dashboard") {
      const headers = ["Item ID", "Item Name", "Category", "Current Stock", "Unit", "Min Stock", "Stock Status", "Last Updated"];
      const rows = filteredProducts.map((p) => [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.category?.name || "Uncategorized").replace(/"/g, '""')}"`,
        p.trackStock ? Number(p.inventory?.quantity ?? 0) : "Unlimited",
        p.unit || "pc",
        p.trackStock ? Number(p.inventory?.minStock ?? 0) : "-",
        getProductStockStatus(p).toUpperCase(),
        `"${p.inventory?.updatedAt ? formatDate(p.inventory.updatedAt) : formatDate(p.updatedAt)}"`,
      ]);
      const csvString = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `inventory_stock_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (activeTab === "movements") {
      const headers = ["#", "Item Name", "Type", "Previous Qty", "Change Qty", "Balance Qty", "Unit", "Date & Time", "Remarks", "Updated By"];
      const rows = filteredMovements.map((m, idx) => {
        const remarksText = m.referenceId && m.notes ? `${m.referenceId} (${m.notes})` : m.referenceId || m.notes || "-";
        const typeLabel = m.type === "restock" ? "RESTOCK" : m.type === "sale" ? "POS SALE" : m.type === "return" ? "RETURN / VOID" : "ADJUSTMENT";
        const changeStr = Number(m.quantity) > 0 ? `+${Math.abs(Number(m.quantity))}` : `-${Math.abs(Number(m.quantity))}`;
        return [
          idx + 1,
          `"${(m.product?.name || "Deleted Product").replace(/"/g, '""')}"`,
          typeLabel,
          m.previousQty ?? 0,
          `"${changeStr}"`,
          m.balanceQty ?? 0,
          m.product?.unit || "pc",
          `"${formatDate(m.createdAt)}"`,
          `"${remarksText.replace(/"/g, '""')}"`,
          `"${(m.user?.email || m.user?.name || "System").replace(/"/g, '""')}"`,
        ];
      });
      const csvString = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `stock_movements_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Export PDF Report Function
  const exportToPdf = () => {
    const doc = new jsPDF();
    const nowStr = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (activeTab === "dashboard") {
      // Document Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("INVENTORY STOCK REPORT", 14, 18);

      // Report Meta
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated: ${nowStr}   |   Total Items: ${metrics.total}   |   In Stock: ${metrics.available}   |   Low Stock: ${metrics.low}   |   Out of Stock: ${metrics.out}`,
        14,
        25
      );

      const tableRows = filteredProducts.map((p, idx) => [
        String(idx + 1),
        p.name || "Unnamed Item",
        p.category?.name || "Uncategorized",
        p.trackStock ? String(p.inventory?.quantity ?? 0) : "Unlimited",
        p.unit || "pc",
        p.trackStock ? String(p.inventory?.minStock ?? 0) : "-",
        getProductStockStatus(p).toUpperCase(),
        p.inventory?.updatedAt ? formatDate(p.inventory.updatedAt) : formatDate(p.updatedAt),
      ]);

      autoTable(doc, {
        startY: 30,
        head: [["#", "Item Name", "Category", "Current Stock", "Unit", "Min Stock", "Stock Status", "Last Updated"]],
        body: tableRows.length
          ? tableRows
          : [["-", "No inventory items found", "-", "-", "-", "-", "-", "-"]],
        theme: "grid",
        headStyles: {
          fillColor: [85, 160, 96],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [51, 65, 85],
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { fontStyle: "bold" },
          3: { halign: "right", fontStyle: "bold" },
          4: { halign: "center" },
          5: { halign: "right" },
          6: { halign: "center" },
          7: { halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 6) {
            const val = String(data.cell.raw);
            if (val.includes("OUT OF STOCK")) {
              data.cell.styles.textColor = [239, 68, 68];
              data.cell.styles.fontStyle = "bold";
            } else if (val.includes("LOW STOCK")) {
              data.cell.styles.textColor = [245, 158, 11];
              data.cell.styles.fontStyle = "bold";
            } else if (val.includes("IN STOCK")) {
              data.cell.styles.textColor = [34, 197, 94];
            }
          }
        },
      });

      doc.save(`inventory_stock_report_${new Date().toISOString().substring(0, 10)}.pdf`);
    } else if (activeTab === "movements") {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("STOCK MOVEMENTS AUDIT REPORT", 14, 18);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${nowStr}   |   Total Movement Logs: ${filteredMovements.length}`, 14, 25);

      const tableRows = filteredMovements.map((m, idx) => {
        const remarksText = m.referenceId && m.notes ? `${m.referenceId} (${m.notes})` : m.referenceId || m.notes || "-";
        const typeLabel = m.type === "restock" ? "RESTOCK" : m.type === "sale" ? "POS SALE" : m.type === "return" ? "RETURN / VOID" : "ADJUSTMENT";
        const changeStr = Number(m.quantity) > 0 ? `+${Math.abs(Number(m.quantity))}` : `-${Math.abs(Number(m.quantity))}`;
        return [
          String(idx + 1),
          m.product?.name || "Deleted Product",
          typeLabel,
          `${m.previousQty ?? 0} ${m.product?.unit || "pc"}`,
          `${changeStr} ${m.product?.unit || "pc"}`,
          `${m.balanceQty ?? 0} ${m.product?.unit || "pc"}`,
          formatDate(m.createdAt),
          remarksText,
          m.user?.email || m.user?.name || "System",
        ];
      });

      autoTable(doc, {
        startY: 30,
        head: [["#", "Item Name", "Type", "Previous Qty", "Change Qty", "Balance Qty", "Date & Time", "Remarks", "Updated By"]],
        body: tableRows.length
          ? tableRows
          : [["-", "No stock movement logs found", "-", "-", "-", "-", "-", "-", "-"]],
        theme: "grid",
        headStyles: {
          fillColor: [85, 160, 96],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85],
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 8 },
          1: { fontStyle: "bold" },
          2: { halign: "center" },
          3: { halign: "right" },
          4: { halign: "right", fontStyle: "bold" },
          5: { halign: "right", fontStyle: "bold" },
          6: { halign: "center" },
        },
      });

      doc.save(`stock_movements_log_${new Date().toISOString().substring(0, 10)}.pdf`);
    }
  };

  // Handle Form Submissions
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProductId) return;

    setSubmitting(true);
    setError("");

    const originalQty = Math.abs(Number(adjQty));
    const finalQty = adjType === "IN" ? originalQty : -originalQty;
    const dbType = adjType === "IN" ? "restock" : "adjustment";

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

  // Supplier Handlers
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: supplierName.trim(),
        companyName: supplierCompany.trim() || undefined,
        phone: supplierPhone.trim() || undefined,
        email: supplierEmail.trim() || undefined,
        address: supplierAddress.trim() || undefined,
      };

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload);
        setSuccessMessage(language === "km" ? "បានធ្វើបច្ចុប្បន្នភាពអ្នកផ្គត់ផ្គង់ដោយជោគជ័យ" : "Supplier updated successfully");
      } else {
        await createSupplier(payload);
        setSuccessMessage(language === "km" ? "បានបង្កើតអ្នកផ្គត់ផ្គង់ដោយជោគជ័យ" : "Supplier created successfully");
      }

      setIsSupplierModalOpen(false);
      setEditingSupplier(null);
      setSupplierName("");
      setSupplierCompany("");
      setSupplierPhone("");
      setSupplierEmail("");
      setSupplierAddress("");
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to save supplier");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this supplier?")) return;
    try {
      await deleteSupplier(id);
      setSuccessMessage("Supplier removed successfully");
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete supplier");
    }
  };

  // PO Handlers
  const handlePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId || poItems.length === 0) return;

    setSubmitting(true);
    setError("");

    try {
      await createPurchaseOrder({
        supplierId: Number(poSupplierId),
        notes: poNotes.trim() || undefined,
        items: poItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      });

      setSuccessMessage("Purchase Order created successfully");
      setIsPoModalOpen(false);
      setPoSupplierId("");
      setPoNotes("");
      setPoItems([]);
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to create purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceivePoStock = async (poId: number) => {
    setSubmitting(true);
    setError("");

    try {
      await receivePurchaseOrderStock(poId);
      setSuccessMessage("Stock received and updated in inventory successfully!");
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to receive stock");
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
          supplierId: addSupplierId ? Number(addSupplierId) : null,
          categoryId: addCategoryId ? Number(addCategoryId) : null,
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
      setAddSupplierId("");
      setAddCategoryId("");
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
          supplierId: settingsSupplierId ? Number(settingsSupplierId) : null,
          categoryId: settingsCategoryId ? Number(settingsCategoryId) : null,
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

    const rawSupplierId = product.supplierId ?? product.supplier?.id;
    setSettingsSupplierId(rawSupplierId ? String(rawSupplierId) : "");

    let resolvedCatId = product.categoryId ?? product.category?.id;
    if (!resolvedCatId || product.category?.name?.toLowerCase() === "inventory") {
      const drinkCat = categories.find(
        (c: any) =>
          c.name?.toLowerCase() === "drink" ||
          c.name?.toLowerCase() === "beverages" ||
          c.name?.toLowerCase() === "beverage"
      );
      if (drinkCat) {
        resolvedCatId = drinkCat.id;
      }
    }
    setSettingsCategoryId(resolvedCatId ? String(resolvedCatId) : "");
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
  const bgMain = dark ? "bg-[#232333]" : "bg-[#f8faf9]";
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


      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
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
            <h1 className={`text-2xl font-bold ${dark ? "text-slate-100" : "text-slate-800"}`}>
              {activeTab === "suppliers"
                ? (language === "km" ? "អ្នកផ្គត់ផ្គង់" : "Suppliers")
                : activeTab === "movements"
                ? "Stock Movement History"
                : activeTab === "po"
                ? "Purchase Orders (PO)"
                : "Inventory Stock"}
            </h1>
            <span className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              dark ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300" : "bg-slate-100 text-slate-500"
            }`}>
              <LayoutGrid size={13} />
              {activeTab === "suppliers"
                ? "Suppliers"
                : activeTab === "movements"
                ? "Stock History"
                : activeTab === "po"
                ? "Purchase Orders"
                : "Dashboard"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(activeTab === "dashboard" || activeTab === "movements") && (
              <div className="relative min-w-[200px]">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "movements"
                      ? language === "km"
                        ? "ស្វែងរកឈ្មោះ ឬលេខ Order..."
                        : "Search item, order #..."
                      : t.searchPlaceholder
                  }
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

            {activeTab === "dashboard" && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all cursor-pointer ${
                  dark
                    ? "border-[#3b3c54] bg-[#2b2c40] text-slate-100"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <option value="all">{language === "km" ? "ទំនិញទាំងអស់ (All Items)" : "All Items"}</option>
                <option value="available">{language === "km" ? "មានក្នុងស្តុក (In Stock)" : "Available / In Stock"}</option>
                <option value="low">{language === "km" ? "ស្តុកជិតអស់ (Low Stock)" : "Low Stock"}</option>
                <option value="out">{language === "km" ? "អស់ពីស្តុក (Out of Stock)" : "Out of Stock"}</option>
              </select>
            )}

            {activeTab === "movements" && (
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all cursor-pointer ${
                  dark
                    ? "border-[#3b3c54] bg-[#2b2c40] text-slate-100"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <option value="all">{language === "km" ? "ប្រភេទទាំងអស់ (All Movement Types)" : "All Movement Types"}</option>
                <option value="restock">{language === "km" ? "អែតស្តុក (RESTOCK)" : "Restock (RESTOCK)"}</option>
                <option value="sale">{language === "km" ? "លក់តាម POS (POS SALE)" : "POS Sale (POS SALE)"}</option>
                <option value="return">{language === "km" ? "សងស្តុក/រំលាយ (RETURN / VOID)" : "Return / Void (RETURN / VOID)"}</option>
                <option value="adjustment">{language === "km" ? "កែសម្រួល (ADJUSTMENT)" : "Adjustment (ADJUSTMENT)"}</option>
              </select>
            )}

            {(activeTab === "dashboard" || activeTab === "movements") && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-3.5 py-2 text-xs font-semibold transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer"
                >
                  <Download size={14} />
                  <span>{language === "km" ? "ទាញយកទិន្នន័យ (Export)" : "Export"}</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${isExportMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isExportMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsExportMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 z-30 w-52 rounded-xl border border-slate-200 dark:border-[#4e4f6e] bg-white dark:bg-[#2b2c40] p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          exportToCsv();
                          setIsExportMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#383a56] transition-all cursor-pointer"
                      >
                        <FileSpreadsheet size={15} className="text-emerald-500" />
                        <span>Excel / CSV (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportToPdf();
                          setIsExportMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#383a56] transition-all cursor-pointer"
                      >
                        <FileText size={15} className="text-rose-500" />
                        <span>PDF Report (.pdf)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Action Trigger Buttons */}
            {activeTab === "dashboard" && (
              <button
                onClick={() => {
                  setAddName("");
                  setAddUnit("pc");
                  setAddQuantity("");
                  setAddMinStock("");
                  setAddSupplierId("");
                  const drinkCat = categories.find((c) =>
                    (c.name && c.name.toLowerCase().includes("drink")) ||
                    (c.nameKm && c.nameKm.includes("ភេសជ្ជៈ")) ||
                    c.slug === "drink"
                  );
                  setAddCategoryId(drinkCat ? String(drinkCat.id) : "");
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#488c52] text-white px-4 py-2 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                {t.addStockBtn}
              </button>
            )}

            {activeTab === "suppliers" && (
              <button
                onClick={openAddSupplierModal}
                className="flex items-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#488c52] text-white px-4 py-2 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>{language === "km" ? "បន្ថែមអ្នកផ្គត់ផ្គង់" : "Add Supplier"}</span>
              </button>
            )}

            {activeTab === "po" && (
              <button
                onClick={() => {
                  setPoSupplierId(suppliers.length > 0 ? String(suppliers[0].id) : "");
                  setPoNotes("");
                  setPoItems([]);
                  setIsPoModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#488c52] text-white px-4 py-2 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>{language === "km" ? "បង្កើតប័ណ្ណបញ្ជាទិញ (PO)" : "Create Purchase Order"}</span>
              </button>
            )}
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
              <div className={`mt-6 overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54]" : "border-slate-200/80"} ${surface}`}>
                <div className="overflow-auto max-h-[720px] min-h-[480px] pb-32 no-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
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
                          const isBottomRow = idx > 1 && idx >= filteredProducts.length - 2;

                          return (
                            <tr key={p.id} className={`transition-colors ${dark ? "hover:bg-[#34354c]/40 text-slate-200" : "hover:bg-slate-50/50 text-slate-700"}`}>
                              <td className={`px-6 py-3 text-xs font-bold ${dark ? "text-slate-400" : "text-slate-400"}`}>
                                {products.length - idx}
                              </td>
                              <td className="px-6 py-3">
                                <div className={`font-semibold text-xs ${dark ? "text-slate-100" : "text-slate-800"}`}>
                                  {p.name}
                                </div>
                                {p.supplier?.name && (
                                  <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                    <Truck size={10} />
                                    <span>{p.supplier.name}</span>
                                  </div>
                                )}
                              </td>
                              <td className={`px-6 py-3 text-xs font-medium ${dark ? "text-slate-200" : "text-slate-600"}`}>
                                {p.trackStock ? (
                                  <span>
                                    {formatStockQuantity(qty)} {p.unit}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">Unlimited</span>
                                )}
                              </td>
                              <td className={`px-6 py-3 text-xs font-medium ${dark ? "text-slate-200" : "text-slate-600"}`}>
                                {p.trackStock ? (
                                  <span>
                                    {formatStockQuantity(min)} {p.unit}
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
            ) : activeTab === "movements" ? (
              /* Stock Movements Log Table */
              <div className={`mt-6 overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54]" : "border-slate-200/80"} ${surface}`}>
                <div className="overflow-auto max-h-[720px] min-h-[480px] pb-10 no-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${dark ? "bg-[#2b2c40] border-[#3b3c54] text-slate-300" : "bg-[#f8f9fa] border-slate-100 text-slate-500"}`}>
                        <th className="px-4 py-3.5 text-left whitespace-nowrap">#</th>
                        <th className="px-4 py-3.5 text-left whitespace-nowrap">ITEM</th>
                        <th className="px-4 py-3.5 text-left whitespace-nowrap">TYPE</th>
                        <th className="px-4 py-3.5 text-right whitespace-nowrap">PREVIOUS QTY</th>
                        <th className="px-4 py-3.5 text-right whitespace-nowrap">CHANGE QTY</th>
                        <th className="px-4 py-3.5 text-right whitespace-nowrap">BALANCE QTY</th>
                        <th className="px-4 py-3.5 text-left whitespace-nowrap">DATE &amp; TIME</th>
                        <th className="px-4 py-3.5 text-left whitespace-nowrap">REMARKS / REASON</th>
                        <th className="px-4 py-3.5 text-left whitespace-nowrap">UPDATED BY</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${dark ? "divide-[#3b3c54]" : "divide-slate-100"}`}>
                      {filteredMovements.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-xs font-medium text-slate-400">
                            {searchQuery || movementTypeFilter !== "all"
                              ? "No stock movement logs match your filter."
                              : t.noMovements}
                          </td>
                        </tr>
                      ) : (
                        filteredMovements.map((move, idx) => {
                          const quantityVal = Number(move.quantity);
                          const isPositive = quantityVal > 0;
                          const moveType = move.type || (isPositive ? "restock" : "adjustment");
                          const isDeleted = move.notes?.toLowerCase().includes("delete");
                          const isCancelled = move.notes?.toLowerCase().includes("cancel");

                          return (
                            <tr key={move.id} className={`transition-colors ${dark ? "hover:bg-[#34354c]/40 text-slate-200" : "hover:bg-slate-50/50 text-slate-700"}`}>
                              <td className={`px-4 py-3.5 text-xs font-bold ${dark ? "text-slate-400" : "text-slate-400"}`}>
                                {filteredMovements.length - idx}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className={`font-semibold text-xs ${dark ? "text-slate-100" : "text-slate-800"}`}>
                                  {move.product?.name || "Deleted Product"}
                                </div>
                                <span className={`text-[10px] font-medium ${dark ? "text-slate-300" : "text-slate-400"}`}>Unit: {move.product?.unit || "pc"}</span>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                {moveType === "restock" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    <Plus size={11} className="stroke-[2.5]" /> RESTOCK
                                  </span>
                                ) : moveType === "sale" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    <ShoppingBag size={11} className="stroke-[2.2]" /> POS SALE
                                  </span>
                                ) : moveType === "return" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    <RotateCw size={11} className="stroke-[2.2]" /> RETURN / VOID
                                  </span>
                                ) : moveType === "damage" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    <AlertTriangle size={11} className="stroke-[2.2]" /> SPOILAGE
                                  </span>
                                ) : moveType === "expired" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    <Clock size={11} className="stroke-[2.2]" /> EXPIRED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    <RotateCw size={11} className="stroke-[2.2]" /> ADJUSTMENT
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <span className={`text-xs font-semibold ${dark ? "text-slate-300" : "text-slate-600"}`}>
                                  {formatStockQuantity(move.previousQty ?? 0)}
                                </span>{" "}
                                <span className={`text-[10px] font-medium ${dark ? "text-slate-300" : "text-slate-400"}`}>{move.product?.unit}</span>
                              </td>
                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <span className={`font-black text-xs ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                                  {isPositive ? `+${formatStockQuantity(Math.abs(quantityVal))}` : `-${formatStockQuantity(Math.abs(quantityVal))}`}
                                </span>{" "}
                                <span className={`text-[10px] font-medium ${dark ? "text-slate-300" : "text-slate-400"}`}>{move.product?.unit}</span>
                              </td>
                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <span className={`text-xs font-bold ${dark ? "text-slate-200" : "text-slate-800"}`}>
                                  {formatStockQuantity(move.balanceQty ?? 0)}
                                </span>{" "}
                                <span className={`text-[10px] font-medium ${dark ? "text-slate-400" : "text-slate-400"}`}>{move.product?.unit || "pc"}</span>
                              </td>
                              <td className={`px-4 py-3.5 text-[11px] font-semibold whitespace-nowrap ${dark ? "text-slate-200" : "text-slate-600"}`}>
                                {formatDate(move.createdAt)}
                              </td>
                              <td className={`px-4 py-3.5 text-xs font-medium whitespace-nowrap ${dark ? "text-slate-200" : "text-slate-600"}`}>
                                <div className="flex items-center gap-1.5">
                                  {move.referenceId && (
                                    <span className={`font-mono text-[11px] px-2 py-0.5 rounded-md font-medium shrink-0 ${
                                      dark
                                        ? "bg-[#34354c] text-slate-300 border border-[#434460]"
                                        : "bg-slate-100/90 text-slate-600 border border-slate-200/80"
                                    }`}>
                                      {move.referenceId}
                                    </span>
                                  )}
                                  {move.notes && (
                                    <span className={`text-xs max-w-[240px] truncate ${
                                      isDeleted
                                        ? "text-rose-600 dark:text-rose-400 font-semibold"
                                        : isCancelled
                                        ? "text-amber-600 dark:text-amber-400 font-semibold"
                                        : dark ? "text-slate-300 font-normal" : "text-slate-500 font-normal"
                                    }`}>
                                      {isDeleted ? "• Order deleted" : isCancelled ? "• Order cancelled" : move.notes}
                                    </span>
                                  )}
                                  {!move.referenceId && !move.notes && <span className="text-slate-400">-</span>}
                                </div>
                              </td>
                              <td className={`px-4 py-3.5 text-xs font-semibold whitespace-nowrap ${dark ? "text-slate-100" : "text-slate-700"}`}>
                                {move.user?.name || move.user?.email || (
                                  <span className={`font-normal ${dark ? "text-slate-400" : "text-slate-400"}`}>System</span>
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
            ) : activeTab === "suppliers" ? (
              /* Suppliers Table */
              <div className={`overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54]" : "border-slate-200/80"} ${surface}`}>
                <div className="overflow-auto max-h-[540px] min-h-[300px] pb-36 no-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${dark ? "bg-[#2b2c40] border-[#3b3c54] text-slate-300" : "bg-[#f8f9fa] border-slate-100 text-slate-500"}`}>
                        <th className="px-6 py-3">#</th>
                        <th className="px-6 py-3">Supplier Name</th>
                        <th className="px-6 py-3">Company</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Address</th>
                        <th className="px-6 py-3 text-center min-w-[120px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${dark ? "divide-[#3b3c54]" : "divide-slate-100"}`}>
                      {suppliers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-xs font-medium text-slate-400">
                            No suppliers registered yet. Click "+ Add Supplier" to add one.
                          </td>
                        </tr>
                      ) : (
                        suppliers.map((s, idx) => {
                          const isBottomRow = idx > 1 && idx >= suppliers.length - 2;

                          return (
                            <tr key={s.id} className={`transition-colors ${dark ? "hover:bg-[#34354c]/40 text-slate-200" : "hover:bg-slate-50/50 text-slate-700"}`}>
                              <td className={`px-6 py-3 text-xs font-bold ${dark ? "text-slate-400" : "text-slate-400"}`}>{idx + 1}</td>
                              <td className={`px-6 py-3 text-xs font-bold ${dark ? "text-slate-100" : "text-slate-800"}`}>{s.name}</td>
                              <td className={`px-6 py-3 text-xs font-medium ${dark ? "text-slate-200" : "text-slate-600"}`}>{s.companyName || "-"}</td>
                              <td className={`px-6 py-3 text-xs font-mono font-semibold ${dark ? "text-slate-200" : "text-slate-600"}`}>{s.phone || "-"}</td>
                              <td className={`px-6 py-3 text-xs font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>{s.email || "-"}</td>
                              <td className={`px-6 py-3 text-xs font-medium max-w-xs truncate ${dark ? "text-slate-300" : "text-slate-500"}`}>{s.address || "-"}</td>
                              <td className="px-6 py-3 text-center min-w-[120px] whitespace-nowrap relative">
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSupplierActionMenuOpen(supplierActionMenuOpen === s.id ? null : s.id);
                                    }}
                                    className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                                      dark ? "text-slate-400 hover:bg-[#34354c] hover:text-slate-200" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                    }`}
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {supplierActionMenuOpen === s.id && (
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
                                          setSupplierActionMenuOpen(null);
                                          setPoSupplierId(String(s.id));
                                          setPoNotes("");
                                          setPoItems([]);
                                          setIsPoModalOpen(true);
                                        }}
                                        className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                                          dark ? "text-slate-200 hover:bg-[#34354e]" : "text-slate-600 hover:bg-slate-50"
                                        }`}
                                      >
                                        <Plus size={14} className="text-slate-400 stroke-[2.5]" />
                                        {language === "km" ? "បង្កើតប័ណ្ណ PO" : "Create PO"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSupplierActionMenuOpen(null);
                                          openEditSupplierModal(s);
                                        }}
                                        className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                                          dark ? "text-slate-200 hover:bg-[#34354e]" : "text-slate-600 hover:bg-slate-50"
                                        }`}
                                      >
                                        <Pencil size={12} className="text-slate-400" />
                                        {language === "km" ? "កែប្រែអ្នកផ្គត់ផ្គង់" : "Update Supplier"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSupplierActionMenuOpen(null);
                                          handleDeleteSupplier(s.id);
                                        }}
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                                      >
                                        <Trash2 size={13} className="text-red-400" />
                                        {language === "km" ? "លុបអ្នកផ្គត់ផ្គង់" : "Delete Supplier"}
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
              /* Purchase Orders (PO) Table */
              <div className={`overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54]" : "border-slate-200/80"} ${surface}`}>
                <div className="overflow-auto max-h-[540px] no-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${dark ? "bg-[#2b2c40] border-[#3b3c54] text-slate-400" : "bg-[#f8f9fa] border-slate-100 text-slate-500"}`}>
                        <th className="px-6 py-3">PO Number</th>
                        <th className="px-6 py-3">Supplier</th>
                        <th className="px-6 py-3">Order Date</th>
                        <th className="px-6 py-3">Items Count</th>
                        <th className="px-6 py-3">Total Amount</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${dark ? "divide-[#3b3c54]" : "divide-slate-100"}`}>
                      {purchaseOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-xs font-medium text-slate-400">
                            No Purchase Orders created yet. Click "+ Create Purchase Order" to create one.
                          </td>
                        </tr>
                      ) : (
                        purchaseOrders.map((po) => {
                          const isReceived = po.status === "received";
                          return (
                            <tr key={po.id} className={`transition-colors ${dark ? "hover:bg-[#34354c]/40 text-slate-200" : "hover:bg-slate-50/50 text-slate-700"}`}>
                              <td className="px-6 py-3 font-bold text-xs font-mono text-slate-800 dark:text-slate-100">{po.poNumber}</td>
                              <td className="px-6 py-3 font-semibold text-xs text-slate-700 dark:text-slate-300">{po.supplier?.name || "Unknown"}</td>
                              <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(po.orderDate)}</td>
                              <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-300 font-semibold">{po.items?.length || 0} items</td>
                              <td className="px-6 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">${Number(po.totalAmount || 0).toFixed(2)}</td>
                              <td className="px-6 py-3">
                                {isReceived ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle size={12} />
                                    Received
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-lg bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                    Ordered
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3 text-center">
                                {!isReceived && (
                                  <button
                                    type="button"
                                    onClick={() => handleReceivePoStock(po.id)}
                                    disabled={submitting}
                                    className="px-3 py-1 rounded-lg bg-[#55a060] hover:bg-[#488c52] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                  >
                                    {submitting ? "Processing..." : "Receive Stock (ទទួលស្តុកចូល)"}
                                  </button>
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
              {/* Item Name (ឈ្មោះទំនិញ) */}
              <div>
                <label className={`block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ឈ្មោះទំនិញ (Item Name) *" : "Item Name *"}
                </label>
                <input
                  type="text"
                  placeholder={language === "km" ? "ឧ. Coca-Cola, Sprite, Angkor Beer, Vital Water..." : "e.g. Coca-Cola, Sprite, Angkor Beer..."}
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

              {/* Category Dropdown (ប្រភេទទំនិញ - Default: Drink) */}
              <div>
                <label className={`block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ប្រភេទទំនិញ (Category)" : "Category"}
                </label>
                <select
                  value={addCategoryId}
                  onChange={(e) => setAddCategoryId(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
                  }`}
                >
                  <option value="">{language === "km" ? "-- ស្វ័យប្រវត្តិតាមឈ្មោះ (Auto-detect Drink/Food) --" : "-- Auto-detect --"}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {resolveCategoryName(c, language)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Dropdown */}
              <div>
                <label className={`block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "អ្នកផ្គត់ផ្គង់ (Supplier)" : "Supplier"}
                </label>
                <select
                  value={addSupplierId}
                  onChange={(e) => setAddSupplierId(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
                  }`}
                >
                  <option value="">-- No Supplier Selected --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.companyName ? `(${s.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Dropdown */}
              <div>
                <label className={`block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ខ្នាត (Unit)" : "Unit"}
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
                  <option value="pc">Piece / Can / Bottle (កំប៉ុង/ដប)</option>
                  <option value="can">Can (កំប៉ុង)</option>
                  <option value="bottle">Bottle (ដប)</option>
                  <option value="pack">Pack / Case (កាតុង/យួរ)</option>
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
              {/* Item Name (ឈ្មោះទំនិញ) */}
              <div>
                <label className={`block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ឈ្មោះទំនិញ (Item Name) *" : "Item Name *"}
                </label>
                <input
                  type="text"
                  placeholder={language === "km" ? "ឧ. Coca-Cola, Sprite, Angkor Beer..." : "Item Name"}
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

              {/* Category Dropdown (ប្រភេទទំនិញ) */}
              <div>
                <label className={`block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ប្រភេទទំនិញ (Category)" : "Category"}
                </label>
                <select
                  value={settingsCategoryId}
                  onChange={(e) => setSettingsCategoryId(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
                  }`}
                >
                  <option value="">{language === "km" ? "-- គ្មាន Category --" : "-- Select Category --"}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {resolveCategoryName(c, language)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Dropdown */}
              <div>
                <label className={`block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "អ្នកផ្គត់ផ្គង់ (Supplier)" : "Supplier"}
                </label>
                <select
                  value={settingsSupplierId}
                  onChange={(e) => setSettingsSupplierId(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all duration-200 ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-white focus:border-[#55a060]"
                      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-[#55a060] focus:bg-white"
                  }`}
                >
                  <option value="">-- No Supplier Selected --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.companyName ? `(${s.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Dropdown */}
              <div>
                <label className={`block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ខ្នាត (Unit)" : "Unit"}
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
                  <option value="pc">Piece / Can / Bottle (កំប៉ុង/ដប)</option>
                  <option value="can">Can (កំប៉ុង)</option>
                  <option value="bottle">Bottle (ដប)</option>
                  <option value="pack">Pack / Case (កាតុង/យួរ)</option>
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

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-[460px] rounded-2xl border p-6 shadow-2xl ${dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-100/90 text-slate-800"} relative`}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#55a060]/10 text-[#55a060]">
                  <Truck size={18} />
                </div>
                <h2 className={`text-lg font-bold ${textPrimary} ${language === "km" ? "font-khmer" : ""}`}>
                  {editingSupplier
                    ? (language === "km" ? "កែប្រែអ្នកផ្គត់ផ្គង់" : "Edit Supplier")
                    : (language === "km" ? "បន្ថែមអ្នកផ្គត់ផ្គង់ថ្មី" : "Add Supplier")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ឈ្មោះអ្នកផ្គត់ផ្គង់ *" : "Supplier Name *"}
                </label>
                <input
                  type="text"
                  placeholder={language === "km" ? "ឧ. ក្រុមហ៊ុន Boba Supply Co." : "e.g. Boba Supply Co."}
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className={`h-10 w-full rounded-xl border ${
                    dark ? "border-[#3b3c54] bg-[#232333] text-slate-100 placeholder:text-slate-500" : "border-slate-200/90 bg-white text-slate-800 placeholder:text-slate-400 shadow-xs"
                  } px-3.5 text-xs font-semibold outline-none focus:border-[#55a060] focus:ring-1 focus:ring-[#55a060] transition-all cursor-pointer`}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ឈ្មោះក្រុមហ៊ុន" : "Company Name"}
                </label>
                <input
                  type="text"
                  placeholder={language === "km" ? "ឧ. Boba Supply Ltd" : "e.g. Boba Supply Ltd"}
                  value={supplierCompany}
                  onChange={(e) => setSupplierCompany(e.target.value)}
                  className={`h-10 w-full rounded-xl border ${
                    dark ? "border-[#3b3c54] bg-[#232333] text-slate-100 placeholder:text-slate-500" : "border-slate-200/90 bg-white text-slate-800 placeholder:text-slate-400 shadow-xs"
                  } px-3.5 text-xs font-semibold outline-none focus:border-[#55a060] focus:ring-1 focus:ring-[#55a060] transition-all cursor-pointer`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                    {language === "km" ? "លេខទូរស័ព្ទ" : "Phone"}
                  </label>
                  <input
                    type="text"
                    placeholder="012 345 678"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className={`h-10 w-full rounded-xl border ${
                      dark ? "border-[#3b3c54] bg-[#232333] text-slate-100 placeholder:text-slate-500" : "border-slate-200/90 bg-white text-slate-800 placeholder:text-slate-400 shadow-xs"
                    } px-3.5 text-xs font-semibold outline-none focus:border-[#55a060] focus:ring-1 focus:ring-[#55a060] transition-all cursor-pointer`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                    {language === "km" ? "អ៊ីមែល" : "Email"}
                  </label>
                  <input
                    type="email"
                    placeholder="supplier@mail.com"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className={`h-10 w-full rounded-xl border ${
                      dark ? "border-[#3b3c54] bg-[#232333] text-slate-100 placeholder:text-slate-500" : "border-slate-200/90 bg-white text-slate-800 placeholder:text-slate-400 shadow-xs"
                    } px-3.5 text-xs font-semibold outline-none focus:border-[#55a060] focus:ring-1 focus:ring-[#55a060] transition-all cursor-pointer`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "អាសយដ្ឋាន" : "Address"}
                </label>
                <input
                  type="text"
                  placeholder={language === "km" ? "ភ្នំពេញ, កម្ពុជា" : "Phnom Penh, Cambodia"}
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  className={`h-10 w-full rounded-xl border ${
                    dark ? "border-[#3b3c54] bg-[#232333] text-slate-100 placeholder:text-slate-500" : "border-slate-200/90 bg-white text-slate-800 placeholder:text-slate-400 shadow-xs"
                  } px-3.5 text-xs font-semibold outline-none focus:border-[#55a060] focus:ring-1 focus:ring-[#55a060] transition-all cursor-pointer`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="h-10 rounded-xl border border-slate-200 dark:border-[#3b3c54] bg-white dark:bg-[#232333] px-5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#34354e] transition-all cursor-pointer outline-none active:scale-[0.98]"
                >
                  {language === "km" ? "បោះបង់" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 rounded-xl bg-[#55a060] hover:bg-[#488c52] px-5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer border border-transparent outline-none active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting
                    ? (language === "km" ? "កំពុងរក្សាទុក..." : "Saving...")
                    : editingSupplier
                    ? (language === "km" ? "រក្សាទុកការកែប្រែ" : "Update Supplier")
                    : (language === "km" ? "រក្សាទុក" : "Save Supplier")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Purchase Order Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-lg rounded-2xl border ${borderCol} ${surface} shadow-xl p-6 relative max-h-[90vh] overflow-y-auto`}>
            <button
              onClick={() => setIsPoModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={15} className="stroke-[2.5]" />
            </button>

            <h2 className={`text-base font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
              <FileText size={18} className="text-[#55a060]" />
              <span>បង្កើតប័ណ្ណបញ្ជាទិញ (Create Purchase Order)</span>
            </h2>

            <form onSubmit={handlePoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  ជ្រើសរើសអ្នកផ្គត់ផ្គង់ (Supplier) *
                </label>
                <select
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">-- ជ្រើសរើស Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.companyName ? `(${s.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    បញ្ជីទំនិញបញ្ជាទិញ (Order Items) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (products.length > 0) {
                        setPoItems((prev) => [
                          ...prev,
                          { productId: products[0].id, quantity: 1, unitCost: Number(products[0].basePrice || 0) },
                        ]);
                      }
                    }}
                    className="text-xs font-bold text-[#55a060] hover:underline"
                  >
                    + បន្ថែមមុខទំនិញ
                  </button>
                </div>

                {poItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-400">
                    សូមចុច "+ បន្ថែមមុខទំនិញ" ដើម្បីជ្រើសរើសទំនិញ និងចំនួនកុម្ម៉ង់ទិញ
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {poItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-xl border p-2.5 bg-slate-50 dark:bg-slate-800/40">
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const pid = Number(e.target.value);
                            const p = products.find((prod) => prod.id === pid);
                            setPoItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, productId: pid, unitCost: Number(p?.basePrice || 0) } : it))
                            );
                          }}
                          className="flex-1 text-xs font-semibold rounded-lg border px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const q = Number(e.target.value);
                            setPoItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: q } : it)));
                          }}
                          className="w-20 text-xs font-semibold rounded-lg border px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                        />

                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Cost ($)"
                          value={item.unitCost}
                          onChange={(e) => {
                            const c = Number(e.target.value);
                            setPoItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unitCost: c } : it)));
                          }}
                          className="w-24 text-xs font-semibold rounded-lg border px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                        />

                        <button
                          type="button"
                          onClick={() => setPoItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  កំណត់ចំណាំ (Notes / Remarks)
                </label>
                <input
                  type="text"
                  placeholder="ឧ. ដឹកជញ្ជូនរហ័ស..."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || poItems.length === 0}
                  className="w-full rounded-xl bg-[#55a060] hover:bg-[#46894f] py-2.5 text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Submitting..." : "រក្សាទុក & បញ្ជូន (Save & Send PO)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANIMATED TOAST NOTIFICATION (MATCHING OTHER PAGES) */}
      {successMessage && (
        <AnimatedToast message={successMessage} onClose={() => setSuccessMessage("")} type="success" />
      )}
    </main>
  );
}

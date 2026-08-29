"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "../../../components/TopBar";
import {
  request,
  getSuppliers,
  createSupplier,
  deleteSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrderStock,
  getCategories,
} from "../../../lib/api";
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
  Download,
  Truck,
  FileText,
  CheckCircle,
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
  const [filterType, setFilterType] = useState<"all" | "available" | "low" | "out">("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>(typeParam || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    if (tabParam === "suppliers") {
      setActiveTab("suppliers");
    } else if (tabParam === "movements") {
      setActiveTab("movements");
    } else if (tabParam === "po") {
      setActiveTab("po");
    } else if (tabParam === "dashboard") {
      setActiveTab("dashboard");
    }

    if (typeParam) {
      setMovementTypeFilter(typeParam);
    } else {
      setMovementTypeFilter("all");
    }
  }, [tabParam, typeParam]);

  useEffect(() => {
    const handleViewChange = (e: any) => {
      const key = e.detail;
      if (key === "supplier" || key === "suppliers") setActiveTab("suppliers");
      else if (key === "history" || key === "movements") setActiveTab("movements");
      else if (key === "inventory" || key === "dashboard") setActiveTab("dashboard");
    };

    window.addEventListener("pos-inventory-view-change", handleViewChange);
    return () => window.removeEventListener("pos-inventory-view-change", handleViewChange);
  }, []);

  // Modals State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  // Supplier Form
  const [supplierName, setSupplierName] = useState("");
  const [supplierCompany, setSupplierCompany] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");

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
      const suppliersData = await getSuppliers().catch(() => []);
      const poData = await getPurchaseOrders().catch(() => []);
      const catsData = await getCategories().catch(() => []);
      setProducts(invData);
      setMovements(movementsData);
      setSuppliers(suppliersData || []);
      setPurchaseOrders(poData || []);
      setCategories(catsData || []);
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
    return products.filter((p) => {
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

      // Metric Card Filter
      const status = getProductStockStatus(p);
      if (filterType === "available" && status !== "available") return false;
      if (filterType === "low" && status !== "low") return false;
      if (filterType === "out" && status !== "out") return false;

      return true;
    });
  }, [products, filterType, searchQuery, selectedCategory, selectedSupplier]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
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
  }, [movements, movementTypeFilter, searchQuery]);

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

  // Export CSV Function
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
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `inventory_stock_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeTab === "movements") {
      const headers = ["ID", "Item Name", "Quantity", "Movement Type", "Date & Time", "Remarks", "Updated By"];
      const rows = filteredMovements.map((m) => [
        m.id,
        `"${(m.product?.name || "Deleted Product").replace(/"/g, '""')}"`,
        Math.abs(Number(m.quantity)),
        Number(m.quantity) > 0 ? "IN" : "OUT",
        `"${formatDate(m.createdAt)}"`,
        `"${(m.notes || m.referenceId || "").replace(/"/g, '""')}"`,
        `"${(m.user?.email || m.user?.name || "System").replace(/"/g, '""')}"`,
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `stock_movements_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  // Supplier Handlers
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      await createSupplier({
        name: supplierName.trim(),
        companyName: supplierCompany.trim() || undefined,
        phone: supplierPhone.trim() || undefined,
        email: supplierEmail.trim() || undefined,
        address: supplierAddress.trim() || undefined,
      });

      setSuccessMessage("Supplier created successfully");
      setIsSupplierModalOpen(false);
      setSupplierName("");
      setSupplierCompany("");
      setSupplierPhone("");
      setSupplierEmail("");
      setSupplierAddress("");
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to create supplier");
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
    setSettingsSupplierId(product.supplierId ? String(product.supplierId) : "");
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
            <h1 className={`text-2xl font-bold ${dark ? "text-slate-100" : "text-slate-800"}`}>
              {activeTab === "suppliers"
                ? "Suppliers & Vendors"
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
            {activeTab === "dashboard" && (
              <>
                <div className="relative min-w-[200px]">
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

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all cursor-pointer ${
                    dark
                      ? "border-[#3b3c54] bg-[#2b2c40] text-slate-100"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <option value="all">{t.allCategories}</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all cursor-pointer ${
                    dark
                      ? "border-[#3b3c54] bg-[#2b2c40] text-slate-100"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <option value="all">{language === "km" ? "អ្នកផ្គត់ផ្គង់ទាំងអស់" : "All Suppliers"}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {(activeTab === "dashboard" || activeTab === "movements") && (
              <button
                type="button"
                onClick={exportToCsv}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-3.5 py-2 text-xs font-semibold transition-all hover:bg-emerald-100 cursor-pointer"
              >
                <Download size={14} />
                <span>{t.exportCsv}</span>
              </button>
            )}

            {/* Action Trigger Buttons */}
            {activeTab === "dashboard" && (
              <button
                onClick={() => {
                  setAddName("");
                  setAddUnit("pc");
                  setAddQuantity("");
                  setAddMinStock("");
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
                onClick={() => {
                  setSupplierName("");
                  setSupplierCompany("");
                  setSupplierPhone("");
                  setSupplierEmail("");
                  setSupplierAddress("");
                  setIsSupplierModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#488c52] text-white px-4 py-2 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>+ បន្ថែមអ្នកផ្គត់ផ្គង់</span>
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
                <span>+ បង្កើតប័ណ្ណបញ្ជាទិញ (PO)</span>
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
                <div className="overflow-auto max-h-[720px] min-h-[480px] pb-16 no-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
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
            ) : activeTab === "movements" ? (
              /* Stock Movements Log Table */
              <div className={`mt-6 overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54]" : "border-slate-200/80"} ${surface}`}>
                <div className="overflow-auto max-h-[720px] min-h-[480px] pb-10 no-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${dark ? "bg-[#2b2c40] border-[#3b3c54] text-slate-400" : "bg-[#f8f9fa] border-slate-100 text-slate-500"}`}>
                        <th className="px-6 py-3">#</th>
                        <th className="px-6 py-3">ITEM</th>
                        <th className="px-6 py-3">TYPE</th>
                        <th className="px-6 py-3">QUANTITY</th>
                        <th className="px-6 py-3">DATE &amp; TIME</th>
                        <th className="px-6 py-3">REMARKS / PO</th>
                        <th className="px-6 py-3">UPDATED BY</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${dark ? "divide-[#3b3c54]" : "divide-slate-100"}`}>
                      {filteredMovements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-xs font-medium text-slate-400">
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

                          return (
                            <tr key={move.id} className={`transition-colors ${dark ? "hover:bg-[#34354c]/40 text-slate-200" : "hover:bg-slate-50/50 text-slate-700"}`}>
                              <td className={`px-6 py-3 text-xs font-bold ${dark ? "text-slate-400" : "text-slate-400"}`}>
                                {filteredMovements.length - idx}
                              </td>
                              <td className="px-6 py-3">
                                <div className={`font-semibold text-xs ${dark ? "text-slate-100" : "text-slate-800"}`}>
                                  {move.product?.name || "Deleted Product"}
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">Unit: {move.product?.unit || "pc"}</span>
                              </td>
                              <td className="px-6 py-3">
                                {moveType === "restock" ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    <Plus size={10} /> RESTOCK
                                  </span>
                                ) : moveType === "sale" ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    🛒 POS SALE
                                  </span>
                                ) : moveType === "damage" ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    ⚠️ SPOILAGE
                                  </span>
                                ) : moveType === "expired" ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    🟠 EXPIRED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    ⚙️ ADJUSTMENT
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                <span className={`font-black text-xs ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                                  {isPositive ? `+${Math.abs(quantityVal).toFixed(2)}` : `-${Math.abs(quantityVal).toFixed(2)}`}
                                </span>{" "}
                                <span className="text-[11px] text-slate-400 font-medium ml-0.5">{move.product?.unit}</span>
                              </td>
                              <td className="px-6 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {formatDate(move.createdAt)}
                              </td>
                              <td className="px-6 py-3 text-[11px] text-slate-600 dark:text-slate-300 font-medium max-w-xs truncate">
                                {move.referenceId ? (
                                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold">
                                    {move.referenceId}
                                  </span>
                                ) : (
                                  move.notes || "-"
                                )}
                              </td>
                              <td className="px-6 py-3 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                {move.user?.name || move.user?.email || "System"}
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
                <div className="overflow-auto max-h-[540px] no-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${dark ? "bg-[#2b2c40] border-[#3b3c54] text-slate-400" : "bg-[#f8f9fa] border-slate-100 text-slate-500"}`}>
                        <th className="px-6 py-3">#</th>
                        <th className="px-6 py-3">Supplier Name</th>
                        <th className="px-6 py-3">Company</th>
                        <th className="px-6 py-3">Phone</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Address</th>
                        <th className="px-6 py-3 text-right">Actions</th>
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
                        suppliers.map((s, idx) => (
                          <tr key={s.id} className={`transition-colors ${dark ? "hover:bg-[#34354c]/40 text-slate-200" : "hover:bg-slate-50/50 text-slate-700"}`}>
                            <td className="px-6 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                            <td className="px-6 py-3 font-semibold text-xs text-slate-800 dark:text-slate-100">{s.name}</td>
                            <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-300">{s.companyName || "-"}</td>
                            <td className="px-6 py-3 text-xs font-mono text-slate-600 dark:text-slate-300">{s.phone || "-"}</td>
                            <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400">{s.email || "-"}</td>
                            <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">{s.address || "-"}</td>
                            <td className="px-6 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteSupplier(s.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Delete Supplier"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
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
              {/* Supplier Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Supplier (អ្នកផ្គត់ផ្គង់)
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
              {/* Supplier Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Supplier (អ្នកផ្គត់ផ្គង់)
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

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]">
          <div className={`w-full max-w-md rounded-2xl border ${borderCol} ${surface} shadow-xl p-6 relative`}>
            <button
              onClick={() => setIsSupplierModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={15} className="stroke-[2.5]" />
            </button>

            <h2 className={`text-base font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
              <Truck size={18} className="text-[#55a060]" />
              <span>បន្ថែមអ្នកផ្គត់ផ្គង់ថ្មី (Add Supplier)</span>
            </h2>

            <form onSubmit={handleSupplierSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  ឈ្មោះអ្នកផ្គត់ផ្គង់ (Supplier Name) *
                </label>
                <input
                  type="text"
                  placeholder="ឧ. ក្រុមហ៊ុន Boba Supply Co."
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  ឈ្មោះក្រុមហ៊ុន (Company Name)
                </label>
                <input
                  type="text"
                  placeholder="ឧ. Boba Supply Ltd"
                  value={supplierCompany}
                  onChange={(e) => setSupplierCompany(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    លេខទូរស័ព្ទ (Phone)
                  </label>
                  <input
                    type="text"
                    placeholder="012 345 678"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    អ៊ីមែល (Email)
                  </label>
                  <input
                    type="email"
                    placeholder="supplier@mail.com"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  អាសយដ្ឋាន (Address)
                </label>
                <input
                  type="text"
                  placeholder="ភ្នំពេញ, កម្ពុជា"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#55a060] hover:bg-[#46894f] py-2.5 text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "រក្សាទុក (Save)"}
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
    </main>
  );
}

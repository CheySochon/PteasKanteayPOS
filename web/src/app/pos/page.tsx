"use client";

import { useEffect, useMemo, useRef, useState, memo, useCallback, useDeferredValue, startTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Bell,
  ChefHat,
  LayoutDashboard,
  Percent,
  Minus,
  Plus,
  Printer,
  Search,
  Settings,
  ShoppingBag,
  Package,
  Trash2,
  Utensils,
  MapPin,
  Users,
  Tag,
  UsersRound,
  Wifi,
  WifiOff,
  X,
  LogOut,
  CheckCircle2,
  Check,
  Archive,
  LayoutGrid,
  Smartphone,
  List,
  Clock,
  RotateCw,
  QrCode,
  Banknote,
  ChevronDown,
  AlertTriangle,
  ClipboardList,
  Armchair,
  User,
  CreditCard,
  ChevronUp,
  Pencil,
  Loader2,
  StickyNote,
  Scissors,
} from "lucide-react";
import { cartItemFromProduct, type CartItem } from "../../components/CartPanel";
import Sidebar from "../../components/Sidebar";
import AnimatedToast from "../../components/AnimatedToast";
import { useAppTheme } from "../../lib/theme";
import { useAppLanguage, setAppLanguage, resolveCategoryName, resolveProductName, getProductCategoryBadgeName } from "../../lib/language";
import {
  apiOrigin,
  createOrder,
  getCategories,
  getProducts,
  getSettings,
  getTables,
  getOrders,
  deleteOrder,
  updateOrderApi,
  resolveImageUrl,
} from "../../lib/api";
import { getSocket } from "../../lib/socket";
import type { Category, DiningTable, Product, OrderStatus } from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";

const SERVICE_RATE = 0.1;
const VAT_RATE = 0.12;
const DEFAULT_POS_NAME = "PteasKanteay POS 60";

const PROMO_CODES = [
  { code: "WELCOME10", label: "Welcome (10%)", value: 10 },
  { code: "HAPPYHOUR", label: "Happy Hour (15%)", value: 15 },
  { code: "STAFF20", label: "Staff (20%)", value: 20 },
];

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getStoredCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

let cachedCategories: Category[] | null = typeof window !== "undefined" ? getStoredCache<Category[]>("pos_cached_categories") : null;
let cachedProducts: Product[] | null = typeof window !== "undefined" ? getStoredCache<Product[]>("pos_cached_products") : null;
let cachedTables: DiningTable[] | null = typeof window !== "undefined" ? getStoredCache<DiningTable[]>("pos_cached_tables") : null;
let cachedSettings: any = typeof window !== "undefined" ? getStoredCache<any>("pos_cached_settings") : null;

const ACTIVE_STATUSES = ["pending", "accepted", "preparing", "ready", "served"];

function getPosDisplayTableName(table: DiningTable, qrOrders: any[], language: string) {
  const tableOrder = qrOrders.find(
    (o) => (o.tableId === table.id || o.table?.id === table.id) && ACTIVE_STATUSES.includes(o.status) && o.notes
  );

  if (tableOrder?.notes) {
    const match = tableOrder.notes.match(/Merged (?:with|into|from) ([^)\n,]+)/i);
    if (match && match[1]) {
      const mergedPart = match[1].trim();
      const cleanMerged = mergedPart.toLowerCase().startsWith("table ") ? `T${mergedPart.slice(6).trim()}` : (mergedPart.startsWith("T") ? mergedPart : `T${mergedPart}`);
      const cleanBase = table.name.toLowerCase().startsWith("table ") ? `T${table.name.slice(6).trim()}` : (table.name.startsWith("T") ? table.name : `T${table.name}`);

      if (cleanMerged && cleanBase.toLowerCase() !== cleanMerged.toLowerCase()) {
        const numBase = parseInt(cleanBase.replace(/\D/g, ""), 10);
        const numOther = parseInt(cleanMerged.replace(/\D/g, ""), 10);
        let combined = `${cleanBase} & ${cleanMerged}`;
        if (!isNaN(numBase) && !isNaN(numOther)) {
          const sorted = [numBase, numOther].sort((a, b) => a - b);
          combined = `T${sorted[0]} & T${sorted[1]}`;
        }
        return language === "km" ? `តុ ${combined}` : combined;
      }
    }
  }

  return language === "km" ? `តុ ${table.name}` : table.name;
}

function PosPageComponent(props?: { isAdminView?: boolean; params?: Promise<any>; searchParams?: Promise<any> }) {
  const isAdminView = props?.isAdminView ?? false;
  const [theme, setTheme] = useAppTheme();
  const dark = theme === "dark";
  const language = useAppLanguage();
  const [categories, setCategories] = useState<Category[]>(cachedCategories || []);
  const [products, setProducts] = useState<Product[]>(cachedProducts || []);
  const [tables, setTables] = useState<DiningTable[]>(cachedTables || []);
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [tableId, setTableId] = useState<number | undefined>();
  const [diningOption, setDiningOption] = useState<"dine-in" | "takeaway">("dine-in");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileTab, setMobileTab] = useState<"menu" | "cart">("menu");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ticketNumber, setTicketNumber] = useState(() => String(Date.now()).slice(-4));

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    startTransition(() => {
      setQuery(val);
    });
  }, []);
  const [orderNote, setOrderNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [posName, setPosName] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_POS_NAME;
    return localStorage.getItem("pos_restaurant_name") || DEFAULT_POS_NAME;
  });
  const [currentUserRole, setCurrentUserRole] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("pos_user");
      if (raw) {
        const u = JSON.parse(raw);
        return String(u.role || u.roleName || "").trim().toLowerCase();
      }
    } catch {}
    return "";
  });
  const [currentUserName, setCurrentUserName] = useState(() => {
    if (typeof window === "undefined") return "Chon (Cashier)";
    try {
      const raw = localStorage.getItem("pos_user");
      if (raw) {
        const u = JSON.parse(raw);
        return String(u.name || u.userName || "Chon (Cashier)").trim();
      }
    } catch {}
    return "Chon (Cashier)";
  });
  const [currentUserImageUrl, setCurrentUserImageUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("pos_user");
      if (raw) {
        const u = JSON.parse(raw);
        return String(u.imageUrl || "").trim();
      }
    } catch {}
    return "";
  });
  const [restaurantImageUrl, setRestaurantImageUrl] = useState(cachedSettings?.restaurantImageUrl || "");
  const [restaurantAddress, setRestaurantAddress] = useState(cachedSettings?.address || "");
  const [restaurantPhone, setRestaurantPhone] = useState(cachedSettings?.restaurantPhone || "");
  const [restaurantEmail, setRestaurantEmail] = useState(cachedSettings?.restaurantEmail || "");
  const [receiptFooterText, setReceiptFooterText] = useState(cachedSettings?.receiptFooter || "Thanks for visit. Come again");
  const [vatTin, setVatTin] = useState(cachedSettings?.vatTin || "");
  const [showVatTin, setShowVatTin] = useState(cachedSettings?.showVatTin ?? true);
  const [receiptHeaderTitle, setReceiptHeaderTitle] = useState(cachedSettings?.receiptHeaderTitle || "RECEIPT");
  const [invoiceHeaderTitle, setInvoiceHeaderTitle] = useState(cachedSettings?.invoiceHeaderTitle || "TAX INVOICE");
  const [receiptPrefix, setReceiptPrefix] = useState(cachedSettings?.receiptPrefix || "REC-");
  const [invoicePrefix, setInvoicePrefix] = useState(cachedSettings?.invoicePrefix || "INV-");
  const [showCashierName, setShowCashierName] = useState(cachedSettings?.showCashierName ?? true);
  const [showTableInfo, setShowTableInfo] = useState(cachedSettings?.showTableInfo ?? true);
  const [showCustomerInfoOnInvoice, setShowCustomerInfoOnInvoice] = useState(cachedSettings?.showCustomerInfoOnInvoice ?? true);
  const [showPaymentQr, setShowPaymentQr] = useState(cachedSettings?.showPaymentQr ?? true);
  const [invoiceTerms, setInvoiceTerms] = useState(cachedSettings?.invoiceTerms || "1. Payment is due within 30 days.\n2. Goods once sold are not returnable.");
  const [serviceRate, setServiceRate] = useState(cachedSettings?.serviceChargeRate != null ? Number(cachedSettings.serviceChargeRate) / 100 : SERVICE_RATE);
  const [vatRate, setVatRate] = useState(cachedSettings?.taxRate != null ? Number(cachedSettings.taxRate) / 100 : VAT_RATE);
  const [exchangeRate, setExchangeRate] = useState<number>(cachedSettings?.exchangeRate ? Number(cachedSettings.exchangeRate) : 4000);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [splitCount, setSplitCount] = useState(2);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [paidSplits, setPaidSplits] = useState<number[]>([]);
  const [selectedSplitIndex, setSelectedSplitIndex] = useState<number | null>(null);
  const [splitPaymentOpen, setSplitPaymentOpen] = useState(false);
  const [splitPaymentMethod, setSplitPaymentMethod] = useState<"cash" | "qr">("cash");
  const [splitCashReceived, setSplitCashReceived] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showSuccessToast = useCallback((msg: string) => {
    if (!msg) return;
    setToast({ message: msg, type: "success" });
  }, []);

  const showErrorToast = useCallback((msg: string) => {
    if (!msg) return;
    setToast({ message: msg, type: "error" });
  }, []);

  const setMessage = showSuccessToast;
  const setErrorMessage = showErrorToast;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!(cachedCategories && cachedProducts && cachedTables));
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  function cancelEditOrder() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pos_editing_order");
    }
    setEditingOrder(null);
    setCart([]);
    setOrderNote("");
    setDiscountPercent(0);
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedEdit = localStorage.getItem("pos_editing_order");
        if (storedEdit) {
          const orderToEdit = JSON.parse(storedEdit);
          setEditingOrder(orderToEdit);

          if (orderToEdit.items && Array.isArray(orderToEdit.items)) {
            let kdsStatuses: Record<string, string> = {};
            try {
              const rawKds = localStorage.getItem("pos_kds_item_statuses");
              if (rawKds) kdsStatuses = JSON.parse(rawKds);
            } catch {}

            const loadedCart: CartItem[] = orderToEdit.items.map((it: any) => {
              const prod = it.product || {
                id: it.productId,
                name: it.name || it.productName || "Product",
                basePrice: it.unitPrice || it.price || 0,
              };
              const itemKey = `${orderToEdit.id}-${it.productId}`;
              const isCompleted =
                kdsStatuses[it.id] === "completed" ||
                kdsStatuses[itemKey] === "completed" ||
                it.status === "completed" ||
                it.isCompleted === true;

              return {
                id: it.id,
                productId: Number(it.productId || prod.id),
                product: prod,
                name: prod.name || it.name,
                unitPrice: Number(it.unitPrice || it.price || prod.basePrice || 0),
                quantity: Number(it.quantity || 1),
                price: Number(it.unitPrice || it.price || prod.basePrice || 0),
                totalPrice: Number(it.totalPrice || ((it.unitPrice || prod.basePrice) * (it.quantity || 1))),
                notes: it.notes || "",
                status: isCompleted ? "completed" : (it.status || "pending"),
                isCompleted,
              };
            });
            setCart(loadedCart);
          }

          if (orderToEdit.tableId) {
            setTableId(Number(orderToEdit.tableId));
            setOrderingMode(true);
          }

          if (orderToEdit.notes) {
            setOrderNote(orderToEdit.notes);
            setShowNoteInput(true);
          }

          if (orderToEdit.orderNumber || orderToEdit.orderId) {
            setTicketNumber(String(orderToEdit.orderNumber || orderToEdit.orderId).slice(-4));
          }
        }
      } catch {}
    }
  }, []);
  
  // Payment State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "card">("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  const [notifications, setNotifications] = useState<{ id: string; title: string; detail: string; orderId?: number; totalAmount?: number; tableNo?: string }[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<any | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const unreadCount = notifications.length;
  const [tableModalOpen, setTableModalOpen] = useState(false);

  const [orderingMode, setOrderingMode] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>("All");

  const [tableCarts, setTableCarts] = useState<Record<string, CartItem[]>>({});
  const [tableNotes, setTableNotes] = useState<Record<string, string>>({});
  const [tableDiscounts, setTableDiscounts] = useState<Record<string, number>>({});
  const [tableIsSent, setTableIsSent] = useState<Record<string, boolean>>({});
  const [tableTicketNumbers, setTableTicketNumbers] = useState<Record<string, string>>({});

  const [saveDraftModalOpen, setSaveDraftModalOpen] = useState(false);
  const [draftRefInput, setDraftRefInput] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Payment Modal Discount Controls
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountValInput, setDiscountValInput] = useState<string>("");

  // Thermal Print Receipt Slip Modal State
  const [printSlipModalOpen, setPrintSlipModalOpen] = useState(false);
  const [printSlipData, setPrintSlipData] = useState<{
    type?: "invoice" | "receipt" | "kitchen";
    orderId?: number | string;
    orderNumber: string;
    createdAt: string;
    customer: string;
    orderType: string;
    items: Array<{ name: string; quantity: number; unitPrice: number; notes?: string }>;
    subtotal: number;
    vat: number;
    serviceFee: number;
    discountAmount: number;
    total: number;
  } | null>(null);

  // QR Menu Orders Real-time State
  const [qrOrdersModalOpen, setQrOrdersModalOpen] = useState(false);
  const [qrOrders, setQrOrders] = useState<any[]>([]);
  const [qrOrdersFilter, setQrOrdersFilter] = useState<"all" | "pending" | "preparing" | "completed">("all");
  const [deleteQrOrderTarget, setDeleteQrOrderTarget] = useState<any | null>(null);

  const activeQrOrders = useMemo(() => {
    return qrOrders.filter((o) => {
      const s = String(o.status || "").toLowerCase().trim();
      const isDoneStatus = ["completed", "done", "cancelled"].includes(s);
      const items = Array.isArray(o.items) ? o.items : [];
      const totalQty = items.reduce((sum: number, i: any) => sum + Number(i.quantity || 1), 0);
      const isEmptyCart = items.length === 0 || totalQty === 0;
      return !isDoneStatus && !isEmptyCart;
    });
  }, [qrOrders]);

  const pendingQrCount = useMemo(() => {
    return activeQrOrders.filter((o) => o.status === "pending" || !o.status).length;
  }, [activeQrOrders]);

  const handleLoadQrOrderToCart = (qrOrder: any) => {
    if (!qrOrder || !qrOrder.items || qrOrder.items.length === 0) return;
    
    const loadedCartItems: CartItem[] = qrOrder.items.map((item: any) => {
      const prod = productMap.get(item.productId);
      return {
        productId: item.productId,
        name: item.product?.name || item.name || prod?.name || `Product #${item.productId}`,
        unitPrice: Number(item.unitPrice || item.price || prod?.basePrice || 0),
        quantity: Number(item.quantity || 1),
        notes: item.notes || "",
      };
    });

    setCart(loadedCartItems);
    if (qrOrder.tableId) setTableId(qrOrder.tableId);
    if (qrOrder.orderNumber) setTicketNumber(qrOrder.orderNumber);
    setOrderingMode(true);
    setQrOrdersModalOpen(false);
    setMessage(`Loaded Order ${qrOrder.orderNumber || `#${qrOrder.id}`} into Cart!`);
  };

  const saveCurrentTableState = (currentTableId: number | undefined, currentOrderingMode: boolean) => {
    const key = currentTableId ? `table-${currentTableId}` : (currentOrderingMode ? "takeaway" : "none");
    if (key !== "none") {
      setTableCarts((prev) => ({ ...prev, [key]: [...cart] }));
      setTableNotes((prev) => ({ ...prev, [key]: orderNote }));
      setTableDiscounts((prev) => ({ ...prev, [key]: discountPercent }));
      setTableTicketNumbers((prev) => ({ ...prev, [key]: ticketNumber }));
    }
  };

  const loadTableState = (newTableId: number | undefined, isTakeaway: boolean) => {
    const key = newTableId ? `table-${newTableId}` : (isTakeaway ? "takeaway" : "none");
    if (key !== "none") {
      setCart(tableCarts[key] || []);
      setOrderNote(tableNotes[key] || "");
      setDiscountPercent(tableDiscounts[key] || 0);
      setTicketNumber(tableTicketNumbers[key] || String(Date.now()).slice(-4));
    } else {
      setCart([]);
      setOrderNote("");
      setDiscountPercent(0);
      setTicketNumber(String(Date.now()).slice(-4));
    }
  };

  const switchSelection = (newTableId: number | undefined, newOrderingMode: boolean) => {
    saveCurrentTableState(tableId, orderingMode);
    setTableId(newTableId);
    setOrderingMode(newOrderingMode);
    loadTableState(newTableId, newOrderingMode && !newTableId);
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const key = tableId ? `table-${tableId}` : "takeaway";
      setTableIsSent((prev) => ({ ...prev, [key]: true }));

      const displayTableName = selectedTable ? getPosDisplayTableName(selectedTable, qrOrders, "en").replace(/^តុ\s*/, "") : "";

      let finalNotes = orderNote;
      if (displayTableName.includes("&")) {
        if (!finalNotes || !finalNotes.includes("Merged")) {
          const parts = displayTableName.split("&").map((p) => p.trim());
          const baseName = selectedTable?.name.startsWith("T") ? selectedTable.name : `T${selectedTable?.name}`;
          const otherPart = parts.find((p) => p.toLowerCase() !== baseName.toLowerCase());
          if (otherPart) {
            finalNotes = finalNotes ? `${finalNotes} (Merged with ${otherPart})` : `Merged with ${otherPart}`;
          }
        }
      }

      const payload = {
        tableId,
        orderNumber: ticketNumber,
        status: (editingOrder?.status && editingOrder.status !== "pending") ? editingOrder.status : ("pending" as OrderStatus),
        totalAmount: total,
        discountAmount,
        taxAmount: serviceFee + vat,
        userName: currentUserName,
        createdBy: { name: currentUserName },
        notes: finalNotes,
        tableNo: displayTableName || (selectedTable ? selectedTable.name : undefined),
        items: cart.map((i) => ({
          id: i.id,
          productId: i.productId,
          quantity: i.quantity,
          name: i.name,
          unitPrice: i.unitPrice,
          notes: i.notes || "",
          status: i.status || (i.isCompleted ? "completed" : undefined),
        })),
        table: selectedTable ? { name: displayTableName || selectedTable.name } : null,
      };

      if (editingOrder && editingOrder.id) {
        // Ensure KDS statuses for existing completed items are preserved
        try {
          const raw = localStorage.getItem("pos_kds_item_statuses");
          const globalObj = raw ? JSON.parse(raw) : {};
          cart.forEach((it) => {
            if (it.isCompleted || it.status === "completed") {
              if (it.id) globalObj[it.id] = "completed";
              globalObj[`${editingOrder.id}-${it.productId}`] = "completed";
            }
          });
          localStorage.setItem("pos_kds_item_statuses", JSON.stringify(globalObj));
          window.dispatchEvent(new Event("pos-item-status-change"));
        } catch {}

        const updatedOrder = await updateOrderApi(editingOrder.id, payload);
        const socket = getSocket();
        if (socket) {
          socket.emit("order:updated", updatedOrder);
        }
        if (typeof window !== "undefined") {
          localStorage.removeItem("pos_editing_order");
          window.dispatchEvent(new Event("pos-order-updated"));
        }
        setEditingOrder(null);
        setCart([]);
        setDiscountPercent(0);
        setOrderNote("");
        setSendKitchenModalOpen(false);
        setMessage(language === "km" ? `កែប្រែការបញ្ជាទិញជោគជ័យ!` : `Order updated successfully!`);
        return;
      }

      const createdOrder = await createOrder(payload);

      const fullOrder = {
        id: createdOrder?.id || Math.floor(Date.now() % 2000000000),
        createdAt: createdOrder?.createdAt || new Date().toISOString(),
        orderNumber: createdOrder?.orderNumber || ticketNumber,
        status: createdOrder?.status || "pending",
        totalAmount: total,
        notes: createdOrder?.notes || finalNotes,
        tableNo: displayTableName || (selectedTable ? selectedTable.name : null),
        items: (createdOrder?.items && createdOrder.items.length > 0) ? createdOrder.items : payload.items,
        table: createdOrder?.table || { name: displayTableName || selectedTable?.name },
        tableName: displayTableName || (selectedTable ? `${selectedTable.name} (${selectedTable.zone})` : "Takeaway"),
        ...createdOrder,
      };

      const socket = getSocket();
      if (socket) {
        socket.emit("order:created", fullOrder);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pos-order-created"));
      }

      setPrintSlipData({
        type: "kitchen",
        orderId: fullOrder?.id,
        orderNumber: fullOrder.orderNumber || ticketNumber,
        createdAt: fullOrder.createdAt || new Date().toISOString(),
        customer: selectedTable ? `${selectedTable.name} (${selectedTable.zone})` : "WALKIN",
        orderType: selectedTable ? "Dine-In" : "Takeaway",
        items: cart.map((i) => ({ ...i })),
        subtotal,
        vat,
        serviceFee,
        discountAmount,
        total,
      });

      setCart([]);
      setDiscountPercent(0);
      setOrderNote("");
      setSendKitchenModalOpen(false);
      setPrintSlipModalOpen(true);
      showSuccessToast(`Order ${fullOrder.orderNumber || `#${fullOrder.id}`} sent to kitchen!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to send order to kitchen");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const [loginSuccessToast, setLoginSuccessToast] = useState<{ userName: string; role: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pos_login_success_alert");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.userName && Date.now() - (parsed.timestamp || 0) < 30000) {
          const roleStr = typeof parsed.role === "object" && parsed.role ? parsed.role.name : parsed.role || "Cashier";
          setLoginSuccessToast({ userName: parsed.userName, role: roleStr });
          localStorage.removeItem("pos_login_success_alert");
        }
      }
    } catch {}
  }, []);

  // Dedicated 5s auto-close timer effect for POS Login Success Toast
  useEffect(() => {
    if (!loginSuccessToast) return;
    const timer = setTimeout(() => {
      setLoginSuccessToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [loginSuccessToast]);

  useEffect(() => {
    getOrders("active")
      .then((data) => {
        if (Array.isArray(data)) setQrOrders(data);
      })
      .catch(() => {});

    const socket = getSocket();
    if (!socket) return;

    const recentEvents = new Map<string, number>();
    function isDuplicateEvent(key: string): boolean {
      const now = Date.now();
      const last = recentEvents.get(key);
      if (last && now - last < 2500) return true;
      recentEvents.set(key, now);
      if (recentEvents.size > 200) {
        for (const [k, t] of recentEvents.entries()) {
          if (now - t > 10000) recentEvents.delete(k);
        }
      }
      return false;
    }

    function handleOrderCreated(order: any) {
      if (!order || !order.id) return;
      if (isDuplicateEvent(`create-${order.id}`)) return;

      setQrOrders((current) => {
        const exists = current.some((o) => o.id === order.id);
        if (exists) return current.map((o) => (o.id === order.id ? { ...o, ...order } : o));
        return [order, ...current];
      });

      // Only notify if order originated as an online QR order
      const isQr = order.isQr || order.source === "qr" || (!order.createdById && order.tableId);
      if (isQr) {
        const label = order.orderNumber || order.orderId || `#${order.id}`;
        const table = order.table?.name || order.tableNo;
        const detail = table ? `${label} - Table ${table} needs attention` : `${label} needs attention`;

        const notif = {
          id: `order-${order.id}-${Date.now()}`,
          title: "New QR Order Received",
          detail,
          orderId: order.id,
          tableNo: String(table || ""),
          totalAmount: Number(order.totalAmount || 0),
        };

        setNotifications((current) => [notif, ...current].slice(0, 5));
      }
    }

    function handleOrderUpdated(order: any) {
      if (!order || !order.id) return;
      if (isDuplicateEvent(`update-${order.id}-${order.status}`)) return;
      setQrOrders((current) => current.map((o) => (o.id === order.id ? { ...o, ...order } : o)));
    }

    function handleOrderDeleted(payload: any) {
      const deletedId = typeof payload === "object" ? payload.id || payload.orderId : payload;
      if (!deletedId) return;
      if (isDuplicateEvent(`delete-${deletedId}`)) return;
      setQrOrders((current) => current.filter((o) => Number(o.id) !== Number(deletedId)));
    }

    socket.on("order:created", handleOrderCreated);
    socket.on("order:updated", handleOrderUpdated);
    socket.on("order:deleted", handleOrderDeleted);
    return () => {
      socket.off("order:created", handleOrderCreated);
      socket.off("order:updated", handleOrderUpdated);
      socket.off("order:deleted", handleOrderDeleted);
    };
  }, []);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = async () => {
      setIsOnline(true);
      try {
        const { getOfflineOrders, deleteOfflineOrder } = await import("../../lib/db");
        const orders = await getOfflineOrders();
        if (orders && orders.length > 0) {
          setSyncing(true);
          for (const order of orders) {
             await createOrder(order.payload);
             await deleteOfflineOrder(order.id);
          }
          setMessage(`Synced ${orders.length} offline orders`);
        }
      } catch (err) {
        console.error("Sync failed", err);
      } finally {
        setSyncing(false);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Defer initial sync check so it doesn't block critical page mount transition
    const syncTimer = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        handleOnline();
      }
    }, 2000);

    return () => {
      clearTimeout(syncTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (cachedCategories && cachedProducts && cachedTables) {
      setInitialLoading(false);
    }

    Promise.all([getCategories(), getProducts(), getTables(), getSettings()])
      .then(([categoryRows, productRows, tableRows, appSettings]) => {
        cachedCategories = categoryRows;
        cachedProducts = productRows;
        cachedTables = tableRows.filter((table: DiningTable) => table.isActive);
        cachedSettings = appSettings;

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("pos_cached_categories", JSON.stringify(cachedCategories));
            localStorage.setItem("pos_cached_products", JSON.stringify(cachedProducts));
            localStorage.setItem("pos_cached_tables", JSON.stringify(cachedTables));
            localStorage.setItem("pos_cached_settings", JSON.stringify(cachedSettings));
          } catch {}
        }

        setCategories(cachedCategories);
        setProducts(cachedProducts);
        setTables(cachedTables);
        const nextName = appSettings.restaurantName || DEFAULT_POS_NAME;
        setPosName(nextName);
        setRestaurantImageUrl(appSettings.restaurantImageUrl || "");
        setRestaurantAddress(appSettings.address || "");
        setRestaurantPhone(appSettings.restaurantPhone || "");
        setRestaurantEmail(appSettings.restaurantEmail || "");
        setReceiptFooterText(appSettings.receiptFooter || "Thanks for visit. Come again");
        setVatTin(appSettings.vatTin || "");
        setShowVatTin(appSettings.showVatTin ?? true);
        setReceiptHeaderTitle(appSettings.receiptHeaderTitle || "RECEIPT");
        setInvoiceHeaderTitle(appSettings.invoiceHeaderTitle || "TAX INVOICE");
        setReceiptPrefix(appSettings.receiptPrefix || "REC-");
        setInvoicePrefix(appSettings.invoicePrefix || "INV-");
        setShowCashierName(appSettings.showCashierName ?? true);
        setShowTableInfo(appSettings.showTableInfo ?? true);
        setShowCustomerInfoOnInvoice(appSettings.showCustomerInfoOnInvoice ?? true);
        setShowPaymentQr(appSettings.showPaymentQr ?? true);
        setInvoiceTerms(appSettings.invoiceTerms || "1. Payment is due within 30 days.\n2. Goods once sold are not returnable.");
        localStorage.setItem("pos_restaurant_name", nextName);
        setServiceRate(Number(appSettings.serviceChargeRate || 0) / 100);
        setVatRate(Number(appSettings.taxRate || 0) / 100);
        if (appSettings.exchangeRate) setExchangeRate(Number(appSettings.exchangeRate));
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Unable to load POS"))
      .finally(() => setInitialLoading(false));
  }, []);

  // Removed auto-open Table modal useEffect since Table Map is now the landing view

  useEffect(() => {
    function syncAuthUser() {
      if (typeof window === "undefined") return;
      setPosName(localStorage.getItem("pos_restaurant_name") || DEFAULT_POS_NAME);
      try {
        const raw = localStorage.getItem("pos_user");
        if (raw) {
          const u = JSON.parse(raw);
          const r = typeof u.role === "string" ? u.role : u.role?.name || u.roleName || "";
          setCurrentUserRole(String(r).trim().toLowerCase());
          setCurrentUserName(String(u.name || u.userName || "Chon (Cashier)").trim());
          setCurrentUserImageUrl(String(u.imageUrl || "").trim());
          return;
        }
      } catch {}
      setCurrentUserRole("");
      setCurrentUserName("Chon (Cashier)");
      setCurrentUserImageUrl("");
    }

    function applySettings(appSettings: any) {
      if (!appSettings) return;
      cachedSettings = appSettings;
      const nextName = appSettings.restaurantName || DEFAULT_POS_NAME;
      setPosName(nextName);
      setRestaurantImageUrl(appSettings.restaurantImageUrl || "");
      setRestaurantAddress(appSettings.address || "");
      setRestaurantPhone(appSettings.restaurantPhone || "");
      setRestaurantEmail(appSettings.restaurantEmail || "");
      setReceiptFooterText(appSettings.receiptFooter || "Thanks for visit. Come again");
      setVatTin(appSettings.vatTin || "");
      setShowVatTin(appSettings.showVatTin ?? true);
      setReceiptHeaderTitle(appSettings.receiptHeaderTitle || "RECEIPT");
      setInvoiceHeaderTitle(appSettings.invoiceHeaderTitle || "TAX INVOICE");
      setReceiptPrefix(appSettings.receiptPrefix || "REC-");
      setInvoicePrefix(appSettings.invoicePrefix || "INV-");
      setShowCashierName(appSettings.showCashierName ?? true);
      setShowTableInfo(appSettings.showTableInfo ?? true);
      setShowCustomerInfoOnInvoice(appSettings.showCustomerInfoOnInvoice ?? true);
      setShowPaymentQr(appSettings.showPaymentQr ?? true);
      setInvoiceTerms(appSettings.invoiceTerms || "1. Payment is due within 30 days.\n2. Goods once sold are not returnable.");
      setServiceRate(Number(appSettings.serviceChargeRate || 0) / 100);
      setVatRate(Number(appSettings.taxRate || 0) / 100);
      if (appSettings.exchangeRate != null) setExchangeRate(Number(appSettings.exchangeRate) || 4000);
    }

    function reloadMenuData() {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }
      reloadTimerRef.current = setTimeout(() => {
        Promise.all([getCategories(), getProducts(), getTables(), getSettings()])
          .then(([categoryRows, productRows, tableRows, appSettings]) => {
            cachedCategories = categoryRows;
            cachedProducts = productRows;
            cachedTables = tableRows.filter((table: DiningTable) => table.isActive);
            setCategories(cachedCategories);
            setProducts(cachedProducts);
            setTables(cachedTables);
            applySettings(appSettings);
          })
          .catch(() => undefined);
      }, 800);
    }

    syncAuthUser();
    const handleSettingsAndAuth = (e?: Event) => {
      syncAuthUser();
      if (e && (e as CustomEvent).detail) {
        applySettings((e as CustomEvent).detail);
        return;
      }
      if (e && e instanceof StorageEvent && e.key) {
        if (!e.key.includes("menu") && !e.key.includes("settings") && !e.key.includes("product") && !e.key.includes("restaurant")) {
          return;
        }
        if (e.key.includes("menu") || e.key.includes("product")) {
          reloadMenuData();
          return;
        }
      }
      getSettings().then(applySettings).catch(() => undefined);
    };

    window.addEventListener("storage", handleSettingsAndAuth);
    window.addEventListener("pos-settings-change", handleSettingsAndAuth);
    window.addEventListener("pos-auth-change", syncAuthUser);
    window.addEventListener("pos-menu-change", reloadMenuData);

    const handleSocketSettings = (updated: any) => {
      if (updated && typeof updated === "object") {
        applySettings(updated);
      } else {
        getSettings().then(applySettings).catch(() => undefined);
      }
    };

    const socket = getSocket();
    if (socket) {
      socket.on("settings:updated", handleSocketSettings);
      socket.on("settings:change", handleSocketSettings);
      socket.on("product:updated", reloadMenuData);
      socket.on("product:created", reloadMenuData);
      socket.on("product:deleted", reloadMenuData);
      socket.on("inventory:updated", reloadMenuData);
      socket.on("category:updated", reloadMenuData);
      socket.on("category:created", reloadMenuData);
      socket.on("category:deleted", reloadMenuData);
      socket.on("menu:updated", reloadMenuData);
    }

    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }
      window.removeEventListener("storage", handleSettingsAndAuth);
      window.removeEventListener("pos-settings-change", handleSettingsAndAuth);
      window.removeEventListener("pos-auth-change", syncAuthUser);
      window.removeEventListener("pos-menu-change", reloadMenuData);
      if (socket) {
        socket.off("settings:updated", handleSocketSettings);
        socket.off("settings:change", handleSocketSettings);
        socket.off("product:updated", reloadMenuData);
        socket.off("product:created", reloadMenuData);
        socket.off("product:deleted", reloadMenuData);
        socket.off("inventory:updated", reloadMenuData);
        socket.off("category:updated", reloadMenuData);
        socket.off("category:created", reloadMenuData);
        socket.off("category:deleted", reloadMenuData);
        socket.off("menu:updated", reloadMenuData);
      }
    };
  }, []);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === tableId),
    [tableId, tables]
  );

  const filteredTables = useMemo(() => {
    if (selectedZone === "All") return tables;
    return tables.filter((t) => t.zone === selectedZone);
  }, [tables, selectedZone]);

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search && categoryId === "all") return products;

    return products.filter((product) => {
      if (categoryId !== "all" && product.categoryId !== categoryId) return false;
      if (!search) return true;

      return (
        product.name.toLowerCase().includes(search) ||
        (product.nameKm && product.nameKm.toLowerCase().includes(search)) ||
        (product.description && product.description.toLowerCase().includes(search)) ||
        (product.descriptionKm && product.descriptionKm.toLowerCase().includes(search))
      );
    });
  }, [categoryId, products, query]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const categoryBadgeMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      map.set(p.id, getProductCategoryBadgeName(p, categories, language as any));
    }
    return map;
  }, [products, categories, language]);

  const productImageMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      map.set(p.id, resolveImageUrl(p.imageUrl));
    }
    return map;
  }, [products]);

  const productNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      map.set(p.id, resolveProductName(p, language as any));
    }
    return map;
  }, [products, language]);

  const tableNameMap = useMemo(() => {
    const map = new Map<number, string>();
    const activeNotesByTable = new Map<number, string>();
    for (let i = 0; i < qrOrders.length; i++) {
      const o = qrOrders[i];
      if (o.notes && ACTIVE_STATUSES.includes(String(o.status || "").toLowerCase().trim())) {
        const tid = Number(o.tableId || o.table?.id);
        if (tid && !activeNotesByTable.has(tid)) {
          activeNotesByTable.set(tid, o.notes);
        }
      }
    }

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const notes = activeNotesByTable.get(table.id);
      let name = language === "km" ? `តុ ${table.name}` : table.name;

      if (notes) {
        const match = notes.match(/Merged (?:with|into|from) ([^)\n,]+)/i);
        if (match && match[1]) {
          const mergedPart = match[1].trim();
          const cleanMerged = mergedPart.toLowerCase().startsWith("table ") ? `T${mergedPart.slice(6).trim()}` : (mergedPart.startsWith("T") ? mergedPart : `T${mergedPart}`);
          const cleanBase = table.name.toLowerCase().startsWith("table ") ? `T${table.name.slice(6).trim()}` : (table.name.startsWith("T") ? table.name : `T${table.name}`);

          if (cleanMerged && cleanBase.toLowerCase() !== cleanMerged.toLowerCase()) {
            const numBase = parseInt(cleanBase.replace(/\D/g, ""), 10);
            const numOther = parseInt(cleanMerged.replace(/\D/g, ""), 10);
            let combined = `${cleanBase} & ${cleanMerged}`;
            if (!isNaN(numBase) && !isNaN(numOther)) {
              const sorted = [numBase, numOther].sort((a, b) => a - b);
              combined = `T${sorted[0]} & T${sorted[1]}`;
            }
            name = language === "km" ? `តុ ${combined}` : combined;
          }
        }
      }
      map.set(table.id, name);
    }
    return map;
  }, [tables, qrOrders, language]);

  const {
    itemsGrossTotal,
    itemDiscountsTotal,
    subtotal,
    cartCount,
    discountAmount,
    discountedSubtotal,
    serviceFee,
    vat,
    total,
    splitAmount,
  } = useMemo(() => {
    let gross = 0;
    let itemDiscounts = 0;
    let count = 0;

    for (let i = 0; i < cart.length; i++) {
      const it = cart[i];
      const lineGross = it.unitPrice * it.quantity;
      gross += lineGross;
      count += it.quantity;

      if (it.itemDiscountPercent && it.itemDiscountPercent > 0) {
        itemDiscounts += (lineGross * it.itemDiscountPercent) / 100;
      } else if (it.itemDiscountAmount && it.itemDiscountAmount > 0) {
        itemDiscounts += Math.min(lineGross, it.itemDiscountAmount);
      }
    }

    const sub = Math.max(0, gross - itemDiscounts);
    const discAmt = Math.min(sub, sub * (discountPercent / 100));
    const discSub = Math.max(sub - discAmt, 0);
    const sFee = discSub * serviceRate;
    const v = discSub * vatRate;
    const tot = discSub + sFee + v;
    const split = splitCount > 0 ? tot / splitCount : tot;

    return {
      itemsGrossTotal: gross,
      itemDiscountsTotal: itemDiscounts,
      subtotal: sub,
      cartCount: count,
      discountAmount: discAmt,
      discountedSubtotal: discSub,
      serviceFee: sFee,
      vat: v,
      total: tot,
      splitAmount: split,
    };
  }, [cart, discountPercent, serviceRate, vatRate, splitCount]);

  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [heldModalOpen, setHeldModalOpen] = useState(false);
  const [sendKitchenModalOpen, setSendKitchenModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pos_held_orders");
        if (stored) setHeldOrders(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const saveHeldOrdersToStorage = (updated: any[]) => {
    setHeldOrders(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pos_held_orders", JSON.stringify(updated));
      } catch {}
    }
  };

  const getNextDraftSeq = () => {
    let maxSeq = 0;
    if (typeof window !== "undefined") {
      try {
        const storedCounter = parseInt(localStorage.getItem("pos_draft_seq_counter") || "0", 10);
        if (!isNaN(storedCounter)) maxSeq = storedCounter;
      } catch {}
    }
    heldOrders.forEach((o: any) => {
      if (typeof o.draftSeq === "number" && o.draftSeq > maxSeq) {
        maxSeq = o.draftSeq;
      }
      const match = String(o.refName || "").match(/#DFT-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    });
    return maxSeq + 1;
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const targetEntity = selectedTable ? (selectedTable.name.startsWith("T-") || selectedTable.name.toLowerCase().startsWith("table") ? selectedTable.name : `Table ${selectedTable.name}`) : (orderingMode ? "Takeaway" : "Walk-in");
    const nextSeq = getNextDraftSeq();
    const dftCode = `#DFT-${String(nextSeq).padStart(3, "0")}`;
    const autoRef = orderNote
      ? `${dftCode} • ${targetEntity} • ${timeStr} (${orderNote})`
      : `${dftCode} • ${targetEntity} • ${timeStr}`;

    setDraftRefInput(autoRef);
    setSaveDraftModalOpen(true);
  };

  const confirmSaveDraft = () => {
    if (cart.length === 0) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const targetEntity = selectedTable ? (selectedTable.name.startsWith("T-") || selectedTable.name.toLowerCase().startsWith("table") ? selectedTable.name : `Table ${selectedTable.name}`) : (orderingMode ? "Takeaway" : "Walk-in");
    const nextSeq = getNextDraftSeq();
    const dftCode = `#DFT-${String(nextSeq).padStart(3, "0")}`;
    const defaultRef = `${dftCode} • ${targetEntity} • ${timeStr}`;
    const refName = draftRefInput.trim() || defaultRef;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pos_draft_seq_counter", String(nextSeq));
      } catch {}
    }

    const newHeld = {
      id: Date.now(),
      draftSeq: nextSeq,
      refName,
      timestamp: new Date().toISOString(),
      ticketNumber,
      tableId,
      tableName: selectedTable ? `${selectedTable.name} (${selectedTable.zone})` : "Walk-in / Takeaway",
      items: [...cart],
      discountPercent,
      orderNote,
      total,
    };
    const updated = [newHeld, ...heldOrders];
    saveHeldOrdersToStorage(updated);
    
    // Clear state for current table/takeaway from records
    const key = tableId ? `table-${tableId}` : (orderingMode ? "takeaway" : "none");
    if (key !== "none") {
      setTableCarts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setTableNotes((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setTableDiscounts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setTableIsSent((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setTableTicketNumbers((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

    // Clear current cart state
    setCart([]);
    setDiscountPercent(0);
    setOrderNote("");
    setTableId(undefined);
    setTicketNumber(String(Date.now()).slice(-4));
    setSaveDraftModalOpen(false);
    setDraftRefInput("");
    setMessage("Draft saved successfully.");
  };

  const handleRecallOrder = (heldOrder: any) => {
    // Restore cart and state
    setCart(heldOrder.items || []);
    setDiscountPercent(heldOrder.discountPercent || 0);
    setOrderNote(heldOrder.orderNote || "");
    setTableId(heldOrder.tableId);
    setTicketNumber(heldOrder.ticketNumber || String(Date.now()).slice(-4));
    setOrderingMode(true); // Open ordering view!
    
    // Remove from held orders
    const updated = heldOrders.filter((o: any) => o.id !== heldOrder.id);
    saveHeldOrdersToStorage(updated);
    setHeldModalOpen(false);
    setMessage("Order recalled.");
  };

  const handleDiscardHeldOrder = (id: number) => {
    const updated = heldOrders.filter((o: any) => o.id !== id);
    saveHeldOrdersToStorage(updated);
  };

  const handleAddProduct = useCallback((product: Product) => {
    const item = cartItemFromProduct(product);
    const key = Number(item.productId || product.id);

    setCart((current) => {
      const existingItem = current.find((i: any) => Number(i.productId) === key);
      const nextQty = (existingItem?.quantity || 0) + 1;

      if (product.trackStock && Number(product.inventory?.quantity ?? 0) < nextQty) {
        showErrorToast(`Insufficient stock for ${product.name}. Available: ${Number(product.inventory?.quantity).toFixed(0)} ${product.unit}`);
        return current;
      }

      const exists = current.some((entry) => Number(entry.productId) === key);
      if (!exists) return [...current, { ...item, productId: key, name: product.name || item.name }];

      return current.map((entry) =>
        Number(entry.productId) === key
          ? { ...entry, quantity: nextQty }
          : entry
      );
    });
  }, [showErrorToast]);

  const handleIncrementItem = useCallback(
    (productId: number) => {
      const prod = productMap.get(productId);
      setCart((current) =>
        current.map((i) => {
          if (i.productId !== productId) return i;
          const nextQty = i.quantity + 1;
          if (prod?.trackStock && Number(prod.inventory?.quantity ?? 0) < nextQty) {
            showErrorToast(`Insufficient stock for ${prod.name}. Available: ${Number(prod.inventory?.quantity).toFixed(0)} ${prod.unit}`);
            return i;
          }
          return { ...i, quantity: nextQty };
        })
      );
    },
    [productMap, showErrorToast]
  );

  const handleDecrementItem = useCallback((productId: number) => {
    setCart((current) =>
      current
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const handleRemoveItem = useCallback((productId: number) => {
    setCart((current) => current.filter((i) => i.productId !== productId));
  }, []);

  const handleSetItemNote = useCallback((productId: number, noteText: string) => {
    setCart((current) =>
      current.map((i) => (i.productId === productId ? { ...i, notes: noteText } : i))
    );
  }, []);

  const handleUpdateItemDiscount = useCallback(
    (productId: number, discountPercent?: number, discountAmount?: number) => {
      setCart((current) =>
        current.map((i) =>
          i.productId === productId
            ? {
                ...i,
                itemDiscountPercent: discountPercent,
                itemDiscountAmount: discountAmount,
              }
            : i
        )
      );
    },
    []
  );

  async function processCheckout() {
    setLoading(true);
    setMessage("");

    try {
      const displayTableName = selectedTable ? getPosDisplayTableName(selectedTable, qrOrders, "en").replace(/^តុ\s*/, "") : "";

      let finalNotes = orderNote;
      if (displayTableName.includes("&")) {
        if (!finalNotes || !finalNotes.includes("Merged")) {
          const parts = displayTableName.split("&").map((p) => p.trim());
          const baseName = selectedTable?.name.startsWith("T") ? selectedTable.name : `T${selectedTable?.name}`;
          const otherPart = parts.find((p) => p.toLowerCase() !== baseName.toLowerCase());
          if (otherPart) {
            finalNotes = finalNotes ? `${finalNotes} (Merged with ${otherPart})` : `Merged with ${otherPart}`;
          }
        }
      }

      const payload: any = {
        tableId,
        discountAmount,
        taxAmount: serviceFee + vat,
        userName: currentUserName,
        createdBy: { name: currentUserName },
        notes: finalNotes,
        tableNo: displayTableName || (selectedTable ? selectedTable.name : undefined),
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          name: item.name,
          unitPrice: item.unitPrice,
          notes: item.notes || "",
        })),
        table: selectedTable ? { name: displayTableName || selectedTable.name } : null,
        _paymentMethod: paymentMethod,
      };

      const order = await createOrder(payload);

      const fullOrder = {
        id: order?.id || Math.floor(Date.now() % 2000000000),
        createdAt: order?.createdAt || new Date().toISOString(),
        orderNumber: order?.orderNumber || ticketNumber,
        status: order?.status || "pending",
        totalAmount: total,
        notes: order?.notes || finalNotes,
        tableNo: displayTableName || (selectedTable ? selectedTable.name : null),
        items: (order?.items && order.items.length > 0) ? order.items : cart.map((i) => ({ productId: i.productId, quantity: i.quantity, name: i.name, unitPrice: i.unitPrice, notes: i.notes || "" })),
        table: order?.table || { name: displayTableName || selectedTable?.name },
        tableName: displayTableName || (selectedTable ? `${selectedTable.name} (${selectedTable.zone})` : "Walk-in / Takeaway"),
        ...order,
      };

      const socket = getSocket();
      if (socket) {
        socket.emit("order:created", fullOrder);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pos-order-created"));
      }

      const receiptSnapshot = {
        ticketNumber: order.orderNumber || order.orderId || ticketNumber,
        table: selectedTable ? `${selectedTable.name} (${selectedTable.zone})` : "Walk-in / Takeaway",
        items: cart.map(i => ({ ...i })),
        subtotal,
        discountAmount,
        serviceFee,
        vat,
        total,
        paymentMethod,
        cashReceived,
        date: new Date(),
      };
      setLastReceipt(receiptSnapshot);

      // Clear state for current table/takeaway from records
      const key = tableId ? `table-${tableId}` : (orderingMode ? "takeaway" : "none");
      if (key !== "none") {
        setTableCarts((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setTableNotes((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setTableDiscounts((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setTableIsSent((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setTableTicketNumbers((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }

      setPrintSlipData({
        type: "receipt",
        orderId: order?.id,
        orderNumber: order.orderNumber || order.orderId || ticketNumber,
        createdAt: new Date().toISOString(),
        customer: selectedTable ? `${selectedTable.name} (${selectedTable.zone})` : "WALKIN",
        orderType: selectedTable ? "Dine-In" : "Takeaway",
        items: cart.map((i) => ({ ...i })),
        subtotal,
        vat,
        serviceFee,
        discountAmount,
        total,
      });

      setCart([]);
      setDiscountPercent(0);
      setSplitOpen(false);
      setDiscountOpen(false);
      setPaymentModalOpen(false);
      setPrintSlipModalOpen(true);
      setCashReceived(0);
      setTicketNumber(String(Date.now()).slice(-4));
      setTableId(undefined);
      setOrderingMode(false); // Return to Table Map
      showSuccessToast(`Order ${order.orderNumber || order.orderId} paid successfully.`);
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Unable to process payment");
    } finally {
      setLoading(false);
    }
  }



  function handlePayClick() {
    if (cart.length === 0) return;
    setCashReceived(total);
    setPaymentModalOpen(true);
  }

  if (initialLoading) {
    return <PosSkeleton dark={dark} isAdminView={isAdminView} />;
  }

  const mainContent = (
    <main className={`overflow-y-auto flex flex-col print:bg-white print:overflow-visible print:h-auto print:text-black ${isAdminView ? 'h-full flex-1 min-w-0' : 'h-full w-full'} ${
      dark ? "bg-[#232333] text-slate-100" : "bg-[#f8faf9] text-slate-700"
    }`}>
      {toast && (
        <AnimatedToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* VIEW 2: Ordering Interface — matching profile account layout container */}
      <div className="flex flex-1 flex-col overflow-hidden w-full max-w-[1400px] mx-auto px-4 py-4 lg:px-6 min-h-0">
          {/* ── Top Full-Width Header: "POS - Point of Sale" + action buttons ── */}
          <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between pb-3 shrink-0 gap-3 bg-transparent">
            <div className="flex items-center justify-between w-full md:w-auto">
              <h1 className={`text-lg sm:text-xl font-normal shrink-0 ${dark ? "text-slate-100" : "text-slate-800"}`}>
                POS &ndash; Point of Sale
              </h1>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => {
                  saveCurrentTableState(tableId, orderingMode);
                  setCart([]);
                  setDiscountPercent(0);
                  setTicketNumber(String(Date.now()).slice(-4));
                }}
                className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 active:scale-95 transition-all cursor-pointer ${
                  dark ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]" : "bg-[#f8faf9] border border-[#ebf0ec] text-[#6b7a82] hover:bg-[#f0f4f2]"
                }`}
              >
                <Plus size={14} />
                New
              </button>
              <button
                type="button"
                onClick={() => setQrOrdersModalOpen(true)}
                className={`relative flex shrink-0 items-center gap-1.5 text-xs font-semibold rounded-xl px-3.5 py-2 active:scale-95 transition-all cursor-pointer ${
                  activeQrOrders.length > 0
                    ? dark
                      ? "bg-indigo-950/50 border border-indigo-500/50 text-indigo-200 hover:bg-indigo-900/60 shadow-xs"
                      : "bg-indigo-50/90 border border-indigo-200 text-indigo-700 hover:bg-indigo-100/80 shadow-xs"
                    : dark
                    ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                    : "bg-[#f8faf9] border border-[#ebf0ec] text-[#6b7a82] hover:bg-[#f0f4f2]"
                }`}
              >
                <QrCode size={14} className={activeQrOrders.length > 0 ? "text-indigo-600 dark:text-indigo-400 animate-pulse" : ""} />
                <span>{language === "km" ? "ការកុម្ម៉ង់ QR Menu" : "QR Menu Orders"}</span>
                {activeQrOrders.length > 0 && (
                  <span className="ml-0.5 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full leading-none shadow-xs animate-pulse">
                    {pendingQrCount > 0 ? (pendingQrCount > 9 ? "9+" : pendingQrCount) : activeQrOrders.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setHeldModalOpen(true)}
                className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 active:scale-95 transition-all cursor-pointer ${
                  dark ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]" : "bg-[#f8faf9] border border-[#ebf0ec] text-[#6b7a82] hover:bg-[#f0f4f2]"
                } ${language === "km" ? "font-khmer" : ""}`}
              >
                <Archive size={14} />
                {language === "km" ? "បញ្ជីព្រាង" : "Drafts List"}
                {heldOrders.length > 0 && (
                  <span className={`ml-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                    dark ? "bg-[#3b3c54] text-slate-200" : "bg-slate-200 text-slate-600"
                  }`}>
                    {heldOrders.length}
                  </span>
                )}
              </button>
              <Link
                href="/admin/orders"
                className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 active:scale-95 transition-all cursor-pointer ${
                  dark ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]" : "bg-[#f8faf9] border border-[#ebf0ec] text-[#6b7a82] hover:bg-[#f0f4f2]"
                } ${language === "km" ? "font-khmer" : ""}`}
              >
                <List size={14} />
                {language === "km" ? "បញ្ជីការកុម្ម៉ង់" : "Orders List"}
              </Link>

              {/* Cashier Info & Logout (Only in standalone Cashier mode) */}
              {!isAdminView && (
                <>
                  <div className={`w-px h-5 mx-1.5 shrink-0 ${dark ? "bg-[#3b3c54]" : "bg-slate-200"}`} />
                  
                  <div className={`flex items-center gap-2 shrink-0 rounded-full px-2.5 py-1 ${
                    dark ? "bg-[#2b2c40] border border-[#3b3c54]" : "bg-slate-50 border border-slate-100"
                  }`}>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-[9px] font-black uppercase overflow-hidden border border-slate-200">
                      {currentUserImageUrl ? (
                        <img loading="lazy" src={resolveImageUrl(currentUserImageUrl)} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        (currentUserName ? currentUserName.split(" ").map(w => w[0]).join("").slice(0, 2) : "AC")
                      )}
                    </div>
                    <span className={`text-[11px] font-bold capitalize ${dark ? "text-slate-200" : "text-slate-700"}`}>{currentUserName || "Alex"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50/50 border border-rose-150 rounded-xl px-3 py-2 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                  >
                    <LogOut size={13} />
                    Logout
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Mobile View Sub-Header Switcher (Visible only on < lg mobile screens) */}
          <div className="flex lg:hidden items-center p-1 rounded-xl bg-slate-100 dark:bg-[#2b2c40] border border-slate-200/80 dark:border-[#3b3c54] mx-3.5 mb-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab("menu")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mobileTab === "menu"
                  ? "bg-[#55a060] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <Utensils size={15} />
              <span>{language === "km" ? "ម៉ឺនុយ (Menu)" : "Menu Catalogue"}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("cart")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                mobileTab === "cart"
                  ? "bg-[#55a060] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <ShoppingBag size={15} />
              <span>{language === "km" ? "កន្ត្រក (Cart)" : "Order Cart"}</span>
              {cartCount > 0 && (
                <span className="ml-1.5 rounded-full bg-white text-[#55a060] px-2 py-0.5 text-[10px] font-black shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto no-scrollbar lg:overflow-hidden w-full min-h-0 pt-0 pb-4 sm:pb-6 gap-4 sm:gap-6 bg-transparent">
            {/* LEFT: Product Catalogue */}
            <section className={`flex min-w-0 flex-1 flex-col rounded-2xl overflow-hidden shadow-3xs ${
              mobileTab === "cart" ? "hidden lg:flex" : "flex"
            } ${
              dark ? "bg-[#2b2c40] border border-[#3b3c54]" : "bg-white border border-slate-200/80"
            }`}>

            {/* ── Category Pills + Search row ── */}
            <div className={`sticky top-0 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-3.5 sm:px-5 py-3 sm:py-3.5 border-b shrink-0 min-w-0 transition-colors ${
              dark
                ? "bg-[#2b2c40] border-[#3b3c54]/70 shadow-xs"
                : "bg-white border-slate-200/70 shadow-xs"
            }`}>
              {/* Left Scrollable Pills Wrapper */}
              <div className="flex-1 min-w-0 flex items-center pr-2 sm:pr-4">
                <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={() => setCategoryId("all")}
                    className={`shrink-0 h-9 sm:h-10 px-4 sm:px-5 rounded-full text-[12.5px] sm:text-[13px] font-medium transition-colors cursor-pointer ${
                      categoryId === "all"
                        ? "bg-[#55a060] text-white shadow-sm"
                        : dark
                        ? "border border-[#3b3c54] bg-[#232333] text-slate-300 hover:bg-[#34354e]"
                        : "border border-slate-200/90 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryId(category.id)}
                      className={`shrink-0 h-9 sm:h-10 px-4 sm:px-5 rounded-full text-[12.5px] sm:text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        categoryId === category.id
                          ? "bg-[#55a060] text-white shadow-sm"
                          : dark
                          ? "border border-[#3b3c54] bg-[#232333] text-slate-300 hover:bg-[#34354e]"
                          : "border border-slate-200/90 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {resolveCategoryName(category, language)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Fixed Search & Layout Grid Wrapper */}
              <div className="shrink-0 flex items-center justify-end gap-2 pl-0 sm:pl-4 w-full sm:w-auto">
                {/* Search bar */}
                <div className="relative flex-1 sm:flex-none sm:w-[220px] md:w-[260px] lg:w-[280px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={searchInput}
                    onChange={handleSearchChange}
                    placeholder="Search"
                    className={`h-10 w-full rounded-xl border pl-9 pr-3 text-[13.5px] font-medium outline-none placeholder:text-slate-400 focus:border-[#55a060] transition-colors ${
                      dark ? "border-slate-700/80 bg-[#232333] text-slate-100" : "border-slate-200/90 bg-slate-50 text-slate-800"
                    }`}
                  />
                </div>
                {/* View Mode Toggle Icon */}
                <button
                  type="button"
                  onClick={() => setViewMode((prev) => (prev === "grid" ? "list" : "grid"))}
                  className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-[#55a060] text-white border-[#55a060] shadow-2xs"
                      : dark
                      ? "bg-[#232333] text-[#55a060] border-[#3b3c54] hover:bg-[#34354e]"
                      : "bg-slate-50 text-[#55a060] border-slate-200/90 hover:bg-slate-100"
                  }`}
                  title={viewMode === "grid" ? "Switch to Horizontal List View" : "Switch to Grid View"}
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>

            {/* ── Product Grid / List ── */}
            <div className={`flex-1 overflow-y-auto no-scrollbar px-3.5 sm:px-5 py-4 min-h-0 ${dark ? "bg-[#2b2c40]" : "bg-white"}`}>
              {initialLoading ? (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-2xl border p-2.5 flex flex-col justify-between h-[210px] overflow-hidden ${
                        dark ? "bg-[#232333] border-[#2b2c40]" : "bg-slate-50/70 border-slate-100"
                      }`}
                    >
                      <div className="w-full aspect-[1.35] rounded-xl glassic-blur-skeleton mb-2" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 w-3/4 rounded-md glassic-blur-skeleton" />
                        <div className="h-3 w-1/2 rounded-md glassic-blur-skeleton" />
                      </div>
                      <div className="h-4 w-1/3 rounded-md glassic-blur-skeleton mt-2" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className={`rounded-2xl border border-dashed p-12 text-center text-sm font-semibold text-slate-400 ${
                  dark ? "border-[#3b3c54] bg-[#232333]" : "border-slate-200 bg-white"
                }`}>
                  <ChefHat size={32} className="mx-auto mb-3 text-slate-400/60" />
                  No matching menu selections found.
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      productName={productNameMap.get(product.id) || product.name}
                      categoryBadge={categoryBadgeMap.get(product.id) || ""}
                      imageUrl={productImageMap.get(product.id) || ""}
                      dark={dark}
                      exchangeRate={exchangeRate}
                      language={language}
                      onAdd={handleAddProduct}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5 sm:gap-3.5">
                  {filteredProducts.map((product) => (
                    <ProductListItem
                      key={product.id}
                      product={product}
                      productName={productNameMap.get(product.id) || product.name}
                      categoryBadge={categoryBadgeMap.get(product.id) || ""}
                      imageUrl={productImageMap.get(product.id) || ""}
                      dark={dark}
                      exchangeRate={exchangeRate}
                      language={language}
                      onAdd={handleAddProduct}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: Cart / WALKIN CUSTOMER */}
          <aside className={`w-full lg:w-[340px] xl:w-[27%] xl:min-w-[340px] xl:max-w-[370px] shrink-0 rounded-2xl flex flex-col h-full overflow-hidden shadow-3xs ${
            mobileTab === "menu" ? "hidden lg:flex" : "flex"
          } ${
            dark ? "bg-[#2b2c40] border border-[#3b3c54]" : "bg-white border border-slate-200/80"
          }`}>

            {/* Editing Order Banner */}
            {editingOrder && (
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-red-500 text-white text-xs font-bold shrink-0 border-b border-red-600 shadow-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <Pencil size={14} className="shrink-0" />
                  <span className="truncate">
                    {language === "km" ? "កំពុងកែប្រែការបញ្ជាទិញ" : "Editing Order"} #{editingOrder.orderNumber || editingOrder.orderId || editingOrder.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cancelEditOrder}
                  className="p-1 rounded-md hover:bg-red-600 text-white transition-colors cursor-pointer shrink-0"
                  title="Cancel Edit"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ── Select Dining Option + Select Table ── */}
            <div className={`flex gap-2 px-4.5 py-3.5 border-b shrink-0 ${dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-100"}`}>
              <div className="relative flex-1">
                <div className="relative flex items-center">
                  <span className="absolute left-3 pointer-events-none text-slate-400 z-10">
                    {diningOption === "takeaway" ? <Package size={14} className="text-[#55a060]" /> : <Utensils size={14} className="text-[#55a060]" />}
                  </span>
                  <select
                    value={diningOption}
                    onChange={(e) => {
                      const val = e.target.value as "dine-in" | "takeaway";
                      setDiningOption(val);
                      if (val === "takeaway") {
                        setTableId(undefined);
                      }
                    }}
                    className={`h-10 w-full rounded-xl border pl-9 pr-7 text-xs font-semibold outline-none focus:border-[#55a060] transition-all appearance-none cursor-pointer ${
                      dark ? "border-[#3b3c54] bg-[#232333] text-slate-200 hover:bg-[#34354e]" : "border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700"
                    } ${language === "km" ? "font-khmer" : ""}`}
                  >
                    <option value="dine-in" className={dark ? "bg-[#232333] text-slate-200" : ""}>
                      {language === "km" ? "ញ៉ាំនៅទីនេះ (Dine In)" : "Dine In"}
                    </option>
                    <option value="takeaway" className={dark ? "bg-[#232333] text-slate-200" : ""}>
                      {language === "km" ? "ខ្ចប់ទៅផ្ទះ (Takeaway)" : "Takeaway"}
                    </option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                </div>
              </div>

              <div className="relative flex-1">
                {diningOption === "takeaway" ? (
                  <div className={`h-10 w-full rounded-xl border px-3 sm:px-3.5 flex items-center gap-2 text-xs font-bold transition-all ${
                    dark ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-300" : "border-emerald-200/90 bg-emerald-50/90 text-emerald-800"
                  }`}>
                    <Package size={15} className="text-[#55a060] shrink-0" />
                    <span className="truncate text-xs font-bold min-w-0">
                      {language === "km" ? "ខ្ចប់ទៅផ្ទះ" : "Takeaway"}
                    </span>
                    <span className="ml-auto rounded-md bg-[#55a060]/15 dark:bg-[#55a060]/25 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-[#55a060] dark:text-emerald-400 shrink-0">
                      {language === "km" ? "គ្មានតុ" : "No Table"}
                    </span>
                  </div>
                ) : (
                  <>
                    <select
                      value={tableId || ""}
                      onChange={(e) => {
                        const selectedVal = e.target.value ? Number(e.target.value) : undefined;
                        const targetTable = tables.find((t) => t.id === selectedVal);
                        if (targetTable?.reservation) {
                          showErrorToast(
                            language === "km"
                              ? `តុ ${targetTable.name} ត្រូវបានកក់ទុក! សូមធ្វើការ Check-In ភ្ញៀវជាមុនសិន។`
                              : `Table ${targetTable.name} is reserved! Please Check-In first.`
                          );
                          return;
                        }
                        setTableId(selectedVal);
                      }}
                      className={`h-10 w-full rounded-xl border pl-3.5 pr-7 text-xs font-semibold outline-none focus:border-[#55a060] transition-all appearance-none cursor-pointer ${
                        dark ? "border-[#3b3c54] bg-[#232333] text-slate-200 hover:bg-[#34354e]" : "border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700"
                      } ${language === "km" ? "font-khmer" : ""}`}
                    >
                      <option value="" className={dark ? "bg-[#232333] text-slate-200" : ""}>{language === "km" ? "ជ្រើសរើសតុ" : "Select Table"}</option>
                      {tables.map((table) => {
                        const isReserved = Boolean((table as any).reservation);
                        const baseLabel = tableNameMap.get(table.id) || table.name;
                        return (
                          <option
                            key={table.id}
                            value={table.id}
                            disabled={isReserved}
                            className={`${dark ? "bg-[#232333] text-slate-200" : ""} ${
                              isReserved ? "opacity-50 text-slate-400 bg-slate-100 dark:bg-slate-800" : ""
                            }`}
                          >
                            {isReserved
                              ? `${baseLabel} (${language === "km" ? "កក់ទុក - ត្រូវ Check-In សិន" : "Reserved - Require Check-In"})`
                              : baseLabel}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  </>
                )}
              </div>
            </div>

            {/* ── Cart Items / Empty State ── */}
            <div className={`flex-1 overflow-y-auto min-h-0 ${dark ? "bg-[#2b2c40]" : "bg-white"}`}>
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <ShoppingBag size={44} className={`mb-3 ${dark ? "text-slate-600" : "text-slate-200"}`} />
                  <span className={`text-xs font-bold ${dark ? "text-slate-300" : "text-slate-500"} ${language === "km" ? "font-khmer" : ""}`}>
                    {language === "km" ? "មិនទាន់មានទំនិញក្នុងកន្ត្រកទេ" : "Cart is empty"}
                  </span>
                  <span className={`text-[11px] text-slate-400 mt-1 ${language === "km" ? "font-khmer" : ""}`}>
                    {language === "km" ? "សូមចុចលើមុខម្ហូបដើម្បីបន្ថែម" : "Click items to add"}
                  </span>
                </div>
              ) : (
                <div className="px-4.5 py-3.5 space-y-2.5">
                  {cart.map((item) => (
                    <TicketItem
                      key={item.productId}
                      item={item}
                      dark={dark}
                      language={language}
                      exchangeRate={exchangeRate}
                      imageUrl={productImageMap.get(item.productId) || ""}
                      onIncrement={handleIncrementItem}
                      onDecrement={handleDecrementItem}
                      onRemove={handleRemoveItem}
                      onAddNote={handleSetItemNote}
                      onUpdateDiscount={handleUpdateItemDiscount}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Cart Summary Footer Block ── */}
            <div className={`p-4.5 border-t space-y-3 shrink-0 ${dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-100"}`}>
              <div className="space-y-1.5">
                <SummaryRow label={language === "km" ? "សរុបរង :" : "Sub total :"} value={money(subtotal)} dark={dark} />

                {/* 🏷️ Sleek & Clean Dynamic Discount Row */}
                <div className={`flex items-center justify-between text-xs font-semibold ${dark ? "text-slate-300" : "text-slate-600"}`}>
                  <div className={`flex items-center gap-1.5 ${language === "km" ? "font-khmer" : ""}`}>
                    <span>{language === "km" ? "បញ្ចុះតម្លៃ :" : "Discount :"}</span>
                    <div className={`relative inline-flex items-center rounded-lg border px-2 py-0.5 transition-all ${
                      discountPercent > 0
                        ? "border-[#55a060] bg-emerald-50/90 dark:bg-emerald-950/50"
                        : dark
                        ? "border-[#3b3c54] bg-[#232333] focus-within:border-[#55a060]"
                        : "border-slate-200 bg-slate-50 focus-within:border-[#55a060] focus-within:bg-white"
                    }`}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercent === 0 ? "" : discountPercent}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setDiscountPercent(0);
                          } else {
                            const num = Math.min(100, Math.max(0, Number(val)));
                            setDiscountPercent(num);
                          }
                        }}
                        placeholder="0"
                        className={`w-7 text-right text-xs font-bold bg-transparent outline-none ${
                          discountPercent > 0
                            ? "text-[#55a060] dark:text-emerald-400"
                            : dark
                            ? "text-slate-200 placeholder:text-slate-500"
                            : "text-slate-700 placeholder:text-slate-400"
                        }`}
                      />
                      <span className={`text-[11px] font-extrabold ml-0.5 ${
                        discountPercent > 0
                          ? "text-[#55a060] dark:text-emerald-400"
                          : "text-slate-400"
                      }`}>%</span>
                    </div>
                  </div>

                  <span className={discountPercent > 0 ? "font-bold text-[#55a060] dark:text-emerald-400" : "text-slate-400"}>
                    {discountPercent > 0 ? `-${money(discountAmount)}` : money(0)}
                  </span>
                </div>

                {serviceFee > 0 && <SummaryRow label={language === "km" ? "ថ្លៃសេវា :" : "Service Fee :"} value={money(serviceFee)} dark={dark} />}
                {vat > 0 && <SummaryRow label={language === "km" ? "ពន្ធ VAT :" : "VAT :"} value={money(vat)} dark={dark} />}
              </div>



              {/* ៛ Total Row with Dual Currency ($ USD + ៛ KHR) */}
              <div className={`flex items-center justify-between border-t pt-2.5 ${dark ? "border-[#3b3c54]" : "border-slate-100"}`}>
                <span className={`text-base font-bold ${dark ? "text-slate-100" : "text-slate-800"} ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "សរុបរួម :" : "Total :"}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-black text-[#55a060]">{money(total)}</span>
                  <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    ({(Math.round(total * (exchangeRate || 4000))).toLocaleString()} ៛)
                  </span>
                </div>
              </div>

              {/* Draft & Split & Send / Update Buttons Row */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={handleHoldOrder}
                  disabled={cart.length === 0 || !!editingOrder}
                  className={`flex h-10 items-center justify-center gap-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    dark ? "border-[#3b3c54] bg-[#232333] text-slate-300 hover:bg-[#34354e]" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  } ${language === "km" ? "font-khmer" : ""}`}
                >
                  <Archive size={13} /> {language === "km" ? "ព្រាង" : "Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitCount(2);
                    setPaidSplits([]);
                    setSplitOpen(true);
                  }}
                  disabled={cart.length === 0}
                  className={`flex h-10 items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    language === "km" ? "font-khmer" : ""
                  }`}
                  title={language === "km" ? "ពុះប៊ីលជាច្រើនចំណែក" : "Split Bill"}
                >
                  <Scissors size={13} /> {language === "km" ? "ពុះប៊ីល" : "Split"}
                </button>
                <button
                  type="button"
                  onClick={() => setSendKitchenModalOpen(true)}
                  disabled={cart.length === 0}
                  className={`flex h-10 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    language === "km" ? "font-khmer" : ""
                  }`}
                >
                  {editingOrder ? <Pencil size={13} /> : <ChefHat size={13} />} 
                  {editingOrder 
                    ? (language === "km" ? "កែប្រែ" : "Update") 
                    : (language === "km" ? "ផ្ញើផ្ទះបាយ" : "Kitchen")}
                </button>
              </div>

              {/* Create Receipt & Pay */}
              <button
                type="button"
                onClick={handlePayClick}
                disabled={cart.length === 0}
                className={`w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-[#55a060] hover:bg-[#439150] text-[14.5px] font-bold text-white shadow-sm shadow-[#55a060]/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  language === "km" ? "font-khmer" : ""
                }`}
              >
                <Banknote size={16} /> 
                {editingOrder 
                  ? (language === "km" ? "រក្សាទុក & ទូទាត់" : "Update & Pay") 
                  : (language === "km" ? "បង្កើតវិក្កយបត្រ & ទូទាត់" : "Create Receipt & Pay")}
              </button>
            </div>
          </aside>
        </div>
      </div>
      {/* Send Order to Kitchen Confirmation Modal */}
      {sendKitchenModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[1px] print:hidden p-4">
          <div className={`w-full max-w-[490px] overflow-hidden rounded-2xl p-7 shadow-2xl animate-[dashboardPageIn_200ms_ease-out] ${
            dark ? "bg-[#2b2c40] text-slate-100" : "bg-white text-slate-800"
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className={`text-xl font-normal tracking-tight ${dark ? "text-slate-100" : "text-slate-900"}`}>
                Send Order to Kitchen
              </h3>
              <button
                type="button"
                onClick={() => setSendKitchenModalOpen(false)}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer ${
                  dark ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Summary Rows */}
            <div className="space-y-4 text-base font-normal">
              <div className="flex items-center justify-between">
                <span className={dark ? "text-slate-300" : "text-slate-500"}>Items Net Total</span>
                <span className={`font-medium ${dark ? "text-slate-200" : "text-slate-600"}`}>{money(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={dark ? "text-slate-300" : "text-slate-500"}>Discount Total</span>
                <span className={`font-medium ${dark ? "text-slate-200" : "text-slate-600"}`}>-{money(discountAmount)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={dark ? "text-slate-300" : "text-slate-500"}>Tax Total</span>
                <span className={`font-medium ${dark ? "text-slate-200" : "text-slate-600"}`}>{money(vat)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={dark ? "text-slate-300" : "text-slate-500"}>Service Charge Total</span>
                <span className={`font-medium ${dark ? "text-slate-200" : "text-slate-600"}`}>+{money(serviceFee)}</span>
              </div>

              <div className="my-3.5 border-t border-slate-100 dark:border-slate-700/60" />

              <div className="flex items-center justify-between pt-1">
                <span className={`text-lg font-normal ${dark ? "text-slate-100" : "text-slate-900"} ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "សរុបត្រូវបង់ (Payable Total)" : "Payable Total"}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-bold text-[#55a060]">{money(total)}</span>
                  <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    ({(Math.round(total * (exchangeRate || 4000))).toLocaleString()} ៛)
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Send Button */}
            <button
              type="button"
              onClick={handleSendToKitchen}
              disabled={loading}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#55a060] hover:bg-[#478851] text-base font-bold text-white shadow-sm shadow-[#55a060]/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Sending...</span>
                </>
              ) : (
                "Send to Kitchen"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating Mobile Checkout Bar (Visible only on < lg mobile screens when cart has items) */}
      {cartCount > 0 && mobileTab === "menu" && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden animate-[dropFromTop_300ms_ease-out]">
          <button
            type="button"
            onClick={() => setMobileTab("cart")}
            className="w-full flex items-center justify-between bg-[#55a060] hover:bg-[#468750] text-white p-3.5 rounded-2xl shadow-xl shadow-[#55a060]/30 cursor-pointer active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">
                <ShoppingBag size={18} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold leading-none">{cartCount} {cartCount === 1 ? "Item" : "Items"} Added</div>
                <div className="text-[11px] opacity-90 mt-0.5">{language === "km" ? "ចុចដើម្បីមើលកន្ត្រក & គិតលុយ" : "Tap to view cart & checkout"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black">{money(total)}</span>
              <span className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold">Checkout ➔</span>
            </div>
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-[9999] w-full max-w-xs animate-[dashboardPageIn_0.3s_ease-out] rounded-xl bg-white p-3 shadow-[0_4px_20px_0_rgba(67,89,113,0.15)] ring-1 ring-slate-100 print:hidden">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#696cff]/10 text-[#696cff]">
              <Bell size={18} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs font-black text-slate-800">{toastNotification.title}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 font-medium">{toastNotification.detail}</p>
            </div>
            <button onClick={() => setToastNotification(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Collect Payment & Send to Kitchen Modal ── */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 print:hidden animate-[userModalBackdrop_180ms_ease-out]">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-none animate-[userModalIn_200ms_cubic-bezier(0.16,1,0.3,1)]">
            {/* Header: Title + Circular Close Button */}
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                Collect Payment &amp; Send to Kitchen
              </h3>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Top Summary Breakdown Card */}
            <div className="rounded-2xl bg-slate-50 border border-slate-100/90 p-4.5 space-y-2 text-xs font-semibold text-slate-500">
              <div className="flex justify-between items-center">
                <span>Items Net Total</span>
                <span className="font-bold text-slate-700">{money(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Discount Total</span>
                <span className="font-bold text-slate-700">
                  {discountAmount > 0 ? `-${money(discountAmount)}` : money(0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tax Total</span>
                <span className="font-bold text-slate-700">
                  {vat > 0 ? `+${money(vat)}` : money(0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Service Charge Total</span>
                <span className="font-bold text-slate-700">
                  {serviceFee > 0 ? `+${money(serviceFee)}` : money(0)}
                </span>
              </div>

              {/* Divider & Payable Total */}
              <div className="pt-2.5 border-t border-slate-200/60 flex justify-between items-center">
                <span className={`text-sm font-bold text-slate-800 flex items-center gap-1 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "សរុបត្រូវបង់" : "Payable Total"} <ChevronUp size={15} className="text-slate-600" />
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-black text-[#55a060]">
                    {money(total)}
                  </span>
                  <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    ({(Math.round(total * (exchangeRate || 4000))).toLocaleString()} ៛)
                  </span>
                </div>
              </div>
            </div>

            {/* Apply Discount Control Card */}
            <div className="mt-3.5 rounded-2xl bg-slate-50 border border-slate-100/90 p-3.5 space-y-2">
              <span className="block text-xs font-semibold text-slate-500">Apply Discount</span>
              <div className="flex items-center gap-2">
                {/* Fixed vs Percentage Toggle */}
                <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDiscountType("fixed")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      discountType === "fixed"
                        ? "bg-[#55a060] text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("percentage")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      discountType === "percentage"
                        ? "bg-[#55a060] text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Percentage
                  </button>
                </div>

                {/* Amount / Value Input */}
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 50"
                  value={discountValInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDiscountValInput(val);
                    const num = Number(val) || 0;
                    if (discountType === "percentage") {
                      setDiscountPercent(Math.min(100, num));
                    } else {
                      if (subtotal > 0) {
                        setDiscountPercent(Math.min(100, (num / subtotal) * 100));
                      }
                    }
                  }}
                  className="h-9 flex-1 rounded-xl border border-slate-200/80 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#55a060] placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Split Bill Option inside Payment Modal */}
            <div className="mt-3.5 flex items-center justify-between rounded-xl bg-indigo-50/60 border border-indigo-100 p-2.5">
              <span className={`text-xs text-indigo-900 font-medium ${language === "km" ? "font-khmer" : ""}`}>
                {language === "km" ? "ភ្ញៀវចង់ពុះប៊ីលជាច្រើនចំណែក?" : "Want to split bill among guests?"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPaymentModalOpen(false);
                  setSplitCount(2);
                  setPaidSplits([]);
                  setSplitOpen(true);
                }}
                className={`inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs ${
                  language === "km" ? "font-khmer" : ""
                }`}
              >
                <Scissors size={12} /> {language === "km" ? "ពុះប៊ីល" : "Split Bill"}
              </button>
            </div>

            {/* Payment Method Selector Grid (3 Cards) */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <button
                type="button"
                onClick={() => setPaymentMethod("qr")}
                className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl transition-all cursor-pointer ${
                  paymentMethod === "qr"
                    ? "border-2 border-[#55a060] bg-[#55a060]/5 text-[#55a060] shadow-2xs font-bold"
                    : "border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 font-semibold"
                }`}
              >
                <QrCode size={22} />
                <span className="text-xs">Qr</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl transition-all cursor-pointer ${
                  paymentMethod === "cash"
                    ? "border-2 border-[#55a060] bg-[#55a060]/5 text-[#55a060] shadow-2xs font-bold"
                    : "border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 font-semibold"
                }`}
              >
                <Banknote size={22} />
                <span className="text-xs">Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl transition-all cursor-pointer ${
                  paymentMethod === "card"
                    ? "border-2 border-[#55a060] bg-[#55a060]/5 text-[#55a060] shadow-2xs font-bold"
                    : "border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 font-semibold"
                }`}
              >
                <CreditCard size={22} />
                <span className="text-xs">Card</span>
              </button>
            </div>

            {/* If Cash selected: Cash Received + Change breakdown */}
            {paymentMethod === "cash" && (
              <div className="mb-4 space-y-2.5 rounded-2xl bg-slate-50 border border-slate-100 p-3.5 animate-[usersPageIn_180ms_ease-out]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Cash Received</span>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      min={total}
                      value={cashReceived || ""}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      className="h-8 w-full rounded-xl border border-slate-200 bg-white pl-6 pr-2 text-xs font-bold text-slate-800 outline-none focus:border-[#55a060]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[10, 20, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashReceived(amt)}
                      className="rounded-lg border border-slate-200 bg-white py-1 text-[11px] font-bold text-slate-600 hover:border-[#55a060] hover:text-[#55a060]"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-xs font-semibold text-slate-500">Change Due</span>
                  <span className={`text-sm font-bold ${cashReceived - total >= 0 ? "text-[#55a060]" : "text-rose-500"}`}>
                    {money(Math.max(0, cashReceived - total))}
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Primary Split Green Button */}
            <button
              type="button"
              onClick={processCheckout}
              disabled={loading || (paymentMethod === "cash" && cashReceived < total)}
              className="w-full rounded-2xl bg-[#55a060] hover:bg-[#46894f] active:scale-[0.99] text-white flex items-center justify-between px-6 py-3.5 shadow-sm shadow-[#55a060]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="text-sm font-bold">
                {loading ? "Processing Order..." : "Collect Payment & Send order to Kitchen"}
              </span>
              <div className="flex items-center justify-center border-l border-white/25 pl-3 ml-2">
                <ChevronUp size={18} />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Split Bill Modal */}
      {splitOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-[dashboardPageIn_200ms_ease-out]">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 flex items-center justify-between">
              <h3 className={`text-base font-black text-slate-800 ${language === "km" ? "font-khmer" : ""}`}>
                {language === "km" ? "ពុះប៊ីលជាច្រើនចំណែក (Split Bill)" : "Split Bill"}
              </h3>
              <button 
                onClick={() => setSplitOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-5 text-center">
                <p className={`text-xs font-bold uppercase tracking-wider text-slate-500 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ទឹកប្រាក់សរុបត្រូវបង់" : "Total Amount"}
                </p>
                <p className="text-2xl font-black text-[#696cff] leading-none mt-1.5">{money(total)}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">~ {(Math.round(total * (exchangeRate || 4000))).toLocaleString()} ៛</p>
              </div>

              {/* Split Count Selector */}
              <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <label className={`block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ចំនួនអ្នកពុះប៊ីល" : "Number of Splits"}
                </label>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    disabled={splitCount <= 2}
                    onClick={() => {
                      const next = Math.max(2, splitCount - 1);
                      setSplitCount(next);
                      setPaidSplits([]); // Reset paid splits when count changes
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-lg font-extrabold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
                  >
                    -
                  </button>
                  <span className={`text-xl font-black text-slate-800 ${language === "km" ? "font-khmer" : ""}`}>
                    {language === "km" ? `${splitCount} នាក់` : `${splitCount} Person(s)`}
                  </span>
                  <button
                    type="button"
                    disabled={splitCount >= 10}
                    onClick={() => {
                      const next = Math.min(10, splitCount + 1);
                      setSplitCount(next);
                      setPaidSplits([]); // Reset paid splits when count changes
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-lg font-extrabold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className={`mt-3 border-t border-slate-100 pt-2 flex items-center justify-between text-xs font-bold text-slate-600 ${language === "km" ? "font-khmer" : ""}`}>
                  <span>{language === "km" ? "ម្នាក់ៗត្រូវបង់ :" : "Each Pays:"}</span>
                  <span className="text-sm font-black text-emerald-600">{money(total / splitCount)}</span>
                </div>
              </div>

              {/* Splits List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {Array.from({ length: splitCount }).map((_, idx) => {
                  const isPaid = paidSplits.includes(idx);
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                        isPaid 
                          ? "border-emerald-100 bg-emerald-50/40" 
                          : "border-slate-100 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isPaid ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                          {idx + 1}
                        </div>
                        <span className={`text-xs font-bold text-slate-700 ${language === "km" ? "font-khmer" : ""}`}>
                          {language === "km" ? `ចំណែកទី #${idx + 1}` : `Split #${idx + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-slate-800">{money(total / splitCount)}</span>
                        {isPaid ? (
                          <span className={`rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700 uppercase ${language === "km" ? "font-khmer" : ""}`}>
                            {language === "km" ? "✓ បានបង់" : "✓ Paid"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSplitIndex(idx);
                              setSplitCashReceived(total / splitCount);
                              setSplitPaymentMethod("cash");
                              setSplitPaymentOpen(true);
                            }}
                            className={`rounded-lg bg-[#696cff] px-3 py-1 text-[10px] font-black text-white hover:bg-[#5f61e6] active:scale-95 transition-all cursor-pointer ${language === "km" ? "font-khmer" : ""}`}
                          >
                            {language === "km" ? "បង់លុយ" : "Pay"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 p-4">
              <button 
                onClick={() => setSplitOpen(false)}
                className={`rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer ${language === "km" ? "font-khmer" : ""}`}
              >
                {language === "km" ? "បិទ" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Payment Modal */}
      {splitPaymentOpen && selectedSplitIndex !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs print:hidden">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-[dashboardPageIn_180ms_ease-out]">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 flex items-center justify-between">
              <h3 className={`text-sm font-black text-slate-800 ${language === "km" ? "font-khmer" : ""}`}>
                {language === "km" ? `បង់ប្រាក់ចំណែកទី #${selectedSplitIndex + 1}` : `Pay Split #${selectedSplitIndex + 1}`}
              </h3>
              <button 
                onClick={() => setSplitPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-4 text-center">
                <p className={`text-[10px] font-bold uppercase tracking-wider text-slate-500 ${language === "km" ? "font-khmer" : ""}`}>
                  {language === "km" ? "ចំណែកត្រូវបង់" : "Split Share"}
                </p>
                <p className="text-2xl font-black text-[#696cff] leading-none mt-1">{money(total / splitCount)}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">~ {(Math.round((total / splitCount) * (exchangeRate || 4000))).toLocaleString()} ៛</p>
              </div>

              <div className="mb-4 flex gap-1.5">
                <button 
                  onClick={() => setSplitPaymentMethod("cash")}
                  className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${splitPaymentMethod === 'cash' ? 'border-[#696cff] bg-[#696cff]/5 text-[#696cff]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'} ${language === "km" ? "font-khmer" : ""}`}
                >
                  {language === "km" ? "💵 សាច់ប្រាក់" : "💵 Cash"}
                </button>
                <button 
                  onClick={() => setSplitPaymentMethod("qr")}
                  className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${splitPaymentMethod === 'qr' ? 'border-[#696cff] bg-[#696cff]/5 text-[#696cff]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'} ${language === "km" ? "font-khmer" : ""}`}
                >
                  {language === "km" ? "📱 ស្កេន QR" : "📱 QR Code"}
                </button>
              </div>

              {splitPaymentMethod === "cash" && (
                <div className="space-y-3 animate-[usersPageIn_180ms_ease-out]">
                  <div>
                    <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 ${language === "km" ? "font-khmer" : ""}`}>
                      {language === "km" ? "ប្រាក់ទទួលបាន" : "Cash Received"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={splitCashReceived || ""}
                        onChange={(e) => setSplitCashReceived(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-4 text-sm font-black text-slate-800 outline-none focus:border-[#696cff] focus:ring-2 focus:ring-[#696cff]/10"
                      />
                    </div>
                  </div>

                  {/* Quick Cash Presets */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: language === "km" ? "គ្រប់" : "Exact", val: total / splitCount },
                      { label: "$5", val: 5 },
                      { label: "$10", val: 10 },
                      { label: "$20", val: 20 },
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSplitCashReceived(btn.val)}
                        className="rounded-lg bg-slate-50 py-1.5 text-[10px] font-extrabold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-100 cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Change calculation */}
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider text-slate-500 ${language === "km" ? "font-khmer" : ""}`}>
                      {language === "km" ? "ប្រាក់អាប់" : "Change"}
                    </span>
                    <div className="text-right">
                      <div className={`text-base leading-none font-black ${splitCashReceived - (total / splitCount) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {money(Math.max(0, splitCashReceived - (total / splitCount)))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {splitPaymentMethod === "qr" && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-4 animate-[usersPageIn_180ms_ease-out]">
                  <div className="mb-2 rounded-xl bg-white p-1.5 shadow-sm">
                    <div className="h-24 w-24 bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=KHQR')] bg-contain bg-center bg-no-repeat opacity-85" />
                  </div>
                  <p className={`text-[10px] font-bold text-slate-500 ${language === "km" ? "font-khmer" : ""}`}>
                    {language === "km" ? "ស្កេនដើម្បីបង់ចំណែកនេះ" : "Scan to pay split share"}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-slate-100 bg-slate-50/50 p-4">
              <button 
                onClick={() => setSplitPaymentOpen(false)}
                className={`flex-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all cursor-pointer ${language === "km" ? "font-khmer" : ""}`}
              >
                {language === "km" ? "បោះបង់" : "Cancel"}
              </button>
              <button 
                disabled={splitPaymentMethod === 'cash' && splitCashReceived < (total / splitCount)}
                onClick={async () => {
                  const updatedPaid = [...paidSplits, selectedSplitIndex];
                  setPaidSplits(updatedPaid);
                  setSplitPaymentOpen(false);
                  
                  // Check if this was the last split
                  if (updatedPaid.length === splitCount) {
                    setLoading(true);
                    try {
                      // Submit payment via normal processCheckout
                      await processCheckout();
                      setMessage(language === "km" ? "ការបង់ប្រាក់គ្រប់ចំណែកបានជោគជ័យ! បញ្ចប់ការលក់។" : "All splits paid successfully! Order completed.");
                      setSplitOpen(false);
                    } catch (e) {
                      setMessage(e instanceof Error ? e.message : "Failed to finalize order");
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                className={`flex-[2] rounded-xl bg-[#696cff] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#5f61e6] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all cursor-pointer ${language === "km" ? "font-khmer" : ""}`}
              >
                {language === "km" ? "យល់ព្រមបង់" : "Confirm Split Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Draft Modal */}
      {saveDraftModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/30 print:hidden">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white p-6 shadow-none animate-[dashboardPageIn_200ms_ease-out]">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              {language === "km" ? "រក្សាទុកការកុម្ម៉ង់ជា Draft" : "Save cart items to draft"}
            </h3>

            <div className="mb-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-600">
                  {language === "km" ? "ឈ្មោះសម្គាល់ (Reference)" : "Reference"}
                </label>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                  {language === "km" ? "បង្កើតស្វ័យប្រវត្តិ" : "Auto-Generated"}
                </span>
              </div>
              <input
                type="text"
                value={draftRefInput}
                onChange={(e) => setDraftRefInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmSaveDraft();
                }}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. #DFT-1025 • Table 02 • 10:55 PM"
                autoFocus
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#55a060] focus:ring-2 focus:ring-[#55a060]/10 transition-all shadow-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {language === "km" ? "💡 អ្នកអាចរក្សាទុកឈ្មោះនេះ ឬវាយកែប្រែបន្ថែមបានតាមចិត្ត" : "💡 You can keep this reference or edit it freely."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSaveDraftModalOpen(false)}
                className="rounded-lg bg-slate-100/90 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/80 active:scale-95 transition-all cursor-pointer"
              >
                {language === "km" ? "បិទ" : "Close"}
              </button>
              <button
                type="button"
                onClick={confirmSaveDraft}
                className="rounded-lg bg-[#55a060] px-6 py-2 text-xs font-semibold text-white hover:bg-[#439150] active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                {language === "km" ? "រក្សាទុក (Save)" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drafts Modal */}
      {heldModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 print:hidden">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white p-6 shadow-none animate-[dashboardPageIn_200ms_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Drafts
              </h3>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button"
                  onClick={() => setHeldModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div>
              {heldOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-12 text-center text-xs font-semibold text-slate-400">
                  <Archive size={32} className="mx-auto mb-2 text-slate-300" />
                  <span>No saved drafts found.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[420px] overflow-y-auto pr-1">
                  {heldOrders.map((order: any) => {
                    const totalQty = (order.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
                    const formattedDate = new Date(order.id).toLocaleString([], {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    });
                    const displayRef = order.refName || order.tableName || `Draft #${order.ticketNumber}`;

                    return (
                      <div 
                        key={order.id}
                        className="rounded-2xl border border-slate-200/90 bg-white p-4 flex items-center justify-between gap-3 shadow-3xs hover:border-emerald-300 hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Circular Gray Icon */}
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            <ClipboardList size={22} />
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate" title={displayRef}>
                              Ref: {displayRef}
                            </div>
                            <div className="text-xs font-semibold text-slate-500 mt-0.5">
                              {totalQty} Cart Item{totalQty > 1 ? 's' : ''}
                            </div>
                            <div className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                              {formattedDate}
                            </div>
                          </div>
                        </div>

                        {/* Action Icon Buttons */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRecallOrder(order)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 active:scale-95 transition-all cursor-pointer"
                            title="Edit / Recall Draft"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscardHeldOrder(order.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 active:scale-95 transition-all cursor-pointer"
                            title="Delete Draft"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Thermal Receipt Printer Layout */}
      {lastReceipt && (
        <div className="hidden print:block w-[80mm] max-w-[80mm] mx-auto bg-white text-black font-mono text-[12px] leading-tight pb-10">
          <div className="text-center mb-4 pt-2">
            <h2 className="text-lg font-bold uppercase">{posName}</h2>
            <p className="text-[11px] font-bold mt-1">Receipt #{lastReceipt.ticketNumber}</p>
            <p className="text-[11px]">{lastReceipt.date.toLocaleString()}</p>
            <p className="text-[11px] mt-1 font-bold">Order: {lastReceipt.table}</p>
          </div>
          <div className="border-t border-dashed border-slate-500 my-2" />
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="border-b border-dashed border-slate-500">
                <th className="py-1 w-10">Qty</th>
                <th className="py-1 text-left truncate">Item</th>
                <th className="py-1 text-right w-16">Amt</th>
              </tr>
            </thead>
            <tbody>
              {lastReceipt.items.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="py-1 align-top">{item.quantity}x</td>
                  <td className="py-1 align-top pr-1 text-left truncate">{item.name}</td>
                  <td className="py-1 align-top text-right">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-dashed border-slate-500 my-2" />
          <div className="space-y-1 text-right text-[11px]">
            <div className="flex justify-between"><span className="text-left font-medium">Subtotal</span><span>${lastReceipt.subtotal.toFixed(2)}</span></div>
            {lastReceipt.discountAmount > 0 && <div className="flex justify-between"><span className="text-left font-medium">Discount</span><span>-${lastReceipt.discountAmount.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-left font-medium">Service</span><span>${lastReceipt.serviceFee.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-left font-medium">VAT</span><span>${lastReceipt.vat.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-[15px] mt-1 pt-1 border-t border-slate-500">
              <span className="text-left">Total</span>
              <span>${lastReceipt.total.toFixed(2)}</span>
            </div>
          </div>
          <div className="border-t border-dashed border-slate-500 my-2" />
          <div className="text-center text-[11px] mt-4 space-y-1">
            <p className="font-bold">Paid via {lastReceipt.paymentMethod.toUpperCase()}</p>
            {lastReceipt.paymentMethod === 'cash' && (
               <p className="mt-1">
                 Cash: ${lastReceipt.cashReceived.toFixed(2)} | Change: ${(lastReceipt.cashReceived - lastReceipt.total).toFixed(2)}
               </p>
            )}
            <p className="mt-6 font-bold text-sm">Thank you for your visit!</p>
            <p className="text-[10px] mt-1 opacity-70">Powered by Antigravity POS</p>
          </div>
        </div>
      )}

      {/* CASHIER LOGIN SUCCESS POP-UP TOAST */}
      {loginSuccessToast && (
        <div className="fixed top-6 left-0 right-0 z-[99999] flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto flex items-center gap-3 py-2.5 px-4.5 rounded-xl bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-[13px] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100/80 dark:border-slate-850 animate-[dropFromTop_400ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="h-5 w-5 rounded-full bg-[#48cf38] flex items-center justify-center text-white shrink-0">
              <Check size={11} strokeWidth={4.5} className="text-white" />
            </div>
            <span>Login successful!</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes dropFromTop {
          0% { transform: translateY(-100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* CASHIER LOGOUT POP-UP MODAL — Admin Dashboard Style */}
      {showLogoutModal && (
        <div
          onClick={() => setShowLogoutModal(false)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 cursor-pointer animate-[posLogoutBackdrop_180ms_ease-out]"
          style={{ background: "rgba(30,30,50,0.35)", backdropFilter: "blur(2px)" }}
        >
          <style>{`
            @keyframes posLogoutBackdrop {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes posLogoutCard {
              from { opacity: 0; transform: translateY(8px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm cursor-default overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-[posLogoutCard_200ms_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                <LogOut size={20} strokeWidth={2} />
              </div>
              <div className="pt-0.5">
                <h3 className="text-sm font-bold text-slate-800 leading-snug">
                  Confirm Logout
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Are you sure you want to log out of your session?
                </p>
              </div>
            </div>

            {/* ── Actions ────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2.5 px-6 py-5">
              {/* Primary — Logout */}
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("pos_logged_in");
                  localStorage.removeItem("pos_token");
                  localStorage.removeItem("pos_user");
                  localStorage.setItem("pos_logout_success_alert", JSON.stringify({ timestamp: Date.now() }));
                  window.location.href = "/login";
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-red-700 active:scale-[0.98] cursor-pointer"
              >
                <LogOut size={14} className="shrink-0" />
                Logout
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Map Selection Modal */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-[dashboardPageIn_200ms_ease-out] flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800 font-khmer flex items-center gap-2">
                  <MapPin size={18} className="text-[#696cff]" />
                  ជ្រើសរើសតុ ឬ ប្រភេទសេវាកម្ម / Select Table or Service Type
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">
                  សូមជ្រើសរើសតុសម្រាប់អង្គុយពិសា ឬ ជ្រើសរើសវេចខ្ចប់ដើម្បីចាប់ផ្តើមកម្ម៉ង់។
                </p>
              </div>
              {/* Show close button only if a table has been chosen or they already started takeaway */}
              {(tableId !== undefined || cart.length > 0 || selectedTable) && (
                <button
                  onClick={() => setTableModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Takeaway / Walk-in Option Card */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setTableId(undefined);
                    setTableModalOpen(false);
                  }}
                  className={`w-full max-w-md flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-all duration-200 active:scale-[0.99] cursor-pointer ${
                    tableId === undefined
                      ? "border-[#696cff] bg-[#696cff]/5 text-[#696cff] ring-2 ring-[#696cff]"
                      : "border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-2xl">🛍️</span>
                  <div className="text-xs font-black uppercase tracking-wider">
                    វេចខ្ចប់ / Walk-in / Takeaway
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    គិតលុយ និង ខ្ចប់យកទៅផ្ទះ (No Table Assigned)
                  </div>
                </button>
              </div>

              {/* Table Zones & Tables Grid */}
              <div className="space-y-6">
                {/* Dynamically group tables by zone */}
                {["indoor"].map((zone) => {
                  const zoneTables = tables.filter((t) => t.zone.toLowerCase() === zone);
                  if (zoneTables.length === 0) return null;

                  return (
                    <div key={zone} className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 capitalize">
                        📍 Zone: {language === "km" ? "ខាងក្នុង (Indoor)" : "Indoor"}
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {zoneTables.map((table) => {
                          const isSelected = tableId === table.id;
                          return (
                            <button
                              key={table.id}
                              type="button"
                              onClick={() => {
                                setTableId(table.id);
                                setTableModalOpen(false);
                              }}
                              className={`flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all duration-200 active:scale-[0.97] cursor-pointer hover:shadow-xs ${
                                isSelected
                                  ? "border-[#696cff] bg-[#696cff]/5 text-[#696cff] ring-2 ring-[#696cff]"
                                  : "border-slate-100 bg-white text-slate-600 hover:border-[#696cff]/40 hover:bg-slate-50/40"
                              }`}
                            >
                              <span className="text-xl mb-1">🪑</span>
                              <div className="text-xs font-black leading-snug">{table.name}</div>
                              <div className="text-[9.5px] font-semibold text-slate-400 mt-1">
                                {table.capacity} Seats
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer with a quick instructions note */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 flex items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 text-center">
                * ការជ្រើសរើសតុជួយទប់ស្កាត់កំហុសក្នុងការបញ្ជូនការកុម្មង់ទៅចង្ក្រានបាយ (KDS)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Real-Time QR Menu Orders Modal ── */}
      {qrOrdersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 print:hidden animate-[userModalBackdrop_180ms_ease-out]">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white p-6 shadow-none animate-[userModalIn_220ms_cubic-bezier(0.16,1,0.3,1)]">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                QR Orders
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setQrOrdersModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {/* Orders Grid Content */}
            <div>
              {activeQrOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-12 text-center text-xs font-semibold text-slate-400">
                  <QrCode size={32} className="mx-auto mb-2 text-slate-300" />
                  <span>{language === "km" ? "មិនមានការកុម្ម៉ង់ QR Menu សកម្មទេ។" : "No active QR Menu orders found."}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[440px] overflow-y-auto pr-1">
                  {activeQrOrders.map((order: any) => {
                    const items = Array.isArray(order.items) ? order.items : [];
                    const totalQty = items.reduce((sum: number, i: any) => sum + Number(i.quantity || 1), 0);
                    const tableName = order.table?.name || (order.tableId ? `P${order.tableId}` : "P2");
                    const customerName = order.customerName || order.userName || order.refName || "WALKIN";

                    return (
                      <div 
                        key={order.id}
                        className="rounded-2xl border border-slate-200/80 bg-white p-3.5 flex items-center justify-between gap-3 shadow-3xs hover:border-emerald-300 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Circular Gray Clipboard Icon */}
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            <ClipboardList size={22} />
                          </div>

                          {/* Info Column */}
                          <div className="min-w-0 space-y-0.5">
                            {/* Table */}
                            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 truncate">
                              <Armchair size={13} className="shrink-0 text-slate-400" />
                              <span className="truncate">{tableName}</span>
                            </div>
                            {/* Customer */}
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                              <User size={13} className="shrink-0 text-slate-400" />
                              <span className="truncate">{customerName}</span>
                            </div>
                            {/* Cart Items count */}
                            <div className="text-xs font-semibold text-slate-500">
                              {totalQty} Cart Item{totalQty > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Right Action Icons Column */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadQrOrderToCart(order)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 active:scale-95 transition-all cursor-pointer"
                            title="Load to Cart / Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteQrOrderTarget(order)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel QR Order Confirmation Modal ── */}
      {deleteQrOrderTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/30 print:hidden animate-[userModalBackdrop_180ms_ease-out]">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-none animate-[userModalIn_200ms_cubic-bezier(0.16,1,0.3,1)]">
            {/* Header / Alert Icon + Title */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                {/* Red warning triangle icon container */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 border border-red-100/60">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 leading-snug">
                    Cancel QR Order
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">
                    Are you sure? This process is irreversible!
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setDeleteQrOrderTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-2">
              <button
                type="button"
                onClick={() => setDeleteQrOrderTarget(null)}
                className="rounded-xl bg-slate-50 border border-slate-100 px-6 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (deleteQrOrderTarget) {
                    const targetId = deleteQrOrderTarget.id;
                    setQrOrders((prev) => prev.filter((o) => o.id !== targetId));
                    setDeleteQrOrderTarget(null);
                    try {
                      await deleteOrder(targetId);
                      const socket = getSocket();
                      if (socket) {
                        socket.emit("order:deleted", { id: targetId });
                      }
                    } catch (err) {
                      console.error("Delete order failed", err);
                    }
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new Event("pos-order-deleted"));
                    }
                    setMessage(`Order ${deleteQrOrderTarget.orderNumber || `#${targetId}`} cancelled successfully.`);
                  }
                }}
                className="rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
              >
                Yes, Delete!
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── THERMAL PRINT RECEIPT & KOT SLIP MODAL (Matching User Image Format) ── */}
      {printSlipModalOpen && printSlipData && typeof window !== "undefined" && (() => {
        const formattedOrderNo = (() => {
          if (printSlipData.orderId) {
            return `#${String(printSlipData.orderId).padStart(4, "0")}`;
          }
          const numStr = String(printSlipData.orderNumber || "");
          if (numStr.startsWith("#")) return numStr;
          if (/^\d+$/.test(numStr)) return `#${numStr.padStart(4, "0")}`;
          const match = numStr.match(/(\d+)$/);
          if (match) {
            return `#${match[1].slice(-4).padStart(4, "0")}`;
          }
          return `#${numStr}`;
        })();

        return createPortal(
          <div 
            onClick={() => setPrintSlipModalOpen(false)}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[2px] animate-[usersPageIn_180ms_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[380px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 text-slate-800 shadow-2xl transition-all font-mono"
            >
              {/* Modal Controls (Print & Close) */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden font-sans">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {printSlipData.type === "kitchen"
                    ? "PRINT KITCHEN SLIP (KOT)"
                    : printSlipData.type === "invoice"
                      ? "PRINT INVOICE PREVIEW"
                      : "PRINT RECEIPT PREVIEW"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#55a060] hover:bg-[#46894f] px-3 py-1.5 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
                  >
                    <Printer size={14} /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintSlipModalOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Printable Thermal Receipt Area (Soft Clean Typography) */}
              <div id="thermal-print-area" className="text-xs text-slate-800 leading-normal font-sans font-khmer">
                {printSlipData.type === "kitchen" ? (
                  <div className="space-y-3 font-sans font-khmer">
                    {/* Kitchen Slip Header */}
                    <div className="text-center pb-2 border-b-2 border-dashed border-slate-300">
                      <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                        KITCHEN ORDER TICKET (KOT)
                      </h2>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                        {posName || "POS Kitchen"}
                      </p>
                    </div>

                    {/* Table / Customer Highlight (Prominent for Chef & Waiter) */}
                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                        តុ / TABLE
                      </span>
                      <span className="text-base font-black text-slate-900 block mt-0.5 font-khmer">
                        {printSlipData.customer}
                      </span>
                    </div>

                    {/* Order Metadata */}
                    <div className="space-y-1 text-xs px-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Order No:</span>
                        <span className="font-bold text-slate-900">{formattedOrderNo}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">ប្រភេទ / Type:</span>
                        <span className="font-bold text-slate-800">{printSlipData.orderType}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">ម៉ោងកុម្ម៉ង់ / Time:</span>
                        <span className="font-semibold text-slate-700">
                          {new Date(printSlipData.createdAt).toLocaleDateString("en-US", {
                            month: "numeric",
                            day: "numeric",
                            year: "numeric",
                          })},{" "}
                          {new Date(printSlipData.createdAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                      {currentUserName && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">អ្នកកុម្ម៉ង់ / Server:</span>
                          <span className="font-semibold text-slate-700">{currentUserName}</span>
                        </div>
                      )}
                    </div>

                    {/* Dashed Separator */}
                    <div className="border-b-2 border-dashed border-slate-300 my-2" />

                    {/* Dish List Header */}
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200">
                      <span className="w-14">ចំនួន (QTY)</span>
                      <span className="flex-1">មុខម្ហូប (ITEM)</span>
                    </div>

                    {/* Dish Items (Big bold quantity, clean dish name, visible note) */}
                    <div className="space-y-2.5 pt-1">
                      {printSlipData.items.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-start">
                            <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded bg-slate-900 text-white text-xs font-black mr-2.5 shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="flex-1 leading-snug font-khmer text-xs font-bold text-slate-900 pt-0.5">
                              {item.name}
                            </span>
                          </div>
                          {item.notes && (
                            <div className="ml-9 text-[11px] text-amber-900 font-bold bg-amber-50 px-2.5 py-0.5 rounded border border-amber-300 font-khmer inline-block">
                              * ចំណាំ: {item.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Dashed Separator */}
                    <div className="border-b-2 border-dashed border-slate-300 my-2" />

                    {/* Total Items Count */}
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800 px-0.5">
                      <span>សរុបមុខម្ហូប (Total Dishes):</span>
                      <span className="text-sm font-black text-slate-900">
                        {printSlipData.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)} ចាន / កែវ
                      </span>
                    </div>

                    {/* Footer Stamp */}
                    <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-3 border-t border-dashed border-slate-200">
                      *** KITCHEN ORDER TICKET (KOT) ***
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Logo / Store Header */}
                    <div className="text-center">
                      {restaurantImageUrl ? (
                        <img loading="lazy" src={resolveImageUrl(restaurantImageUrl)} alt="Logo" className="h-12 w-12 object-contain mx-auto mb-1.5" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F522B] text-white font-bold text-sm mx-auto mb-1.5">
                          {posName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <h2 className="text-sm font-bold tracking-tight text-slate-800 font-khmer">{posName}</h2>
                      {restaurantAddress && (
                        <p className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">
                          {restaurantAddress}
                        </p>
                      )}
                      {(restaurantPhone || restaurantEmail) && (
                        <p className="text-[11px] text-slate-500 font-normal leading-tight">
                          {restaurantPhone ? `Phone: ${restaurantPhone}` : ""}{restaurantPhone && restaurantEmail ? ", " : ""}{restaurantEmail ? `Email: ${restaurantEmail}` : ""}
                        </p>
                      )}
                      {showVatTin && vatTin && (
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                          VAT TIN: {vatTin}
                        </p>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-200">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          {printSlipData.type === "invoice"
                            ? (invoiceHeaderTitle || "TAX INVOICE")
                            : (receiptHeaderTitle || "RECEIPT")}
                        </h3>
                      </div>

                      {((printSlipData.type === "invoice" && showCustomerInfoOnInvoice) || (printSlipData.type !== "invoice" && showTableInfo)) && (
                        <div className="mt-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-md inline-block">
                          {printSlipData.customer}
                        </div>
                      )}
                    </div>

                    {/* Order Metadata */}
                    <div className="mt-3.5 space-y-1 text-xs">
                      {showTableInfo && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-normal">Order Type:</span>
                          <span className="font-semibold text-slate-800">{printSlipData.orderType}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-normal">
                          {printSlipData.type === "invoice" ? "Invoice No.:" : "Receipt No.:"}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formattedOrderNo}
                        </span>
                      </div>
                      {showCashierName && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-normal">Cashier:</span>
                          <span className="font-semibold text-slate-800">{currentUserName}</span>
                        </div>
                      )}
                      <div className="text-slate-400 text-[11px] text-right font-normal mt-0.5">
                        {new Date(printSlipData.createdAt).toLocaleDateString("en-US", {
                          month: "numeric",
                          day: "numeric",
                          year: "numeric",
                        })},{" "}
                        {new Date(printSlipData.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })}
                      </div>
                    </div>

                    {/* Dashed Line */}
                    <div className="my-2.5 border-b border-dashed border-slate-200" />

                    {/* Dishes Itemized Breakdown */}
                    <div className="space-y-2">
                      {printSlipData.items.map((item, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between items-baseline text-xs font-medium text-slate-800">
                            <span className="flex-1 pr-2 leading-snug">{item.name}</span>
                            <span className="font-semibold text-slate-900">{money(item.unitPrice * item.quantity)}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal">
                            {item.quantity}x {money(item.unitPrice)}
                          </div>
                          {item.notes && (
                            <div className="text-[10.5px] text-amber-700 font-normal italic pl-1.5 border-l border-amber-300 mt-0.5">
                              Note: {item.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Dashed Line */}
                    <div className="my-2.5 border-b border-dashed border-slate-200" />

                    {/* Financial Totals */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center text-slate-600 font-normal">
                        <span>Subtotal (excl. tax):</span>
                        <span className="font-semibold text-slate-800">{money(printSlipData.subtotal)}</span>
                      </div>
                      {printSlipData.vat > 0 && (
                        <div className="flex justify-between items-center text-slate-600 font-normal">
                          <span>Tax:</span>
                          <span className="font-semibold text-slate-800">{money(printSlipData.vat)}</span>
                        </div>
                      )}
                      {printSlipData.serviceFee > 0 && (
                        <div className="flex justify-between items-center text-slate-600 font-normal">
                          <span>Service Charge:</span>
                          <span className="font-semibold text-slate-800">{money(printSlipData.serviceFee)}</span>
                        </div>
                      )}
                      {printSlipData.discountAmount > 0 && (
                        <div className="flex justify-between items-center text-emerald-600 font-normal">
                          <span>Discount:</span>
                          <span className="font-semibold">-{money(printSlipData.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 text-sm font-bold border-t border-slate-200 text-slate-800 mt-1">
                        <span>{printSlipData.type === "invoice" ? "Total:" : "Total (PAID):"}</span>
                        <span className="text-base text-[#55a060] font-bold">{money(printSlipData.total)}</span>
                      </div>
                      <div className="text-right text-[10.5px] text-slate-400 font-normal mt-0.5">
                        ~ {(printSlipData.total * (exchangeRate || 4000)).toLocaleString()} ៛
                      </div>
                    </div>

                    {/* Footer Note / Terms */}
                    {printSlipData.type === "invoice" ? (
                      invoiceTerms ? (
                        <>
                          <div className="my-3 border-b border-dashed border-slate-200" />
                          <div className="text-[10.5px] text-slate-500 font-normal leading-relaxed whitespace-pre-line">
                            <p className="font-semibold text-slate-700 mb-0.5">Terms & Conditions:</p>
                            {invoiceTerms}
                          </div>
                        </>
                      ) : null
                    ) : (
                      receiptFooterText ? (
                        <>
                          <div className="my-3 border-b border-dashed border-slate-200" />
                          <div className="text-center text-xs font-normal text-slate-500 space-y-0.5">
                            <p>{receiptFooterText}</p>
                          </div>
                        </>
                      ) : null
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </main>
  );

  if (isAdminView) {
    return mainContent;
  }

  return (
    <div suppressHydrationWarning className="h-screen w-screen bg-white">
      {mainContent}
    </div>
  );
}

const PosPage = memo(PosPageComponent);
export default PosPage;

const ProductCard = memo(
  function ProductCard({
    product,
    productName,
    categoryBadge,
    imageUrl,
    dark,
    exchangeRate = 4000,
    language = "en",
    onAdd,
  }: {
    product: Product;
    productName: string;
    categoryBadge?: string;
    imageUrl?: string;
    dark?: boolean;
    exchangeRate?: number;
    language?: "en" | "km" | string;
    onAdd: (product: Product) => void;
  }) {
    const unavailable = !product.isAvailable;
    const [imgFailed, setImgFailed] = useState(false);

    return (
      <button
        type="button"
        onClick={() => onAdd(product)}
        disabled={unavailable}
        className={`group relative overflow-hidden rounded-2xl border text-left shadow-2xs hover:shadow-sm active:scale-[0.97] transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60 flex flex-col justify-between cursor-pointer [contain:paint] ${
          dark ? "bg-[#232333] border-[#2b2c40] text-slate-100 hover:border-[#3b3c54]" : "bg-white border-slate-200/90 text-slate-800 hover:border-slate-300"
        }`}
      >
        {/* Product Image Cover */}
        <div className={`w-full aspect-[1.35] relative overflow-hidden shrink-0 border-b flex items-center justify-center ${
          dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-slate-50 border-slate-100"
        }`}>
          {categoryBadge && (
            <span className="absolute top-0 left-0 bg-[#55a060] text-white text-[9.5px] font-bold px-2.5 py-1 rounded-br-lg z-10">
              {categoryBadge}
            </span>
          )}

          {imageUrl && !imgFailed ? (
            <img loading="lazy"
              src={imageUrl}
              alt={productName}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover transition-opacity duration-150 group-hover:opacity-95"
            />
          ) : (
            <div className={`flex h-full w-full flex-col items-center justify-center ${dark ? "bg-[#2b2c40] text-slate-400" : "bg-slate-50 text-slate-300"}`}>
              <Utensils size={24} className="text-slate-400/80 mb-1" />
              <span className="text-[8.5px] font-bold text-slate-400/80 uppercase tracking-widest font-brand">No Photo</span>
            </div>
          )}

          {/* Plus Button Overlay */}
          {!unavailable && (
            <span className="absolute bottom-2 right-2 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-[#55a060] text-white shadow-2xs hover:bg-[#439150] active:scale-90 transition-colors">
              <Plus size={13} className="stroke-[3]" />
            </span>
          )}

          {/* Unavailable overlay */}
          {unavailable && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-extrabold text-white uppercase tracking-wider shadow-md">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Card Content Body */}
        <div className="p-2.5 w-full flex-1 flex flex-col justify-between">
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {product.trackStock && product.inventory && Number(product.inventory.quantity) <= Number(product.inventory.minStock) && (
                <div className="flex items-center gap-1 bg-[#fdf8e2] border border-[#fbeba5] text-[#b38f00] text-[9.5px] font-bold px-2 py-0.5 rounded mb-1.5">
                  <AlertTriangle size={9.5} className="text-[#e6b800] shrink-0" />
                  <span>Low Stock - {Number(product.inventory.quantity)} Qty</span>
                </div>
              )}

              <h3 className={`line-clamp-1 text-[12.5px] font-semibold leading-snug font-khmer ${
                dark ? "text-slate-100" : "text-slate-800"
              }`}>
                {productName}
              </h3>

              {/* Reserved Middle Slot for Stock Info */}
              <div className="min-h-[6px] flex items-center mt-0.5" />
            </div>

            {/* Price ALWAYS aligned at the bottom with Dual Currency ($ USD + ៛ KHR) */}
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <span className="text-[12.5px] font-black text-[#55a060]">
                {money(product.basePrice)}
              </span>
              <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-400">
                {(Math.round(Number(product.basePrice || 0) * exchangeRate)).toLocaleString()} ៛
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  },
  (prev, next) =>
    prev.product.id === next.product.id &&
    prev.dark === next.dark &&
    prev.exchangeRate === next.exchangeRate &&
    prev.language === next.language &&
    prev.product.isAvailable === next.product.isAvailable &&
    prev.product.basePrice === next.product.basePrice &&
    prev.productName === next.productName &&
    prev.categoryBadge === next.categoryBadge &&
    prev.imageUrl === next.imageUrl &&
    prev.product.trackStock === next.product.trackStock &&
    prev.product.inventory?.quantity === next.product.inventory?.quantity &&
    prev.onAdd === next.onAdd
);

const ProductListItem = memo(
  function ProductListItem({
    product,
    productName,
    categoryBadge,
    imageUrl,
    dark,
    exchangeRate = 4000,
    language = "en",
    onAdd,
  }: {
    product: Product;
    productName: string;
    categoryBadge?: string;
    imageUrl?: string;
    dark?: boolean;
    exchangeRate?: number;
    language?: "en" | "km" | string;
    onAdd: (product: Product) => void;
  }) {
    const unavailable = !product.isAvailable;
    const [imgFailed, setImgFailed] = useState(false);

    return (
      <button
        type="button"
        onClick={() => !unavailable && onAdd(product)}
        disabled={unavailable}
        className={`group relative flex overflow-hidden rounded-xl border text-left shadow-2xs transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out h-[105px] w-full cursor-pointer active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 [contain:paint] ${
          dark
            ? "bg-[#232333] border-[#2b2c40] text-slate-100 hover:border-[#55a060]/60 hover:bg-[#282a3d]"
            : "bg-white border-slate-200/90 text-slate-800 hover:border-[#55a060]/50 hover:bg-slate-50/80"
        }`}
      >
        {/* Product Image Cover (Clickable Left Side) */}
        <div
          className={`w-[110px] sm:w-[120px] relative overflow-hidden shrink-0 border-r flex items-center justify-center cursor-pointer ${
            dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-slate-50 border-slate-100"
          }`}
        >
          {categoryBadge && (
            <span className="absolute top-0 left-0 bg-[#55a060] text-white text-[9px] font-bold px-2 py-0.5 rounded-br-md z-10">
              {categoryBadge}
            </span>
          )}

          {imageUrl && !imgFailed ? (
            <img loading="lazy"
              src={imageUrl}
              alt={productName}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover transition-opacity duration-150 group-hover:opacity-95"
            />
          ) : (
            <div className={`flex h-full w-full flex-col items-center justify-center ${dark ? "bg-[#2b2c40] text-slate-400" : "bg-slate-50 text-slate-300"}`}>
              <Utensils size={22} className="text-slate-400/80 mb-1" />
              <span className="text-[8px] font-bold text-slate-400/80 uppercase tracking-widest font-brand">No Photo</span>
            </div>
          )}

          {unavailable && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-extrabold text-white uppercase tracking-wider shadow-md">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Content Right Side */}
        <div className="p-3 flex-1 min-w-0 flex flex-col justify-between">
          {/* Header Row: Title & Price */}
          <div className="flex items-start justify-between gap-2">
            <h3 className={`line-clamp-1 text-xs font-semibold leading-snug font-khmer ${
              dark ? "text-slate-100" : "text-slate-800"
            }`}>
              {productName}
            </h3>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-xs font-black text-[#55a060]">
                {money(product.basePrice)}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                {(Math.round(Number(product.basePrice || 0) * exchangeRate)).toLocaleString()} ៛
              </span>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom Action Row: ADD Button */}
          <div className="flex items-center justify-end mt-1">
            <span
              className={`rounded-lg bg-[#55a060] px-4 py-1 text-[11px] font-bold text-white shadow-2xs group-hover:bg-[#439150] transition-all cursor-pointer ${
                unavailable ? "opacity-40" : ""
              }`}
            >
              ADD
            </span>
          </div>
        </div>
      </button>
    );
  },
  (prev, next) =>
    prev.product.id === next.product.id &&
    prev.dark === next.dark &&
    prev.exchangeRate === next.exchangeRate &&
    prev.language === next.language &&
    prev.product.isAvailable === next.product.isAvailable &&
    prev.product.basePrice === next.product.basePrice &&
    prev.productName === next.productName &&
    prev.categoryBadge === next.categoryBadge &&
    prev.imageUrl === next.imageUrl &&
    prev.product.trackStock === next.product.trackStock &&
    prev.product.inventory?.quantity === next.product.inventory?.quantity &&
    prev.onAdd === next.onAdd
);

const TicketItem = memo(
  function TicketItem({
    item,
    dark,
    language,
    imageUrl,
    exchangeRate = 4000,
    onIncrement,
    onDecrement,
    onRemove,
    onAddNote,
    onUpdateDiscount,
  }: {
    item: CartItem;
    dark?: boolean;
    language?: string;
    imageUrl: string;
    exchangeRate?: number;
    onIncrement: (productId: number) => void;
    onDecrement: (productId: number) => void;
    onRemove?: (productId: number) => void;
    onAddNote?: (productId: number, noteText: string) => void;
    onUpdateDiscount?: (productId: number, discountPercent?: number, discountAmount?: number) => void;
  }) {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(item.notes || "");
    const [isEditingDiscount, setIsEditingDiscount] = useState(false);
    const [discountMode, setDiscountMode] = useState<"percent" | "amount">(
      item.itemDiscountAmount ? "amount" : "percent"
    );
    const [discountInputVal, setDiscountInputVal] = useState(
      item.itemDiscountPercent
        ? String(item.itemDiscountPercent)
        : item.itemDiscountAmount
        ? String(item.itemDiscountAmount)
        : ""
    );

    const lineGross = item.unitPrice * item.quantity;
    let lineDiscountVal = 0;
    if (item.itemDiscountPercent && item.itemDiscountPercent > 0) {
      lineDiscountVal = (lineGross * item.itemDiscountPercent) / 100;
    } else if (item.itemDiscountAmount && item.itemDiscountAmount > 0) {
      lineDiscountVal = Math.min(lineGross, item.itemDiscountAmount);
    }
    const lineNet = Math.max(0, lineGross - lineDiscountVal);

    return (
      <div className={`group flex flex-col gap-2 rounded-xl border p-3 shadow-2xs transition-all duration-200 [contain:paint] ${
        dark ? "bg-[#232333] border-[#2b2c40] text-slate-100" : "bg-white border-slate-100 text-slate-700"
      }`}>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className={`truncate text-sm font-semibold leading-snug ${
                item.isCompleted
                  ? "line-through text-slate-400 dark:text-slate-500"
                  : dark
                  ? "text-slate-100"
                  : "text-slate-700"
              } ${language === "km" ? "font-khmer" : ""}`}>
                {item.name}
              </h3>
              {item.isCompleted && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                  {language === "km" ? "✓ ផ្ទះបាយធ្វើរួច" : "✓ Made"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {lineDiscountVal > 0 ? (
                <span className="text-xs font-semibold text-[#55a060] flex items-center gap-1.5">
                  <span className="line-through text-slate-400 font-normal">{money(lineGross)}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{money(lineNet)}</span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-[#55a060]">
                  {money(item.unitPrice)} × {item.quantity} = {money(lineGross)}
                </span>
              )}
              {lineDiscountVal > 0 && (
                <span className="inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  -{item.itemDiscountPercent ? `${item.itemDiscountPercent}%` : money(lineDiscountVal)}
                </span>
              )}
              <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-400">
                ({(Math.round(lineNet * exchangeRate)).toLocaleString()} ៛)
              </span>
            </div>
            {item.notes && (
              <div className={`text-xs font-medium text-slate-400 dark:text-slate-400 mt-1 truncate ${language === "km" ? "font-khmer" : ""}`}>
                {language === "km" ? "ចំណាំ: " : "Notes: "}{item.notes}
              </div>
            )}
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.productId)}
              className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-all shrink-0 cursor-pointer"
              title="Remove item"
            >
              <Trash2 size={13} className="stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Stepper Count & Add Note & Discount Row */}
        <div className="flex items-center justify-between mt-1 flex-wrap gap-1.5">
          <div className={`flex items-center rounded-lg border p-0.5 scale-100 ${
            dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-slate-50/50 border-slate-200"
          }`}>
            <button
              type="button"
              onClick={() => onDecrement(item.productId)}
              className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors cursor-pointer"
            >
              <Minus size={12} />
            </button>
            <span className={`w-6 text-center text-xs font-bold ${dark ? "text-slate-200" : "text-slate-600"}`}>
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onIncrement(item.productId)}
              className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Add Notes Button */}
            {onAddNote && (
              <button
                type="button"
                onClick={() => {
                  setNoteText(item.notes || "");
                  setIsEditingNote(true);
                }}
                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  dark ? "border-[#3b3c54] bg-[#2b2c40] text-slate-300 hover:bg-[#34354e]" : "border-slate-200/80 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                } ${language === "km" ? "font-khmer" : ""}`}
              >
                <StickyNote size={12} strokeWidth={2} className="text-slate-600 dark:text-slate-300" />
                <span>{item.notes ? (language === "km" ? "ចំណាំ" : "Note") : (language === "km" ? "+ចំណាំ" : "+Note")}</span>
              </button>
            )}

            {/* Item Discount Button */}
            {onUpdateDiscount && (
              <button
                type="button"
                onClick={() => {
                  setDiscountInputVal(
                    item.itemDiscountPercent
                      ? String(item.itemDiscountPercent)
                      : item.itemDiscountAmount
                      ? String(item.itemDiscountAmount)
                      : ""
                  );
                  setDiscountMode(item.itemDiscountAmount ? "amount" : "percent");
                  setIsEditingDiscount(true);
                }}
                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  lineDiscountVal > 0
                    ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold"
                    : dark
                    ? "border-[#3b3c54] bg-[#2b2c40] text-slate-300 hover:bg-[#34354e]"
                    : "border-slate-200/80 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                } ${language === "km" ? "font-khmer" : ""}`}
              >
                <Tag size={12} strokeWidth={2} className={lineDiscountVal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"} />
                <span>
                  {lineDiscountVal > 0
                    ? `-${item.itemDiscountPercent ? `${item.itemDiscountPercent}%` : money(lineDiscountVal)}`
                    : (language === "km" ? "+បញ្ចុះតម្លៃ" : "+Discount")}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Add Notes Modal Popup */}
        {isEditingNote && onAddNote && typeof window !== "undefined" && createPortal(
          <div
            onClick={() => setIsEditingNote(false)}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4 animate-[usersPageIn_180ms_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm sm:max-w-md overflow-hidden rounded-2xl p-5.5 shadow-2xl transition-all ${
                dark ? "bg-[#1f2130] text-slate-100 border border-slate-700" : "bg-white text-slate-800 border border-slate-100"
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">
                  {language === "km" ? "បន្ថែមចំណាំ" : "Add Notes"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition-colors cursor-pointer"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>

              {/* Note Sub-label & Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">
                  {language === "km" ? "ចំណាំ (អតិបរមា ១០០ អក្សរ)" : "Notes (100 character max.)"}
                </label>
                <input
                  autoFocus
                  type="text"
                  maxLength={100}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onAddNote(item.productId, noteText.trim());
                      setIsEditingNote(false);
                    }
                  }}
                  placeholder={language === "km" ? "ឧទាហរណ៍ ៖ ផ្អែមតិច, អត់ម្ទេស..." : "e.g. Less sweet, extra ice..."}
                  className={`h-10 w-full rounded-lg border px-3.5 text-sm font-semibold outline-none transition-all ${
                    dark
                      ? "border-slate-700 bg-[#2b2c40] text-slate-100 focus:border-[#55a060]"
                      : "border-slate-200 bg-white text-slate-800 focus:border-[#55a060] focus:ring-2 focus:ring-[#55a060]/10"
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddNote(item.productId, noteText.trim());
                  setIsEditingNote(false);
                }}
                className="mt-4.5 w-full h-10.5 rounded-xl bg-[#55a060] hover:bg-[#46894f] text-white text-sm font-bold shadow-sm shadow-[#55a060]/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                {language === "km" ? "រក្សាទុក" : "Save Note"}
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Item Discount Modal Popup */}
        {isEditingDiscount && onUpdateDiscount && typeof window !== "undefined" && createPortal(
          <div
            onClick={() => setIsEditingDiscount(false)}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4 animate-[usersPageIn_180ms_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-xs sm:max-w-sm overflow-hidden rounded-2xl p-5 shadow-2xl transition-all ${
                dark ? "bg-[#1f2130] text-slate-100 border border-slate-700" : "bg-white text-slate-800 border border-slate-100"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className={`text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 ${language === "km" ? "font-khmer" : ""}`}>
                    {language === "km" ? `បញ្ចុះតម្លៃ (${item.name})` : `Item Discount (${item.name})`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === "km" ? `តម្លៃដើម: ${money(lineGross)}` : `Original Total: ${money(lineGross)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingDiscount(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition-colors cursor-pointer"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {[5, 10, 15, 20, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setDiscountMode("percent");
                      setDiscountInputVal(String(pct));
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      discountMode === "percent" && Number(discountInputVal) === pct
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : dark
                        ? "border-slate-700 bg-[#2b2c40] text-slate-200 hover:bg-slate-700"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Mode Switch & Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#2b2c40]">
                  <button
                    type="button"
                    onClick={() => setDiscountMode("percent")}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      discountMode === "percent" ? "bg-white dark:bg-[#1f2130] text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    {language === "km" ? "ភាគរយ (%)" : "Percent (%)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountMode("amount")}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      discountMode === "amount" ? "bg-white dark:bg-[#1f2130] text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    {language === "km" ? "ទឹកប្រាក់ ($)" : "Amount ($)"}
                  </button>
                </div>

                <div className="relative">
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    step={discountMode === "percent" ? "1" : "0.01"}
                    max={discountMode === "percent" ? "100" : lineGross}
                    value={discountInputVal}
                    onChange={(e) => setDiscountInputVal(e.target.value)}
                    placeholder={discountMode === "percent" ? "0 - 100%" : "0.00"}
                    className={`h-10 w-full rounded-xl border pl-3.5 pr-8 text-sm font-bold outline-none transition-all ${
                      dark
                        ? "border-slate-700 bg-[#2b2c40] text-slate-100 focus:border-emerald-500"
                        : "border-slate-200 bg-white text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    {discountMode === "percent" ? "%" : "$"}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateDiscount(item.productId, undefined, undefined);
                    setIsEditingDiscount(false);
                  }}
                  className={`flex-1 h-9.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    dark ? "border-slate-700 bg-[#2b2c40] text-slate-300 hover:bg-slate-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {language === "km" ? "លុបបញ្ចុះតម្លៃ" : "Clear"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const num = Number(discountInputVal) || 0;
                    if (num <= 0) {
                      onUpdateDiscount(item.productId, undefined, undefined);
                    } else if (discountMode === "percent") {
                      onUpdateDiscount(item.productId, Math.min(100, num), undefined);
                    } else {
                      onUpdateDiscount(item.productId, undefined, Math.min(lineGross, num));
                    }
                    setIsEditingDiscount(false);
                  }}
                  className="flex-1 h-9.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {language === "km" ? "រក្សាទុក" : "Apply"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.item.productId === next.item.productId &&
    prev.item.quantity === next.item.quantity &&
    prev.item.unitPrice === next.item.unitPrice &&
    prev.item.notes === next.item.notes &&
    prev.item.itemDiscountPercent === next.item.itemDiscountPercent &&
    prev.item.itemDiscountAmount === next.item.itemDiscountAmount &&
    prev.item.isCompleted === next.item.isCompleted &&
    prev.item.status === next.item.status &&
    prev.dark === next.dark &&
    prev.language === next.language &&
    prev.exchangeRate === next.exchangeRate &&
    prev.imageUrl === next.imageUrl &&
    prev.onIncrement === next.onIncrement &&
    prev.onDecrement === next.onDecrement &&
    prev.onRemove === next.onRemove &&
    prev.onAddNote === next.onAddNote &&
    prev.onUpdateDiscount === next.onUpdateDiscount
);

function getCategoryIcon(name: string): string {
  const map: Record<string, string> = {
    coffee: "☕", tea: "🍵", dessert: "🍰", cake: "🎂",
    food: "🍔", frappe: "🧋", juice: "🥤", smoothie: "🥤",
    pizza: "🍕", pasta: "🍝", salad: "🥗", soup: "🍜",
    burger: "🍔", sandwich: "🥪", noodle: "<ctrl42>", rice: "🍚",
    snack: "🍟", bread: "🥐", drink: "🧃", water: "💧",
    beer: "🍺", wine: "🍷", cocktail: "🍹", milk: "🥛",
    chocolate: "🍫", ice: "🍦", fruit: "🍓", chicken: "🍗",
  };
  const key = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return "🍴";
}

function CategoryTab({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex shrink-0 items-center gap-1.5 px-4 pb-3 pt-2.5 text-xs font-bold transition-colors duration-200 ${
        active
          ? "text-[#696cff]"
          : "text-slate-400 hover:text-slate-700"
      }`}
    >
      {icon && <span className="text-sm leading-none">{icon}</span>}
      <span>{children}</span>
      {/* Underline indicator */}
      <span
        className={`absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full transition-all duration-200 ${
          active ? "bg-[#696cff] opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full text-[#8592a3] hover:bg-[#f5f5f9] hover:text-[#0F522B] transition-all"
      title={label}
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-400 tracking-wide">{label}</span>
      <span className={`text-xs font-bold ${dark ? "text-slate-100" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}

function MobileTicket({
  cart,
  total,
  loading,
  onCheckout,
}: {
  cart: CartItem[];
  total: number;
  loading: boolean;
  onCheckout: () => void;
}) {
  return (
    <div className="fixed inset-x-3 bottom-3 rounded border border-[#e5e7eb] bg-white p-3 shadow-xl lg:hidden z-20">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#8592a3]">{cart.length} item(s)</span>
        <span className="text-xl font-bold text-[#696cff]">{money(total)}</span>
      </div>
      <button
        onClick={onCheckout}
        disabled={cart.length === 0 || loading}
        className="h-12 w-full rounded bg-[#696cff] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#5f61e6] active:scale-95 transition-all shadow-[#696cff]/20"
      >
        {loading ? "Creating..." : "Pay Now"}
      </button>
    </div>
  );
}

function PosSkeleton({ dark, isAdminView }: { dark?: boolean; isAdminView?: boolean }) {
  return (
    <main className={`overflow-hidden flex flex-col ${isAdminView ? 'h-full flex-1 min-w-0' : 'h-screen w-screen'} ${
      dark ? "bg-[#232333] text-slate-100" : "bg-[#f5f5f9] text-slate-700"
    }`}>
      {/* Main Layout: Monolithic Double Panels matching User Image */}
      <div className={`flex flex-col lg:flex-row flex-1 overflow-hidden w-full min-h-0 pt-3.5 px-3.5 sm:px-4 pb-4 sm:pb-6 gap-3.5 sm:gap-4 ${dark ? "bg-[#232333]" : "bg-white"}`}>
        {/* LEFT: Big Rounded Panel Box (Matches Image 2) */}
        <section className={`flex min-w-0 flex-1 flex-col rounded-[24px] overflow-hidden shadow-3xs water-wave-glass ${
          dark ? "bg-[#2b2c40] border border-[#3b3c54]" : "bg-[#e5e7eb] border border-slate-200/60"
        }`} />

        {/* RIGHT: Cart Side Panel Box (Matches Image 2) */}
        <aside className={`w-full lg:w-[320px] xl:w-[27%] xl:min-w-[320px] xl:max-w-[360px] shrink-0 rounded-[24px] flex flex-col h-full overflow-hidden shadow-3xs water-wave-glass ${
          dark ? "bg-[#2b2c40] border border-[#3b3c54]" : "bg-[#e5e7eb] border border-slate-200/60"
        }`} />
      </div>
    </main>
  );
}



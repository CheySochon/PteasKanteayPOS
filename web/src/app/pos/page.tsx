"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  SlidersHorizontal,
  ClipboardList,
  Pencil,
} from "lucide-react";
import { cartItemFromProduct, type CartItem } from "../../components/CartPanel";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { useAppTheme } from "../../lib/theme";
import { useAppLanguage, setAppLanguage } from "../../lib/language";
import {
  apiOrigin,
  createOrder,
  createPayment,
  getCategories,
  getProducts,
  getSettings,
  getTables,
  getOrders,
} from "../../lib/api";
import { getSocket } from "../../lib/socket";
import type { Category, DiningTable, Product } from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";

const SERVICE_RATE = 0.1;
const VAT_RATE = 0.12;
const DEFAULT_POS_NAME = "The Tofu";

const PROMO_CODES = [
  { code: "WELCOME10", label: "Welcome (10%)", value: 10 },
  { code: "HAPPYHOUR", label: "Happy Hour (15%)", value: 15 },
  { code: "STAFF20", label: "Staff (20%)", value: 20 },
];

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function resolveImageUrl(value?: string | null) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:")) {
    return value;
  }
  return `${apiOrigin}${value}`;
}

export default function PosPage({ isAdminView = false }: { isAdminView?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useAppTheme();
  const dark = theme === "dark";
  const language = useAppLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [tableId, setTableId] = useState<number | undefined>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [ticketNumber, setTicketNumber] = useState("0000");
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
  const [restaurantImageUrl, setRestaurantImageUrl] = useState("");
  const [serviceRate, setServiceRate] = useState(SERVICE_RATE);
  const [vatRate, setVatRate] = useState(VAT_RATE);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [splitCount, setSplitCount] = useState(2);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [paidSplits, setPaidSplits] = useState<number[]>([]);
  const [selectedSplitIndex, setSelectedSplitIndex] = useState<number | null>(null);
  const [splitPaymentOpen, setSplitPaymentOpen] = useState(false);
  const [splitPaymentMethod, setSplitPaymentMethod] = useState<"cash" | "qr">("cash");
  const [splitCashReceived, setSplitCashReceived] = useState(0);
  const [message, setMessage] = useState("");
  useAutoDismiss(message, setMessage);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Payment State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr">("cash");
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

  const [showKitchenToast, setShowKitchenToast] = useState(false);
  const [saveDraftModalOpen, setSaveDraftModalOpen] = useState(false);
  const [draftRefInput, setDraftRefInput] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // QR Menu Orders Real-time State
  const [qrOrdersModalOpen, setQrOrdersModalOpen] = useState(false);
  const [qrOrders, setQrOrders] = useState<any[]>([]);
  const [qrOrdersFilter, setQrOrdersFilter] = useState<"all" | "pending" | "preparing" | "completed">("all");

  const pendingQrCount = useMemo(() => {
    return qrOrders.filter((o) => o.status === "pending" || !o.status).length;
  }, [qrOrders]);

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
    const key = tableId ? `table-${tableId}` : "takeaway";
    setTableIsSent((prev) => ({ ...prev, [key]: true }));

    const socket = getSocket();
    if (socket) {
      const payload = {
        tableId,
        orderNumber: ticketNumber,
        status: "pending",
        totalAmount: total,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          name: i.name,
          unitPrice: i.unitPrice,
        })),
        table: selectedTable ? { name: selectedTable.name } : null,
      };
      socket.emit("order:new", payload);
    }

    setShowKitchenToast(true);
    setTimeout(() => {
      setShowKitchenToast(false);
    }, 3000);
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
    getOrders()
      .then((data) => {
        if (Array.isArray(data)) setQrOrders(data);
      })
      .catch(() => {});

    const socket = getSocket();
    if (!socket) return;

    function handleOrderCreated(order: any) {
      if (!order) return;

      setQrOrders((current) => {
        const exists = current.some((o) => o.id === order.id);
        if (exists) return current.map((o) => (o.id === order.id ? { ...o, ...order } : o));
        return [order, ...current];
      });

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

    function handleOrderUpdated(order: any) {
      if (!order) return;
      setQrOrders((current) => current.map((o) => (o.id === order.id ? { ...o, ...order } : o)));
    }

    socket.on("order:created", handleOrderCreated);
    socket.on("order:new", handleOrderCreated);
    socket.on("order:updated", handleOrderUpdated);
    return () => {
      socket.off("order:created", handleOrderCreated);
      socket.off("order:new", handleOrderCreated);
      socket.off("order:updated", handleOrderUpdated);
    };
  }, []);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = async () => {
      setIsOnline(true);
      setSyncing(true);
      try {
        const { getOfflineOrders, deleteOfflineOrder } = await import("../../lib/db");
        const orders = await getOfflineOrders();
        for (const order of orders) {
           const newOrder = await createOrder(order.payload);
           // If the payload has payment info, process payment
           if (order.payload._paymentMethod) {
              await createPayment({ orderId: newOrder.id, method: order.payload._paymentMethod, amount: newOrder.totalAmount, status: "completed" }).catch(console.error);
           }
           await deleteOfflineOrder(order.id);
        }
        if (orders.length > 0) setMessage(`Synced ${orders.length} offline orders`);
      } catch (err) {
        console.error("Sync failed", err);
      } finally {
        setSyncing(false);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setTicketNumber(String(Date.now()).slice(-4));
    });

    Promise.all([getCategories(), getProducts(), getTables(), getSettings()])
      .then(([categoryRows, productRows, tableRows, appSettings]) => {
        setCategories(categoryRows);
        setProducts(productRows);
        setTables(tableRows.filter((table: DiningTable) => table.isActive));
        const nextName = appSettings.restaurantName || DEFAULT_POS_NAME;
        setPosName(nextName);
        setRestaurantImageUrl(appSettings.restaurantImageUrl || "");
        localStorage.setItem("pos_restaurant_name", nextName);
        setServiceRate(Number(appSettings.serviceChargeRate || 0) / 100);
        setVatRate(Number(appSettings.taxRate || 0) / 100);
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

    function reloadMenuData() {
      Promise.all([getCategories(), getProducts(), getTables(), getSettings()])
        .then(([categoryRows, productRows, tableRows, appSettings]) => {
          setCategories(categoryRows);
          setProducts(productRows);
          setTables(tableRows.filter((table: DiningTable) => table.isActive));
          const nextName = appSettings.restaurantName || DEFAULT_POS_NAME;
          setPosName(nextName);
          setRestaurantImageUrl(appSettings.restaurantImageUrl || "");
          setServiceRate(Number(appSettings.serviceChargeRate || 0) / 100);
          setVatRate(Number(appSettings.taxRate || 0) / 100);
        })
        .catch(() => undefined);
    }

    syncAuthUser();
    window.addEventListener("storage", syncAuthUser);
    window.addEventListener("pos-settings-change", syncAuthUser);
    window.addEventListener("pos-auth-change", syncAuthUser);
    window.addEventListener("pos-menu-change", reloadMenuData);

    return () => {
      window.removeEventListener("storage", syncAuthUser);
      window.removeEventListener("pos-settings-change", syncAuthUser);
      window.removeEventListener("pos-auth-change", syncAuthUser);
      window.removeEventListener("pos-menu-change", reloadMenuData);
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

    return products.filter((product) => {
      const matchesCategory =
        categoryId === "all" || product.categoryId === categoryId;
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        (product.description || "").toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [categoryId, products, query]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = Math.min(subtotal, subtotal * (discountPercent / 100));
  const discountedSubtotal = Math.max(subtotal - discountAmount, 0);
  const serviceFee = discountedSubtotal * serviceRate;
  const vat = discountedSubtotal * vatRate;
  const total = discountedSubtotal + serviceFee + vat;
  const splitAmount = splitCount > 0 ? total / splitCount : total;

  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [heldModalOpen, setHeldModalOpen] = useState(false);

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

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    setDraftRefInput(orderNote || (selectedTable ? selectedTable.name : ""));
    setSaveDraftModalOpen(true);
  };

  const confirmSaveDraft = () => {
    if (cart.length === 0) return;
    const refName = draftRefInput.trim() || (selectedTable ? selectedTable.name : `Draft #${ticketNumber}`);

    const newHeld = {
      id: Date.now(),
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

  function addProduct(product: Product) {
    const item = cartItemFromProduct(product);
    const key = item.productId;

    const existingItem = cart.find((i: any) => i.productId === key);
    const nextQty = (existingItem?.quantity || 0) + 1;
    if (product.trackStock && Number(product.inventory?.quantity ?? 0) < nextQty) {
      alert(`Insufficient stock for ${product.name}. Available: ${Number(product.inventory?.quantity).toFixed(0)} ${product.unit}`);
      return;
    }

    setCart((current) => {
      const exists = current.some((entry) => entry.productId === key);
      if (!exists) return [...current, item];

      return current.map((entry) =>
        entry.productId === key
          ? { ...entry, quantity: nextQty }
          : entry
      );
    });
  }

  async function processCheckout() {
    setLoading(true);
    setMessage("");

    try {
      const payload: any = {
        tableId,
        discountAmount,
        taxAmount: serviceFee + vat,
        userName: currentUserName,
        createdBy: { name: currentUserName },
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        _paymentMethod: paymentMethod,
      };

      const order = await createOrder(payload);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pos-order-created"));
      }
      
      if (isOnline) {
        await createPayment({ 
          orderId: order.id, 
          method: paymentMethod, 
          amount: total, 
          status: "completed" 
        }).catch(console.error);
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

      setCart([]);
      setDiscountPercent(0);
      setSplitOpen(false);
      setDiscountOpen(false);
      setPaymentModalOpen(false);
      setCashReceived(0);
      setTicketNumber(String(Date.now()).slice(-4));
      setTableId(undefined);
      setOrderingMode(false); // Return to Table Map
      setMessage(`Order ${order.orderNumber || order.orderId} paid successfully.`);

      // Trigger browser print dialog after DOM updates
      setTimeout(() => {
        window.print();
      }, 150);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to process payment");
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
    return (
      <main className={`overflow-hidden bg-[#f5f5f9] flex flex-col items-center justify-center text-[#566a7f] ${isAdminView ? 'h-full flex-1 min-w-0' : 'h-screen w-screen'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#55a060] border-t-transparent shadow-sm"></div>
          <p className="text-sm font-semibold tracking-wide uppercase">Loading...</p>
        </div>
      </main>
    );
  }

  const mainContent = (
    <main className={`overflow-hidden flex flex-col print:bg-white print:overflow-visible print:h-auto print:text-black ${isAdminView ? 'h-full flex-1 min-w-0' : 'h-full w-full'} ${
      dark ? "bg-[#232333] text-slate-100" : "bg-white text-slate-700"
    }`}>
      {isAdminView && (
        <TopBar
          title="POS - Point of Sale"
          subtitle="Real-time ordering and billing terminal"
          searchPlaceholder="Search POS..."
          language={language}
          onLanguageChange={setAppLanguage}
          notifications={[]}
          dark={theme === "dark"}
        />
      )}
      {/* Toast Notification for Kitchen */}
      {showKitchenToast && (
        <div className="fixed top-6 left-0 right-0 z-[99999] flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto flex items-center gap-3 py-2.5 px-4.5 rounded-xl bg-white dark:bg-[#2b2c40] text-slate-800 dark:text-slate-200 text-[13px] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100/80 dark:border-[#3b3c54] animate-[dropFromTop_400ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="h-5 w-5 rounded-full bg-[#48cf38] flex items-center justify-center text-white shrink-0">
              <Check size={11} strokeWidth={4.5} className="text-white" />
            </div>
            <span>Order sent to kitchen!</span>
          </div>
        </div>
      )}

      {/* VIEW 2: Ordering Interface — full screen, no padding wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden w-full min-h-0">
          {/* ── Top Full-Width Header: "POS - Point of Sale" + action buttons (Spans Full Width) ── */}
          <header className={`flex items-center justify-between pt-3 pb-3 px-6 shrink-0 gap-3 ${dark ? "bg-[#232333]" : "bg-white"}`}>
            <h1 className={`text-xl font-normal shrink-0 ${dark ? "text-slate-100" : "text-slate-800"}`}>
              POS &ndash; Point of Sale
            </h1>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 active:scale-95 transition-all cursor-pointer ${
                  dark ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]" : "bg-[#f8faf9] border border-[#ebf0ec] text-[#6b7a82] hover:bg-[#f0f4f2]"
                }`}
              >
                <LayoutGrid size={14} />
                Dual Screen
              </button>
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
                className={`relative flex shrink-0 items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 active:scale-95 transition-all cursor-pointer ${
                  pendingQrCount > 0
                    ? dark
                      ? "bg-amber-950/40 border border-amber-500/50 text-amber-300 hover:bg-amber-900/50"
                      : "bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100"
                    : dark
                    ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                    : "bg-[#f8faf9] border border-[#ebf0ec] text-[#6b7a82] hover:bg-[#f0f4f2]"
                }`}
              >
                <QrCode size={14} className={pendingQrCount > 0 ? "text-amber-500 animate-pulse" : ""} />
                {language === "km" ? "ការកុម្ម៉ង់ QR Menu" : "QR Menu Orders"}
                {pendingQrCount > 0 ? (
                  <span className="ml-0.5 bg-amber-500 text-white text-[9.5px] font-black px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                    {pendingQrCount > 9 ? "9+" : pendingQrCount}
                  </span>
                ) : qrOrders.length > 0 ? (
                  <span className={`ml-0.5 text-[9.5px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                    dark ? "bg-[#3b3c54] text-slate-300" : "bg-slate-200 text-slate-600"
                  }`}>
                    {qrOrders.length}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setHeldModalOpen(true)}
                className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 active:scale-95 transition-all cursor-pointer ${
                  dark ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]" : "bg-[#f8faf9] border border-[#ebf0ec] text-[#6b7a82] hover:bg-[#f0f4f2]"
                }`}
              >
                <Archive size={14} />
                Drafts List
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
                }`}
              >
                <List size={14} />
                Orders List
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
                        <img src={resolveImageUrl(currentUserImageUrl)} alt="Avatar" className="h-full w-full object-cover" />
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

          <div className={`flex flex-1 overflow-hidden w-full min-h-0 pt-0 px-6 pb-6 gap-6 ${dark ? "bg-[#232333]" : "bg-white"}`}>
            {/* LEFT: Product Catalogue */}
            <section className={`flex min-w-0 flex-1 flex-col rounded-2xl overflow-hidden shadow-3xs transition-all duration-[300ms] ease-in-out ${
              dark ? "bg-[#2b2c40] border border-[#3b3c54]" : "bg-white border border-slate-200/80"
            }`}>

            {/* ── Category Pills + Search row ── */}
            <div className={`flex items-center justify-between gap-3 px-5 py-3.5 border-b shrink-0 min-w-0 ${
              dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-100"
            }`}>
              {/* Left Scrollable Pills Wrapper with Blur Fade Overlay */}
              <div
                className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0 pr-12"
                style={{
                  WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 98%)',
                  maskImage: 'linear-gradient(to right, black 80%, transparent 98%)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setCategoryId("all")}
                  className={`shrink-0 h-10 px-5 rounded-full text-[13px] font-normal transition-all cursor-pointer ${
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
                    className={`shrink-0 h-10 px-5 rounded-full text-[13px] font-normal transition-all cursor-pointer whitespace-nowrap ${
                      categoryId === category.id
                        ? "bg-[#55a060] text-white shadow-sm"
                        : dark
                        ? "border border-[#3b3c54] bg-[#232333] text-slate-300 hover:bg-[#34354e]"
                        : "border border-slate-200/90 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Right Fixed Search & Layout Grid Wrapper */}
              <div className="shrink-0 flex items-center justify-end gap-2 pl-4">
                {/* Search bar */}
                <div className="relative w-[180px] sm:w-[240px] md:w-[280px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    className={`h-10 w-full rounded-xl border pl-9 pr-3 text-[13.5px] font-medium outline-none placeholder:text-slate-400 focus:border-[#55a060] transition-all ${
                      dark
                        ? "border-[#3b3c54] bg-[#232333] text-slate-100 focus:bg-[#2b2c40]"
                        : "border-slate-200/90 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-700"
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
            <div className={`flex-1 overflow-y-auto px-5 py-4 min-h-0 ${dark ? "bg-[#2b2c40]" : "bg-white"}`}>
              {filteredProducts.length === 0 ? (
                <div className={`rounded-2xl border border-dashed p-12 text-center text-sm font-semibold text-slate-400 ${
                  dark ? "border-[#3b3c54] bg-[#232333]" : "border-slate-200 bg-white"
                }`}>
                  <ChefHat size={32} className="mx-auto mb-3 text-slate-400/60" />
                  No matching menu selections found.
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} dark={dark} onAdd={() => addProduct(product)} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3.5">
                  {filteredProducts.map((product) => (
                    <ProductListItem key={product.id} product={product} dark={dark} onAdd={() => addProduct(product)} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: Cart / WALKIN CUSTOMER */}
          <aside className={`w-[340px] lg:w-[350px] xl:w-[27%] xl:min-w-[340px] xl:max-w-[370px] shrink-0 rounded-2xl flex flex-col h-full overflow-hidden shadow-3xs transition-all duration-[300ms] ease-in-out ${
            dark ? "bg-[#2b2c40] border border-[#3b3c54]" : "bg-white border border-slate-200/80"
          }`}>

            {/* ── Select Dining Option + Select Table ── */}
            <div className={`flex gap-2 px-4.5 py-3.5 border-b shrink-0 ${dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-100"}`}>
              <div className="relative flex-1">
                <select
                  value={tableId ? "dine-in" : "walk-in"}
                  onChange={(e) => { if (e.target.value === "walk-in") setTableId(undefined); }}
                  className={`h-10 w-full rounded-xl border pl-3.5 pr-7 text-xs font-semibold outline-none focus:border-[#55a060] transition-all appearance-none cursor-pointer ${
                    dark ? "border-[#3b3c54] bg-[#232333] text-slate-200 hover:bg-[#34354e]" : "border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700"
                  }`}
                >
                  <option value="walk-in" className={dark ? "bg-[#232333] text-slate-200" : ""}>Select Dining Option</option>
                  <option value="dine-in" className={dark ? "bg-[#232333] text-slate-200" : ""}>Dine In</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
              <div className="relative flex-1">
                <select
                  value={tableId || ""}
                  onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : undefined)}
                  className={`h-10 w-full rounded-xl border pl-3.5 pr-7 text-xs font-semibold outline-none focus:border-[#55a060] transition-all appearance-none cursor-pointer ${
                    dark ? "border-[#3b3c54] bg-[#232333] text-slate-200 hover:bg-[#34354e]" : "border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700"
                  }`}
                >
                  <option value="" className={dark ? "bg-[#232333] text-slate-200" : ""}>Select Table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id} className={dark ? "bg-[#232333] text-slate-200" : ""}>
                      {table.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
            </div>

            {/* ── Cart Items / Empty State ── */}
            <div className={`flex-1 overflow-y-auto min-h-0 ${dark ? "bg-[#2b2c40]" : "bg-white"}`}>
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <ShoppingBag size={44} className={`mb-3 ${dark ? "text-slate-600" : "text-slate-200"}`} />
                  <span className={`text-xs font-bold ${dark ? "text-slate-300" : "text-slate-500"}`}>Cart is empty</span>
                  <span className="text-[11px] text-slate-400 mt-1">Click items to add</span>
                </div>
              ) : (
                <div className="px-4.5 py-3.5 space-y-2.5">
                  {cart.map((item, index) => {
                    const product = productMap.get(item.productId);
                    return (
                      <TicketItem
                        key={`${item.productId}-${index}`}
                        item={item}
                        dark={dark}
                        imageUrl={resolveImageUrl(product?.imageUrl)}
                        onIncrement={() => {
                          const prod = products.find((p) => p.id === item.productId);
                          const nextQty = item.quantity + 1;
                          if (prod?.trackStock && Number(prod.inventory?.quantity ?? 0) < nextQty) {
                            alert(`Insufficient stock for ${prod.name}. Available: ${Number(prod.inventory?.quantity).toFixed(0)} ${prod.unit}`);
                            return;
                          }
                          setCart((current) =>
                            current.map((i) =>
                              i.productId === item.productId ? { ...i, quantity: nextQty } : i
                            )
                          );
                        }}
                        onDecrement={() => {
                          setCart((current) =>
                            current
                              .map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity - 1 } : i))
                              .filter((i) => i.quantity > 0)
                          );
                        }}
                        onRemove={() => {
                          setCart((current) => current.filter((i) => i.productId !== item.productId));
                        }}
                        onAddNote={(noteText) => {
                          setCart((current) =>
                            current.map((i) => (i.productId === item.productId ? { ...i, notes: noteText } : i))
                          );
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Cart Summary Footer Block ── */}
            <div className={`p-4.5 border-t space-y-3 shrink-0 ${dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-100"}`}>
              <div className="space-y-1.5">
                <SummaryRow label="Sub total :" value={money(subtotal)} dark={dark} />
                {discountPercent > 0 && (
                  <SummaryRow label={`Discount (${discountPercent}%):`} value={`-${money(discountAmount)}`} dark={dark} />
                )}
                {serviceFee > 0 && <SummaryRow label="Service Fee :" value={money(serviceFee)} dark={dark} />}
                {vat > 0 && <SummaryRow label="VAT :" value={money(vat)} dark={dark} />}
              </div>

              {/* Total Row */}
              <div className={`flex items-center justify-between border-t pt-2.5 ${dark ? "border-[#3b3c54]" : "border-slate-100"}`}>
                <span className={`text-base font-bold ${dark ? "text-slate-100" : "text-slate-800"}`}>Total :</span>
                <span className="text-2xl font-black text-[#55a060]">{money(total)}</span>
              </div>

              {/* Draft & Send to Kitchen Buttons Row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleHoldOrder}
                  disabled={cart.length === 0}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    dark ? "border-[#3b3c54] bg-[#232333] text-slate-300 hover:bg-[#34354e]" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Archive size={14} /> Draft
                </button>
                <button
                  type="button"
                  onClick={handleSendToKitchen}
                  disabled={cart.length === 0}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChefHat size={14} /> Send to Kitchen
                </button>
              </div>

              {/* Create Receipt & Pay */}
              <button
                type="button"
                onClick={handlePayClick}
                disabled={cart.length === 0}
                className="w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-[#55a060] hover:bg-[#439150] text-[14.5px] font-bold text-white shadow-sm shadow-[#55a060]/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Banknote size={16} /> Create Receipt &amp; Pay
              </button>
            </div>
          </aside>
        </div>
      </div>
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

      {/* Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-[dashboardPageIn_200ms_ease-out]">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <h3 className="text-base font-black text-slate-800">Complete Payment</h3>
            </div>
            
            <div className="p-5">
              <div className="mb-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Due</p>
                <p className="text-3xl font-black text-[#696cff] leading-none mt-1.5">{money(total)}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">~ {(total * 4100).toLocaleString()} ៛</p>
              </div>

              <div className="mb-4 flex gap-2">
                <button 
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex-1 rounded-xl border-2 py-3 font-bold transition-all ${paymentMethod === 'cash' ? 'border-[#696cff] bg-[#696cff]/5 text-[#696cff]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                >
                  💵 Cash
                </button>
                <button 
                  onClick={() => setPaymentMethod("qr")}
                  className={`flex-1 rounded-xl border-2 py-3 font-bold transition-all ${paymentMethod === 'qr' ? 'border-[#696cff] bg-[#696cff]/5 text-[#696cff]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                >
                  📱 KHQR
                </button>
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-3 animate-[usersPageIn_200ms_ease-out]">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Cash Received</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                      <input 
                        type="number"
                        min={total}
                        value={cashReceived || ""}
                        onChange={(e) => setCashReceived(Number(e.target.value))}
                        className="h-10 w-full rounded-xl border-2 border-slate-200 bg-slate-50 pl-7 pr-3 text-base font-black text-slate-800 outline-none focus:border-[#696cff] focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1.5">
                    {[10, 20, 50, 100].map(amt => (
                      <button 
                        key={amt}
                        onClick={() => setCashReceived(amt)}
                        className="rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-600 hover:border-[#696cff] hover:text-[#696cff] transition-all"
                      >
                        ${amt}
                      </button>
                    ))}
                    {[10000, 20000, 50000, 100000].map(amt => (
                      <button 
                        key={amt}
                        onClick={() => setCashReceived(amt / 4100)}
                        className="rounded-lg border border-slate-200 bg-white py-1.5 text-[10px] font-bold text-slate-600 hover:border-[#696cff] hover:text-[#696cff] transition-all"
                      >
                        {amt / 1000}k ៛
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Change</span>
                    <div className="text-right">
                      <div className={`text-lg leading-none font-black ${cashReceived - total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {money(Math.max(0, cashReceived - total))}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                        ~ {(Math.max(0, cashReceived - total) * 4100).toLocaleString()} ៛
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "qr" && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 animate-[usersPageIn_200ms_ease-out]">
                  <div className="mb-3 rounded-xl bg-white p-2 shadow-sm">
                    {/* Placeholder for real QR code */}
                    <div className="h-32 w-32 bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=KHQR')] bg-contain bg-center bg-no-repeat opacity-80" />
                  </div>
                  <p className="text-xs font-bold text-slate-500">Scan to pay with KHQR</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-slate-100 bg-slate-50/50 p-5">
              <button 
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={processCheckout}
                disabled={loading || (paymentMethod === 'cash' && cashReceived < total)}
                className="flex-[2] rounded-xl bg-[#696cff] px-3 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#5f61e6] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
              >
                {loading ? "Processing..." : "Confirm & Print"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Bill Modal */}
      {splitOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-[dashboardPageIn_200ms_ease-out]">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">Split Bill</h3>
              <button 
                onClick={() => setSplitOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-5 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Amount</p>
                <p className="text-2xl font-black text-[#696cff] leading-none mt-1.5">{money(total)}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">~ {(total * 4100).toLocaleString()} ៛</p>
              </div>

              {/* Split Count Selector */}
              <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Number of Splits</label>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    disabled={splitCount <= 2}
                    onClick={() => {
                      const next = Math.max(2, splitCount - 1);
                      setSplitCount(next);
                      setPaidSplits([]); // Reset paid splits when count changes
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-lg font-extrabold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-slate-800">{splitCount} Person(s)</span>
                  <button
                    type="button"
                    disabled={splitCount >= 10}
                    onClick={() => {
                      const next = Math.min(10, splitCount + 1);
                      setSplitCount(next);
                      setPaidSplits([]); // Reset paid splits when count changes
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-lg font-extrabold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    +
                  </button>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Each Pays:</span>
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
                        <span className="text-xs font-bold text-slate-700">Split #{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-slate-800">{money(total / splitCount)}</span>
                        {isPaid ? (
                          <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700 uppercase">
                            ✓ Paid
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
                            className="rounded-lg bg-[#696cff] px-3 py-1 text-[10px] font-black text-white hover:bg-[#5f61e6] active:scale-95 transition-all"
                          >
                            Pay
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
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
              >
                Close
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
              <h3 className="text-sm font-black text-slate-800">Pay Split #{selectedSplitIndex + 1}</h3>
              <button 
                onClick={() => setSplitPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Split Share</p>
                <p className="text-2xl font-black text-[#696cff] leading-none mt-1">{money(total / splitCount)}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">~ {((total / splitCount) * 4100).toLocaleString()} ៛</p>
              </div>

              <div className="mb-4 flex gap-1.5">
                <button 
                  onClick={() => setSplitPaymentMethod("cash")}
                  className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${splitPaymentMethod === 'cash' ? 'border-[#696cff] bg-[#696cff]/5 text-[#696cff]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                >
                  💵 Cash
                </button>
                <button 
                  onClick={() => setSplitPaymentMethod("qr")}
                  className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${splitPaymentMethod === 'qr' ? 'border-[#696cff] bg-[#696cff]/5 text-[#696cff]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                >
                  📱 QR Code
                </button>
              </div>

              {splitPaymentMethod === "cash" && (
                <div className="space-y-3 animate-[usersPageIn_180ms_ease-out]">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cash Received</label>
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
                      { label: "Exact", val: total / splitCount },
                      { label: "$5", val: 5 },
                      { label: "$10", val: 10 },
                      { label: "$20", val: 20 },
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSplitCashReceived(btn.val)}
                        className="rounded-lg bg-slate-50 py-1.5 text-[10px] font-extrabold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-100"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Change calculation */}
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Change</span>
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
                  <p className="text-[10px] font-bold text-slate-500">Scan to pay split share</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-slate-100 bg-slate-50/50 p-4">
              <button 
                onClick={() => setSplitPaymentOpen(false)}
                className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all"
              >
                Cancel
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
                      setMessage("All splits paid successfully! Order completed.");
                      setSplitOpen(false);
                    } catch (e) {
                      setMessage(e instanceof Error ? e.message : "Failed to finalize order");
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                className="flex-[2] rounded-xl bg-[#696cff] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#5f61e6] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
              >
                Confirm Split Pay
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
              Save cart items to draft
            </h3>

            <div className="mb-5 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500">
                Reference
              </label>
              <input
                type="text"
                value={draftRefInput}
                onChange={(e) => setDraftRefInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmSaveDraft();
                }}
                placeholder="Enter Reference Name here..."
                autoFocus
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-[#55a060] focus:ring-2 focus:ring-[#55a060]/10 transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSaveDraftModalOpen(false)}
                className="rounded-lg bg-slate-100/90 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/80 active:scale-95 transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={confirmSaveDraft}
                className="rounded-lg bg-[#55a060] px-6 py-2 text-xs font-semibold text-white hover:bg-[#439150] active:scale-95 transition-all cursor-pointer"
              >
                Save
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
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Filter / Sort"
                >
                  <SlidersHorizontal size={18} />
                </button>
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
                  ចាកចេញពីគណនី / Confirm Logout
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  តើអ្នកពិតជាចង់ចាកចេញ ឬ ប្តូរកុងស៊ុយបុគ្គលិកមែនទេ?
                </p>
              </div>
            </div>

            {/* ── Actions ────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2 px-6 py-5">
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
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-red-700 active:scale-[0.98]"
              >
                <LogOut size={14} className="shrink-0" />
                ចាកចេញ / Logout &amp; Lock Station
              </button>

              {/* Secondary — Switch account */}
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("pos_logged_in");
                  localStorage.removeItem("pos_token");
                  localStorage.removeItem("pos_user");
                  localStorage.setItem("pos_logout_success_alert", JSON.stringify({ timestamp: Date.now() }));
                  window.location.href = "/login";
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-50 active:scale-[0.98]"
              >
                <span>🔄</span>
                ប្តូរបុគ្គលិក / Switch Staff Account
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="h-8 w-full rounded-lg text-xs font-medium text-slate-400 transition-colors duration-150 hover:text-slate-600"
              >
                បោះបង់ / Cancel
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
                {["indoor", "outdoor", "vip"].map((zone) => {
                  const zoneTables = tables.filter((t) => t.zone.toLowerCase() === zone);
                  if (zoneTables.length === 0) return null;

                  return (
                    <div key={zone} className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 capitalize">
                        📍 Zone: {zone === "indoor" ? "ខាងក្នុង (Indoor)" : zone === "outdoor" ? "ខាងក្រៅ (Outdoor)" : "វីអាយភី (VIP)"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px] animate-[userModalBackdrop_180ms_ease-out]">
          <div className={`relative max-h-[calc(100vh-32px)] w-full max-w-3xl overflow-hidden rounded-3xl border shadow-2xl animate-[userModalIn_220ms_cubic-bezier(0.16,1,0.3,1)] flex flex-col ${
            dark ? "border-[#3b3c54] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              dark ? "border-[#3b3c54] bg-[#232333]" : "border-slate-100 bg-slate-50/60"
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#55a060]/10 text-[#55a060]">
                  <QrCode size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-base font-bold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                      {language === "km" ? "ការកុម្ម៉ង់តាម QR Menu (Real-time)" : "QR Menu Orders"}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                    {language === "km" ? "ការកុម្ម៉ង់ផ្ទាល់ពីរថែប្លេត ឬទូរស័ព្ទអតិថិជន" : "Incoming customer orders placed via QR code scan"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    getOrders().then((data) => { if (Array.isArray(data)) setQrOrders(data); });
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    dark ? "border-[#3b3c54] bg-[#2b2c40] text-slate-300 hover:bg-[#34354e]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <RotateCw size={13} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setQrOrdersModalOpen(false)}
                  className={`rounded-xl p-1.5 transition-colors cursor-pointer ${
                    dark ? "text-slate-400 hover:bg-[#34354e] hover:text-slate-200" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  }`}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className={`flex items-center gap-2 px-6 py-3 border-b text-xs font-semibold shrink-0 ${
              dark ? "border-[#3b3c54] bg-[#232333]/50" : "border-slate-100 bg-slate-50/30"
            }`}>
              {(["all", "pending", "preparing", "completed"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setQrOrdersFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                    qrOrdersFilter === tab
                      ? "bg-[#55a060] text-white font-bold shadow-xs"
                      : dark
                      ? "bg-[#232333] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                      : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab === "all" ? `All (${qrOrders.length})` : `${tab} (${qrOrders.filter(o => o.status === tab).length})`}
                </button>
              ))}
            </div>

            {/* Orders Content List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[500px]">
              {(() => {
                const list = qrOrders.filter((o) => qrOrdersFilter === "all" || o.status === qrOrdersFilter);
                if (list.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                        dark ? "bg-[#232333] text-slate-500" : "bg-slate-100 text-slate-400"
                      }`}>
                        <QrCode size={28} />
                      </div>
                      <p className={`text-sm font-semibold ${dark ? "text-slate-300" : "text-slate-600"}`}>
                        {language === "km" ? "មិនទាន់មានការកុម្ម៉ង់ QR Menu ឡើយ" : "No QR Menu orders found"}
                      </p>
                      <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                        {language === "km" ? "នៅពេលអតិថិជនស្កែន QR ធ្វើការកុម្ម៉ង់ វានឹងបង្ហាញនៅទីនេះភ្លាមៗ" : "Incoming QR orders will appear here automatically in real time"}
                      </p>
                    </div>
                  );
                }

                return list.map((order) => {
                  const items = Array.isArray(order.items) ? order.items : [];
                  const orderNum = order.orderNumber || `#${order.id}`;
                  const tableName = order.table?.name || (order.tableId ? `Table ${order.tableId}` : "Takeaway / QR");
                  const orderTotal = Number(order.totalAmount || order.total || items.reduce((sum: number, i: any) => sum + Number(i.unitPrice || 0) * Number(i.quantity || 1), 0));
                  const isPending = order.status === "pending" || !order.status;

                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        dark ? "border-[#3b3c54] bg-[#232333]" : "border-slate-200/80 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/40 dark:border-slate-700/40">
                        <div className="flex items-center gap-2.5">
                          <span className="font-extrabold text-sm text-[#55a060]">
                            {orderNum}
                          </span>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${
                            dark ? "bg-[#2b2c40] border-[#3b3c54] text-slate-200" : "bg-white border-slate-200 text-slate-700"
                          }`}>
                            {tableName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                            isPending
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : order.status === "preparing"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          }`}>
                            {order.status || "pending"}
                          </span>
                          <span className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                            {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                          </span>
                        </div>
                      </div>

                      {/* Items list */}
                      <div className="py-3 space-y-1.5">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className={`font-medium ${dark ? "text-slate-200" : "text-slate-700"}`}>
                              <span className="font-bold text-[#55a060]">{item.quantity}×</span> {item.product?.name || item.name || `Item #${item.productId}`}
                              {item.notes && <span className="text-slate-400 italic ml-1.5">({item.notes})</span>}
                            </span>
                            <span className={`font-semibold ${dark ? "text-slate-300" : "text-slate-600"}`}>
                              {money(Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1))}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Total & Action Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/40 dark:border-slate-700/40">
                        <div className="text-xs">
                          <span className={dark ? "text-slate-400" : "text-slate-500"}>Total: </span>
                          <span className="text-sm font-black text-[#55a060]">{money(orderTotal)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadQrOrderToCart(order)}
                            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                              dark
                                ? "border-[#3b3c54] bg-[#2b2c40] text-slate-200 hover:bg-[#34354e]"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <ShoppingBag size={13} className="text-[#55a060]" />
                            {language === "km" ? "បញ្ចូលក្នុង Cart" : "Load to Cart"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const socket = getSocket();
                              if (socket) {
                                socket.emit("order:update", { id: order.id, status: "preparing" });
                              }
                              setQrOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "preparing" } : o)));
                              setMessage(`Order ${orderNum} sent to Kitchen!`);
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#498b52] active:scale-95 px-3.5 py-1.5 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
                          >
                            <ChefHat size={13} />
                            {language === "km" ? "ផ្ញើទៅចុងភៅ" : "Send to Kitchen"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
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

function ProductCard({ product, dark, onAdd }: { product: Product; dark?: boolean; onAdd: () => void }) {
  const imageUrl = resolveImageUrl(product.imageUrl);
  const unavailable = !product.isAvailable;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={unavailable}
      className={`group relative overflow-hidden rounded-2xl border text-left shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60 flex flex-col justify-between ${
        dark ? "bg-[#232333] border-[#2b2c40] text-slate-100 hover:border-[#3b3c54]" : "bg-white border-slate-200/90 text-slate-800 hover:border-slate-300"
      }`}
    >
      {/* Product Image Cover */}
      <div className={`w-full aspect-[1.35] relative overflow-hidden shrink-0 border-b flex items-center justify-center ${
        dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-slate-50 border-slate-100"
      }`}>
        {product.category && (
          <span className="absolute top-0 left-0 bg-[#55a060] text-white text-[9.5px] font-bold px-2.5 py-1 rounded-br-lg z-10">
            {product.category.name}
          </span>
        )}

        {imageUrl && !imgFailed ? (
          <img
            src={imageUrl}
            alt={product.name}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className={`flex h-full w-full flex-col items-center justify-center ${dark ? "bg-[#2b2c40] text-slate-400" : "bg-slate-50 text-slate-300"}`}>
            <Utensils size={24} className="text-slate-400/80 mb-1" />
            <span className="text-[8.5px] font-bold text-slate-400/80 uppercase tracking-widest font-brand">No Photo</span>
          </div>
        )}

        {/* Plus Button Overlay */}
        {!unavailable && (
          <span className="absolute bottom-2 right-2 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-[#55a060] text-white shadow-xs hover:scale-110 active:scale-90 transition-all">
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
        <div>
          {product.trackStock && product.inventory && Number(product.inventory.quantity) <= Number(product.inventory.minStock) && (
            <div className="flex items-center gap-1 bg-[#fdf8e2] border border-[#fbeba5] text-[#b38f00] text-[9.5px] font-bold px-2 py-0.5 rounded mb-1.5">
              <AlertTriangle size={9.5} className="text-[#e6b800] shrink-0" />
              <span>Low Stock - {Number(product.inventory.quantity)} Qty</span>
            </div>
          )}

          <h3 className={`line-clamp-1 text-[12.5px] font-bold group-hover:text-[#55a060] transition-colors leading-snug ${
            dark ? "text-slate-100" : "text-slate-800"
          }`}>
            {product.name}
          </h3>

          {(() => {
            const key = product.name.toLowerCase();
            let text = null;
            if (key.includes("pizza")) text = "2 Variants • 2 Addons";
            else if (key.includes("fries")) text = "1 Variants • 1 Addons";
            else if (key.includes("burger")) text = "2 Variants • 3 Addons";
            else if (key.includes("almuerzo") || key.includes("ejecutivo")) text = "4 Variants • 8 Addons";
            else if (product.id % 3 === 0) text = "2 Variants • 4 Addons";
            else if (product.id % 4 === 0) text = "1 Variants • 2 Addons";
            
            if (!text) return null;
            return (
              <span className="text-[10.5px] text-slate-400 block mt-0.5 font-medium">
                {text}
              </span>
            );
          })()}

          <div className="mt-1 text-[12.5px] font-black text-[#55a060]">
            {money(product.basePrice)}
          </div>
        </div>
      </div>
    </button>
  );
}

function ProductListItem({ product, dark, onAdd }: { product: Product; dark?: boolean; onAdd: () => void }) {
  const imageUrl = resolveImageUrl(product.imageUrl);
  const unavailable = !product.isAvailable;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={`group relative flex overflow-hidden rounded-xl border text-left shadow-2xs hover:shadow-md transition-all duration-200 ease-out h-[105px] ${
      dark ? "bg-[#232333] border-[#2b2c40] text-slate-100 hover:border-[#3b3c54]" : "bg-white border-slate-200/90 text-slate-800 hover:border-slate-300"
    }`}>
      {/* Product Image Cover (Left Side) */}
      <div className={`w-[110px] sm:w-[120px] relative overflow-hidden shrink-0 border-r flex items-center justify-center ${
        dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-slate-50 border-slate-100"
      }`}>
        {product.category && (
          <span className="absolute top-0 left-0 bg-[#55a060] text-white text-[9px] font-bold px-2 py-0.5 rounded-br-md z-10">
            {product.category.name}
          </span>
        )}

        {imageUrl && !imgFailed ? (
          <img
            src={imageUrl}
            alt={product.name}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
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
          <h3 className={`line-clamp-1 text-xs font-bold group-hover:text-[#55a060] transition-colors leading-snug ${
            dark ? "text-slate-100" : "text-slate-800"
          }`}>
            {product.name}
          </h3>
          <span className="text-xs font-black text-[#55a060] shrink-0">
            {money(product.basePrice)}
          </span>
        </div>

        {/* Subtitle / Variants / Addons text */}
        {(() => {
          const key = product.name.toLowerCase();
          let text = null;
          if (key.includes("pizza")) text = "2 Variants • 2 Addons";
          else if (key.includes("fries")) text = "1 Variants • 1 Addons";
          else if (key.includes("burger")) text = "2 Variants • 3 Addons";
          else if (key.includes("almuerzo") || key.includes("ejecutivo")) text = "4 Variants • 8 Addons";
          else if (product.id % 3 === 0) text = "2 Variants • 4 Addons";
          else if (product.id % 4 === 0) text = "1 Variants • 2 Addons";
          
          if (!text) return <div className="flex-1" />;
          return (
            <span className="text-[10px] text-slate-400 block line-clamp-1 font-medium">
              {text}
            </span>
          );
        })()}

        {/* Bottom Action Row: ADD Button */}
        <div className="flex items-center justify-end mt-1">
          <button
            type="button"
            onClick={onAdd}
            disabled={unavailable}
            className="rounded-lg bg-[#55a060] px-4 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-[#439150] active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketItem({
  item,
  dark,
  imageUrl,
  onIncrement,
  onDecrement,
  onRemove,
  onAddNote,
}: {
  item: CartItem;
  dark?: boolean;
  imageUrl: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove?: () => void;
  onAddNote?: (noteText: string) => void;
}) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(item.notes || "");

  return (
    <div className={`group flex flex-col gap-2 rounded-xl border p-3 shadow-2xs transition-all duration-200 ${
      dark ? "bg-[#232333] border-[#2b2c40] text-slate-100" : "bg-white border-slate-100 text-slate-700"
    }`}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <h3 className={`truncate text-sm font-bold leading-snug ${dark ? "text-slate-100" : "text-slate-700"}`}>
            {item.name}
          </h3>
          <span className="text-xs font-semibold text-[#55a060] block mt-0.5">
            {money(item.unitPrice)} × {item.quantity} = {money(item.unitPrice * item.quantity)}
          </span>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-all shrink-0 cursor-pointer"
            title="Remove item"
          >
            <Trash2 size={13} className="stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Stepper Count & Add Note Row */}
      <div className="flex items-center justify-between mt-1">
        <div className={`flex items-center rounded-lg border p-0.5 scale-100 ${
          dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-slate-50/50 border-slate-200"
        }`}>
          <button
            type="button"
            onClick={onDecrement}
            className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className={`w-6 text-center text-xs font-bold ${dark ? "text-slate-200" : "text-slate-600"}`}>
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Add Notes Button */}
        {onAddNote && (
          <button
            type="button"
            onClick={() => setIsEditingNote(!isEditingNote)}
            className={`rounded-lg border px-2 py-1 text-[10.5px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              dark ? "border-[#3b3c54] bg-[#2b2c40] text-slate-300 hover:bg-[#34354e]" : "border-slate-100 bg-slate-50/50 text-slate-500 hover:bg-slate-100"
            }`}
          >
            📝 {item.notes ? `Note: "${item.notes}"` : "Add Notes"}
          </button>
        )}
      </div>

      {/* Note input slide-down */}
      {isEditingNote && onAddNote && (
        <div className="mt-1 flex items-center gap-1 animate-[usersPageIn_150ms_ease-out]">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add note (e.g. Less sugar)..."
            className={`h-8.5 w-full rounded border px-2 text-xs font-semibold outline-none focus:border-[#55a060] transition-all ${
              dark ? "border-[#3b3c54] bg-[#2b2c40] text-slate-100 focus:bg-[#34354e]" : "border-slate-200 bg-slate-50 text-slate-700 focus:bg-white"
            }`}
          />
          <button
            type="button"
            onClick={() => {
              onAddNote(noteText);
              setIsEditingNote(false);
            }}
            className="rounded bg-[#55a060] text-white px-2 py-1 text-xs font-bold cursor-pointer"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

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

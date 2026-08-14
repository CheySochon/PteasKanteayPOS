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
    const socket = getSocket();
    if (!socket) return;

    function handleOrderCreated(order: any) {
      const label = order.orderNumber || order.orderId || `#${order.id}`;
      const table = order.table?.name || order.tableNo;
      const detail = table ? `${label} - Table ${table} needs attention` : `${label} needs attention`;

      const notif = {
        id: `order-${order.id}-${Date.now()}`,
        title: "New order received",
        detail,
        orderId: order.id,
        tableNo: String(table || ""),
        totalAmount: Number(order.totalAmount || 0),
      };

      setNotifications((current) => [notif, ...current].slice(0, 5));
      setToastNotification(notif);
      setTimeout(() => setToastNotification(null), 5000);
    }

    socket.on("order:created", handleOrderCreated);
    return () => {
      socket.off("order:created", handleOrderCreated);
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
    const newHeld = {
      id: Date.now(),
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
    setOrderingMode(false); // Return to Table Map
    setTicketNumber(String(Date.now()).slice(-4));
    setMessage("Order held successfully.");
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
      <main className={`overflow-hidden bg-[#f5f5f9] flex flex-col items-center justify-center text-[#566a7f] ${isAdminView ? 'h-full w-full flex-1' : 'h-screen w-screen'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#696cff] border-t-transparent shadow-sm"></div>
          <p className="text-sm font-semibold tracking-wide uppercase">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <div suppressHydrationWarning className={isAdminView ? `flex h-screen h-[100dvh] overflow-hidden font-sans ${theme === "dark" ? "bg-[#232333]" : "bg-white"} ${language === "km" ? "font-khmer" : ""}` : "h-screen w-screen"}>
      <div className={isAdminView ? "flex-1 flex flex-col h-full overflow-hidden" : "h-full w-full"}>
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
        <main className={`overflow-hidden bg-[#f8f9fa] flex flex-col text-slate-700 print:bg-white print:overflow-visible print:h-auto print:text-black ${isAdminView ? 'h-full w-full flex-1' : 'h-full w-full'}`}>
      {/* Toast Notification for Kitchen */}
      {showKitchenToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-2.5 rounded-xl bg-emerald-500 text-white px-5 py-3.5 shadow-lg font-bold text-xs animate-[posLogoutCard_200ms_cubic-bezier(0.16,1,0.3,1)_both]">
          ✓ Order sent to kitchen!
        </div>
      )}
      {/* Global POS Header (Top Bar) */}
      {!isAdminView && (
        <header className="relative flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-100/80 shadow-sm shadow-slate-100/30 shrink-0 m-4 sm:m-6 mb-0 sm:mb-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-slate-800 tracking-tight">Terminal Status</h1>
            
            <div className="flex items-center gap-2 ml-4">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                <span>{isOnline ? "Online" : "Offline"}</span>
              </div>

              <div className="w-px h-5 bg-slate-200 mx-1" />

              <button 
                type="button" 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative text-slate-400 hover:text-slate-600 transition-colors p-1.5"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </button>

              <button 
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("pos-menu-change"));
                }}
                className={`text-slate-400 hover:text-slate-600 transition-colors p-1.5 ${syncing ? 'animate-spin' : ''}`}
              >
                <RotateCw size={18} />
              </button>
            </div>
          </div>

          {/* Cashier Info & Close Shift Button */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-full px-3 py-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-[10px] font-black uppercase overflow-hidden border border-slate-200">
                {currentUserImageUrl ? (
                  <img src={resolveImageUrl(currentUserImageUrl)} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  (currentUserName ? currentUserName.split(" ").map(w => w[0]).join("").slice(0, 2) : "AC")
                )}
              </div>
              <span className="text-xs font-bold text-slate-700 capitalize">{currentUserName || "Alex Cashier"}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="border border-rose-200 text-rose-600 hover:bg-rose-50 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <LogOut size={13} />
              Close Shift
            </button>
          </div>
        </header>
      )}
      {!orderingMode && (
      <div className={`flex flex-1 overflow-hidden bg-[#f8f9fa] w-full h-full p-4 sm:p-6 relative print:hidden ${isAdminView ? 'pt-4 sm:pt-5' : 'pt-2 sm:pt-2'}`}>
        {/* VIEW 1: Table Map View — only shown when NOT in ordering mode */}
        {!orderingMode && (<div className="flex flex-1 flex-col overflow-hidden w-full h-full space-y-4">
          {/* Sub-header: Filters & Actions */}
          <div className="flex flex-col gap-4 bg-white rounded-2xl p-4 border border-slate-100/80 shadow-sm shadow-slate-100/30 shrink-0">
            {/* Row 1: Tabs & Stats */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex gap-2 max-w-full overflow-x-auto no-scrollbar">
                {Array.from(new Set(tables.map((t) => t.zone))).map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setSelectedZone(zone)}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      selectedZone === zone
                        ? "bg-[#0066ff] text-white shadow-sm shadow-blue-500/10"
                        : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {zone.charAt(0).toUpperCase() + zone.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Counters */}
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  ● {tables.filter((t) => !(tableIsSent[`table-${t.id}`] || t.isOccupied)).length} Free
                </span>
                <span className="bg-rose-50 border border-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  ● {tables.filter((t) => tableIsSent[`table-${t.id}`] || t.isOccupied).length} Occupied
                </span>
              </div>
            </div>

            {/* Row 2: Status buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => switchSelection(undefined, true)}
                className="border border-blue-500 bg-blue-50/50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer"
              >
                <List size={13} />
                Pending
              </button>
              <button
                type="button"
                onClick={() => switchSelection(undefined, true)}
                className="border border-amber-500 bg-amber-50/50 text-amber-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Clock size={13} />
                Reserve
              </button>
              <button
                type="button"
                onClick={() => switchSelection(undefined, true)}
                className="border border-slate-600 bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Smartphone size={13} />
                App
              </button>
              <button
                type="button"
                onClick={() => switchSelection(undefined, true)}
                className="border border-purple-500 bg-purple-50/50 text-purple-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-100 flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag size={13} />
                Takeaway
              </button>
            </div>
          </div>

          {/* Tables Grid Layout */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredTables.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-400">
                No tables found in this zone.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredTables.map((table) => {
                  const isOccupied = tableIsSent[`table-${table.id}`] || table.isOccupied;
                  const reservationTime = table.reservation || (table.name.toLowerCase().includes("4") ? "18:30" : null);
                  const isReserved = !isOccupied && !!reservationTime;

                  const tableCart = tableCarts[`table-${table.id}`] || [];
                  const tableSubtotal = tableCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
                  const tableDiscount = tableSubtotal * ((tableDiscounts[`table-${table.id}`] || 0) / 100);
                  const tableTotal = Math.max(tableSubtotal - tableDiscount, 0) * (1 + serviceRate + vatRate);

                  return (
                    <div
                      key={table.id}
                      onClick={() => switchSelection(table.id, true)}
                      className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col items-center w-full max-w-[200px] cursor-pointer active:scale-[0.98] ${
                        isOccupied 
                          ? "border-rose-400" 
                          : isReserved 
                            ? "border-amber-400" 
                            : "border-slate-200/80 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <span className="text-xs font-bold text-slate-400">
                          {table.name}
                        </span>
                        {isOccupied && (
                          <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] px-1.5 py-0.5 rounded font-black">
                            ACTIVE
                          </span>
                        )}
                        {isReserved && (
                          <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[9px] px-1.5 py-0.5 rounded font-black">
                            {reservationTime}
                          </span>
                        )}
                      </div>

                      <div className={`border rounded-2xl w-full aspect-square flex flex-col justify-center items-center shadow-3xs transition-all duration-300 p-4 ${
                        isOccupied 
                          ? "border-rose-300 bg-rose-50/40 text-rose-600" 
                          : isReserved
                            ? "border-amber-300 bg-amber-50/40 text-amber-600"
                            : "border-emerald-300 bg-emerald-50/40 text-emerald-600"
                      }`}>
                        <span className="text-4xl font-extrabold tracking-tight">
                          {table.name.toLowerCase().trim() === "vip lounge" ? "V1" : (table.name.replace(/[^0-9]/g, '') || table.name)}
                        </span>
                        <span className={`text-[10px] font-bold mt-1.5 flex items-center gap-1 ${
                          isOccupied 
                            ? "text-rose-400" 
                            : isReserved 
                              ? "text-amber-400" 
                              : "text-emerald-400"
                        }`}>
                          👥 {table.capacity}
                        </span>
                        {isOccupied && (
                          <span className="text-[11px] font-extrabold text-slate-800 mt-1">
                            {money(tableTotal || 142.50)}
                          </span>
                        )}
                      </div>

                      <div className={`mt-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider w-full text-center border text-white ${
                        isOccupied 
                          ? "bg-rose-700 border-rose-700" 
                          : isReserved
                            ? "bg-[#f59e0b] border-[#f59e0b]"
                            : "bg-emerald-700 border-emerald-700"
                      }`}>
                        {isOccupied ? "OCCUPIED" : isReserved ? "RESERVED" : "AVAILABLE"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>)}
      </div>
      )}
      {/* VIEW 2: Ordering Interface — full screen, no padding wrapper */}
      {orderingMode && (
        <div className="flex flex-1 overflow-hidden w-full min-h-0">
          {/* LEFT: Product Catalogue */}
          <section className="flex min-w-0 flex-1 flex-col bg-[#f8f9fa]">

            {/* ── Header: "POS - Point of Sale" + action buttons ── */}
            <header className="flex items-center justify-between h-[68px] px-6 border-b border-slate-100 bg-white shrink-0 gap-3">
              <h1 className="text-base font-black text-slate-800 shrink-0 tracking-wide">
                POS &ndash; Point of Sale
              </h1>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#6b7a82] bg-[#f8faf9] border border-[#ebf0ec] rounded-xl px-3 py-2 hover:bg-[#f0f4f2] active:scale-95 transition-all cursor-pointer"
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
                  className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#6b7a82] bg-[#f8faf9] border border-[#ebf0ec] rounded-xl px-3 py-2 hover:bg-[#f0f4f2] active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  New
                </button>
                <button
                  type="button"
                  className="relative flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#6b7a82] bg-[#f8faf9] border border-[#ebf0ec] rounded-xl px-3 py-2 hover:bg-[#f0f4f2] active:scale-95 transition-all cursor-pointer"
                >
                  <QrCode size={14} />
                  QR Menu Orders
                  {unreadCount > 0 && (
                    <span className="ml-0.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setHeldModalOpen(true)}
                  className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#6b7a82] bg-[#f8faf9] border border-[#ebf0ec] rounded-xl px-3 py-2 hover:bg-[#f0f4f2] active:scale-95 transition-all cursor-pointer"
                >
                  <Archive size={14} />
                  Drafts List
                  {heldOrders.length > 0 && (
                    <span className="ml-0.5 bg-slate-200 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                      {heldOrders.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderingMode(false)}
                  className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#6b7a82] bg-[#f8faf9] border border-[#ebf0ec] rounded-xl px-3 py-2 hover:bg-[#f0f4f2] active:scale-95 transition-all cursor-pointer"
                >
                  <List size={14} />
                  Table Orders
                </button>
              </div>
            </header>

            {/* ── Category Pills + Search row ── */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-white shrink-0 min-w-0">
              {/* Left Scrollable Pills Wrapper */}
              <div className="w-[320px] shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setCategoryId("all")}
                  className={`shrink-0 h-10 px-5 rounded-full text-[13px] font-bold transition-all cursor-pointer ${
                    categoryId === "all"
                      ? "bg-[#55a060] text-white shadow-sm"
                      : "bg-[#f8faf9] border border-[#ebf0ec] text-[#6b7a82] hover:bg-[#f0f4f2]"
                  }`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                    className={`shrink-0 h-10 px-5 rounded-full text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      categoryId === category.id
                        ? "bg-[#55a060] text-white shadow-sm"
                        : "bg-[#f8faf9] border border-[#ebf0ec] text-[#6b7a82] hover:bg-[#f0f4f2]"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Right Fixed Search & Layout Grid Wrapper */}
              <div className="flex-1 flex items-center justify-end gap-2 pl-2 min-w-0">
                {/* Search bar */}
                <div className="relative flex-1 max-w-[340px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13.5px] font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#70b379] transition-all"
                  />
                </div>
                {/* Grid icon */}
                <button
                  type="button"
                  className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-[#70b379] hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>

            {/* ── Product Grid ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 bg-[#f8f9fa] min-h-0">
              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-400">
                  <ChefHat size={32} className="mx-auto mb-3 text-slate-300" />
                  No matching menu selections found.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAdd={() => addProduct(product)} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: Cart / WALKIN CUSTOMER */}
          <aside className="w-[330px] xl:w-[355px] shrink-0 border-l border-slate-100 bg-white flex flex-col h-full overflow-hidden">

            {/* ── WALKIN CUSTOMER header ── */}
            <div className="flex items-center gap-2 px-4.5 pt-3.5 pb-2 border-b border-slate-100 shrink-0">
              <div className="flex-1 flex h-10 items-center rounded-lg border border-[#ebf0ec] bg-[#f8faf9] px-3.5 text-xs font-bold text-[#6b7a82] tracking-wide uppercase select-none">
                {selectedTable ? selectedTable.name : "WALKIN CUSTOMER"}
              </div>
              <button type="button" className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#ebf0ec] bg-[#f8faf9] text-[#6b7a82] hover:bg-[#f0f4f2] transition-colors shrink-0 cursor-pointer">
                <Search size={15} />
              </button>
            </div>

            {/* ── Select Dining Option + Select Table ── */}
            <div className="flex gap-2 px-4.5 py-3.5 border-b border-slate-100 shrink-0">
              <div className="relative flex-1">
                <select
                  value={tableId ? "dine-in" : "walk-in"}
                  onChange={(e) => { if (e.target.value === "walk-in") setTableId(undefined); }}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-7 text-xs font-semibold text-slate-700 outline-none focus:border-[#70b379] transition-all appearance-none cursor-pointer"
                >
                  <option value="walk-in">Select Dining Option</option>
                  <option value="dine-in">Dine In</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
              <div className="relative flex-1">
                <select
                  value={tableId || ""}
                  onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-7 text-xs font-semibold text-slate-700 outline-none focus:border-[#70b379] transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
            </div>

            {/* ── Cart Items / Empty State ── */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <ShoppingBag size={44} className="text-slate-200 mb-3" />
                  <span className="text-xs font-bold text-slate-500">Cart is empty</span>
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
                        imageUrl={resolveImageUrl(product?.imageUrl)}
                        onIncrement={() => {
                          const prod = products.find((p) => p.id === item.productId);
                          const nextQty = item.quantity + 1;
                          if (prod?.trackStock && Number(prod.inventory?.quantity ?? 0) < nextQty) {
                            alert(`Insufficient stock for ${prod.name}. Available: ${Number(prod.inventory?.quantity).toFixed(0)} ${prod.unit}`);
                            return;
                          }
                          setCart((current) =>
                            current.map((entry, i) =>
                              i === index ? { ...entry, quantity: nextQty } : entry
                            )
                          );
                        }}
                        onDecrement={() =>
                          setCart((current) =>
                            current.flatMap((entry, i) =>
                              i === index
                                ? entry.quantity <= 1
                                  ? []
                                  : [{ ...entry, quantity: entry.quantity - 1 }]
                                : [entry]
                            )
                          )
                        }
                        onRemove={() =>
                          setCart((current) => current.filter((_, i) => i !== index))
                        }
                        onAddNote={(noteText) => {
                          setCart((current) =>
                            current.map((entry, i) =>
                              i === index ? { ...entry, notes: noteText } : entry
                            )
                          );
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Summary Footer ── */}
            <div className="border-t border-slate-100 px-6 pt-4 pb-5 bg-white space-y-3 shrink-0">
              <div className="space-y-2">
                <SummaryRow label="Sub total :" value={money(subtotal)} />
                <SummaryRow label="Product Discount :" value={money(discountAmount)} />
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[17px] font-black text-slate-800">Total :</span>
                <span className="text-3xl font-black text-slate-900">{money(total)}</span>
              </div>
              {/* Draft + Send to Kitchen row */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleHoldOrder}
                  disabled={cart.length === 0}
                  className="flex-1 flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Archive size={16} /> Draft
                </button>
                <button
                  type="button"
                  onClick={handleSendToKitchen}
                  disabled={cart.length === 0}
                  className="flex-1 flex h-11 items-center justify-center gap-2 rounded-xl border border-[#70b379] text-[13px] font-bold text-[#70b379] hover:bg-[#70b379]/5 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChefHat size={16} /> Send to Kitchen
                </button>
              </div>
              {/* Create Receipt & Pay */}
              <button
                type="button"
                onClick={handlePayClick}
                disabled={cart.length === 0}
                className="w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-[#70b379] hover:bg-[#5fa368] text-[14.5px] font-bold text-white shadow-sm shadow-[#70b379]/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Banknote size={16} /> Create Receipt &amp; Pay
              </button>
            </div>
          </aside>
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

      {/* Held Orders Modal */}
      {heldModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-[dashboardPageIn_200ms_ease-out]">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Archive size={18} className="text-[#696cff]" />
                Held Orders (ការកុម្មង់ផ្អាកបណ្តោះអាសន្ន)
              </h3>
              <button 
                onClick={() => setHeldModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5">
              {heldOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center text-xs font-semibold text-slate-400">
                  <Archive size={32} className="mx-auto mb-2 text-slate-300" />
                  <span>No held orders found.</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {heldOrders.map((order) => (
                    <div 
                      key={order.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-slate-50 hover:border-slate-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-xs font-black text-slate-800">
                            Ticket #{order.ticketNumber} - {order.tableName}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                            Held at: {new Date(order.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <span className="text-sm font-black text-[#696cff]">{money(order.total)}</span>
                      </div>

                      {/* Items Preview */}
                      <div className="text-[11px] font-medium text-slate-500 line-clamp-1 mb-3">
                        {order.items.map((item: any) => `${item.quantity}x ${item.name}`).join(", ")}
                      </div>

                      <div className="flex justify-end gap-2 border-t border-slate-100/80 pt-2.5">
                        <button
                          type="button"
                          onClick={() => handleDiscardHeldOrder(order.id)}
                          className="rounded-lg bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-100 active:scale-95 transition-all"
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRecallOrder(order)}
                          className="rounded-lg bg-[#696cff] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#5f61e6] active:scale-95 transition-all"
                        >
                          Recall Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 p-4">
              <button 
                onClick={() => setHeldModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
              >
                Close
              </button>
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
        </main>
      </div>
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const imageUrl = resolveImageUrl(product.imageUrl);
  const unavailable = !product.isAvailable;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={unavailable}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60 flex flex-col justify-between"
    >
      {/* Product Image Cover */}
      <div className="w-full aspect-[1.3] bg-slate-50 relative overflow-hidden shrink-0 border-b border-slate-100 flex items-center justify-center">
        {product.category && (
          <span className="absolute top-2.5 left-2.5 bg-[#70b379] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg z-10">
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
          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 text-slate-300">
            <Utensils size={26} className="text-slate-300/80 mb-1" />
            <span className="text-[9px] font-bold text-slate-400/80 uppercase tracking-widest font-brand">No Photo</span>
          </div>
        )}

        {/* Plus Button Overlay */}
        {!unavailable && (
          <span className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#70b379] text-white shadow-sm hover:scale-110 active:scale-90 transition-all">
            <Plus size={14} className="stroke-[3]" />
          </span>
        )}

        {/* Unavailable overlay */}
        {unavailable && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[8px] font-extrabold text-white uppercase tracking-wider shadow-md">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-3 w-full flex-1 flex flex-col justify-between">
        <div>
          {product.trackStock && product.inventory && Number(product.inventory.quantity) <= Number(product.inventory.minStock) && (
            <div className="flex items-center gap-1.5 bg-[#fdf8e2] border border-[#fbeba5] text-[#b38f00] text-[10px] font-bold px-2.5 py-0.5 rounded-lg mb-2">
              <AlertTriangle size={10} className="text-[#e6b800] shrink-0" />
              <span>Low Stock - {Number(product.inventory.quantity)} Qty</span>
            </div>
          )}

          <h3 className="line-clamp-1 text-[13.5px] font-bold text-slate-800 group-hover:text-[#70b379] transition-colors leading-tight">
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
              <span className="text-[11.5px] text-slate-400 block mt-1 font-medium">
                {text}
              </span>
            );
          })()}

          <div className="mt-1 text-[13.5px] font-black text-[#70b379]">
            {money(product.basePrice)}
          </div>
        </div>
      </div>
    </button>
  );
}

function TicketItem({
  item,
  imageUrl,
  onIncrement,
  onDecrement,
  onRemove,
  onAddNote,
}: {
  item: CartItem;
  imageUrl: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove?: () => void;
  onAddNote?: (noteText: string) => void;
}) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(item.notes || "");

  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-2xs hover:shadow-xs hover:border-slate-200/80 transition-all duration-200">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-700 leading-snug">
            {item.name}
          </h3>
          <span className="text-xs font-semibold text-[#70b379] block mt-0.5">
            {money(item.unitPrice)} × {item.quantity} = {money(item.unitPrice * item.quantity)}
          </span>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-300 hover:text-rose-500 p-0.5 rounded transition-all shrink-0 cursor-pointer"
            title="Remove item"
          >
            <Trash2 size={13} className="stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Stepper Count & Add Note Row */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/50 p-0.5 scale-100">
          <button
            type="button"
            onClick={onDecrement}
            className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className="w-6 text-center text-xs font-bold text-slate-600">
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
            className="rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-1 text-[10.5px] font-semibold text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer"
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
            className="h-8.5 w-full rounded border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#70b379] focus:bg-white transition-all"
          />
          <button
            type="button"
            onClick={() => {
              onAddNote(noteText);
              setIsEditingNote(false);
            }}
            className="rounded bg-[#70b379] text-white px-2 py-1 text-xs font-bold cursor-pointer"
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
    burger: "🍔", sandwich: "🥪", noodle: "🍜", rice: "🍚",
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-400 tracking-wide">{label}</span>
      <span className="text-xs font-bold text-slate-700">{value}</span>
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

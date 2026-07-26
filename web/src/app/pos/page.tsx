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
} from "lucide-react";
import { cartItemFromProduct, type CartItem } from "../../components/CartPanel";
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

export default function PosPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [tableId, setTableId] = useState<number | undefined>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [ticketNumber, setTicketNumber] = useState("0000");
  const [posName, setPosName] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_POS_NAME;
    return localStorage.getItem("pos_restaurant_name") || DEFAULT_POS_NAME;
  });
  const [restaurantImageUrl, setRestaurantImageUrl] = useState("");
  const [serviceRate, setServiceRate] = useState(SERVICE_RATE);
  const [vatRate, setVatRate] = useState(VAT_RATE);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [splitCount, setSplitCount] = useState(2);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
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
  const unreadCount = notifications.length;

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

  useEffect(() => {
    function syncPosName() {
      setPosName(localStorage.getItem("pos_restaurant_name") || DEFAULT_POS_NAME);
    }

    window.addEventListener("storage", syncPosName);
    window.addEventListener("pos-settings-change", syncPosName);

    return () => {
      window.removeEventListener("storage", syncPosName);
      window.removeEventListener("pos-settings-change", syncPosName);
    };
  }, []);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === tableId),
    [tableId, tables]
  );

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

  function addProduct(product: Product) {
    const item = cartItemFromProduct(product);
    const key = item.productId;

    setCart((current) => {
      const exists = current.some((entry) => entry.productId === key);
      if (!exists) return [...current, item];

      return current.map((entry) =>
        entry.productId === key
          ? { ...entry, quantity: entry.quantity + 1 }
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

      setCart([]);
      setDiscountPercent(0);
      setSplitOpen(false);
      setDiscountOpen(false);
      setPaymentModalOpen(false);
      setCashReceived(0);
      setTicketNumber(String(Date.now()).slice(-4));
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
      <main className="h-screen w-screen overflow-hidden bg-[#f5f5f9] flex flex-col items-center justify-center text-[#566a7f]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#696cff] border-t-transparent shadow-sm"></div>
          <p className="text-sm font-semibold tracking-wide uppercase">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#f5f5f9] flex flex-col text-slate-700 print:bg-white print:overflow-visible print:h-auto print:text-black">
      <div className="flex flex-1 overflow-hidden bg-[#f5f5f9] w-full h-full print:hidden">
        
        {/* Left Side: Product Grid & Search */}
        <section className="flex min-w-0 flex-1 flex-col bg-[#f5f5f9]">
          <header className="flex h-[70px] items-center gap-3 border-b border-[#eceef1] px-4 sm:px-6 bg-white">
            <div className="flex h-11 shrink-0 items-center gap-2.5 pr-2">
              {restaurantImageUrl ? (
                <img
                  src={resolveImageUrl(restaurantImageUrl)}
                  alt="POS Logo"
                  className="h-9 w-9 rounded-xl object-cover border border-[#0F522B]/20 shadow-xs"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F522B] text-white shadow-xs">
                  <Utensils size={18} />
                </div>
              )}
              <div className="hidden min-w-0 sm:flex sm:flex-col leading-tight">
                <span className="font-khmer font-bold text-sm text-slate-800 truncate max-w-[210px] tracking-normal">
                  {posName}
                </span>
                <span className="text-[9.5px] font-black tracking-widest text-[#0F522B] uppercase">
                  LIVE TERMINAL STATION
                </span>
              </div>
            </div>

            {/* Live Search Bar */}
            <div className="relative max-w-[420px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a1acb8]" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search menu items..."
                className="h-10 w-full rounded border border-[#d9dee3] bg-white pl-10 pr-3 text-sm outline-none placeholder:text-[#b4bdc6] focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 transition-all duration-150"
              />
            </div>

            {/* Actions & Utilities */}
            <div className="ml-auto flex items-center gap-3">
              {/* Network Status */}
              <div className={`flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600 animate-pulse'}`}>
                {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{isOnline ? (syncing ? "Syncing..." : "Online") : "Offline"}</span>
              </div>

              {/* Admin navigation shortcut link */}
              <Link
                href="/admin"
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded bg-[#696cff] px-4 text-xs font-semibold text-white hover:bg-[#5f61e6] active:scale-95 transition-all shadow-sm shadow-[#696cff]/20"
                title="Switch to admin dashboard"
              >
                <LayoutDashboard size={15} />
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Link>

              {/* Divider */}
              <div className="hidden h-5 w-px bg-[#d9dee3] sm:block"></div>

              <div className="hidden items-center gap-1 sm:flex">
                <div className="relative" ref={notificationsRef}>
                  <IconButton label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}>
                    <div className="relative">
                      <Bell size={17} className="text-[#566a7f]" />
                      {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff3e1d] text-[10px] font-bold text-white shadow-[0_0_0_2px_#fff]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </IconButton>

                  {notificationsOpen && (
                    <div className="absolute right-0 top-10 z-50 mt-2 w-72 overflow-hidden rounded-lg border border-[#d9dee3] bg-white shadow-xl animate-[usersPageIn_200ms_ease-out]">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
                        <span className="text-xs font-bold text-slate-700">Notifications</span>
                        {notifications.length > 0 && (
                          <button onClick={() => setNotifications([])} className="text-[10px] font-bold text-slate-400 hover:text-slate-800 transition-colors">Clear</button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No new notifications</div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
                          {notifications.map((item) => (
                            <div key={item.id} className="rounded-md bg-white p-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                              <div className="text-[11px] font-black text-slate-800">{item.title}</div>
                              <div className="mt-0.5 text-[11px] text-slate-500 leading-tight">{item.detail}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Link href="/admin/settings">
                  <IconButton label="Settings">
                    <Settings size={18} className="text-[#566a7f]" />
                  </IconButton>
                </Link>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 bg-[#f5f5f9]">
            {message && (
              <div className="mb-4 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {message}
              </div>
            )}

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              {/* <div>
                <h1 className="text-2xl font-bold text-[#566a7f] sm:text-3xl">Terminal Menu</h1>
                <p className="mt-1 text-xs font-semibold text-[#a1acb8]">
                  {filteredProducts.length} items matching search criteria
                </p>
              </div> */}

              {/* Sneat Pills Category Tabs */}
              <div className="flex max-w-full gap-1.5 overflow-x-auto rounded bg-[#eceef1]/60 p-1">
                <CategoryTab active={categoryId === "all"} onClick={() => setCategoryId("all")}>
                  All Menu
                </CategoryTab>
                {categories.map((category) => (
                  <CategoryTab
                    key={category.id}
                    active={categoryId === category.id}
                    onClick={() => setCategoryId(category.id)}
                  >
                    {category.name}
                  </CategoryTab>
                ))}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded border border-dashed border-[#e5e7eb] bg-slate-50/50 p-12 text-center text-sm font-semibold text-[#8592a3]">
                <ChefHat size={32} className="mx-auto mb-3 text-slate-300" />
                No matching menu selections found.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onAdd={() => addProduct(product)} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Order Ticket Checkout */}
        <aside className="hidden w-[380px] shrink-0 border-l border-[#eceef1] bg-white lg:flex lg:flex-col">
          <div className="flex h-[70px] items-center justify-between border-b border-[#eceef1] px-6">
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setDiscountPercent(0);
                setSplitOpen(false);
                setDiscountOpen(false);
                setTicketNumber(String(Date.now()).slice(-4));
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded bg-[#696cff] px-4 text-xs font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all"
            >
              <Plus size={14} />
              New Order
            </button>
            <button
              type="button"
              onClick={() => setCart([])}
              className="flex h-9 w-9 items-center justify-center rounded text-[#8592a3] hover:bg-red-50 hover:text-[#ff3e1d] transition-all"
              title="Clear current cart"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-[#566a7f]">Order Ticket</h2>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#a1acb8]">
                <MapPin size={11} className="text-[#a1acb8]" />
                <span>{selectedTable ? `${selectedTable.name} (${selectedTable.zone})` : "Walk-in / Takeaway"}</span>
              </div>
              
              {/* Tables Selection Dropdown */}
              <select
                value={tableId || ""}
                onChange={(event) => setTableId(event.target.value ? Number(event.target.value) : undefined)}
                className="mt-3 h-10 w-full rounded border border-[#d9dee3] bg-white px-3 text-sm font-semibold text-[#566a7f] outline-none focus:border-[#696cff] transition-all"
              >
                <option value="">Walk-in / Takeaway</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} - {table.zone} ({table.capacity} Seats)
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5 flex gap-2">
              <span className="rounded bg-[#e7e7ff] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#696cff]">
                {selectedTable ? "Dine In" : "Takeaway"}
              </span>
              <span className="rounded bg-[#eceef1] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8592a3]">
                #{ticketNumber || "0000"}
              </span>
            </div>

            {/* Cart Ticket List */}
            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="rounded border border-dashed border-[#e5e7eb] bg-slate-50/50 p-8 text-center text-xs font-semibold text-[#8592a3]">
                  <ShoppingBag size={22} className="mx-auto mb-2 text-slate-300" />
                  Select menu items to populate order ticket.
                </div>
              ) : (
                cart.map((item, index) => {
                  const product = productMap.get(item.productId);
                  return (
                    <TicketItem
                      key={`${item.productId}-${index}`}
                      item={item}
                      imageUrl={resolveImageUrl(product?.imageUrl)}
                      onIncrement={() =>
                        setCart((current) =>
                          current.map((entry, i) =>
                            i === index ? { ...entry, quantity: entry.quantity + 1 } : entry
                          )
                        )
                      }
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
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Checkout Totals Summary Section */}
          <div className="border-t border-[#eceef1] px-6 py-5 bg-[#f5f5f9]/40 space-y-3">
            <SummaryRow label="Subtotal" value={money(subtotal)} />

            {/* Split Bill Direct Input Row */}
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-[#a1acb8]">Split Bill (Guests)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSplitCount((value) => Math.max(1, value - 1))}
                    className="flex h-6 w-6 items-center justify-center rounded border border-[#d9dee3] bg-white text-[#8592a3] hover:text-[#696cff] hover:border-[#696cff] transition-all"
                  >
                    <Minus size={11} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={splitCount}
                    onChange={(event) => setSplitCount(Math.max(1, Number(event.target.value || 1)))}
                    className="h-6 w-10 rounded border border-[#d9dee3] bg-white text-center text-xs font-bold text-[#566a7f] outline-none focus:border-[#696cff] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSplitCount((value) => value + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded border border-[#d9dee3] bg-white text-[#8592a3] hover:text-[#696cff] hover:border-[#696cff] transition-all"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>
              <span className="text-[#566a7f] font-bold">
                {splitCount > 1 ? `${money(splitAmount)} each` : money(total)}
              </span>
            </div>

            {/* Discount Direct Input Row */}
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-[#a1acb8]">Discount (%)</span>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(event) =>
                      setDiscountPercent(Math.min(100, Math.max(0, Number(event.target.value || 0))))
                    }
                    className="h-6 w-14 rounded border border-[#d9dee3] bg-white pr-4 text-center text-xs font-bold text-[#566a7f] outline-none focus:border-[#696cff] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="pointer-events-none absolute right-1.5 text-[10px] font-bold text-[#a1acb8]">%</span>
                </div>
              </div>
              <span className="text-[#ff3e1d] font-bold">
                {discountAmount > 0 ? `-${money(discountAmount)}` : money(0)}
              </span>
            </div>

            {/* Promo preset quick buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {PROMO_CODES.map((promo) => (
                <button
                  key={promo.code}
                  type="button"
                  onClick={() => setDiscountPercent(discountPercent === promo.value ? 0 : promo.value)}
                  className={`h-6 rounded-md px-2 text-[9px] font-extrabold uppercase transition-all ${
                    discountPercent === promo.value
                      ? "bg-[#696cff] text-white shadow-sm shadow-[#696cff]/20"
                      : "bg-white text-[#8592a3] border border-[#d9dee3] hover:text-[#696cff]"
                  }`}
                >
                  {promo.label}
                </button>
              ))}
            </div>

            <SummaryRow label={`Service Charge (${Math.round(serviceRate * 100)}%)`} value={money(serviceFee)} />
            <SummaryRow label={`VAT (${Math.round(vatRate * 100)}%)`} value={money(vat)} />

            <div className="mt-4 flex items-end justify-between border-t pt-3 border-[#eceef1]">
              <span className="text-sm font-bold uppercase tracking-wider text-[#8592a3]">Total Amount</span>
              <span className="text-3xl font-bold text-[#696cff]">{money(total)}</span>
            </div>

            {/* Pay Now Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handlePayClick}
                className="flex w-full items-center justify-center gap-2 rounded bg-[#696cff] py-3.5 text-[13px] font-bold text-white shadow-sm shadow-[#696cff]/30 hover:bg-[#5f61e6] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all"
              >
                Pay Now & Print
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile bottom checkout panel */}
        <MobileTicket
          cart={cart}
          total={total}
          loading={loading}
          onCheckout={handlePayClick}
        />
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
    </main>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const imageUrl = resolveImageUrl(product.imageUrl);
  const unavailable = !product.isAvailable;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={unavailable}
      className="group overflow-hidden rounded border border-[#e5e7eb] bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 flex flex-col justify-between"
    >
      <div className="w-full aspect-[1.38] bg-slate-50 dark:bg-[#232333] relative overflow-hidden shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ChefHat size={30} />
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between w-full">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 min-w-0 text-xs font-bold leading-snug text-[#566a7f] group-hover:text-[#696cff] transition-colors">
              {product.name}
            </h3>
            <span className="shrink-0 text-xs font-bold text-[#696cff]">
              {money(product.basePrice)}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 min-h-[28px] text-[10px] font-medium leading-normal text-[#a1acb8]">
            {product.description || product.category?.name || "Fresh chef selection."}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5 border-[#f5f5f9]">
          <span className={`min-w-0 truncate rounded px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
            unavailable ? "bg-[#ffe5e5] text-[#ff3e1d]" : "bg-[#e8fadf] text-[#71dd37]"
          }`}>
            {unavailable ? "Out of stock" : product.category?.name || "Ready"}
          </span>
          
          <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-[#e7e7ff] text-[#696cff] group-hover:bg-[#696cff] group-hover:text-white transition-all">
            <Plus size={14} />
          </span>
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
}: {
  item: CartItem;
  imageUrl: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex gap-3 items-center border-b pb-3 border-[#eceef1]/50 last:border-none last:pb-0">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-50 border">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ShoppingBag size={16} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xs font-bold text-[#566a7f]">{item.name}</h3>
            <p className="mt-0.5 text-[9.5px] font-semibold text-[#a1acb8]">
              {money(item.unitPrice)}
            </p>
          </div>
          <span className="text-xs font-bold text-[#566a7f]">
            {money(item.unitPrice * item.quantity)}
          </span>
        </div>

        {/* Quantity selectors */}
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrement}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5f5f9] text-[#8592a3] hover:bg-[#ffe5e5] hover:text-[#ff3e1d] transition-all"
          >
            <Minus size={11} />
          </button>
          <span className="w-4 text-center text-xs font-bold text-[#566a7f]">{item.quantity}</span>
          <button
            type="button"
            onClick={onIncrement}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e7e7ff] text-[#696cff] hover:bg-[#696cff] hover:text-white transition-all"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded px-4 text-xs font-bold transition-all ${
        active
          ? "bg-[#696cff] text-white shadow-sm shadow-[#696cff]/20"
          : "text-[#8592a3] hover:text-[#696cff] hover:bg-[#eceef1]/60"
      }`}
    >
      {children}
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
    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
      <span className="text-[#a1acb8]">{label}</span>
      <span className="text-[#566a7f]">{value}</span>
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

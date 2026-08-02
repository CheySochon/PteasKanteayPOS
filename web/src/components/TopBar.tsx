"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Clock3,
  Grid2X2,
  Languages,
  Maximize,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShoppingBag,
  Utensils,
  UserRound,
  Sun,
  Moon,
  Eye,
  X,
  ChefHat,
  LayoutDashboard,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { getOrders, getProducts, getTables } from "../lib/api";
import { getSocket } from "../lib/socket";
import { setAppLanguage } from "../lib/language";
import { useAppTheme } from "../lib/theme";
import { canSeeHref, normalizeStaffPermissions } from "../lib/permissions";
import {
  getProfileImage,
  getProfileVersionSnapshot,
  getServerProfileVersionSnapshot,
  initials,
  parseProfileUserSnapshot,
  profileAvatarClass,
  subscribeToProfileChanges,
} from "../lib/profile";

export type Language = "en" | "km";

export type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  tone?: "default" | "warning";
  orderId?: string | number;
  orderNumber?: string;
  tableNo?: string;
  totalAmount?: number;
  time?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price?: number;
    notes?: string;
    image?: string;
  }>;
};

type TopBarProps = {
  title: string;
  subtitle: string;
  language: Language;
  onLanguageChange: (language: Language) => void;
  notifications: NotificationItem[];
  onClearNotifications?: () => void;
  dark?: boolean;
  onMenuToggle?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
};

const quickLinks = [
  { label: "Orders History", href: "/admin/orders", Icon: Clock3 },
  { label: "Hold Orders", href: "/admin/orders", Icon: ReceiptText },
  { label: "POS", href: "/pos", Icon: Utensils },
  { label: "Table", href: "/admin/tables", Icon: Grid2X2 },
];

let cachedStaffPermissionsRaw = "";
let cachedStaffPermissions = normalizeStaffPermissions();

const labels = {
  km: {
    toggleMenu: "\u1794\u17d2\u178a\u17bc\u179a\u1798\u17c9\u17ba\u1793\u17bb\u1799",
    fullscreen: "\u1796\u17c1\u1789\u17a2\u17c1\u1780\u17d2\u179a\u1784\u17cb",
    notifications: "\u1780\u17b6\u179a\u1787\u17bc\u1793\u178a\u17c6\u178e\u17b9\u1784",
    noNotifications: "\u1782\u17d2\u1798\u17b6\u1793\u1780\u17b6\u179a\u1787\u17bc\u1793\u178a\u17c6\u178e\u17b9\u1784\u1790\u17d2\u1798\u17b8",
    clear: "\u179f\u1798\u17d2\u17a2\u17b6\u178f",
    settings: "\u1780\u17b6\u179a\u1780\u17c6\u178e\u178f\u17cb",
    quickLinks: {
      "Orders History": "ប្រវត្តិការបញ្ជាទិញ",
      "Hold Orders": "ការបញ្ជាទុក",
      POS: "POS",
      Table: "តុ",
    },
    khmer: "\u1781\u17d2\u1798\u17c2\u179a",
    english: "English",
  },
  en: {
    toggleMenu: "Toggle menu",
    fullscreen: "Fullscreen",
    notifications: "Notifications",
    noNotifications: "No new notifications",
    clear: "Clear",
    settings: "Settings",
    quickLinks: {
      "Orders History": "Orders History",
      "Hold Orders": "Hold Orders",
      POS: "POS",
      Table: "Table",
    },
    khmer: "Khmer",
    english: "English",
  },
};

export default function TopBar({
  title,
  subtitle,
  language,
  onLanguageChange,
  notifications,
  onClearNotifications,
  dark = false,
  onMenuToggle,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
}: TopBarProps) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const user = parseUserSnapshot(
    useSyncExternalStore(
      subscribeToUserChanges,
      getUserSnapshot,
      getServerUserSnapshot
    )
  );
  const staffPermissions = useSyncExternalStore(
    subscribeToPermissionChanges,
    getStaffPermissionsSnapshot,
    getServerStaffPermissionsSnapshot
  );
  useSyncExternalStore(
    subscribeToProfileChanges,
    getProfileVersionSnapshot,
    getServerProfileVersionSnapshot
  );

  const [appTheme, setAppTheme] = useAppTheme();
  const isDark = appTheme === "dark";

  const router = useRouter();
  const [internalQuery, setInternalQuery] = useState(searchQuery ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [dbTables, setDbTables] = useState<any[]>([]);

  // Fetch live search data on search open / focus
  useEffect(() => {
    if (!searchOpen) return;
    let mounted = true;
    Promise.all([
      getProducts().catch(() => []),
      getOrders().catch(() => []),
      getTables().catch(() => []),
    ]).then(([prods, ords, tbls]) => {
      if (!mounted) return;
      setDbProducts(prods || []);
      setDbOrders(ords || []);
      setDbTables(tbls || []);
    });
    return () => {
      mounted = false;
    };
  }, [searchOpen]);

  // Keyboard hotkey Cmd+K / Ctrl+K / Esc
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        if (!searchOpen) searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  // Handle outside click for search overlay
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }

      if (languageRef.current && !languageRef.current.contains(target)) {
        setLanguageOpen(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const navRoutes = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Orders Management", href: "/admin/orders", icon: ReceiptText },
    { label: "Dining Tables Plan", href: "/admin/tables", icon: Grid2X2 },
    { label: "Menu List & Categories", href: "/admin/menu", icon: ShoppingBag },
    { label: "Analytics & Reports", href: "/admin/reports", icon: TrendingUp },
    { label: "Staff & Permissions", href: "/admin/users", icon: UsersRound },
    { label: "System Settings", href: "/admin/settings", icon: Settings },
    { label: "POS Terminal", href: "/pos", icon: Utensils },
    { label: "Kitchen Display (KDS)", href: "/kds", icon: ChefHat },
  ];

  const q = internalQuery.trim().toLowerCase();

  const matchingRoutes = useMemo(() => {
    if (!q) return [];
    return navRoutes.filter((r) => r.label.toLowerCase().includes(q));
  }, [q]);

  const matchingOrders = useMemo(() => {
    if (!q) return [];
    return dbOrders
      .filter((o) => {
        const no = (o.orderNumber || o.orderId || `#${o.id}`).toLowerCase();
        const status = (o.status || "").toLowerCase();
        const table = (o.tableNo || o.table?.name || "").toLowerCase();
        return no.includes(q) || status.includes(q) || table.includes(q);
      })
      .slice(0, 4);
  }, [q, dbOrders]);

  const matchingProducts = useMemo(() => {
    if (!q) return [];
    return dbProducts
      .filter((p) => (p.name || "").toLowerCase().includes(q) || (p.category?.name || "").toLowerCase().includes(q))
      .slice(0, 4);
  }, [q, dbProducts]);

  const matchingTables = useMemo(() => {
    if (!q) return [];
    return dbTables
      .filter((t) => (t.name || "").toLowerCase().includes(q) || (t.zone || "").toLowerCase().includes(q))
      .slice(0, 4);
  }, [q, dbTables]);

  const totalResults = matchingRoutes.length + matchingOrders.length + matchingProducts.length + matchingTables.length;

  const [internalNotifications, setInternalNotifications] = useState<NotificationItem[]>([]);
  const [clearedKeys, setClearedKeys] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem("pos_cleared_notification_keys");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    function handleClearedEvent() {
      try {
        const raw = localStorage.getItem("pos_cleared_notification_keys");
        if (raw) setClearedKeys(new Set(JSON.parse(raw)));
      } catch {}
      setInternalNotifications([]);
      setToastNotification(null);
    }
    window.addEventListener("pos-notifications-cleared", handleClearedEvent);
    return () => window.removeEventListener("pos-notifications-cleared", handleClearedEvent);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      try {
        const orders = await getOrders();
        if (!mounted || !Array.isArray(orders)) return;
        const active = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
        const items: NotificationItem[] = active.map((o) => {
          const label = o.orderNumber || o.orderId || `#${o.id}`;
          const table = o.table?.name || o.tableNo;
          const detail = table ? `Table ${table} • $${Number(o.totalAmount || 0).toFixed(2)}` : `$${Number(o.totalAmount || 0).toFixed(2)}`;
          return {
            id: `topbar-order-${o.id}`,
            title: `Order ${label} (${(o.status || "pending").toUpperCase()})`,
            detail,
            orderId: o.id,
            orderNumber: label,
            tableNo: String(table || ""),
            totalAmount: Number(o.totalAmount || 0),
          };
        });
        setInternalNotifications(items);
      } catch {}
    }

    fetchNotifications();

    const socket = getSocket();
    if (socket) {
      function handleNewOrder(order: any) {
        if (order && order.id) {
          setClearedKeys((prev) => {
            const next = new Set(prev);
            next.delete(String(order.id));
            try {
              localStorage.setItem("pos_cleared_notification_keys", JSON.stringify([...next]));
            } catch {}
            return next;
          });
        }
        const label = order.orderNumber || order.orderId || `#${order.id}`;
        const table = order.table?.name || order.tableNo;
        const detail = table ? `Table ${table} • $${Number(order.totalAmount || 0).toFixed(2)}` : `$${Number(order.totalAmount || 0).toFixed(2)}`;
        const newNotif: NotificationItem = {
          id: `topbar-order-${order.id}-${Date.now()}`,
          title: `New Order ${label}`,
          detail,
          orderId: order.id,
          orderNumber: label,
          tableNo: String(table || ""),
          totalAmount: Number(order.totalAmount || 0),
        };
        setInternalNotifications((prev) => [newNotif, ...prev.filter((i) => i.orderId !== order.id)]);
      }

      function handleNotificationsCleared() {
        setInternalNotifications([]);
        setToastNotification(null);
      }

      socket.on("order:created", handleNewOrder);
      socket.on("order:updated", handleNewOrder);
      socket.on("notifications:cleared", handleNotificationsCleared);

      return () => {
        mounted = false;
        socket.off("order:created", handleNewOrder);
        socket.off("order:updated", handleNewOrder);
        socket.off("notifications:cleared", handleNotificationsCleared);
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const activeNotifications = useMemo(() => {
    const rawList = notifications && notifications.length > 0 ? notifications : internalNotifications;
    return rawList.filter((item) => {
      const oId = item.orderId ? String(item.orderId) : "";
      return !clearedKeys.has(item.id) && (!oId || !clearedKeys.has(oId));
    });
  }, [notifications, internalNotifications, clearedKeys]);

  const unreadCount = activeNotifications.length;

  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const [mounted, setMounted] = useState(false);
  const prevNotificationsCount = useRef(notifications.length);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (notifications.length > prevNotificationsCount.current) {
      const newNotif = notifications[0]; 
      if (newNotif) {
        setToastNotification(newNotif);
        const timer = setTimeout(() => setToastNotification(null), 5000);
        return () => clearTimeout(timer);
      }
    }
    prevNotificationsCount.current = notifications.length;
  }, [notifications]);

  const bgCard = dark ? "bg-[#2b2c40]" : "bg-white";
  const surface = isDark ? "border-[#2a2f3d] bg-[#171a23]" : "border-slate-200 bg-white";
  const dropdownSurface = isDark ? "border-[#2a2f3d] bg-[#171a23]" : "border-slate-200 bg-white";
  const menuHover = isDark ? "hover:bg-white/10" : "hover:bg-slate-100";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const kmClass = language === "km" ? "font-khmer" : "";
  const t = labels[language];
  const allowedQuickLinks = quickLinks.filter(({ href }) => canSeeHref(href, user.role, staffPermissions));

  return (
    <header className={`sticky top-0 z-20 border-b px-3 shadow-sm ${surface}`}>
      <div className="flex h-[52px] items-center justify-between gap-3">
        {/* Left Section: Menu Toggle + Title */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onMenuToggle?.();
              window.dispatchEvent(new Event("pos-sidebar-toggle"));
            }}
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${textPrimary} ${menuHover}`}
            title={t.toggleMenu}
          >
            <Menu size={18} />
          </button>

          <div className="hidden min-w-0 border-l border-slate-200 dark:border-[#4e4f6e] pl-3 sm:block">
            <div className={`truncate text-xs font-black ${textPrimary} ${kmClass}`}>
              {title}
            </div>
            <div className={`truncate text-[10px] ${textSecondary} ${kmClass}`}>
              {subtitle}
            </div>
          </div>
        </div>

        {/* Right Section: Global Search + Quick Launch + Utilities */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Global Search Bar (Right Grouped with Dynamic Live Search Overlay) */}
          <div ref={searchRef} className="relative hidden items-center md:flex border-r border-slate-200/80 dark:border-slate-700/80 pr-2.5">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={internalQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setInternalQuery(val);
                  onSearchChange?.(val);
                  setSearchOpen(true);
                }}
                placeholder={searchPlaceholder ?? "Search orders, products, tables..."}
                className={`h-8.5 w-52 sm:w-64 rounded-xl border pl-9 pr-10 text-xs font-medium outline-none transition placeholder:text-slate-400 focus:border-[#0F522B] focus:ring-2 focus:ring-[#0F522B]/10 ${
                  isDark
                    ? "border-slate-700/80 bg-[#232333] text-slate-100"
                    : "border-slate-200 bg-slate-50 text-slate-800"
                }`}
              />
              {internalQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setInternalQuery("");
                    onSearchChange?.("");
                  }}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              ) : (
                <span className="absolute right-2.5 hidden sm:inline-block rounded border border-slate-200/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                  ⌘K
                </span>
              )}
            </div>

            {/* DYNAMIC LIVE SEARCH OVERLAY DROPDOWN (ONLY WHEN TYPING) */}
            {searchOpen && q.length > 0 && (
              <div
                className={`absolute right-2.5 top-11 z-50 w-80 sm:w-96 overflow-hidden rounded-2xl border p-2 shadow-2xl backdrop-blur-md animate-[usersPageIn_180ms_ease-out] ${
                  isDark ? "border-slate-700/90 bg-[#1a1c27]/95 text-slate-100" : "border-slate-200 bg-white/95 text-slate-800"
                }`}
              >
                <div className="max-h-96 overflow-y-auto space-y-3 p-1">
                  {/* Category 1: Navigation Routes */}
                  {matchingRoutes.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {language === "km" ? "ទំព័រប្រព័ន្ធ" : "Pages & Navigation"}
                      </div>
                      <div className="space-y-0.5">
                        {matchingRoutes.map((route) => {
                          const Icon = route.icon;
                          return (
                            <Link
                              key={route.href}
                              href={route.href}
                              onClick={() => setSearchOpen(false)}
                              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                                isDark ? "hover:bg-white/10 text-slate-200" : "hover:bg-slate-100 text-slate-700"
                              }`}
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0F522B]/10 text-[#0F522B] dark:text-emerald-400 shrink-0">
                                <Icon size={14} />
                              </div>
                              <span className="flex-1 truncate">{route.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Go →</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category 2: Matching Orders */}
                  {matchingOrders.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {language === "km" ? "ការបញ្ជាទិញ" : "Orders"} ({matchingOrders.length})
                      </div>
                      <div className="space-y-0.5">
                        {matchingOrders.map((order) => (
                          <Link
                            key={order.id}
                            href="/admin/orders"
                            onClick={() => setSearchOpen(false)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                              isDark ? "hover:bg-white/10 text-slate-200" : "hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-extrabold text-[#0F522B] dark:text-emerald-400">
                                #{order.orderNumber || order.orderId || order.id}
                              </span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                • {order.tableNo || order.table?.name || "Takeout"}
                              </span>
                            </div>
                            <span className="font-black text-xs text-slate-800 dark:text-slate-100">
                              ${Number(order.totalAmount || 0).toFixed(2)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 3: Matching Products */}
                  {matchingProducts.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {language === "km" ? "មុខម្ហូប/ភេសជ្ជៈ" : "Menu Products"} ({matchingProducts.length})
                      </div>
                      <div className="space-y-0.5">
                        {matchingProducts.map((product) => (
                          <Link
                            key={product.id}
                            href="/admin/menu"
                            onClick={() => setSearchOpen(false)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                              isDark ? "hover:bg-white/10 text-slate-200" : "hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <ShoppingBag size={14} className="text-amber-500 shrink-0" />
                              <span className="truncate">{product.name}</span>
                            </div>
                            <span className="font-bold text-[#0F522B] dark:text-emerald-400">
                              ${Number(product.price || 0).toFixed(2)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 4: Matching Tables */}
                  {matchingTables.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {language === "km" ? "តុអាហារ" : "Dining Tables"} ({matchingTables.length})
                      </div>
                      <div className="space-y-0.5">
                        {matchingTables.map((table) => (
                          <Link
                            key={table.id}
                            href="/admin/tables"
                            onClick={() => setSearchOpen(false)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                              isDark ? "hover:bg-white/10 text-slate-200" : "hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Grid2X2 size={14} className="text-blue-500 shrink-0" />
                              <span className="font-bold">{table.name}</span>
                              <span className="text-[10px] text-slate-400 capitalize">({table.zone})</span>
                            </div>
                            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {table.capacity} guests
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {totalResults === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium">
                      No matching orders, products, or tables found for "{internalQuery}".
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Launch Switcher: POS & KDS */}
          <div className="hidden items-center gap-1.5 sm:flex border-r border-slate-200/80 dark:border-slate-700/80 pr-2.5">
            <Link
              href="/pos"
              className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-[#0F522B]/10 px-3 text-xs font-bold text-[#0F522B] dark:text-emerald-400 hover:bg-[#0F522B] hover:text-white active:scale-95 transition-all border border-[#0F522B]/20 shadow-sm"
              title="Open POS Terminal"
            >
              <Utensils size={14} />
              <span className="font-bold">POS</span>
            </Link>

            <Link
              href="/kds"
              className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-teal-500/10 px-3 text-xs font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-600 hover:text-white active:scale-95 transition-all border border-teal-500/20 shadow-sm"
              title="Open Kitchen Display (KDS)"
            >
              <ChefHat size={14} />
              <span className="font-bold">KDS</span>
            </Link>
          </div>

          {/* Grouped Utility Actions Pill */}
          <div
            className={`flex items-center gap-0.5 rounded-xl border p-0.5 transition-colors ${
              isDark
                ? "border-slate-700/80 bg-[#232333]/90 text-slate-100"
                : "border-slate-200/80 bg-slate-50/80 text-slate-700"
            }`}
          >
            <div ref={languageRef} className="relative">
              <button
                type="button"
                onClick={() => setLanguageOpen((value) => !value)}
                className={`inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg ${textPrimary} ${menuHover} transition-colors`}
                title="Language"
              >
                <Languages size={15} />
              </button>

              {languageOpen && (
                <div className={`absolute right-0 z-40 mt-2 w-40 overflow-hidden rounded-xl border shadow-xl ${dropdownSurface}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setAppLanguage("en");
                      onLanguageChange("en");
                      setLanguageOpen(false);
                    }}
                    className={`block w-full px-4 py-2.5 text-left text-xs font-semibold ${
                      language === "en" ? "bg-[#0F522B] text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {t.english}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAppLanguage("km");
                      onLanguageChange("km");
                      setLanguageOpen(false);
                    }}
                    className={`block w-full px-4 py-2.5 text-left text-xs font-semibold font-khmer ${
                      language === "km" ? "bg-[#0F522B] text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {t.khmer}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                document.fullscreenElement
                  ? document.exitFullscreen()
                  : document.documentElement.requestFullscreen()
              }
              className={`hidden sm:inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg ${textPrimary} ${menuHover} transition-colors`}
              title={t.fullscreen}
            >
              <Maximize size={15} />
            </button>

            <button
              type="button"
              onClick={() => setAppTheme(isDark ? "light" : "dark")}
              className={`inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg ${textPrimary} ${menuHover} transition-all active:scale-75`}
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              <span className="inline-flex transition-transform duration-300 transform hover:rotate-45">
                {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
              </span>
            </button>
          </div>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((value) => !value)}
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-md ${textPrimary} ${menuHover}`}
              title={t.notifications}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className={`absolute right-0 z-40 mt-2 w-80 rounded-xl border p-3 shadow-xl ${dropdownSurface}`}>
                <div className={`mb-2 flex items-center justify-between text-sm font-black ${textPrimary} ${kmClass}`}>
                  <span>{t.notifications}</span>
                  {activeNotifications.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const newKeys = new Set(clearedKeys);
                        activeNotifications.forEach((item) => {
                          newKeys.add(item.id);
                          if (item.orderId) newKeys.add(String(item.orderId));
                        });
                        setClearedKeys(newKeys);
                        try {
                          localStorage.setItem("pos_cleared_notification_keys", JSON.stringify([...newKeys]));
                        } catch {}
                        window.dispatchEvent(new Event("pos-notifications-cleared"));
                        setInternalNotifications([]);
                        onClearNotifications?.();
                        const socket = getSocket();
                        if (socket) socket.emit("notifications:cleared");
                      }}
                      className={`rounded-md px-2 py-1 text-[11px] font-bold ${textSecondary} ${menuHover}`}
                    >
                      {t.clear}
                    </button>
                  ) : (
                    <Bell size={15} className={textSecondary} />
                  )}
                </div>

                {activeNotifications.length === 0 ? (
                  <div className={`rounded-lg bg-slate-50 p-4 text-center text-xs ${textSecondary} ${kmClass}`}>
                    {t.noNotifications}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {activeNotifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedNotification(item);
                          setNotificationsOpen(false);
                        }}
                        className={`flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
                          isDark ? "bg-[#232333] hover:bg-[#2b2c40]" : "bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            item.tone === "warning"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-[#696cff]/10 text-[#696cff]"
                          }`}
                        >
                          {item.tone === "warning" ? <Package size={15} /> : <ShoppingBag size={15} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className={`truncate text-xs font-black ${textPrimary} ${kmClass}`}>
                              {item.title}
                            </div>
                            <span className="shrink-0 rounded bg-[#696cff]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#696cff]">
                              {language === "km" ? "មើលមុខម្ហូប" : "View Dishes"}
                            </span>
                          </div>
                          <div className={`mt-0.5 truncate text-xs ${textSecondary} ${kmClass}`}>
                            {item.detail}
                          </div>
                          {item.items && item.items.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.items.slice(0, 2).map((dish, dIdx) => (
                                <span key={dIdx} className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                  {dish.quantity}x {dish.name}
                                </span>
                              ))}
                              {item.items.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-bold">+{item.items.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link
            href="/admin/profile"
            className={`hidden h-8 items-center gap-2 rounded-md px-2 sm:flex ${textPrimary} ${menuHover}`}
            title="Profile"
          >
            <ProfileAvatar user={user} />
            <span className={`max-w-24 truncate text-sm ${kmClass}`}>{user.name}</span>
          </Link>
          <Link
            href="/admin/settings"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${textPrimary} ${menuHover}`}
            title={t.settings}
          >
            <Settings size={17} />
          </Link>
        </div>
      </div>

      {/* Quick Order Items Preview Modal */}
      {selectedNotification && mounted && createPortal(
        <div 
          onClick={() => setSelectedNotification(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-[usersPageIn_200ms_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl transition-all ${
              isDark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b px-5 py-4 ${isDark ? "border-[#4e4f6e] bg-[#2b2c40]/60" : "border-slate-100 bg-slate-50/80"}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#696cff] text-white shadow-md shadow-[#696cff]/20">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className={`text-base font-bold tracking-tight ${kmClass}`}>
                    {language === "km" ? "ព័ត៌មានលម្អិតនៃការជូនដំណឹង" : "Notification Details"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedNotification.orderNumber ? `Order #${selectedNotification.orderNumber}` : selectedNotification.title}
                    {selectedNotification.tableNo ? ` • Table ${selectedNotification.tableNo}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[380px] overflow-y-auto p-5 space-y-3">
              {selectedNotification.items && selectedNotification.items.length > 0 ? (
                <div>
                  <div className="mb-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {language === "km" ? "បញ្ជីមុខម្ហូបក្នុង Order" : "Ordered Items"}
                  </div>
                  <div className="space-y-2.5">
                    {selectedNotification.items.map((dish, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between rounded-xl p-3 border transition-all ${
                          isDark ? "bg-[#2b2c40] border-[#4e4f6e]" : "bg-slate-50 border-slate-200/60 hover:bg-slate-100/60"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {dish.image ? (
                            <img src={dish.image} alt={dish.name} className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#696cff]/10 text-[#696cff]">
                              <ShoppingBag size={18} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{dish.name}</div>
                            {dish.notes && (
                              <div className="truncate text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                Note: {dish.notes}
                              </div>
                            )}
                            {dish.price ? (
                              <div className="text-[11px] text-slate-500 font-medium">${dish.price.toFixed(2)} / item</div>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-block rounded-md bg-[#696cff] px-2.5 py-1 text-xs font-bold text-white">
                            x{dish.quantity}
                          </span>
                          {dish.price ? (
                            <div className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-100">
                              ${(dish.price * dish.quantity).toFixed(2)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl border p-4 space-y-3 ${isDark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/70 bg-slate-50/80"}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#696cff]/10 text-[#696cff]">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {selectedNotification.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedNotification.detail}
                      </p>
                    </div>
                  </div>

                  {/* Summary Info Cards */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {selectedNotification.tableNo && (
                      <div className={`rounded-lg p-2.5 border text-xs ${isDark ? "bg-[#232333] border-[#4e4f6e]" : "bg-white border-slate-200/60"}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{language === "km" ? "លេខតុ" : "Table"}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">Table {selectedNotification.tableNo}</span>
                      </div>
                    )}
                    {selectedNotification.orderNumber && (
                      <div className={`rounded-lg p-2.5 border text-xs ${isDark ? "bg-[#232333] border-[#4e4f6e]" : "bg-white border-slate-200/60"}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{language === "km" ? "លេខ Order" : "Order No."}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">#{selectedNotification.orderNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`flex items-center justify-between border-t px-5 py-3.5 ${isDark ? "border-[#4e4f6e] bg-[#2b2c40]/40" : "border-slate-100 bg-slate-50/50"}`}>
              <div>
                {selectedNotification.totalAmount ? (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "km" ? "សរុបទឹកប្រាក់" : "Total Amount"}
                    </span>
                    <div className="text-base font-black text-emerald-500">${selectedNotification.totalAmount.toFixed(2)}</div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <Link
                  href="/admin/orders"
                  onClick={() => setSelectedNotification(null)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#696cff] px-4 text-xs font-bold text-white hover:bg-[#5f61e6] active:scale-95 transition-all shadow-sm shadow-[#696cff]/20"
                >
                  <Eye size={14} />
                  <span>{language === "km" ? "មើលក្នុង Orders" : "View in Orders"}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="h-9 rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-[#4e4f6e] dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                >
                  {language === "km" ? "បិទ" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Popup */}
      {toastNotification && !clearedKeys.has(toastNotification.id) && (!toastNotification.orderId || !clearedKeys.has(String(toastNotification.orderId))) && (
        <div className={`fixed bottom-6 right-6 z-[9999] w-full max-w-sm rounded-lg p-4 shadow-xl ring-1 animate-[dashboardPageIn_0.3s_ease-out] ${bgCard} ${dark ? 'ring-white/10' : 'ring-black/5'}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#696cff]/10 text-[#696cff]">
              <Bell size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${textPrimary}`}>{toastNotification.title}</p>
              <p className={`mt-1 text-sm line-clamp-2 ${textSecondary}`}>{toastNotification.detail}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedNotification(toastNotification);
                    setToastNotification(null);
                  }}
                  className="text-sm font-semibold text-[#696cff] hover:text-[#5f61e6]"
                >
                  {t.notifications || "View"}
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                if (toastNotification) {
                  const newKeys = new Set(clearedKeys);
                  newKeys.add(toastNotification.id);
                  if (toastNotification.orderId) newKeys.add(String(toastNotification.orderId));
                  setClearedKeys(newKeys);
                  try {
                    localStorage.setItem("pos_cleared_notification_keys", JSON.stringify([...newKeys]));
                  } catch {}
                }
                setToastNotification(null);
              }}
              className={`flex-shrink-0 ml-4 ${textSecondary} hover:${textPrimary}`}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function subscribeToUserChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-auth-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-auth-change", onStoreChange);
  };
}

function subscribeToPermissionChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-permissions-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-permissions-change", onStoreChange);
  };
}

function getUserSnapshot() {
  return localStorage.getItem("pos_user") || JSON.stringify({ name: "Guest", role: "Not signed in" });
}

function getServerUserSnapshot() {
  return JSON.stringify({ name: "User", role: "Member" });
}

function getStaffPermissionsSnapshot() {
  const raw = localStorage.getItem("pos_staff_permissions") || "{}";
  if (raw === cachedStaffPermissionsRaw) return cachedStaffPermissions;

  try {
    cachedStaffPermissions = normalizeStaffPermissions(JSON.parse(raw));
  } catch {
    cachedStaffPermissions = normalizeStaffPermissions();
  }

  cachedStaffPermissionsRaw = raw;
  return cachedStaffPermissions;
}

function getServerStaffPermissionsSnapshot() {
  return cachedStaffPermissions;
}

function parseUserSnapshot(snapshot: string) {
  return parseProfileUserSnapshot(snapshot);
}

function ProfileAvatar({ user }: { user: ReturnType<typeof parseUserSnapshot> }) {
  const image = getProfileImage(user);

  if (image) {
    return (
      <img
        src={image}
        alt={user.name}
        className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
      />
    );
  }

  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white ${profileAvatarClass(
        user.role,
      )}`}
    >
      {user.name ? initials(user.name) : <UserRound size={15} />}
    </span>
  );
}

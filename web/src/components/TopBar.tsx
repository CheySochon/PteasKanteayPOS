"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  ChevronDown,
  ChevronRight,
  User,
  Laptop,
  HelpCircle,
  LogOut,
  LifeBuoy,
  MonitorSmartphone,
} from "lucide-react";
import { getOrders, getProducts, getTables, logoutApi } from "../lib/api";
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
  { label: "POS", href: "/admin/pos", Icon: Utensils },
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
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
    setInternalQuery("");
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

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const navRoutes = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Orders", href: "/admin/orders", icon: Utensils },
    { label: "Reservations", href: "/admin/tables", icon: Grid2X2 },
    { label: "Menu", href: "/admin/menu", icon: ShoppingBag },
    { label: "Reports", href: "/admin/reports", icon: TrendingUp },
    { label: "Staff & Roles", href: "/admin/users", icon: UsersRound },
    { label: "Settings", href: "/admin/settings", icon: Settings },
    { label: "POS - Point of Sale", href: "/admin/pos", icon: MonitorSmartphone },
    { label: "Kitchen", href: "/kds", icon: ChefHat },
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
    <header className={`sticky top-0 z-20 border-b border-slate-200/60 px-5 backdrop-blur-md ${isDark ? "bg-[#171a23]/80" : "bg-white/80"}`}>
      <div className="flex h-[62px] items-center justify-between gap-3">
        {/* Left Section: Search Bar */}
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onMenuToggle?.();
              window.dispatchEvent(new Event("pos-sidebar-toggle"));
            }}
            className={`md:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${textPrimary} ${menuHover}`}
            title={t.toggleMenu}
          >
            <Menu size={18} />
          </button>

          {/* Global Search Bar Trigger */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="relative flex items-center flex-1 max-w-[260px] text-left cursor-pointer border-none bg-transparent"
          >
            <Search size={18} className={`absolute left-4.5 ${isDark ? "text-slate-400" : "text-slate-550"}`} />
            <div
              className={`h-11 w-full rounded-full border pl-12 pr-4 text-sm font-normal flex items-center select-none ${
                isDark
                  ? "border-slate-700/80 bg-[#232333] text-slate-400"
                  : "border-slate-200/50 bg-[#eef2ee] text-slate-550"
              }`}
            >
              Search
            </div>
          </button>
        </div>

        {/* COMMAND PALETTE SEARCH MODAL OVERLAY */}
        {searchOpen && mounted && createPortal(
          <div 
            onClick={() => setSearchOpen(false)}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1.5px] animate-[usersPageIn_200ms_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-md h-[440px] overflow-hidden rounded-[24px] border shadow-2xl transition-all ${
                isDark ? "border-[#4e4f6e] bg-[#1a1b26] text-slate-100" : "border-slate-100 bg-white text-slate-800"
              }`}
            >
              {/* Floating Header: Input + Close Button */}
              <div className={`absolute top-6 left-6 right-6 z-25 flex items-center gap-3 pb-2 ${isDark ? "bg-[#1a1b26]" : "bg-white"}`}>
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    autoFocus
                    type="text"
                    value={internalQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInternalQuery(val);
                      onSearchChange?.(val);
                    }}
                    placeholder="Search"
                    className={`h-11 w-full rounded-xl border pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#0F522B] focus:ring-2 focus:ring-[#0F522B]/10 ${
                      isDark
                        ? "border-slate-700/80 bg-[#232333] text-slate-100"
                        : "border-slate-200 bg-slate-50 text-slate-850"
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className={`h-11 w-11 flex items-center justify-center rounded-full transition-colors cursor-pointer border-none shrink-0 ${
                    isDark
                      ? "bg-white/10 hover:bg-white/20 text-slate-300"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-500"
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Body: Results / Navigation List */}
              <div className="h-full overflow-y-auto pt-[86px] pb-6 px-6 space-y-1 scrollbar-thin">
                {internalQuery.trim().length === 0 ? (
                  /* Default popular pages navigation list */
                  <div className="space-y-1">
                    {/* 1. Dashboard */}
                    <Link
                      href="/admin"
                      onClick={() => setSearchOpen(false)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-[14px] transition-colors ${
                        isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <LayoutDashboard size={18} strokeWidth={1.7} className="text-slate-550" />
                        <span className="text-[13.5px] font-semibold">Dashboard</span>
                      </div>
                      <ChevronRight size={15} className="text-slate-400" />
                    </Link>

                    {/* 2. POS */}
                    <Link
                      href="/admin/pos"
                      onClick={() => setSearchOpen(false)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-[14px] transition-colors ${
                        isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <MonitorSmartphone size={18} strokeWidth={1.7} className="text-slate-550" />
                        <span className="text-[13.5px] font-semibold">POS - Point of Sale</span>
                      </div>
                      <ChevronRight size={15} className="text-slate-400" />
                    </Link>

                    {/* 3. Kitchen */}
                    <Link
                      href="/kds"
                      onClick={() => setSearchOpen(false)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-[14px] transition-colors ${
                        isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <ChefHat size={18} strokeWidth={1.7} className="text-slate-550" />
                        <span className="text-[13.5px] font-semibold">Kitchen</span>
                      </div>
                      <ChevronRight size={15} className="text-slate-400" />
                    </Link>

                    {/* 4. Orders */}
                    <Link
                      href="/admin/orders"
                      onClick={() => setSearchOpen(false)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-[14px] transition-colors ${
                        isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Utensils size={18} strokeWidth={1.7} className="text-slate-555" />
                        <span className="text-[13.5px] font-semibold">Orders</span>
                      </div>
                      <ChevronRight size={15} className="text-slate-400" />
                    </Link>

                    {/* 5. Reservations (Dining Tables) */}
                    <Link
                      href="/admin/tables"
                      onClick={() => setSearchOpen(false)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-[14px] transition-colors ${
                        isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Grid2X2 size={18} strokeWidth={1.7} className="text-slate-550" />
                        <span className="text-[13.5px] font-semibold">Reservations</span>
                      </div>
                      <ChevronRight size={15} className="text-slate-400" />
                    </Link>
                  </div>
                ) : (
                  /* Dynamic filtered results list */
                  <div className="space-y-1">
                    {/* Matching Pages */}
                    {matchingRoutes.map((route) => {
                      const Icon = route.icon;
                      return (
                        <Link
                          key={route.href}
                          href={route.href}
                          onClick={() => setSearchOpen(false)}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-[14px] transition-colors ${
                            isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <Icon size={18} strokeWidth={1.7} className="text-slate-550" />
                            <span className="text-[13.5px] font-semibold">{route.label}</span>
                          </div>
                          <ChevronRight size={15} className="text-slate-400" />
                        </Link>
                      );
                    })}

                    {/* Matching Orders */}
                    {matchingOrders.map((order) => (
                      <Link
                        key={order.id}
                        href="/admin/orders"
                        onClick={() => setSearchOpen(false)}
                        className={`flex items-center justify-between w-full px-4 py-3 rounded-[14px] transition-colors ${
                          isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <ReceiptText size={18} strokeWidth={1.7} className="text-slate-550" />
                          <span className="text-[13.5px] font-semibold">Order #{order.orderNumber || order.id} ({order.table?.name || "Takeaway"})</span>
                        </div>
                        <ChevronRight size={15} className="text-slate-400" />
                      </Link>
                    ))}

                    {/* Matching Products */}
                    {matchingProducts.map((product) => (
                      <Link
                        key={product.id}
                        href="/admin/menu"
                        onClick={() => setSearchOpen(false)}
                        className={`flex items-center justify-between w-full px-4 py-3 rounded-[14px] transition-colors ${
                          isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <ShoppingBag size={18} strokeWidth={1.7} className="text-slate-550" />
                          <span className="text-[13.5px] font-semibold">{product.name} (${Number(product.price).toFixed(2)})</span>
                        </div>
                        <ChevronRight size={15} className="text-slate-400" />
                      </Link>
                    ))}

                    {/* Matching Tables */}
                    {matchingTables.map((table) => (
                      <Link
                        key={table.id}
                        href="/admin/tables"
                        onClick={() => setSearchOpen(false)}
                        className={`flex items-center justify-between w-full px-4 py-3 rounded-[14px] transition-colors ${
                          isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <Grid2X2 size={18} strokeWidth={1.7} className="text-slate-550" />
                          <span className="text-[13.5px] font-semibold">{table.name} ({table.zone})</span>
                        </div>
                        <ChevronRight size={15} className="text-slate-400" />
                      </Link>
                    ))}

                    {totalResults === 0 && (
                      <div className="py-10 text-center text-xs text-slate-400 font-medium">
                        No matching results found for "{internalQuery}".
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        , document.body)}

        {/* Right Section: Notification Bell + User Menu Pill */}
        <div className="flex shrink-0 items-center gap-3">
          {/* Notification Bell */}
          <div ref={notificationsRef} className="relative flex items-center">
            <button
              type="button"
              onClick={() => setNotificationsOpen((value) => !value)}
              className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 ${textPrimary}`}
              title={t.notifications}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500" />
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
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu Pill Container */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`h-11 rounded-full flex items-center gap-2.5 pl-1 pr-3.5 border border-transparent hover:border-slate-200/55 transition-all ${
                isDark ? "bg-[#232333] text-slate-100" : "bg-[#eef2ee] text-slate-800"
              } cursor-pointer`}
            >
              <ProfileAvatar user={user} />
              <span className="text-sm font-extrabold tracking-tight hidden sm:inline-block">{user.name}</span>
              <ChevronDown size={15} className="text-slate-500 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className={`absolute right-0 z-50 mt-2.5 w-52 overflow-hidden rounded-[18px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1a1b26] p-1.5 shadow-xl animate-[usersPageIn_200ms_cubic-bezier(0.16,1,0.3,1)_both]`}>
                <div className="space-y-0.5">
                  {/* Admin Panel Link (Only for admins/managers) */}
                  {user && user.role && ["super admin", "admin", "administrator", "manager", "superadmin"].includes(user.role.toLowerCase()) && (
                    <Link
                      href="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <LayoutDashboard size={18} strokeWidth={1.7} className="text-slate-700 dark:text-slate-350" />
                      <span>Admin Panel</span>
                    </Link>
                  )}

                  {/* 1. Profile Link */}
                  <Link
                    href="/admin/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      pathname === "/admin/profile" ? "bg-[#0F522B] text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <User size={18} strokeWidth={1.7} className={pathname === "/admin/profile" ? "text-white" : "text-slate-700 dark:text-slate-350"} />
                    <span>Profile</span>
                  </Link>

                  {/* 3. Language */}
                  <Link
                    href="/admin/language"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-left transition-colors border-none bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer no-underline"
                  >
                    <Languages size={18} strokeWidth={1.7} className="text-slate-700 dark:text-slate-350" />
                    <span>Language</span>
                  </Link>

                  {/* 5. Dark Mode */}
                  <button
                    type="button"
                    onClick={() => setAppTheme(isDark ? "light" : "dark")}
                    className="flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-left transition-colors border-none bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    {isDark ? <Sun size={18} strokeWidth={1.7} className="text-amber-500" /> : <Moon size={18} strokeWidth={1.7} className="text-slate-700 dark:text-slate-350" />}
                    <span>Dark Mode</span>
                  </button>

                  {/* 6. Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logoutApi().catch(() => {});
                      localStorage.setItem("pos_logout_success_alert", JSON.stringify({ timestamp: Date.now() }));
                      localStorage.removeItem("pos_logged_in");
                      localStorage.removeItem("pos_token");
                      localStorage.removeItem("pos_user");
                      window.dispatchEvent(new Event("pos-auth-change"));
                      router.replace("/login");
                    }}
                    className="flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10 text-left transition-colors border-none bg-transparent cursor-pointer w-full"
                  >
                    <LogOut size={18} strokeWidth={1.7} className="text-rose-500" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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
        className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200/80"
      />
    );
  }

  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white ${profileAvatarClass(
        user.role,
      )}`}
    >
      {user.name ? initials(user.name) : <UserRound size={16} />}
    </span>
  );
}

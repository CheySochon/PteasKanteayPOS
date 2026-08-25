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
  Check,
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
  Minimize,
  Lock,
} from "lucide-react";
import { getOrders, getProducts, getTables, logoutApi } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAppLanguage, setAppLanguage } from "../lib/language";
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
  title?: string;
  subtitle?: string;
  language?: Language;
  onLanguageChange?: (language: Language) => void;
  notifications?: NotificationItem[];
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
  const [languageSubmenuOpen, setLanguageSubmenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function handleLockScreen() {
    localStorage.setItem("pos_is_locked", "true");
    window.location.href = "/lock";
  }
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

  const appLanguage = useAppLanguage();
  const [appTheme, setAppTheme] = useAppTheme();
  const isDark = Boolean(dark || appTheme === "dark");

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

  // Handle outside click for search overlay & dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

    window.addEventListener("click", handleClickOutside, { passive: true });
    return () => window.removeEventListener("click", handleClickOutside);
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
            title: `New Order ${label}`,
            detail,
            orderId: o.id,
            orderNumber: label,
            tableNo: String(table || ""),
            totalAmount: Number(o.totalAmount || 0),
            items: (o.items || []).map((i: any) => ({
              name: i.product?.name || i.name || "Item",
              quantity: i.quantity || 1,
              price: Number(i.unitPrice || i.price || 0),
              notes: i.notes || "",
              image: i.product?.imageUrl || i.image || "",
            })),
          };
        });
        setInternalNotifications(items);
      } catch {}
    }

    fetchNotifications();

    // 30-second background polling backup for guaranteed notifications updates
    const pollInterval = setInterval(fetchNotifications, 30000);

    function handleLocalOrderEvent() {
      fetchNotifications();
    }

    window.addEventListener("pos-order-created", handleLocalOrderEvent);
    window.addEventListener("pos-order-updated", handleLocalOrderEvent);
    window.addEventListener("storage", handleLocalOrderEvent);

    const socket = getSocket();
    if (socket) {
      function handleNewOrder(order: any) {
        if (order && order.id) {
          setClearedKeys((prev) => {
            const next = new Set(prev);
            const targetId = String(order.id);
            next.delete(targetId);
            next.delete(`topbar-order-${targetId}`);
            next.delete(`order-${targetId}`);
            for (const key of Array.from(next)) {
              if (key.includes(`-${targetId}`)) next.delete(key);
            }
            try {
              localStorage.setItem("pos_cleared_notification_keys", JSON.stringify([...next]));
            } catch {}
            return next;
          });
        }
        fetchNotifications();
      }

      function handleNotificationsCleared() {
        setInternalNotifications([]);
      }

      socket.on("order:created", handleNewOrder);
      socket.on("order:updated", handleNewOrder);
      socket.on("notifications:cleared", handleNotificationsCleared);

      return () => {
        mounted = false;
        clearInterval(pollInterval);
        window.removeEventListener("pos-order-created", handleLocalOrderEvent);
        window.removeEventListener("pos-order-updated", handleLocalOrderEvent);
        window.removeEventListener("storage", handleLocalOrderEvent);
        socket.off("order:created", handleNewOrder);
        socket.off("order:updated", handleNewOrder);
        socket.off("notifications:cleared", handleNotificationsCleared);
      };
    }

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      window.removeEventListener("pos-order-created", handleLocalOrderEvent);
      window.removeEventListener("pos-order-updated", handleLocalOrderEvent);
      window.removeEventListener("storage", handleLocalOrderEvent);
    };
  }, []);

  const activeNotifications = useMemo(() => {
    // Combine both props notifications and internalNotifications cleanly without duplicates
    const combined = [...(notifications || []), ...(internalNotifications || [])];
    const seen = new Set<string>();
    const uniqueList: NotificationItem[] = [];

    for (const item of combined) {
      const key = item.orderId ? `order-${item.orderId}` : item.id;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(item);
      }
    }

    return uniqueList.filter((item) => {
      const oId = item.orderId ? String(item.orderId) : "";
      if (oId && (clearedKeys.has(oId) || clearedKeys.has(`topbar-order-${oId}`))) return false;
      return !clearedKeys.has(item.id);
    });
  }, [notifications, internalNotifications, clearedKeys]);

  const unreadCount = activeNotifications.length;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bgCard = dark ? "bg-[#2b2c40]" : "bg-white";
  const surface = isDark ? "border-[#2a2f3d] bg-[#171a23]" : "border-slate-200 bg-white";
  const dropdownSurface = isDark ? "border-[#2a2f3d] bg-[#171a23]" : "border-slate-200 bg-white";
  const menuHover = isDark ? "hover:bg-white/10" : "hover:bg-slate-100";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const hookLanguage = useAppLanguage();
  const activeLang: Language = (language || hookLanguage || "en") as Language;
  const kmClass = activeLang === "km" ? "font-khmer" : "";
  const t = labels[activeLang] || labels.en;
  const [topbarToast, setTopbarToast] = useState<string | null>(null);

  useEffect(() => {
    function handleShowToast(e: Event) {
      const detail = (e as CustomEvent<string | { message: string }>).detail;
      const msg = typeof detail === "string" ? detail : detail?.message;
      if (msg) {
        setTopbarToast(msg);
      }
    }

    function handleLoginAlert() {
      try {
        const raw = localStorage.getItem("pos_login_success_alert");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.userName || parsed.email || true) && Date.now() - (parsed.timestamp || 0) < 120000) {
            setTopbarToast("Login successful!");
            localStorage.removeItem("pos_login_success_alert");
          }
        }
      } catch {}
    }

    handleLoginAlert();
    window.addEventListener("pos-show-toast", handleShowToast);
    return () => window.removeEventListener("pos-show-toast", handleShowToast);
  }, []);

  useEffect(() => {
    if (!topbarToast) return;
    const timer = setTimeout(() => {
      setTopbarToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [topbarToast]);

  return (
    <header className={`sticky top-0 z-20 border-b px-3 sm:px-4 backdrop-blur-md transition-colors duration-150 relative ${isDark ? "bg-[#232333]/90 border-[#4e4f6e]" : "bg-white/90 border-slate-200/80"}`}>
      {/* GLOBAL TOP-CENTERED TOAST NOTIFICATION (PORTAL TO BODY - IGNORES SIDEBAR COMPLETELY) */}
      {topbarToast && mounted && createPortal(
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none px-4">
          <div className="pointer-events-auto flex items-center gap-3 py-2.5 px-4.5 rounded-xl bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-[13px] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-100/80 dark:border-slate-800 animate-[dropFromTop_400ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="h-5 w-5 rounded-full bg-[#48cf38] flex items-center justify-center text-white shrink-0">
              <Check size={11} strokeWidth={4.5} className="text-white" />
            </div>
            <span className="whitespace-nowrap">{topbarToast}</span>
            <button
              type="button"
              onClick={() => setTopbarToast(null)}
              className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <style>{`
            @keyframes dropFromTop {
              0% { transform: translateY(-100%); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>,
        document.body
      )}
      <div className="flex h-[56px] items-center justify-between gap-3">
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
            className="relative flex items-center flex-1 max-w-[250px] text-left cursor-pointer border-none bg-transparent"
          >
            <Search size={16} className={`absolute left-3.5 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
            <div
              className={`h-[38px] w-full rounded-full border pl-10.5 pr-4 text-[13px] font-normal flex items-center select-none ${
                isDark
                  ? "border-slate-700/80 bg-[#232333] text-slate-400"
                  : "border-slate-200/80 bg-slate-100 text-slate-500 hover:bg-slate-200/60"
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

        {/* Right Section: Lock + Fullscreen + Notification Bell + User Menu Pill */}
        <div className="flex shrink-0 items-center gap-3">
          {/* Lock Screen */}
          <button
            type="button"
            onClick={handleLockScreen}
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 ${textPrimary}`}
            title="Lock Screen"
          >
            <Lock size={16} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 ${textPrimary}`}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>

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
              <div className={`absolute right-0 top-full mt-2.5 z-50 w-80 sm:w-88 rounded-2xl border p-3.5 shadow-xl ${
                isDark ? "border-slate-800 bg-[#1a1b26]" : "border-slate-200/90 bg-white"
              } animate-[usersPageIn_200ms_cubic-bezier(0.16,1,0.3,1)_both]`}>
                <div className={`mb-3 flex items-center justify-between px-1 text-sm font-bold ${textPrimary} ${kmClass}`}>
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
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${textSecondary} ${menuHover}`}
                    >
                      {t.clear}
                    </button>
                  ) : (
                    <Bell size={15} className={textSecondary} />
                  )}
                </div>

                {activeNotifications.length === 0 ? (
                  <div className={`rounded-xl bg-white border border-slate-200/80 dark:border-slate-800 dark:bg-[#232333] p-4 text-center text-xs font-medium ${textSecondary} ${kmClass}`}>
                    {t.noNotifications}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                    {activeNotifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedNotification(item);
                          setNotificationsOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                          isDark ? "bg-[#232333] hover:bg-[#2b2c40] border border-slate-700/60" : "bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              item.tone === "warning"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-[#696cff]/10 text-[#696cff]"
                            }`}
                          >
                            {item.tone === "warning" ? <Package size={17} /> : <ShoppingBag size={17} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-xs font-bold ${textPrimary} ${kmClass}`}>
                              {item.title}
                            </div>
                            <div className={`mt-0.5 truncate text-[11px] font-medium ${textSecondary} ${kmClass}`}>
                              {item.detail}
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-[#696cff]/10 px-2.5 py-1 text-[11px] font-bold text-[#696cff] hover:bg-[#696cff]/20 transition-colors">
                          {language === "km" ? "មើលមុខម្ហូប" : "View Dishes"}
                        </span>
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
              className={`h-[38px] rounded-full flex items-center gap-2 pl-1 pr-3 border border-transparent hover:border-slate-200/55 transition-all ${
                isDark ? "bg-[#232333] text-slate-100" : "bg-[#eef2ee] text-slate-800"
              } cursor-pointer`}
            >
              <ProfileAvatar user={user} />
              <span className="text-[13px] font-normal tracking-tight hidden sm:inline-block">{user.name}</span>
              <ChevronDown size={14} className="text-slate-500 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className={`absolute right-0 z-50 mt-2.5 w-52 overflow-hidden rounded-[18px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1a1b26] p-1.5 shadow-xl transform-gpu animate-[usersPageIn_180ms_cubic-bezier(0.16,1,0.3,1)_both]`}>
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

                  {/* 3. Language Selector Submenu */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setLanguageSubmenuOpen(!languageSubmenuOpen)}
                      className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-left transition-colors border-none bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <Languages size={18} strokeWidth={1.7} className="text-slate-700 dark:text-slate-350" />
                        <span>{(language || appLanguage) === "km" ? "ភាសា" : "Language"}</span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${languageSubmenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Submenu Options */}
                    {languageSubmenuOpen && (
                      <div className="mt-1 ml-4 mr-1 pl-3.5 border-l-2 border-slate-200 dark:border-slate-700 space-y-1 py-1 animate-[usersPageIn_150ms_ease-out_both]">
                        <button
                          type="button"
                          onClick={() => {
                            setAppLanguage("km");
                            onLanguageChange?.("km");
                            window.dispatchEvent(new Event("storage"));
                            window.dispatchEvent(new Event("pos-language-change"));
                            window.dispatchEvent(new Event("pos-auth-change"));
                            setUserMenuOpen(false);
                            setLanguageSubmenuOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-normal cursor-pointer transition-colors border-none ${
                            (language || appLanguage) === "km"
                              ? "bg-[#55a060]/15 text-[#55a060] font-medium dark:bg-[#55a060]/25 dark:text-slate-100"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                          }`}
                        >
                          <span className="font-normal font-khmer">ភាសាខ្មែរ</span>
                          {(language || appLanguage) === "km" && <Check size={14} className="text-[#55a060]" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAppLanguage("en");
                            onLanguageChange?.("en");
                            window.dispatchEvent(new Event("storage"));
                            window.dispatchEvent(new Event("pos-language-change"));
                            window.dispatchEvent(new Event("pos-auth-change"));
                            setUserMenuOpen(false);
                            setLanguageSubmenuOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-normal cursor-pointer transition-colors border-none ${
                            (language || appLanguage) === "en"
                              ? "bg-[#55a060]/15 text-[#55a060] font-medium dark:bg-[#55a060]/25 dark:text-slate-100"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                          }`}
                        >
                          <span className="font-normal">English</span>
                          {(language || appLanguage) === "en" && <Check size={14} className="text-[#55a060]" />}
                        </button>
                      </div>
                    )}
                  </div>

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
                      window.location.href = "/login";
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
        className="h-[30px] w-[30px] rounded-full object-cover ring-1 ring-slate-200/80"
      />
    );
  }

  return (
    <span
      className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-xs font-black text-white ${profileAvatarClass(
        user.role,
      )}`}
    >
      {user.name ? initials(user.name) : <UserRound size={15} />}
    </span>
  );
}

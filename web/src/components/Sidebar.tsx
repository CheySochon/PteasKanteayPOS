"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Store,
  ReceiptText,
  UtensilsCrossed,
  TrendingUp,
  Armchair,
  UsersRound,
  Settings,
  Settings2,
  ShieldCheck,
  LogOut,
  Languages,
  ListFilter,
  MoreHorizontal,
  Tags,
  ChevronLeft,
  ChevronRight,
  Building2,
  Printer,
  SendHorizontal,
  ShieldAlert,
  UserRound,
  Boxes,
  ChefHat,
  FileText,
} from "lucide-react";
import { apiOrigin, getAdminGroups, getSettings, logoutApi } from "../lib/api";
import { getSocket } from "../lib/socket";
import { canSeeHref, normalizeStaffPermissions, parseStoredUser, permissionsForUser } from "../lib/permissions";
import {
  getProfileImage,
  getProfileVersionSnapshot,
  getServerProfileVersionSnapshot,
  initials,
  profileAvatarClass,
  profileRoleClass,
  subscribeToProfileChanges,
} from "../lib/profile";

const BRAND = "#0F522B";

type IconProps = {
  active?: boolean;
};

const NAV_MAIN = [
  { label: "Dashboard", href: "/admin", icon: DashboardIcon, badge: undefined },
  { label: "POS", href: "/admin/pos", icon: PosIcon, badge: undefined },
  { label: "Orders", href: "/admin/orders", icon: OrdersIcon, badge: undefined },
  { label: "Kitchen", href: "/admin/kitchen", icon: KitchenIcon, badge: undefined },
  { label: "Tables", href: "/admin/tables", icon: TablesIcon, badge: undefined },
  { label: "Invoices", href: "/admin/invoices", icon: InvoicesIcon, badge: undefined },
];

const NAV_MANAGEMENT = [
  { label: "Menu", href: "/admin/menu", icon: MenuIcon, badge: undefined },
  { label: "Inventory", href: "/admin/inventory", icon: InventoryIcon, badge: undefined },
  { label: "Reports", href: "/admin/reports", icon: ReportsIcon, badge: undefined },
];

const MENU_CHILDREN = [
  { key: "list", label: "Menu List", href: "/admin/menu", icon: ListFilter },
  { key: "categories", label: "Categories", href: "/admin/menu?view=categories", icon: Tags },
];

const SETTINGS_CHILDREN = [
  { key: "general", label: "General Info", href: "/admin/settings?tab=general", icon: Building2 },
  { key: "billing", label: "Billing & Receipt", href: "/admin/settings?tab=billing", icon: ReceiptText },
  { key: "printers", label: "Hardware & Printers", href: "/admin/settings?tab=printers", icon: Printer },
  { key: "integrations", label: "Integrations", href: "/admin/settings?tab=integrations", icon: SendHorizontal },
  { key: "security", label: "System & Backups", href: "/admin/settings?tab=security", icon: ShieldAlert },
];

const NAV_SYSTEM = [
  { label: "Auth", href: "/admin/users", icon: AuthIcon, badge: undefined },
  { label: "Settings", href: "/admin/settings", icon: SettingsIcon, badge: undefined },
];

const AUTH_CHILDREN = [
  { key: "admin", label: "Admin", href: "/admin/users", icon: UserRound },
  { key: "logs", label: "Admin log", href: "/admin/logs", icon: FileText },
  { key: "group", label: "Group", href: "/admin/groups", icon: UsersRound },
  { key: "rule", label: "Rule", href: "/admin/roles", icon: ShieldCheck },
];

let cachedStaffPermissionsRaw = "";
let cachedStaffPermissions = normalizeStaffPermissions();

const TEXT = {
  en: {
    main: "Main",
    management: "Management",
    system: "System",
    overview: "Overview",
    account: "Account",
    restaurantAdmin: "Restaurant Admin",
    logout: "Logout",
    login: "Login",
    language: "Language",
    expand: "Expand sidebar",
    collapse: "Collapse sidebar",
    nav: {
      Dashboard: "Dashboard",
      POS: "POS",
      Orders: "Orders",
      Kitchen: "Kitchen",
      Menu: "Menu",
      Inventory: "Inventory",
      Reports: "Reports",
      Tables: "Tables",
      Invoices: "Invoices",
      Users: "Users",
      Auth: "Auth",
      Admin: "Admin",
      "Admin log": "Admin log",
      Group: "Group",
      Rule: "Rule",
      "Staff & Roles": "Auth",
      Permissions: "Permissions",
      Settings: "Settings",
    },
  },
  km: {
    main: "ចម្បង",
    management: "ការគ្រប់គ្រង",
    system: "ប្រព័ន្ធ",
    overview: "ទិដ្ឋភាពទូទៅ",
    account: "គណនី",
    restaurantAdmin: "គ្រប់គ្រងភោជនីយដ្ឋាន",
    logout: "ចាកចេញ",
    login: "ចូល",
    language: "ភាសា",
    expand: "ពង្រីកម៉ឺនុយ",
    collapse: "បង្រួមម៉ឺនុយ",
    nav: {
      Dashboard: "ផ្ទាំងគ្រប់គ្រង",
      POS: "លក់ (POS)",
      Orders: "ការបញ្ជាទិញ",
      Kitchen: "ផ្ទះបាយ (Kitchen)",
      Menu: "មុខម្ហូប",
      Inventory: "ស្តុក",
      Reports: "របាយការណ៍",
      Tables: "តុ",
      Invoices: "វិក្កយបត្រ",
      Users: "អ្នកប្រើប្រាស់",
      Auth: "សិទ្ធិ និង គណនី",
      Admin: "អ្នកគ្រប់គ្រង",
      "Admin log": "កំណត់ហេតុ Admin",
      Group: "ក្រុម Admin",
      Rule: "ច្បាប់សិទ្ធិ",
      "Staff & Roles": "សិទ្ធិ និង គណនី",
      Settings: "ការកំណត់",
    },
  },
};

type Theme = "light" | "dark";

function getSavedSidebarCollapsed(fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  if (window.innerWidth < 768) return true;
  const saved = localStorage.getItem("pos_sidebar_collapsed");
  return saved === null ? fallback : saved === "true";
}

type SidebarProps = {
  collapsed?: boolean;
  setCollapsed?: Dispatch<SetStateAction<boolean>>;
  activeNav?: string;
  setActiveNav?: Dispatch<SetStateAction<string>>;
  theme?: Theme;
  setTheme?: Dispatch<SetStateAction<Theme>>;
};
type SideNavItemProps = {
  label: string;
  href: string;
  active: boolean;
  collapsed: boolean;
  navActive: string;
  navHover: string;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  icon: ReactNode;
  trailing?: ReactNode;
  contentClass?: string;
  dark?: boolean;
  isKhmer?: boolean;
};

export default function Sidebar({
  collapsed = false,
  setCollapsed = () => undefined,
  activeNav = "",
  setActiveNav = () => undefined,
  theme = "light",
  setTheme = () => undefined,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [localActiveNav, setLocalActiveNav] = useState(() => {
    if (activeNav) return activeNav;
    if (pathname.startsWith("/admin/menu")) return "Menu";
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/orders")) return "Orders";
    if (pathname.startsWith("/kds") || pathname.startsWith("/admin/kitchen")) return "Kitchen";
    if (pathname.startsWith("/admin/inventory")) return "Inventory";
    if (pathname.startsWith("/admin/reports")) return "Reports";
    if (pathname.startsWith("/admin/tables")) return "Tables";
    if (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/permissions")) return "Users";
    if (pathname.startsWith("/admin/settings")) return "Settings";
    if (pathname.startsWith("/pos") || pathname.startsWith("/admin/pos")) return "POS";
    return "";
  });
  const searchParams = useSearchParams();
  const prevPathnameRef = useRef(pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => getSavedSidebarCollapsed(collapsed));
  const [contentMounted, setContentMounted] = useState(() => !getSavedSidebarCollapsed(collapsed));
  const sidebarCollapsedRef = useRef(sidebarCollapsed);
  const [menuView, setMenuView] = useState("list");
  const [authView, setAuthView] = useState("admin");
  const [menuOpen, setMenuOpen] = useState(
    () => typeof window !== "undefined" && window.location.pathname.startsWith("/admin/menu"),
  );
  const [authOpen, setAuthOpen] = useState(
    () => typeof window !== "undefined" && window.location.pathname.startsWith("/admin/users"),
  );
  const [settingsOpen, setSettingsOpen] = useState(
    () => typeof window !== "undefined" && window.location.pathname.startsWith("/admin/settings"),
  );
  const restaurantName = useSyncExternalStore(
    subscribeToSettingsChanges,
    getRestaurantNameSnapshot,
    getServerRestaurantNameSnapshot
  );
  const restaurantImageUrl = useSyncExternalStore(
    subscribeToSettingsChanges,
    getRestaurantImageSnapshot,
    getServerRestaurantImageSnapshot
  );
  const currentUser = parseUserSnapshot(
    useSyncExternalStore(
      subscribeToUserChanges,
      getUserSnapshot,
      getServerUserSnapshot
    )
  );
  const language = useSyncExternalStore(
    subscribeToLanguageChanges,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );
  const hasToken = useSyncExternalStore(
    subscribeToTokenChanges,
    getTokenSnapshot,
    getServerTokenSnapshot
  );
  useSyncExternalStore(
    subscribeToProfileChanges,
    getProfileVersionSnapshot,
    getServerProfileVersionSnapshot
  );
  const staffPermissions = useSyncExternalStore(
    subscribeToPermissionChanges,
    getStaffPermissionsSnapshot,
    getServerStaffPermissionsSnapshot
  );

  const [groupsVersion, setGroupsVersion] = useState(0);

  useEffect(() => {
    // Fetch live group permissions from PostgreSQL DB API on mount
    const handleUpdate = () => {
      void getAdminGroups(true).then(() => setGroupsVersion((v) => v + 1)).catch(() => null);
    };

    handleUpdate();

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("pos-groups-updated", handleUpdate);
    window.addEventListener("pos-auth-change", handleUpdate);
    window.addEventListener("pos-user-change", handleUpdate);

    const socket = getSocket();
    if (socket) {
      if (!socket.connected) socket.connect();
      socket.on("group:created", handleUpdate);
      socket.on("group:updated", handleUpdate);
      socket.on("group:deleted", handleUpdate);
      socket.on("settings:updated", handleUpdate);
    }

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("pos-groups-updated", handleUpdate);
      window.removeEventListener("pos-auth-change", handleUpdate);
      window.removeEventListener("pos-user-change", handleUpdate);
      if (socket) {
        socket.off("group:created", handleUpdate);
        socket.off("group:updated", handleUpdate);
        socket.off("group:deleted", handleUpdate);
        socket.off("settings:updated", handleUpdate);
      }
    };
  }, []);

  const dark = theme === "dark";
  const sidebarBg = dark ? "bg-[#2b2c40] border-r border-[#4e4f6e]" : "bg-white border-r border-slate-200/90";
  const navHover = dark ? "hover:bg-[#232333]/80 hover:text-white" : "hover:bg-slate-100 hover:text-slate-900";
  const navActive = dark 
    ? "bg-[#55a060] text-white font-bold shadow-xs" 
    : "bg-[#55a060] text-[#55a060] font-bold shadow-xs";
  const headerBorder = dark ? "border-[#4e4f6e]" : "border-slate-100";
  const dividerClass = dark ? "bg-[#4e4f6e]" : "bg-slate-150";
  const sectionTextClass = dark ? "text-slate-400 font-bold uppercase tracking-wider" : "text-slate-400 font-bold uppercase tracking-wider";
  const brandNameClass = dark ? "text-white font-black" : "text-slate-800 font-bold";
  const brandSubtitleClass = dark ? "text-slate-400 font-semibold" : "text-slate-500 font-medium";
  const utilityTextClass = dark ? "text-slate-300 hover:bg-[#232333]/80 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  const footerBorderClass = dark ? "border-[#4e4f6e]" : "border-slate-150";
  const t = TEXT[language];
  const allowedMain = NAV_MAIN.filter((item) => canSeeHref(item.href, currentUser, staffPermissions));
  const allowedManagement = NAV_MANAGEMENT.filter((item) => canSeeHref(item.href, currentUser, staffPermissions));
  const allowedSystem = NAV_SYSTEM.filter((item) => canSeeHref(item.href, currentUser, staffPermissions));
  const menuExpanded = !sidebarCollapsed && contentMounted && menuOpen;
  const authExpanded = !sidebarCollapsed && contentMounted && authOpen;
  const settingsExpanded = !sidebarCollapsed && contentMounted && settingsOpen;
  const activeMenuChild = menuView === "categories" ? "categories" : "list";

  const activeAuthChild = (function () {
    if (typeof window === "undefined") return authView;
    const pathname = window.location.pathname;
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (pathname.startsWith("/admin/logs") || (pathname.startsWith("/admin/settings") && tab === "security")) return "logs";
    if (pathname.startsWith("/admin/groups")) return "group";
    if (pathname.startsWith("/admin/roles")) return "rule";
    if (pathname.startsWith("/admin/users")) return "admin";
    return authView || "admin";
  })();

  const widthClass = sidebarCollapsed ? "w-[80px] min-w-[80px]" : "w-[280px] min-w-[280px]";
  const contentMotionClass = "";
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const handleConfirmLogout = () => setShowLogoutModal(true);
    window.addEventListener("pos-confirm-logout", handleConfirmLogout);
    return () => window.removeEventListener("pos-confirm-logout", handleConfirmLogout);
  }, []);

  // Fetch live settings dynamically on mount
  useEffect(() => {
    getSettings()
      .then((data: any) => {
        if (data) {
          if (data.restaurantName) {
            localStorage.setItem("pos_restaurant_name", data.restaurantName);
          }
          if (data.restaurantImageUrl) {
            localStorage.setItem("pos_restaurant_image_url", data.restaurantImageUrl);
          }
          window.dispatchEvent(new Event("pos-settings-change"));
        }
      })
      .catch(() => undefined);
  }, []);

  // Dynamic Browser Favicon Tab Icon Sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeFavicon = restaurantImageUrl ? resolveImageUrl(restaurantImageUrl) : "/favicon.svg";
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "shortcut icon";
        document.head.appendChild(link);
      }
      link.href = activeFavicon;
    }
  }, [restaurantImageUrl]);

  // Background prefetch all main admin pages for instant 0ms click transitions
  useEffect(() => {
    const mainRoutes = [
      "/admin",
      "/admin/pos",
      "/admin/orders",
      "/admin/kitchen",
      "/admin/tables",
      "/admin/invoices",
      "/admin/menu",
      "/admin/inventory",
      "/admin/reports",
      "/admin/users",
      "/admin/settings",
    ];
    const timer = setTimeout(() => {
      mainRoutes.forEach((route) => {
        try { router.prefetch(route); } catch {}
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [router]);

  function setSidebarState(next: boolean) {
    sidebarCollapsedRef.current = next;
    localStorage.setItem("pos_sidebar_collapsed", String(next));
    setCollapsed(next);
    setSidebarCollapsed(next);
    if (!next) {
      setContentMounted(true);
    } else {
      setTimeout(() => {
        if (sidebarCollapsedRef.current) setContentMounted(false);
      }, 300);
    }
  }

  function toggleSidebar() {
    setSidebarState(!sidebarCollapsedRef.current);
  }

  useEffect(() => {
    sidebarCollapsedRef.current = sidebarCollapsed;
  }, [sidebarCollapsed]);

  useEffect(() => {
    window.addEventListener("pos-sidebar-toggle", toggleSidebar);
    return () => window.removeEventListener("pos-sidebar-toggle", toggleSidebar);
  }, []);

  useEffect(() => {
    const syncMenuView = () => {
      const params = new URLSearchParams(window.location.search);
      setMenuView(params.get("view") === "categories" || window.location.hash === "#categories" ? "categories" : "list");
    };

    syncMenuView();
    window.addEventListener("hashchange", syncMenuView);
    window.addEventListener("popstate", syncMenuView);

    return () => {
      window.removeEventListener("hashchange", syncMenuView);
      window.removeEventListener("popstate", syncMenuView);
    };
  }, []);

  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    // 1. Sync Menu list expansion state only when navigating from outside to inside Menu
    const wasOutsideMenu = !prevPathname.startsWith("/admin/menu");
    const isInsideMenu = pathname.startsWith("/admin/menu");

    if (isInsideMenu && wasOutsideMenu) {
      setMenuOpen(true);
    } else if (!isInsideMenu) {
      setMenuOpen(false);
    }

    // 2. Sync Active Nav highlight state
    if (pathname.startsWith("/admin/menu")) {
      setLocalActiveNav("Menu");
    } else if (pathname === "/admin") {
      setLocalActiveNav("Dashboard");
    } else if (pathname.startsWith("/admin/orders")) {
      setLocalActiveNav("Orders");
    } else if (pathname.startsWith("/kds") || pathname.startsWith("/admin/kitchen")) {
      setLocalActiveNav("Kitchen");
    } else if (pathname.startsWith("/admin/inventory")) {
      setLocalActiveNav("Inventory");
    } else if (pathname.startsWith("/admin/reports")) {
      setLocalActiveNav("Reports");
    } else if (pathname.startsWith("/admin/tables")) {
      setLocalActiveNav("Tables");
    } else if (pathname.startsWith("/admin/users")) {
      setLocalActiveNav("Users");
    } else if (pathname.startsWith("/admin/permissions")) {
      setLocalActiveNav("Permissions");
    } else if (pathname.startsWith("/admin/settings")) {
      setLocalActiveNav("Settings");
    } else if (pathname.startsWith("/pos") || pathname.startsWith("/admin/pos")) {
      setLocalActiveNav("POS");
    }
  }, [pathname, setActiveNav]);

  useEffect(() => {
    let mounted = true;

    getSettings()
      .then((settings) => {
        if (!mounted) return;
        const nextName = settings.restaurantName || "The Tofu";
        localStorage.setItem("pos_restaurant_name", nextName);
        localStorage.setItem("pos_restaurant_image_url", settings.restaurantImageUrl || "");
        localStorage.setItem("pos_staff_permissions", JSON.stringify(permissionsForUser(currentUser.id, settings.staffPermissions)));
        window.dispatchEvent(new Event("pos-settings-change"));
        window.dispatchEvent(new Event("pos-permissions-change"));
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [currentUser.id]);

  function performLogout() {
    void logoutApi().catch(() => null);
    localStorage.removeItem("pos_logged_in");
    localStorage.removeItem("pos_token");
    localStorage.removeItem("pos_user");
    localStorage.setItem("pos_logout_success_alert", JSON.stringify({ timestamp: Date.now() }));
    window.dispatchEvent(new Event("pos-auth-change"));
    window.location.href = "/login";
  }

  function isNavItemActive(label: string, href: string) {
    return localActiveNav === label;
  }

  return (
    <>
    {!sidebarCollapsed && (
      <button
        type="button"
        aria-label="Close menu backdrop"
        onClick={toggleSidebar}
        className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] md:hidden cursor-default border-none outline-none"
      />
    )}
    <aside
      className={`fixed bottom-0 left-0 top-0 h-screen ${sidebarBg} flex flex-col z-40 shrink-0 transition-all duration-[300ms] ease-in-out ${
        sidebarCollapsed ? "max-md:-translate-x-full w-[80px] min-w-[80px]" : "w-[280px] min-w-[280px] shadow-none"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center min-h-[64px] px-5 py-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-[#55a060] flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-[#55a060]/30 shadow-md">
            {restaurantImageUrl ? (
              <img
                src={resolveImageUrl(restaurantImageUrl)}
                alt={restaurantName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div style={{ display: restaurantImageUrl ? "none" : "flex" }} className="w-full h-full items-center justify-center bg-[#55a060]">
              <img src="/favicon.svg" alt="POS Logo" className="w-6 h-6 object-contain" />
            </div>
          </div>

          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden transition-opacity duration-150">
              <div className={`font-khmer whitespace-nowrap leading-5 tracking-normal ${brandNameClass} ${language === "km" ? "text-[14px] font-bold" : "text-[13px] font-black"}`}>
                {restaurantName}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Card under POS Header - Clickable to Profile Page */}
      {!sidebarCollapsed && (
        <Link
          href="/admin/profile"
          prefetch={true}
          onClick={() => setLocalActiveNav("")}
          title={language === "km" ? "មើលគណនីផ្ទាល់ខ្លួន" : "View Profile Account"}
          className={`mx-3 px-3 py-2 my-1 flex items-center gap-3 overflow-hidden rounded-xl transition-all duration-150 cursor-pointer group active:scale-98 ${
            pathname === "/admin/profile"
              ? dark ? "bg-[#55a060]/20 ring-1 ring-[#55a060]/40" : "bg-[#55a060]/10 ring-1 ring-[#55a060]/30"
              : dark ? "hover:bg-[#232333]/80" : "hover:bg-slate-100/80"
          }`}
        >
          {getProfileImage(currentUser) ? (
            <img
              src={getProfileImage(currentUser)!}
              alt={currentUser.name}
              className="h-10 w-10 rounded-full object-cover ring-1 ring-[#55a060]/30 shadow-xs shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#55a060]/15 text-[#55a060] text-xs font-black shadow-xs transition-transform duration-200 group-hover:scale-105">
              {initials(currentUser.name)}
            </div>
          )}
          <div className="min-w-0 flex-1 whitespace-nowrap">
            <div className={`truncate text-[13px] font-semibold transition-colors ${
              pathname === "/admin/profile"
                ? "text-[#55a060]"
                : dark ? "text-white group-hover:text-[#55a060]" : "text-slate-800 group-hover:text-[#55a060]"
            } ${language === "km" ? "font-khmer text-xs" : ""}`}>
              {currentUser.name}
            </div>
            <div className="mt-0.5 flex items-center">
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                dark 
                  ? "bg-[#55a060]/20 text-[#55a060]" 
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
              }`}>
                {currentUser.role}
              </span>
            </div>
          </div>
        </Link>
      )}

      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100/90 text-slate-500 shadow-sm ring-1 ring-slate-200 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-slate-800 hover:scale-105 cursor-pointer"
        title={sidebarCollapsed ? t.expand : t.collapse}
      >
        {sidebarCollapsed ? <ChevronRight size={12} strokeWidth={2.8} /> : <ChevronLeft size={12} strokeWidth={2.8} />}
      </button>

      {/* Nav */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 ${
          sidebarCollapsed ? "px-2 py-3 flex flex-col items-center" : "px-3 py-3"
        }`}
      >
        {allowedMain.map((item) => (
          <SideNavItem
            key={item.label}
            {...item}
            label={t.nav[item.label as keyof typeof t.nav] || item.label}
            active={localActiveNav === item.label}
            collapsed={sidebarCollapsed}
            navActive={navActive}
            navHover={navHover}
            dark={dark}
            isKhmer={language === "km"}
            contentClass={contentMotionClass}
            onClick={() => setLocalActiveNav(item.label)}
            icon={<item.icon active={localActiveNav === item.label} />}
          />
        ))}

        {allowedManagement.map((item) => {
          const isMenu = item.label === "Menu";
          const active = isNavItemActive(item.label, item.href) || (isMenu && localActiveNav === "Menu");

          return (
            <div key={item.label}>
              <SideNavItem
                {...item}
                label={t.nav[item.label as keyof typeof t.nav] || item.label}
                active={active}
                collapsed={sidebarCollapsed}
                navActive={navActive}
                navHover={navHover}
                dark={dark}
                isKhmer={language === "km"}
                contentClass={contentMotionClass}
                onClick={() => {
                  setLocalActiveNav(item.label);
                  if (isMenu) {
                    setMenuOpen((open) => !open);
                  }
                }}
                icon={<item.icon active={active} />}
                trailing={
                  isMenu && !sidebarCollapsed ? (
                    menuExpanded ? (
                      <ChevronUp size={13} strokeWidth={2.2} />
                    ) : (
                      <ChevronDown size={13} strokeWidth={2.2} />
                    )
                  ) : undefined
                }
              />

              {isMenu && (
                <div
                  className={`overflow-hidden transition-all duration-[300ms] ease-in-out ml-[18px] border-l pl-4 ${
                    dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]"
                  }`}
                  style={{
                    maxHeight: menuExpanded ? "120px" : "0px",
                    opacity: menuExpanded ? 1 : 0,
                    marginTop: menuExpanded ? "4px" : "0px",
                    marginBottom: menuExpanded ? "8px" : "0px",
                  }}
                >
                  <div className="space-y-1 py-1">
                    {MENU_CHILDREN.map((child) => (
                      <MenuSubNavItem
                        key={child.key}
                        href={child.href}
                        label={child.label}
                        active={activeMenuChild === child.key}
                        dark={dark}
                        isKhmer={language === "km"}
                        icon={<child.icon size={14} strokeWidth={1.9} />}
                        onClick={() => {
                          setLocalActiveNav("Menu");
                          setMenuView(child.key);
                          window.dispatchEvent(
                            new CustomEvent("pos-menu-view-change", {
                              detail: child.key,
                            }),
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {allowedSystem.map((item) => {
          const isAuth = item.label === "Auth" || item.label === "Staff & Roles";
          const active = isNavItemActive(item.label, item.href) || (isAuth && (localActiveNav === "Auth" || pathname.startsWith("/admin/users")));

          return (
            <div key={item.label}>
              <SideNavItem
                {...item}
                label={isAuth ? (t.nav["Auth"] || "Auth") : (t.nav[item.label as keyof typeof t.nav] || item.label)}
                active={active}
                collapsed={sidebarCollapsed}
                navActive={navActive}
                navHover={navHover}
                dark={dark}
                isKhmer={language === "km"}
                contentClass={contentMotionClass}
                onClick={() => {
                  setLocalActiveNav(isAuth ? "Auth" : item.label);
                  if (isAuth) {
                    setAuthOpen((open) => !open);
                  }
                }}
                icon={<item.icon active={active} />}
                trailing={
                  isAuth && !sidebarCollapsed ? (
                    authExpanded ? (
                      <ChevronUp size={13} strokeWidth={2.2} />
                    ) : (
                      <ChevronDown size={13} strokeWidth={2.2} />
                    )
                  ) : undefined
                }
              />

              {isAuth && (
                <div
                  className={`overflow-hidden transition-all duration-[300ms] ease-in-out ml-[18px] border-l pl-4 ${
                    dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]"
                  }`}
                  style={{
                    maxHeight: authExpanded ? "200px" : "0px",
                    opacity: authExpanded ? 1 : 0,
                    marginTop: authExpanded ? "4px" : "0px",
                    marginBottom: authExpanded ? "8px" : "0px",
                  }}
                >
                  <div className="space-y-1 py-1">
                    {AUTH_CHILDREN.map((child) => (
                      <MenuSubNavItem
                        key={child.key}
                        href={child.href}
                        label={t.nav[child.label as keyof typeof t.nav] || child.label}
                        active={activeAuthChild === child.key}
                        dark={dark}
                        isKhmer={language === "km"}
                        icon={<child.icon size={14} strokeWidth={1.9} />}
                        onClick={() => {
                          setLocalActiveNav("Auth");
                          setAuthView(child.key);
                          window.dispatchEvent(
                            new CustomEvent("pos-auth-view-change", {
                              detail: child.key,
                            }),
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Footer Logout Button - Seamlessly Matching Sidebar Item Style */}
      <div className={`p-2 border-t ${dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/90 bg-white"} mt-auto shrink-0`}>
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          title={sidebarCollapsed ? (language === "km" ? "ចាកចេញ" : "Logout") : undefined}
          className={`group flex items-center border-none cursor-pointer transition-all duration-150 ease-in-out relative text-left active:scale-[0.98] ${
            sidebarCollapsed
              ? "h-10 w-10 mx-auto justify-center rounded-xl px-0"
              : "w-full h-10 gap-2.5 rounded-xl px-1.5 justify-start"
          } ${
            dark
              ? "text-slate-300 hover:bg-rose-500/10 hover:text-rose-400"
              : "text-slate-700 hover:bg-rose-50 hover:text-rose-600"
          }`}
        >
          <span className={`w-10 h-10 shrink-0 flex items-center justify-center transition-all duration-200 transform group-hover:scale-105 ${
            dark ? "text-slate-400 group-hover:text-rose-400" : "text-slate-500 group-hover:text-rose-600"
          }`}>
            <LogOut size={18} strokeWidth={1.75} color="currentColor" />
          </span>

          {!sidebarCollapsed && (
            <span className={`flex-1 whitespace-nowrap overflow-hidden transition-opacity duration-150 font-normal text-[14px] ${
              dark ? "text-slate-200 group-hover:text-rose-400" : "text-slate-700 group-hover:text-rose-600"
            } ${language === "km" ? "font-khmer text-[14px]" : ""}`}>
              {language === "km" ? "ចាកចេញ" : "Logout"}
            </span>
          )}
        </button>
      </div>


    </aside>

    {/* CONFIRM LOGOUT MODAL - SUBTLE & SMOOTH LOW ANIMATION */}
    {showLogoutModal && (
      <div
        onClick={() => setShowLogoutModal(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[0.5px] p-4 transition-opacity duration-150 ease-out cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-[370px] overflow-hidden rounded-2xl border p-5 shadow-lg cursor-default transition-all duration-150 ease-out ${
            dark
              ? "bg-[#181920] border-slate-800 text-slate-100"
              : "bg-white border-slate-200/90 text-slate-800"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <LogOut size={19} strokeWidth={2} />
            </div>
            <div className="space-y-1 min-w-0 pt-0.5">
              <h3 className={`text-base font-bold text-slate-900 dark:text-white ${language === "km" ? "font-khmer" : ""}`}>
                {language === "km" ? "បញ្ជាក់ការចាកចេញ" : "Confirm Logout"}
              </h3>
              <p className={`text-xs text-slate-500 dark:text-slate-400 font-normal leading-normal ${language === "km" ? "font-khmer" : ""}`}>
                {language === "km"
                  ? "តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធមែនទេ?"
                  : "Are you sure you want to logout from the system?"}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className={`h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150 ${
                language === "km" ? "font-khmer" : ""
              }`}
            >
              {language === "km" ? "បោះបង់" : "Cancel"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowLogoutModal(false);
                performLogout();
              }}
              className={`h-9 flex items-center gap-1.5 rounded-xl bg-[#0F522B] hover:bg-[#09391D] px-4 text-xs font-semibold text-white transition-colors duration-150 ${
                language === "km" ? "font-khmer" : ""
              }`}
            >
              <LogOut size={14} strokeWidth={2} />
              <span>{language === "km" ? "ចាកចេញ" : "Logout"}</span>
            </button>
          </div>
        </div>
      </div>
    )}
    <div className={`hidden md:block ${widthClass} h-screen shrink-0 transition-all duration-[300ms] ease-in-out`} aria-hidden="true" />
    </>
  );
}

function SideNavItem({
  label,
  href,
  active,
  collapsed,
  onClick,
  icon,
  trailing,
  contentClass = "",
  dark = false,
  isKhmer = false,
}: SideNavItemProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      prefetch={true}
      onMouseEnter={() => {
        if (href) {
          try { router.prefetch(href); } catch {}
        }
      }}
      onTouchStart={() => {
        if (href) {
          try { router.prefetch(href); } catch {}
        }
      }}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`group flex items-center border-none cursor-pointer mb-1 transition-all duration-150 ease-in-out relative text-left active:scale-[0.98] active:translate-y-[0.5px] 
        ${
          collapsed
            ? "h-10 w-10 mx-auto justify-center rounded-xl px-0"
            : "w-full h-10 gap-2.5 rounded-xl px-1.5 justify-start"
        }
        ${
          active
            ? dark
              ? "bg-[#55a060] text-white font-semibold shadow-xs"
              : "bg-[#55a060] text-white font-semibold shadow-xs"
            : dark
              ? "text-slate-300 hover:bg-[#232333]/80 hover:text-white"
              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
        }
        ${isKhmer ? "font-medium text-[14px] leading-normal" : active ? "font-semibold text-[14px]" : "font-normal text-[14px]"}
      `}
    >
      <span className={`w-10 h-10 shrink-0 flex items-center justify-center transition-all duration-200 transform group-hover:scale-105 ${active ? "text-white" : dark ? "text-slate-400 group-hover:text-white" : "text-slate-500 group-hover:text-slate-900"}`}>
        {icon}
      </span>

      {!collapsed && (
        <span
          className={`flex-1 whitespace-nowrap overflow-hidden transition-opacity duration-150 ${contentClass} ${active ? "text-white font-semibold" : dark ? "text-slate-200 group-hover:text-white font-medium" : "text-slate-700 group-hover:text-slate-900 font-normal"} ${isKhmer ? "text-[14px]" : "text-[14px]"}`}
        >
          {label}
        </span>
      )}

      {!collapsed && trailing && (
        <span
          className={`shrink-0 pr-3 transition-opacity duration-150 ${contentClass} ${active ? "text-white" : dark ? "text-slate-400 group-hover:text-white" : "text-slate-400 group-hover:text-slate-900"}`}
        >
          {trailing}
        </span>
      )}
    </Link>
  );
}

function MenuSubNavItem({
  href,
  label,
  active,
  icon,
  onClick,
  dark = false,
  isKhmer = false,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
  dark?: boolean;
  isKhmer?: boolean;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      prefetch={true}
      onMouseEnter={() => {
        if (href) {
          try { router.prefetch(href); } catch {}
        }
      }}
      onTouchStart={() => {
        if (href) {
          try { router.prefetch(href); } catch {}
        }
      }}
      onClick={onClick}
      className={`group flex h-9 items-center gap-2 rounded-xl px-3 transition duration-150 active:scale-[0.98] active:translate-y-[0.5px] ${
        active
          ? dark
            ? "bg-[#55a060]/20 font-bold text-emerald-400"
            : "bg-emerald-50 font-bold text-[#55a060]"
          : dark 
            ? "text-slate-300 hover:bg-[#55a060]/10 hover:text-emerald-400 font-normal"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-normal"
      } ${isKhmer ? "text-[13.5px]" : "text-[13.5px]"}`}
    >
      <span className={`transition-all duration-200 transform group-hover:scale-105 group-hover:translate-x-0.5 ${active ? "text-[#55a060] dark:text-emerald-400" : dark ? "text-slate-400 group-hover:text-emerald-400" : "text-slate-500 group-hover:text-slate-900"}`}>{icon}</span>
      <span className={`truncate ${active ? "text-[#55a060] dark:text-emerald-400" : "group-hover:text-slate-900"}`}>{label}</span>
    </Link>
  );
}

function SidebarProfileCard({
  user,
  dark = false,
  isKhmer = false,
  onLogoutClick,
}: {
  user: { id?: number; name: string; email?: string; role: string; isActive?: boolean };
  dark?: boolean;
  isKhmer?: boolean;
  onLogoutClick?: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const image = getProfileImage(user);

  return (
    <div
      ref={dropdownRef}
      className="relative w-full"
    >
      {/* Profile Card Container (acts as dropdown trigger) */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border p-2.5 group transition-all duration-200 text-left outline-none cursor-pointer ${
          dark 
            ? "border-slate-700/60 bg-[#232333]/60 hover:bg-[#232333]"
            : "border-slate-200/80 bg-white hover:border-[#0F522B]/30 hover:shadow-xs"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {image ? (
            <img
              src={image}
              alt={user.name}
              className={`h-[38px] w-[38px] rounded-lg object-cover ring-1 ${dark ? "ring-[#4e4f6e]" : "ring-[#0F522B]/20"}`}
            />
          ) : (
            <div
              className={`flex h-[38px] w-[38px] items-center justify-center rounded-lg ${dark ? "bg-[#0F522B] text-white" : "bg-[#0F522B]/10 text-[#0F522B]"} text-xs font-black shadow-sm ring-1 ring-[#0F522B]/20`}
            >
              {initials(user.name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className={`truncate leading-4 font-semibold ${dark ? "text-white" : "text-[#0F522B]"} ${isKhmer ? "text-[13px]" : "text-[12.5px]"}`}>
              {user.name}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`max-w-[85px] truncate rounded-md px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
                  dark ? "bg-[#0F522B] text-white" : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                }`}
              >
                {user.role}
              </span>
              <span className={`flex min-w-0 items-center gap-1 text-[9.5px] font-semibold ${dark ? "text-[#71dd37]" : "text-emerald-600"}`}>
                <span className="relative flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Small Chevron to indicate dropdown */}
        <ChevronUp 
          size={14} 
          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {dropdownOpen && (
        <div
          className={`absolute bottom-full left-0 mb-2 w-full rounded-xl border p-1 shadow-sm backdrop-blur-md transition-all duration-150 z-50 animate-[fadeIn_150ms_ease-out] ${
            dark
              ? "bg-[#1d1e27]/98 border-slate-800/80 text-slate-100 shadow-black/25"
              : "bg-white/98 border-slate-100 text-slate-700 shadow-slate-200/40"
          }`}
        >
          {/* Option 1: My Account */}
          <Link
            href="/admin/profile"
            onClick={() => setDropdownOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              dark
                ? "hover:bg-white/5 text-slate-200 hover:text-white"
                : "hover:bg-slate-50 text-slate-600 hover:text-[#0F522B]"
            }`}
          >
            <UserRound size={13.5} className="text-[#696cff] shrink-0" />
            <span>{isKhmer ? "គណនីខ្ញុំ" : "My Account"}</span>
          </Link>

          {/* Option 2: Logout */}
          <button
            type="button"
            onClick={() => {
              setDropdownOpen(false);
              if (onLogoutClick) onLogoutClick();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-left transition-all duration-200 ${
              dark
                ? "hover:bg-red-500/10 text-red-400 hover:text-red-300"
                : "hover:bg-red-50/50 text-red-600 hover:text-red-700"
            }`}
          >
            <LogOut size={13.5} className="shrink-0" />
            <span>{isKhmer ? "ចាកចេញ" : "Logout"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function getTokenSnapshot() {
  return Boolean(localStorage.getItem("pos_token"));
}

function getServerTokenSnapshot() {
  return false;
}

function subscribeToTokenChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-auth-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-auth-change", onStoreChange);
  };
}

function subscribeToSettingsChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-settings-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-settings-change", onStoreChange);
  };
}

function subscribeToLanguageChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-language-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-language-change", onStoreChange);
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

function getLanguageSnapshot(): "en" | "km" {
  return localStorage.getItem("pos_language") === "km" ? "km" : "en";
}

function getServerLanguageSnapshot(): "en" | "km" {
  return "en";
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

function getRestaurantNameSnapshot() {
  return localStorage.getItem("pos_restaurant_name") || "The Tofu";
}

function getServerRestaurantNameSnapshot() {
  return "The Tofu";
}

function getRestaurantImageSnapshot() {
  return localStorage.getItem("pos_restaurant_image_url") || "";
}

function getServerRestaurantImageSnapshot() {
  return "";
}

function resolveImageUrl(imageUrl: string) {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${apiOrigin}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

function subscribeToUserChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-auth-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-auth-change", onStoreChange);
  };
}

function getUserSnapshot() {
  const storedUser = localStorage.getItem("pos_user");
  if (!storedUser) {
    return JSON.stringify({ name: "Guest", role: "Not signed in" });
  }

  return storedUser;
}

function getServerUserSnapshot() {
  return JSON.stringify({ name: "Chef Tofu", role: "Executive Chef" });
}

function parseUserSnapshot(snapshot: string) {
  return parseStoredUser(snapshot);
}

// Icons
function DashboardIcon({ active = false }: IconProps) {
  return <LayoutDashboard size={18} strokeWidth={1.75} color="currentColor" />;
}

function PosIcon({ active = false }: IconProps) {
  return <Store size={18} strokeWidth={1.75} color="currentColor" />;
}

function OrdersIcon({ active = false }: IconProps) {
  return <ReceiptText size={18} strokeWidth={1.75} color="currentColor" />;
}

function KitchenIcon({ active = false }: IconProps) {
  return <ChefHat size={18} strokeWidth={1.75} color="currentColor" />;
}

function MenuIcon({ active = false }: IconProps) {
  return <UtensilsCrossed size={18} strokeWidth={1.75} color="currentColor" />;
}

function InventoryIcon({ active = false }: IconProps) {
  return <Boxes size={18} strokeWidth={1.75} color="currentColor" />;
}

function ReportsIcon({ active = false }: IconProps) {
  return <TrendingUp size={18} strokeWidth={1.75} color="currentColor" />;
}

function TablesIcon({ active = false }: IconProps) {
  return <Armchair size={18} strokeWidth={1.75} color="currentColor" />;
}

function InvoicesIcon({ active = false }: IconProps) {
  return <FileText size={18} strokeWidth={1.75} color="currentColor" />;
}

function AuthIcon({ active = false }: IconProps) {
  return <UsersRound size={18} strokeWidth={1.75} color="currentColor" />;
}

function StaffIcon({ active = false }: IconProps) {
  return <UsersRound size={18} strokeWidth={1.75} color="currentColor" />;
}

function PermissionsIcon({ active = false }: IconProps) {
  return <ShieldCheck size={18} strokeWidth={1.75} color="currentColor" />;
}

function SettingsIcon({ active = false }: IconProps) {
  return <Settings size={18} strokeWidth={1.75} color="currentColor" />;
}

function LogoutIcon({ active = false }: IconProps) {
  return <LogOut size={18} strokeWidth={1.75} color="currentColor" />;
}

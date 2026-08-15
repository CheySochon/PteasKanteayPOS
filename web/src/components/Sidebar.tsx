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
import { apiOrigin, getSettings, logoutApi } from "../lib/api";
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
  { label: "Kitchen", href: "/kds", icon: KitchenIcon, badge: undefined },
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
  { label: "Staff & Roles", href: "/admin/users", icon: StaffIcon, badge: undefined },
  { label: "Settings", href: "/admin/settings", icon: SettingsIcon, badge: undefined },
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
      "Staff & Roles": "Staff & Roles",
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
      "Staff & Roles": "បុគ្គលិក និងតួនាទី",
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
  onClick: () => void;
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
  const searchParams = useSearchParams();
  const prevPathnameRef = useRef(pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => getSavedSidebarCollapsed(collapsed));
  const [contentMounted, setContentMounted] = useState(() => !getSavedSidebarCollapsed(collapsed));
  const sidebarCollapsedRef = useRef(sidebarCollapsed);
  const [menuView, setMenuView] = useState("list");
  const [menuOpen, setMenuOpen] = useState(
    () => typeof window !== "undefined" && window.location.pathname.startsWith("/admin/menu"),
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

  const dark = theme === "dark";
  const sidebarBg = dark ? "bg-[#2b2c40] border-r border-[#4e4f6e]" : "bg-[#eef5ee] border-r border-[#d4e8d4]/80";
  const navHover = dark ? "hover:bg-[#232333]/80 hover:text-white" : "hover:bg-[#dcecdb] hover:text-[#09391D]";
  const navActive = dark 
    ? "bg-[#0F522B] text-white font-extrabold shadow-sm" 
    : "bg-[#dcecdb] text-[#09391D] font-bold";
  const headerBorder = dark ? "border-[#4e4f6e]" : "border-[#cde4cd]/80";
  const dividerClass = dark ? "bg-[#4e4f6e]" : "bg-[#cde4cd]/80";
  const sectionTextClass = dark ? "text-slate-400 font-bold uppercase tracking-wider" : "text-[#5a7a5a] font-bold";
  const brandNameClass = dark ? "text-white font-black" : "text-[#1a3a1a] font-black";
  const brandSubtitleClass = dark ? "text-slate-400 font-semibold" : "text-[#5a7a5a] font-semibold";
  const utilityTextClass = dark ? "text-slate-300 hover:bg-[#232333]/80 hover:text-white" : "text-[#4a6a4a] hover:bg-[#0F522B]/10 hover:text-[#0F522B]";
  const footerBorderClass = dark ? "border-[#4e4f6e]" : "border-[#cde4cd]/80";
  const t = TEXT[language];
  const allowedMain = NAV_MAIN.filter((item) => canSeeHref(item.href, currentUser.role, staffPermissions));
  const allowedManagement = NAV_MANAGEMENT.filter((item) => canSeeHref(item.href, currentUser.role, staffPermissions));
  const allowedSystem = NAV_SYSTEM.filter((item) => canSeeHref(item.href, currentUser.role, staffPermissions));
  const menuExpanded = !sidebarCollapsed && contentMounted && menuOpen;
  const settingsExpanded = !sidebarCollapsed && contentMounted && settingsOpen;
  const activeMenuChild = menuView === "categories" ? "categories" : "list";

  const widthClass = sidebarCollapsed ? "w-[80px] min-w-[80px]" : "w-[280px] min-w-[280px]";
  const contentMotionClass = "";
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const handleConfirmLogout = () => setShowLogoutModal(true);
    window.addEventListener("pos-confirm-logout", handleConfirmLogout);
    return () => window.removeEventListener("pos-confirm-logout", handleConfirmLogout);
  }, []);

  function setSidebarState(next: boolean) {
    sidebarCollapsedRef.current = next;
    localStorage.setItem("pos_sidebar_collapsed", String(next));
    setCollapsed(next);
    setSidebarCollapsed(next);
    setContentMounted(!next);
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
  });

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
      setActiveNav("Menu");
    } else if (pathname === "/admin") {
      setActiveNav("Dashboard");
    } else if (pathname.startsWith("/admin/orders")) {
      setActiveNav("Orders");
    } else if (pathname.startsWith("/kds") || pathname.startsWith("/admin/kitchen")) {
      setActiveNav("Kitchen");
    } else if (pathname.startsWith("/admin/inventory")) {
      setActiveNav("Inventory");
    } else if (pathname.startsWith("/admin/reports")) {
      setActiveNav("Reports");
    } else if (pathname.startsWith("/admin/tables")) {
      setActiveNav("Tables");
    } else if (pathname.startsWith("/admin/users")) {
      setActiveNav("Users");
    } else if (pathname.startsWith("/admin/permissions")) {
      setActiveNav("Permissions");
    } else if (pathname.startsWith("/admin/settings")) {
      setActiveNav("Settings");
    } else if (pathname.startsWith("/pos") || pathname.startsWith("/admin/pos")) {
      setActiveNav("POS");
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
    router.push("/login");
  }

  function isNavItemActive(label: string, href: string) {
    if (activeNav) {
      return activeNav === label || (label === "Menu" && pathname.startsWith("/admin/menu"));
    }

    if (href === "/admin") return pathname === "/admin";
    if (label === "Menu") return pathname.startsWith("/admin/menu");
    return pathname === href || pathname.startsWith(`${href}/`);
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
      <div
        className={`flex items-center min-h-[64px] ${
          sidebarCollapsed ? "justify-center py-[18px]" : "justify-start p-[18px_16px]"
        }`}
      >
        <div className="flex items-center gap-[10px] overflow-hidden">
          <div className="w-9 h-9 rounded-[10px] bg-[#0F522B] flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-[#0F522B]/30 shadow-md">
            {restaurantImageUrl ? (
              <img
                src={resolveImageUrl(restaurantImageUrl)}
                alt={restaurantName}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="8" width="18" height="12" rx="2" fill="white" opacity="0.9" />
                <rect x="7" y="4" width="10" height="6" rx="1.5" fill="white" opacity="0.6" />
                <rect x="9" y="5.5" width="6" height="2.5" rx="0.75" fill="#0F522B" />
              </svg>
            )}
          </div>

          {contentMounted && (
            <div className={`overflow-hidden transition-all duration-[260ms] ease-out ${contentMotionClass}`}>
              <div className={`font-khmer whitespace-nowrap leading-5 tracking-normal ${brandNameClass} ${language === "km" ? "text-[14px] font-bold" : "text-[13px] font-black"}`}>
                {restaurantName}
              </div>
              <div className={`whitespace-nowrap uppercase tracking-[0.08em] ${brandSubtitleClass} ${language === "km" ? "text-[10.5px] font-semibold" : "text-[10px]"}`}>
                {t.restaurantAdmin}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* User Profile Card under POS Header */}
      {!sidebarCollapsed && contentMounted && (
        <div className="px-5 pt-3.5 pb-2 flex items-center gap-3">
          {getProfileImage(currentUser) ? (
            <img
              src={getProfileImage(currentUser)!}
              alt={currentUser.name}
              className="h-10 w-10 rounded-full object-cover ring-1 ring-[#0F522B]/20 shadow-xs shrink-0"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F522B]/15 text-[#0F522B] text-xs font-black shadow-xs">
              {initials(currentUser.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className={`truncate text-sm font-normal ${dark ? "text-white" : "text-[#1a3a1a]"} ${language === "km" ? "font-khmer text-xs" : ""}`}>
              {currentUser.name}
            </div>
            <div className={`text-[10.5px] font-semibold uppercase tracking-wider ${dark ? "text-slate-400" : "text-[#5a7a5a]/80"}`}>
              {currentUser.role}
            </div>
          </div>
        </div>
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
        className={`flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          sidebarCollapsed ? "p-[12px_14px]" : "p-[12px_10px]"
        }`}
      >
        {allowedMain.map((item) => (
          <SideNavItem
            key={item.label}
            {...item}
            label={t.nav[item.label as keyof typeof t.nav] || item.label}
            active={isNavItemActive(item.label, item.href)}
            collapsed={!contentMounted}
            navActive={navActive}
            navHover={navHover}
            dark={dark}
            isKhmer={language === "km"}
            contentClass={contentMotionClass}
            onClick={() => setActiveNav(item.label)}
            icon={<item.icon active={isNavItemActive(item.label, item.href)} />}
          />
        ))}

        {allowedManagement.map((item) => {
          const isMenu = item.label === "Menu";
          const active = isNavItemActive(item.label, item.href) || (isMenu && activeNav === "Menu");

          return (
            <div key={item.label}>
              <SideNavItem
                {...item}
                label={t.nav[item.label as keyof typeof t.nav] || item.label}
                active={active}
                collapsed={!contentMounted}
                navActive={navActive}
                navHover={navHover}
                dark={dark}
                isKhmer={language === "km"}
                contentClass={contentMotionClass}
                onClick={() => {
                  setActiveNav(item.label);
                  if (isMenu) {
                    setMenuOpen((open) => !open);
                    setMenuView("list");
                    window.dispatchEvent(
                      new CustomEvent("pos-menu-view-change", {
                        detail: "list",
                      }),
                    );
                  }
                }}
                icon={<item.icon active={active} />}
                trailing={
                  isMenu && contentMounted ? (
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
                          setActiveNav("Menu");
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
          const active = isNavItemActive(item.label, item.href);

          return (
            <div key={item.label}>
              <SideNavItem
                {...item}
                label={t.nav[item.label as keyof typeof t.nav] || item.label}
                active={active}
                collapsed={!contentMounted}
                navActive={navActive}
                navHover={navHover}
                dark={dark}
                isKhmer={language === "km"}
                contentClass={contentMotionClass}
                onClick={() => {
                  setActiveNav(item.label);
                }}
                icon={<item.icon active={active} />}
              />
            </div>
          );
        })}
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
              <h3 className={`text-base font-bold text-slate-900 dark:text-white ${language === "km" ? "font-khmer text-sm" : ""}`}>
                {language === "km" ? "បញ្ជាក់ការចាកចេញ" : "Confirm Logout"}
              </h3>
              <p className={`text-xs text-slate-500 dark:text-slate-400 font-normal leading-normal ${language === "km" ? "font-khmer text-[11px]" : ""}`}>
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
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group w-full flex items-center gap-3.5 rounded-full border-none cursor-pointer mb-1.5 transition-all duration-200 relative text-left active:scale-[0.98] active:translate-y-[0.5px] 
        ${collapsed ? "justify-center p-3.5" : "justify-start px-4.5 py-3"}
        ${
          active
            ? dark
              ? "bg-[#0F522B] text-white font-medium shadow-sm"
              : "bg-[#dcecdb] text-[#09391D] font-medium"
            : dark
              ? "text-slate-300 hover:bg-[#0F522B]/20 hover:text-white"
              : "text-slate-800 hover:bg-[#dcecdb] hover:text-[#09391D]"
        }
        ${isKhmer ? "font-medium text-[15px] leading-relaxed" : active ? "font-medium text-[15px]" : "font-normal text-[15px]"}
      `}
    >
      <span className={`shrink-0 transition-all duration-200 transform group-hover:scale-105 group-hover:translate-x-0.5 ${active ? (dark ? "text-white" : "text-[#09391D]") : dark ? "text-slate-400 group-hover:text-white" : "text-slate-800 group-hover:text-[#09391D]"}`}>
        {icon}
      </span>

      {!collapsed && (
        <span className={`flex-1 transition-all duration-[260ms] ease-out ${contentClass} ${active ? (dark ? "text-white font-medium" : "text-[#09391D] font-medium") : dark ? "text-slate-200 group-hover:text-white font-medium" : "text-slate-800 group-hover:text-[#09391D] font-normal"} ${isKhmer ? "text-[15px]" : "text-[15px]"}`}>
          {label}
        </span>
      )}

      {!collapsed && trailing && (
        <span className={`transition-all duration-[260ms] ease-out ${contentClass} ${active ? (dark ? "text-white" : "text-[#09391D]") : dark ? "text-slate-400 group-hover:text-white" : "text-[#8592a3] group-hover:text-[#09391D]"}`}>{trailing}</span>
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
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex h-9 items-center gap-2 rounded-lg px-3 transition duration-200 active:scale-[0.98] active:translate-y-[0.5px] ${
        active
          ? dark
            ? "bg-[#0F522B]/20 font-bold text-emerald-400"
            : "bg-[#dcecdb] font-bold text-[#09391D]"
          : dark 
            ? "text-slate-300 hover:bg-[#0F522B]/20 hover:text-emerald-400 font-normal"
            : "text-slate-700 hover:bg-[#dcecdb] hover:text-[#09391D] font-normal"
      } ${isKhmer ? "text-[13.5px]" : "text-[13.5px]"}`}
    >
      <span className={`transition-all duration-200 transform group-hover:scale-105 group-hover:translate-x-0.5 ${active ? "text-[#09391D] dark:text-emerald-400" : dark ? "text-slate-400 group-hover:text-emerald-400" : "text-slate-700 group-hover:text-[#09391D]"}`}>{icon}</span>
      <span className={`truncate ${active ? "text-[#09391D] dark:text-emerald-400" : "group-hover:text-[#09391D]"}`}>{label}</span>
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
            <div className={`truncate leading-4 font-normal ${dark ? "text-white" : "text-[#0F522B]"} ${isKhmer ? "text-[13px]" : "text-[12.5px]"}`}>
              {user.name}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`max-w-[70px] truncate rounded px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider ${
                  dark ? "bg-[#0F522B] text-white" : "bg-[#0F522B]/10 text-[#0F522B]"
                }`}
              >
                {user.role}
              </span>
              <span className={`flex min-w-0 items-center gap-1 text-[9.5px] font-semibold ${dark ? "text-[#71dd37]" : "text-[#0F522B]"}`}>
                <span className="relative flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-[#71dd37]/20">
                  <span className="h-1 w-1 rounded-full bg-[#71dd37]" />
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
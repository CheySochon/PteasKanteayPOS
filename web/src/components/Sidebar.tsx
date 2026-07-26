"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Settings2,
  ShieldCheck,
  LogOut,
  Languages,
  ListFilter,
  MoreHorizontal,
  Tags,
  ChevronLeft,
  ChevronRight,
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
  { label: "Orders", href: "/admin/orders", icon: OrdersIcon, badge: undefined },
  { label: "Tables", href: "/admin/tables", icon: TablesIcon, badge: undefined },
];

const NAV_MANAGEMENT = [
  { label: "Menu", href: "/admin/menu", icon: MenuIcon, badge: undefined },
  { label: "Reports", href: "/admin/reports", icon: ReportsIcon, badge: undefined },
];

const MENU_CHILDREN = [
  { key: "list", label: "Menu List", href: "/admin/menu", icon: ListFilter },
  { key: "categories", label: "Categories", href: "/admin/menu?view=categories", icon: Tags },
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
      Menu: "Menu",
      Inventory: "Inventory",
      Reports: "Reports",
      Tables: "Tables",
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
      Orders: "ការបញ្ជាទិញ",
      Menu: "មុខម្ហូប",
      Inventory: "ស្តុក",
      Reports: "របាយការណ៍",
      Tables: "តុ",
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
  const prevPathnameRef = useRef(pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => getSavedSidebarCollapsed(collapsed));
  const [contentMounted, setContentMounted] = useState(() => !getSavedSidebarCollapsed(collapsed));
  const sidebarCollapsedRef = useRef(sidebarCollapsed);
  const [menuView, setMenuView] = useState("list");
  const [menuOpen, setMenuOpen] = useState(
    () => typeof window !== "undefined" && window.location.pathname.startsWith("/admin/menu"),
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
  const sidebarBg = dark ? "bg-[#2b2c40] border-r border-[#4e4f6e]" : "bg-[#F8FAF9] border-r border-[#E2E9E4]";
  const navHover = dark ? "hover:bg-[#232333]/80 hover:text-white" : "hover:bg-[#0F522B]/10 hover:text-[#0F522B]";
  const navActive = dark 
    ? "bg-[#0F522B] text-white font-extrabold shadow-md shadow-[#0F522B]/40 ring-1 ring-emerald-400/30" 
    : "bg-[#0F522B] text-white font-extrabold shadow-sm border-l-4 border-[#09391D]";
  const headerBorder = dark ? "border-[#4e4f6e]" : "border-[#E2E9E4]";
  const dividerClass = dark ? "bg-[#4e4f6e]" : "bg-[#E2E9E4]";
  const sectionTextClass = dark ? "text-slate-400 font-bold uppercase tracking-wider" : "text-[#0F522B]/60 font-bold";
  const brandNameClass = dark ? "text-white font-black" : "text-[#0F522B] font-black";
  const brandSubtitleClass = dark ? "text-slate-400 font-semibold" : "text-[#0F522B]/70 font-semibold";
  const utilityTextClass = dark ? "text-slate-300 hover:bg-[#232333]/80 hover:text-white" : "text-[#334155] hover:bg-[#0F522B]/10 hover:text-[#0F522B]";
  const footerBorderClass = dark ? "border-[#4e4f6e]" : "border-[#E2E9E4]";
  const t = TEXT[language];
  const allowedMain = NAV_MAIN.filter((item) => canSeeHref(item.href, currentUser.role, staffPermissions));
  const allowedManagement = NAV_MANAGEMENT.filter((item) => canSeeHref(item.href, currentUser.role, staffPermissions));
  const allowedSystem = NAV_SYSTEM.filter((item) => canSeeHref(item.href, currentUser.role, staffPermissions));
  const menuExpanded = !sidebarCollapsed && contentMounted && menuOpen;
  const activeMenuChild = menuView === "categories" ? "categories" : "list";

  const widthClass = sidebarCollapsed ? "w-16 min-w-[64px]" : "w-[220px] min-w-[220px]";
  const contentMotionClass = "";

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
    } else if (pathname.startsWith("/pos")) {
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

  function logout() {
    void logoutApi().catch(() => null);
    localStorage.removeItem("pos_logged_in");
    localStorage.removeItem("pos_token");
    localStorage.removeItem("pos_user");
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
        sidebarCollapsed ? "max-md:-translate-x-full w-16 min-w-[64px]" : "w-[230px] min-w-[230px] shadow-2xl md:shadow-none"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center min-h-[64px] border-b ${headerBorder} ${
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

      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute -right-2 top-1/2 z-20 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100/85 text-slate-500 shadow-sm ring-1 ring-slate-300/60 backdrop-blur-sm transition-colors duration-300 hover:bg-white hover:text-slate-800"
        title={sidebarCollapsed ? t.expand : t.collapse}
      >
        {sidebarCollapsed ? <ChevronRight size={9} strokeWidth={2.6} /> : <ChevronLeft size={9} strokeWidth={2.6} />}
      </button>

      {/* Nav */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          sidebarCollapsed ? "p-[12px_8px]" : "p-[12px_10px]"
        }`}
      >
        {/* MAIN */}
        {contentMounted && allowedMain.length > 0 && (
          <div className={`transition-all duration-[260ms] ease-out ${contentMotionClass} font-semibold ${sectionTextClass} tracking-[0.1em] uppercase p-[12px_8px_8px] ${language === "km" ? "text-[11.5px] font-bold" : "text-[10px]"}`}>
            {t.main}
          </div>
        )}

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

        <div className={`h-px ${dividerClass} ${sidebarCollapsed ? "m-[12px_0]" : "m-[12px_8px]"}`} />

        {/* MANAGEMENT */}
        {contentMounted && allowedManagement.length > 0 && (
          <div className={`transition-all duration-[260ms] ease-out ${contentMotionClass} font-semibold ${sectionTextClass} tracking-[0.1em] uppercase p-[4px_8px_8px] ${language === "km" ? "text-[11.5px] font-bold" : "text-[10px]"}`}>
            {t.management}
          </div>
        )}

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

        <div className={`h-px ${dividerClass} ${sidebarCollapsed ? "m-[12px_0]" : "m-[12px_8px]"}`} />

        {/* SYSTEM */}
        {contentMounted && allowedSystem.length > 0 && (
          <div className={`transition-all duration-[260ms] ease-out ${contentMotionClass} font-semibold ${sectionTextClass} tracking-[0.1em] uppercase p-[4px_8px_8px] ${language === "km" ? "text-[11.5px] font-bold" : "text-[10px]"}`}>
            {t.system}
          </div>
        )}

        {allowedSystem.map((item) => (
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
      </div>

      {/* Footer Section */}
      <div className={`mt-auto border-t ${footerBorderClass} ${sidebarCollapsed ? "p-[12px_8px]" : "p-[14px_14px_14px]"}`}>
        {contentMounted && (
          <div className={`transition-all duration-[260ms] ease-out ${contentMotionClass}`}>
            <SidebarProfileCard user={currentUser} dark={dark} isKhmer={language === "km"} />
          </div>
        )}

        {hasToken ? (
          <button
            onClick={logout}
            className={`w-full flex items-center justify-center gap-[10px] rounded-lg p-2.5 text-center transition-all duration-150 ${
              dark 
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" 
                : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/80"
            } font-bold shadow-sm ${language === "km" ? "text-[14px]" : "text-[13px]"}`}
          >
            <LogOut size={16} strokeWidth={2.2} />
            {contentMounted && !sidebarCollapsed && <span className={`transition-all duration-[260ms] ease-out ${contentMotionClass}`}>{t.logout}</span>}
          </button>
        ) : (
          <SideNavItem
            label={t.login}
            href="/login"
            active={activeNav === "Login"}
            collapsed={!contentMounted}
            navActive={navActive}
            navHover={navHover}
            dark={dark}
            isKhmer={language === "km"}
            contentClass={contentMotionClass}
            onClick={() => setActiveNav("Login")}
            icon={<LogoutIcon active={activeNav === "Login"} />}
          />
        )}
      </div>
    </aside>
    <div className={`hidden md:block ${widthClass} h-screen shrink-0 transition-all duration-[300ms] ease-in-out`} aria-hidden="true" />
    </>
  );
}

function SideNavItem({
  label,
  href,
  active,
  collapsed,
  navActive,
  navHover,
  onClick,
  icon,
  trailing,
  contentClass = "",
  dark = false,
  isKhmer = false,
}: SideNavItemProps) {
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`w-full flex items-center gap-3 rounded border-none cursor-pointer mb-[2px] transition-all duration-150 relative text-left 
        ${collapsed ? "justify-center p-[10px]" : "justify-start p-[9px_12px]"}
        ${active ? navActive : hover ? navHover : "bg-transparent"}
        ${isKhmer ? "font-bold text-[14.5px] leading-relaxed" : active ? "font-semibold text-[14px]" : "font-medium text-[14px]"}
      `}
    >
      <span className={`shrink-0 ${active ? "text-white" : dark ? "text-emerald-300/80 group-hover:text-white" : "text-[#0F522B]/75 group-hover:text-[#0F522B]"}`}>
        {icon}
      </span>

      {!collapsed && (
        <span className={`flex-1 transition-all duration-[260ms] ease-out ${contentClass} ${active ? "text-white font-bold" : dark ? "text-slate-200 font-medium" : "text-[#334155] font-semibold"} ${isKhmer ? "text-[14px]" : "text-[14px]"}`}>
          {label}
        </span>
      )}

      {!collapsed && trailing && (
        <span className={`transition-all duration-[260ms] ease-out ${contentClass} ${active ? "text-white" : dark ? "text-emerald-400/70" : "text-[#0F522B]/60"}`}>{trailing}</span>
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
      className={`flex h-9 items-center gap-2 rounded px-3 transition ${
        active
          ? "bg-[#0F522B] border-l-2 border-[#09391D] font-bold text-white shadow-sm"
          : dark 
            ? "text-slate-300 hover:bg-white/[0.07] hover:text-white"
            : "text-[#334155] hover:bg-[#0F522B]/10 hover:text-[#0F522B]"
      } ${isKhmer ? "text-[13.5px]" : "text-[13.5px]"}`}
    >
      <span className={active ? "text-white" : dark ? "text-emerald-400/60" : "text-[#0F522B]/60"}>{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarProfileCard({
  user,
  dark = false,
  isKhmer = false,
}: {
  user: { id?: number; name: string; email?: string; role: string; isActive?: boolean };
  dark?: boolean;
  isKhmer?: boolean;
}) {
  const image = getProfileImage(user);

  return (
    <Link
      href="/admin/profile"
      className={`block mb-3 rounded-xl border p-2.5 group transition-all duration-200 ${
        dark 
          ? "border-[#4e4f6e] bg-[#232333]/60 hover:bg-[#232333] hover:border-[#696cff]/40"
          : "border-[#E2E9E4] bg-white hover:border-[#0F522B]/40 hover:shadow-sm"
      }`}
    >
      <div className="grid grid-cols-[42px_minmax(0,1fr)_24px] items-center gap-2.5">
        {image ? (
          <img
            src={image}
            alt={user.name}
            className={`h-[42px] w-[42px] rounded-lg object-cover ring-1 ${dark ? "ring-[#4e4f6e]" : "ring-[#0F522B]/20"}`}
          />
        ) : (
          <div
            className={`flex h-[42px] w-[42px] items-center justify-center rounded-lg ${dark ? "bg-[#0F522B] text-white" : "bg-[#0F522B]/10 text-[#0F522B]"} text-sm font-black shadow-sm ring-1 ring-[#0F522B]/20`}
          >
            {initials(user.name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className={`truncate leading-4 font-bold ${dark ? "text-white" : "text-[#0F522B]"} ${isKhmer ? "text-[13.5px]" : "text-[13px]"}`}>
            {user.name}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`max-w-[76px] truncate rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                dark ? "bg-[#0F522B] text-white" : "bg-[#0F522B]/10 text-[#0F522B]"
              }`}
            >
              {user.role}
            </span>
            <span className={`flex min-w-0 items-center gap-1 text-[10px] font-semibold ${dark ? "text-[#71dd37]" : "text-[#0F522B]"}`}>
              <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-[#71dd37]/20">
                <span className="h-1.5 w-1.5 rounded-full bg-[#71dd37]" />
              </span>
              Active
            </span>
          </div>
        </div>

        <div
          className={`inline-flex h-6 w-6 items-center justify-center self-start rounded-md transition-colors ${
            dark ? "text-slate-400 group-hover:bg-[#4e4f6e]/40 group-hover:text-white" : "text-[#0F522B]/60 group-hover:bg-[#0F522B]/10 group-hover:text-[#0F522B]"
          }`}
          title="Profile options"
        >
          <MoreHorizontal size={15} />
        </div>
      </div>
    </Link>
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
  return <LayoutDashboard size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}

function PosIcon({ active = false }: IconProps) {
  return <Store size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}

function OrdersIcon({ active = false }: IconProps) {
  return <ReceiptText size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}

function MenuIcon({ active = false }: IconProps) {
  return <UtensilsCrossed size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}

function InventoryIcon({ active = false }: IconProps) {
  return <Store size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}

function ReportsIcon({ active = false }: IconProps) {
  return <TrendingUp size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}

function TablesIcon({ active = false }: IconProps) {
  return <Armchair size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}

function StaffIcon({ active = false }: IconProps) {
  return <UsersRound size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}

function PermissionsIcon({ active = false }: IconProps) {
  return <ShieldCheck size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}

function SettingsIcon({ active = false }: IconProps) {
  return <Settings2 size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}

function LogoutIcon({ active = false }: IconProps) {
  return <LogOut size={18} strokeWidth={1.75} color={active ? "#ffffff" : "currentColor"} />;
}
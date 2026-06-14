"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Bell,
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
} from "lucide-react";
import { setAppLanguage } from "../lib/language";
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
}: TopBarProps) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

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

  const unreadCount = notifications.length;
  const surface = dark ? "border-[#2a2f3d] bg-[#171a23]" : "border-slate-200 bg-white";
  const dropdownSurface = dark ? "border-[#2a2f3d] bg-[#171a23]" : "border-slate-200 bg-white";
  const menuHover = dark ? "hover:bg-white/10" : "hover:bg-slate-100";
  const textPrimary = dark ? "text-slate-100" : "text-slate-800";
  const textSecondary = dark ? "text-slate-400" : "text-slate-500";
  const kmClass = language === "km" ? "font-khmer" : "";
  const t = labels[language];
  const allowedQuickLinks = quickLinks.filter(({ href }) => canSeeHref(href, user.role, staffPermissions));

  return (
    <header className={`sticky top-0 z-20 border-b px-3 shadow-sm ${surface}`}>
      <div className="flex h-[52px] items-center justify-between gap-3">
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

          <div className="hidden min-w-0 border-l border-slate-200 pl-3 2xl:block">
            <div className={`truncate text-xs font-black ${textPrimary} ${kmClass}`}>
              {title}
            </div>
            <div className={`truncate text-[10px] ${textSecondary} ${kmClass}`}>
              {subtitle}
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {allowedQuickLinks.map(({ label, href, Icon }) => (
              <Link
                key={label}
                href={href}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm ${textPrimary} ${menuHover}`}
              >
                <Icon size={15} />
                <span>{t.quickLinks[label as keyof typeof t.quickLinks] || label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div ref={languageRef} className="relative">
            <button
              type="button"
              onClick={() => setLanguageOpen((value) => !value)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${textPrimary} ${menuHover}`}
              title="Language"
            >
              <Languages size={16} />
            </button>

            {languageOpen && (
              <div className={`absolute right-0 z-40 mt-2 w-40 overflow-hidden rounded-sm border shadow-lg ${dropdownSurface}`}>
                <button
                  type="button"
                  onClick={() => {
                    setAppLanguage("en");
                    onLanguageChange("en");
                    setLanguageOpen(false);
                  }}
                  className={`block w-full px-4 py-2.5 text-left text-sm ${
                    language === "en" ? "bg-[#4b5578] text-white" : "text-slate-700 hover:bg-slate-100"
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
                  className={`block w-full px-4 py-2.5 text-left text-sm font-khmer ${
                    language === "km" ? "bg-[#4b5578] text-white" : "text-slate-700 hover:bg-slate-100"
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
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${textPrimary} ${menuHover}`}
            title={t.fullscreen}
          >
            <Maximize size={16} />
          </button>

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
                  {notifications.length > 0 ? (
                    <button
                      type="button"
                      onClick={onClearNotifications}
                      className={`rounded-md px-2 py-1 text-[11px] font-bold ${textSecondary} ${menuHover}`}
                    >
                      {t.clear}
                    </button>
                  ) : (
                    <Bell size={15} className={textSecondary} />
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className={`rounded-lg bg-slate-50 p-4 text-center text-xs ${textSecondary} ${kmClass}`}>
                    {t.noNotifications}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex gap-3 rounded-lg bg-slate-50 p-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            item.tone === "warning"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-[#1D9E75]/10 text-[#1D9E75]"
                          }`}
                        >
                          {item.tone === "warning" ? <Package size={15} /> : <ShoppingBag size={15} />}
                        </div>
                        <div className="min-w-0">
                          <div className={`truncate text-xs font-black ${textPrimary} ${kmClass}`}>
                            {item.title}
                          </div>
                          <div className={`mt-0.5 truncate text-xs ${textSecondary} ${kmClass}`}>
                            {item.detail}
                          </div>
                        </div>
                      </div>
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

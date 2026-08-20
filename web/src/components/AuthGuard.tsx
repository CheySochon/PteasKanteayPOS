"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMe, getSettings } from "../lib/api";
import { getSocket } from "../lib/socket";
import { getCookie, eraseCookie } from "../lib/cookies";
import { canAccessPath, firstAllowedPathForRole, parseStoredUser, permissionsForUser, roleName } from "../lib/permissions";

const PROTECTED_PREFIXES = ["/admin", "/pos", "/kds"];
const PUBLIC_PREFIXES = ["/login", "/qr"];

function isProtectedPath(pathname: string) {
  if (pathname === "/") return false;
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const protectedRoute = useMemo(() => isProtectedPath(pathname), [pathname]);
  const [authorizedPath, setAuthorizedPath] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      if (pathname === "/login" || !protectedRoute) {
        return;
      }

      const hasSession = !!localStorage.getItem("pos_logged_in") || !!localStorage.getItem("pos_token") || !!getCookie("pos_token");
      if (!hasSession) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      try {
        let user;
        const storedUserRaw = typeof window !== "undefined" ? localStorage.getItem("pos_user") : null;
        if (storedUserRaw) {
          try {
            user = JSON.parse(storedUserRaw);
          } catch {}
        }

        if (!user) {
          user = await getMe();
        }

        let staffPermissions: Record<string, boolean> = {};
        const storedPermsRaw = typeof window !== "undefined" ? localStorage.getItem("pos_staff_permissions") : null;
        if (storedPermsRaw) {
          try {
            staffPermissions = JSON.parse(storedPermsRaw);
          } catch {}
        } else {
          staffPermissions = permissionsForUser(user.id, (await getSettings()).staffPermissions);
        }

        if (!active) return;

        const uRole = roleName(user);
        if (!canAccessPath(pathname, uRole, staffPermissions)) {
          setDenied(true);
          router.replace(firstAllowedPathForRole(uRole, staffPermissions));
          return;
        }

        setDenied(false);
        setAuthorizedPath(pathname);
      } catch {
        if (!active) return;
        localStorage.removeItem("pos_logged_in");
        localStorage.removeItem("pos_token");
        localStorage.removeItem("pos_user");
        eraseCookie("pos_token");
        eraseCookie("pos_logged_in");
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }

    verifySession();

    const socket = getSocket();
    if (!socket) return;

    function handlePermissionsUpdated(settings: any) {
      if (!settings || !settings.staffPermissions) return;
      const storedUserRaw = typeof window !== "undefined" ? localStorage.getItem("pos_user") : null;
      let currentUser: any = null;
      if (storedUserRaw) {
        try { currentUser = JSON.parse(storedUserRaw); } catch {}
      }
      const staffPermissions = permissionsForUser(currentUser?.id, settings.staffPermissions);
      localStorage.setItem("pos_staff_permissions", JSON.stringify(staffPermissions));
      window.dispatchEvent(new Event("pos-permissions-change"));

      if (!canAccessPath(pathname, roleName(currentUser), staffPermissions)) {
        setDenied(true);
        router.replace(firstAllowedPathForRole(roleName(currentUser), staffPermissions));
      } else {
        setDenied(false);
        setAuthorizedPath(pathname);
      }
    }

    function handleRolesUpdated() {
      getMe().then((updatedUser) => {
        let staffPermissions: Record<string, boolean> = {};
        if (updatedUser.role && typeof updatedUser.role === "object" && Array.isArray(updatedUser.role.permissions)) {
          updatedUser.role.permissions.forEach((item: any) => {
            staffPermissions[item.key] = item.view;
            staffPermissions[`${item.key}_create`] = item.create;
            staffPermissions[`${item.key}_edit`] = item.edit;
            staffPermissions[`${item.key}_delete`] = item.delete;
          });
        }
        localStorage.setItem("pos_user", JSON.stringify(updatedUser));
        localStorage.setItem("pos_staff_permissions", JSON.stringify(staffPermissions));
        window.dispatchEvent(new Event("pos-auth-change"));
        window.dispatchEvent(new Event("pos-permissions-change"));

        if (!canAccessPath(pathname, roleName(updatedUser), staffPermissions)) {
          setDenied(true);
          router.replace(firstAllowedPathForRole(roleName(updatedUser), staffPermissions));
        } else {
          setDenied(false);
          setAuthorizedPath(pathname);
        }
      }).catch(() => null);
    }

    socket.on("permissions:updated", handlePermissionsUpdated);
    socket.on("roles:updated", handleRolesUpdated);

    return () => {
      active = false;
      socket.off("permissions:updated", handlePermissionsUpdated);
      socket.off("roles:updated", handleRolesUpdated);
    };
  }, [pathname, protectedRoute, router]);

  // ALL HOOKS EXECUTED UNCONDITIONALLY ──

  // For public non-protected routes (/qr, /login, /), render children immediately!
  if (!protectedRoute) {
    return <>{children}</>;
  }

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4">
        <div className="rounded border border-[#e5e7eb] bg-white px-5 py-4 text-sm font-semibold text-[#8592a3] shadow-sm">
          Checking session...
        </div>
      </main>
    );
  }

  const hasSession = typeof window !== "undefined" && (!!localStorage.getItem("pos_logged_in") || !!localStorage.getItem("pos_token"));

  if (protectedRoute && !hasSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4">
        <div className="rounded border border-[#e5e7eb] bg-white px-5 py-4 text-sm font-semibold text-[#8592a3] shadow-sm">
          Redirecting to login...
        </div>
      </main>
    );
  }

  if (denied) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4">
        <div className="rounded border border-[#e5e7eb] bg-white px-5 py-4 text-sm font-semibold text-rose-500 shadow-sm">
          Access Denied. Redirecting...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

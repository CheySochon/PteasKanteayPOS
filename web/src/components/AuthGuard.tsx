"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAdminGroups, getMe, getSettings } from "../lib/api";
import { getSocket } from "../lib/socket";
import { getCookie, eraseCookie } from "../lib/cookies";
import { canAccessPath, firstAllowedPathForRole, parseStoredUser, permissionsForUser, roleName, normalizeStaffPermissions } from "../lib/permissions";

const PROTECTED_PREFIXES = ["/admin", "/pos", "/kds", "/lock"];
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

      const isLocked = localStorage.getItem("pos_is_locked") === "true";
      if (isLocked && pathname !== "/lock") {
        router.replace("/lock");
        return;
      }
      if (!isLocked && pathname === "/lock") {
        router.replace("/admin");
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

        // Cache live admin groups so sub-admin permissions are resolved dynamically
        void getAdminGroups().catch(() => null);

        const userRawPerms = (user as any)?.permissions || (user as any)?.role?.permissions || (user as any)?.roleObj?.permissions;
        const staffPermissions = normalizeStaffPermissions(userRawPerms);

        if (!active) return;

        const uRole = roleName(user);
        if (!canAccessPath(pathname, user, staffPermissions)) {
          setDenied(true);
          router.replace(firstAllowedPathForRole(user, staffPermissions));
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

      if (!canAccessPath(pathname, currentUser, staffPermissions)) {
        setDenied(true);
        router.replace(firstAllowedPathForRole(currentUser, staffPermissions));
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

        if (!canAccessPath(pathname, updatedUser, staffPermissions)) {
          setDenied(true);
          router.replace(firstAllowedPathForRole(updatedUser, staffPermissions));
        } else {
          setDenied(false);
          setAuthorizedPath(pathname);
        }
      }).catch(() => null);
    }

    function handleUserUpdated(updatedUser: any) {
      if (!updatedUser) return;
      const storedUserRaw = typeof window !== "undefined" ? localStorage.getItem("pos_user") : null;
      let currentUser: any = null;
      if (storedUserRaw) {
        try { currentUser = JSON.parse(storedUserRaw); } catch {}
      }
      if (currentUser && (currentUser.id === updatedUser.id || (currentUser.email && currentUser.email.toLowerCase() === updatedUser.email?.toLowerCase()))) {
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

        if (!canAccessPath(pathname, updatedUser, staffPermissions)) {
          setDenied(true);
          router.replace(firstAllowedPathForRole(updatedUser, staffPermissions));
        } else {
          setDenied(false);
          setAuthorizedPath(pathname);
        }
      }
    }

    socket.on("permissions:updated", handlePermissionsUpdated);
    socket.on("roles:updated", handleRolesUpdated);
    socket.on("user:updated", handleUserUpdated);

    return () => {
      active = false;
      socket.off("permissions:updated", handlePermissionsUpdated);
      socket.off("roles:updated", handleRolesUpdated);
      socket.off("user:updated", handleUserUpdated);
    };
  }, [pathname, protectedRoute, router]);

  // ALL HOOKS EXECUTED UNCONDITIONALLY ──

  // For public non-protected routes (/qr, /login, /), render children immediately!
  if (!protectedRoute) {
    return <>{children}</>;
  }

  if (!mounted) {
    return <>{children}</>;
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMe, getSettings } from "../lib/api";
import { getSocket } from "../lib/socket";
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
      if (pathname === "/login") {
        const hasSession = !!localStorage.getItem("pos_logged_in") || !!localStorage.getItem("pos_token");
        if (hasSession) {
          try {
            const user = await getMe();
            localStorage.setItem("pos_logged_in", "true");
            const redirect = new URLSearchParams(window.location.search).get("redirect");
            let targetPath =
              redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/admin";
            if (targetPath === "/admin") {
              const rName = roleName(user);
              if (rName === "Cashier") {
                targetPath = "/pos";
              } else if (rName === "Staff") {
                targetPath = "/kds";
              }
            }
            router.replace(targetPath);
          } catch {
            localStorage.removeItem("pos_logged_in");
            localStorage.removeItem("pos_token");
            localStorage.removeItem("pos_user");
            window.dispatchEvent(new Event("pos-auth-change"));
          }
        }
        return;
      }

      if (!protectedRoute) {
        return;
      }

      const hasSession = !!localStorage.getItem("pos_logged_in") || !!localStorage.getItem("pos_token");
      if (!hasSession) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      try {
        const user = await getMe();
        const settings = await getSettings().catch(() => null);
        const staffPermissions = permissionsForUser(user.id, settings?.staffPermissions);

        localStorage.setItem("pos_logged_in", "true");
        localStorage.setItem("pos_user", JSON.stringify(user));
        localStorage.setItem("pos_staff_permissions", JSON.stringify(staffPermissions));
        window.dispatchEvent(new Event("pos-auth-change"));
        window.dispatchEvent(new Event("pos-permissions-change"));

        if (!canAccessPath(pathname, roleName(user), staffPermissions)) {
          if (active) setDenied(true);
          router.replace(firstAllowedPathForRole(roleName(user), staffPermissions));
          return;
        }

        if (active) {
          setDenied(false);
          setAuthorizedPath(pathname);
        }
      } catch {
        localStorage.removeItem("pos_logged_in");
        localStorage.removeItem("pos_token");
        localStorage.removeItem("pos_user");
        window.dispatchEvent(new Event("pos-auth-change"));
        if (active) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    }

    void verifySession();

    return () => {
      active = false;
    };
  }, [pathname, protectedRoute, router]);

  useEffect(() => {
    if (!protectedRoute) return;

    const socket = getSocket();
    if (!socket) return;

    function handlePermissionsUpdated(payload: { staffPermissions?: Record<string, unknown> }) {
      const currentUser = parseStoredUser(localStorage.getItem("pos_user"));
      const staffPermissions = permissionsForUser(currentUser.id, payload.staffPermissions);

      localStorage.setItem("pos_staff_permissions", JSON.stringify(staffPermissions));
      window.dispatchEvent(new Event("pos-permissions-change"));

      if (!canAccessPath(pathname, currentUser.role, staffPermissions)) {
        setDenied(true);
        router.replace(firstAllowedPathForRole(currentUser.role, staffPermissions));
        return;
      }

      setDenied(false);
      setAuthorizedPath(pathname);
    }

    socket.on("permissions:updated", handlePermissionsUpdated);

    return () => {
      socket.off("permissions:updated", handlePermissionsUpdated);
    };
  }, [pathname, protectedRoute, router]);

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4">
        <div className="rounded border border-[#e5e7eb] bg-white px-5 py-4 text-sm font-semibold text-[#8592a3] shadow-sm">
          Checking session...
        </div>
      </main>
    );
  }

  const hasSession = !!localStorage.getItem("pos_logged_in") || !!localStorage.getItem("pos_token");

  if (protectedRoute && !hasSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4">
        <div className="rounded border border-[#e5e7eb] bg-white px-5 py-4 text-sm font-semibold text-[#8592a3] shadow-sm">
          Checking session...
        </div>
      </main>
    );
  }

  if (protectedRoute && denied) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4">
        <div className="rounded border border-[#e5e7eb] bg-white px-5 py-4 text-sm font-semibold text-[#8592a3] shadow-sm">
          Redirecting to an allowed page...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

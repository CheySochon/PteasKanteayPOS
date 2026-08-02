"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useAppLanguage } from "../../lib/language";
import { useAppTheme } from "../../lib/theme";
import { roleName } from "../../lib/permissions";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useAppTheme();
  const language = useAppLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const bg = theme === "dark" ? "bg-[#232333]" : "bg-[#f3f6fb]";

  // Strict Synchronous-Guard for /admin pages
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedUser = localStorage.getItem("pos_user");
    if (!storedUser) {
      setAuthorized(false);
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      const uRole = roleName(user).trim().toLowerCase();

      if (["super admin", "admin", "administrator", "manager"].includes(uRole)) {
        setAuthorized(true);
      } else {
        setAuthorized(false);
        if (uRole === "cashier") {
          router.replace("/pos");
        } else if (uRole === "staff" || uRole === "kitchen") {
          router.replace("/kds");
        } else {
          router.replace("/pos");
        }
      }
    } catch {
      setAuthorized(false);
      router.replace("/login");
    }
  }, [pathname, router]);

  // Block rendering ANY admin UI until authorized is confirmed true!
  if (authorized !== true) {
    return (
      <div className={`flex h-screen w-screen items-center justify-center ${bg}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#696cff]" />
          <span className="text-xs font-bold text-slate-400">Verifying Permissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className={`flex h-screen h-[100dvh] overflow-hidden font-sans ${bg} ${language === "km" ? "font-khmer" : ""}`}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        theme={theme}
        setTheme={setTheme}
      />
      {children}
    </div>
  );
}

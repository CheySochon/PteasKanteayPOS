"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { useAppLanguage } from "../../lib/language";
import { useAppTheme } from "../../lib/theme";
import { roleName, canAccessPath } from "../../lib/permissions";
import { Loader2, Check, X, LogIn, LogOut } from "lucide-react";
import { getSocket } from "../../lib/socket";
import { getSettings, getMe } from "../../lib/api";

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

  const [userAuthToast, setUserAuthToast] = useState<{ userName: string; role: string; type: "login" | "logout" } | null>(null);

  const bg = theme === "dark" ? "bg-[#232333]" : "bg-white";

  // Strict Synchronous-Guard for /admin pages
  useEffect(() => {
    function checkAuth() {
      if (typeof window === "undefined") return;
      const storedUser = localStorage.getItem("pos_user");
      if (!storedUser) {
        setAuthorized(false);
        window.location.href = "/login";
        return;
      }

      try {
        const user = JSON.parse(storedUser);
        let uRole = roleName(user).trim().toLowerCase();

        // Auto-Repair: Only super admin owner email is forced as Super Admin
        if (user.email?.toLowerCase() === "cheychon258@gmail.com") {
          uRole = "super admin";
          if (user.role !== "Super Admin" || user.roleName !== "SUPER_ADMIN") {
            user.role = { id: 1, name: "Super Admin" };
            user.roleName = "SUPER_ADMIN";
            localStorage.setItem("pos_user", JSON.stringify(user));
          }
        }

        const isAllowed = canAccessPath(pathname, user);

        if (isAllowed) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          if (uRole.includes("cashier")) {
            window.location.href = "/pos";
          } else if (uRole.includes("staff") || uRole.includes("kitchen")) {
            window.location.href = "/kds";
          } else {
            window.location.href = "/pos";
          }
        }
      } catch {
        setAuthorized(false);
        window.location.href = "/login";
      }
    }

    checkAuth();

    window.addEventListener("pos-auth-change", checkAuth);
    window.addEventListener("storage", checkAuth);
    return () => {
      window.removeEventListener("pos-auth-change", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, [pathname]);



  // Real-time socket listener for user login and logout alerts
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (!socket.connected) {
      socket.connect();
    }

    function handleAuthLogin(data: any) {
      if (data && data.userName) {
        setUserAuthToast({
          userName: data.userName,
          role: data.userRole || "Staff",
          type: "login",
        });
      }
    }

    function handleAuthLogout(data: any) {
      if (data && data.userName) {
        setUserAuthToast({
          userName: data.userName,
          role: data.userRole || "Staff",
          type: "logout",
        });
      }
    }

    async function handleGroupUpdated() {
      try {
        const freshUser = await getMe();
        if (freshUser) {
          const stored = localStorage.getItem("pos_user");
          const userObj = stored ? JSON.parse(stored) : {};
          const updatedUser = {
            ...userObj,
            ...freshUser,
            permissions: freshUser.permissions || userObj.permissions,
          };
          localStorage.setItem("pos_user", JSON.stringify(updatedUser));
          window.dispatchEvent(new Event("pos-auth-change"));
        }
      } catch {}
    }

    socket.on("auth:login", handleAuthLogin);
    socket.on("auth:logout", handleAuthLogout);
    socket.on("group:updated", handleGroupUpdated);
    socket.on("groups:updated", handleGroupUpdated);

    return () => {
      socket.off("auth:login", handleAuthLogin);
      socket.off("auth:logout", handleAuthLogout);
      socket.off("group:updated", handleGroupUpdated);
      socket.off("groups:updated", handleGroupUpdated);
    };
  }, []);

  // Auto-dismiss user auth toast after 4 seconds
  useEffect(() => {
    if (!userAuthToast) return;
    const timer = setTimeout(() => {
      setUserAuthToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [userAuthToast]);

  // Block rendering ANY admin UI until authorized is confirmed true!
  if (authorized !== true) {
    if (typeof window !== "undefined" && !localStorage.getItem("pos_user")) {
      return null;
    }
    return (
      <div className={`flex h-screen w-screen items-center justify-center ${bg}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#55a060]" />
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
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 min-h-0">
        <TopBar />
        {children}
      </div>



      <style jsx>{`
        @keyframes dropFromTop {
          0% { transform: translateY(-100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* REAL-TIME USER LOGIN / LOGOUT TOAST */}
      {userAuthToast && (
        <div className={`fixed bottom-5 right-5 z-[99999] flex items-center gap-3.5 rounded-2xl border bg-white/95 dark:bg-[#1a1b26]/95 px-4.5 py-3.5 shadow-xl backdrop-blur-md animate-[slideFromRight_300ms_cubic-bezier(0.16,1,0.3,1)] text-slate-800 dark:text-slate-100 min-w-[310px] max-w-md ${
          userAuthToast.type === "login" 
            ? "border-emerald-500/20" 
            : "border-amber-500/20"
        }`}>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-xs ${
            userAuthToast.type === "login"
              ? "bg-[#eefcf2] dark:bg-emerald-950/60 border-emerald-100/80 dark:border-emerald-900/50 text-[#16a34a] dark:text-emerald-400"
              : "bg-[#fffbeb] dark:bg-amber-950/60 border-amber-100/80 dark:border-amber-900/50 text-[#d97706] dark:text-amber-400"
          }`}>
            {userAuthToast.type === "login" ? (
              <LogIn size={20} strokeWidth={2.5} />
            ) : (
              <LogOut size={20} strokeWidth={2.5} />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-1 leading-snug font-khmer">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {userAuthToast.type === "login" 
                ? (language === "km" ? "បុគ្គលិកបានចូលប្រើប្រាស់" : "Staff Logged In")
                : (language === "km" ? "បុគ្គលិកបានចាកចេញ" : "Staff Logged Out")}
            </div>
            <div className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {userAuthToast.userName} ({userAuthToast.role}) {userAuthToast.type === "login" 
                ? (language === "km" ? "បានចូលគណនីដោយជោគជ័យ។" : "has logged in successfully.")
                : (language === "km" ? "បានចាកចេញពីប្រព័ន្ធហើយ។" : "has logged out.")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUserAuthToast(null)}
            className="ml-2 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

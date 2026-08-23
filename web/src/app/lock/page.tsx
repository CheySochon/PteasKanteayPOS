"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loginPin, apiOrigin } from "../../lib/api";

export default function LockScreen() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockedUser, setLockedUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const userStr = localStorage.getItem("pos_user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setLockedUser({
          id: u.id,
          name: u.name,
          role: u.roleName || "USER",
          imageUrl: u.imageUrl || u.image || "",
          avatarBg: "bg-[#55a060]",
          initial: (u.name || "U")[0].toUpperCase(),
        });
      } catch {}
    } else {
      localStorage.removeItem("pos_is_locked");
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (pin.length === 4) {
      handleUnlock(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function handleUnlock(enteredPin: string) {
    setLoading(true);
    setError("");
    try {
      const res = await loginPin(enteredPin);
      localStorage.removeItem("pos_is_locked");
      if (res.token) localStorage.setItem("pos_token", res.token);
      
      const targetRole = typeof res.user.role === "string" 
        ? res.user.role 
        : (res.user.roleName || "USER");

      // Redirect dynamically based on role
      if (targetRole === "ADMIN") {
        window.location.href = "/admin";
      } else if (targetRole === "CASHIER") {
        window.location.href = "/pos";
      } else if (targetRole === "KITCHEN") {
        window.location.href = "/kds";
      } else {
        window.location.href = "/admin";
      }
    } catch (err: any) {
      setError(err.message || "Invalid PIN. Please try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("pos_is_locked");
    localStorage.removeItem("pos_logged_in");
    localStorage.removeItem("pos_token");
    localStorage.removeItem("pos_user");
    window.location.href = "/login";
  }

  if (!mounted || !lockedUser) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] dark:bg-[#0f1115] px-4 font-sans login-page">
      <div suppressHydrationWarning className="w-full max-w-[400px] sm:max-w-[420px] rounded-2xl bg-white dark:bg-[#181920] border border-slate-200/60 dark:border-slate-800/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] flex flex-col p-7 sm:p-8 relative overflow-hidden transition-all duration-300">
        <div className="space-y-3.5 w-full flex flex-col items-center">
          
          {/* User Details & Avatar Badge */}
          <div className="flex flex-col items-center text-center shrink-0">
            {lockedUser.imageUrl ? (
              <img
                src={lockedUser.imageUrl.startsWith("http") ? lockedUser.imageUrl : `${apiOrigin}${lockedUser.imageUrl}`}
                alt={lockedUser.name}
                className="h-16 w-16 rounded-2xl object-cover shadow-sm mb-2 ring-4 ring-emerald-500/10 border border-slate-100 dark:border-slate-800"
              />
            ) : (
              <div className={`h-16 w-16 rounded-2xl ${lockedUser.avatarBg} text-white flex items-center justify-center text-xl font-black shadow-sm mb-2 ring-4 ring-emerald-500/10`}>
                {lockedUser.initial}
              </div>
            )}
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              {lockedUser.name}
            </h3>
            <span className="inline-block mt-1 text-[10.5px] font-bold uppercase tracking-wide bg-[#55a060]/10 text-[#55a060] dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-0.5 rounded-full">
              {lockedUser.role}
            </span>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 font-normal text-center shrink-0 pt-1">
            Enter your 4-digit PIN
          </p>

          <div className="flex items-center justify-center py-1.5 shrink-0">
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
                    pin.length > idx
                      ? "bg-[#55a060] border-2 border-[#55a060] shadow-sm shadow-[#55a060]/40 scale-110"
                      : "bg-slate-100 dark:bg-slate-800 border-2 border-slate-200/80 dark:border-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-y-2.5 gap-x-4 max-w-[240px] w-full mx-auto justify-items-center pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => {
                  setError("");
                  if (btn === "C") {
                    setPin("");
                  } else if (btn === "⌫") {
                    setPin((prev) => prev.slice(0, -1));
                  } else {
                    if (pin.length < 4) {
                      setPin((prev) => prev + btn);
                    }
                  }
                }}
                className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full text-xl sm:text-2xl font-semibold transition-all ${
                  btn === "C" || btn === "⌫"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90"
                    : "bg-white dark:bg-[#1a1b26] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-[#55a060]/10 hover:border-[#55a060]/30 hover:text-[#55a060] shadow-sm active:scale-95"
                }`}
              >
                {btn}
              </button>
            ))}
          </div>

          <div className="pt-4 text-center w-full min-h-[40px]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-[#55a060]">
                <Loader2 className="animate-spin" size={16} /> Authenticating...
              </div>
            ) : error ? (
              <p className="text-xs text-rose-500 font-medium animate-pulse">{error}</p>
            ) : null}
          </div>
          
          <div className="pt-2 text-center w-full">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-500 text-xs font-normal transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60 shadow-xs hover:border-rose-200 active:scale-95"
            >
              Sign out completely
            </button>
          </div>
          
        </div>
      </div>
    </main>
  );
}

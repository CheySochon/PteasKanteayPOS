"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiOrigin, getSettings, login } from "../../lib/api";
import { firstAllowedPathForRole } from "../../lib/permissions";
import { useAutoDismiss } from "../../lib/useAutoDismiss";
import { useAppTheme } from "../../lib/theme";
import { Eye, EyeOff, Lock, Mail, Server, Clock, Calendar, Loader2 } from "lucide-react";

const DEFAULT_POS_NAME = "The Tofu";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [posName, setPosName] = useState(DEFAULT_POS_NAME);
  const [restaurantImageUrl, setRestaurantImageUrl] = useState("");
  const [error, setError] = useState("");
  useAutoDismiss(error, setError);
  const [loading, setLoading] = useState(false);
  const [theme] = useAppTheme();
  
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  const dark = theme === "dark";

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setDate(
        now.toLocaleDateString([], {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem("pos_restaurant_name");
    const savedImage = localStorage.getItem("pos_restaurant_image_url");
    if (savedName) setPosName(savedName);
    if (savedImage) setRestaurantImageUrl(savedImage);

    getSettings()
      .then((settings) => {
        const nextName = settings.restaurantName || DEFAULT_POS_NAME;
        const nextImage = settings.restaurantImageUrl || "";
        setPosName(nextName);
        setRestaurantImageUrl(nextImage);
        localStorage.setItem("pos_restaurant_name", nextName);
        localStorage.setItem("pos_restaurant_image_url", nextImage);
        window.dispatchEvent(new Event("pos-settings-change"));
      })
      .catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      localStorage.setItem("pos_logged_in", "true");
      if (result.token) localStorage.setItem("pos_token", result.token);
      localStorage.setItem("pos_user", JSON.stringify(result.user));
      window.dispatchEvent(new Event("pos-auth-change"));
      
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      let targetPath = redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "";
      
      const r = result.user?.role;
      const role = typeof r === "object" && r ? r.name : r;

      if (!targetPath) {
        let userPerms = null;
        const savedPermsRaw = localStorage.getItem("pos_staff_permissions");
        if (savedPermsRaw) {
          try {
            userPerms = JSON.parse(savedPermsRaw);
          } catch {}
        }
        targetPath = firstAllowedPathForRole(String(role || "Member"), userPerms);
      }
      router.replace(targetPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`flex min-h-screen select-none overflow-hidden ${dark ? "bg-[#151521]" : "bg-[#f4f5f7]"}`}>
      {/* Left panel: Branding and Live Clock (hidden on mobile) */}
      <div 
        className="hidden md:flex md:w-1/2 lg:w-[58%] relative bg-cover bg-center flex-col justify-between p-12 lg:p-16 text-white"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200')` }}
      >
        {/* Dark overlay for rich contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/30 z-0" />
        
        {/* Top Section: Branding */}
        <div className="relative z-10 flex items-center gap-4">
          {restaurantImageUrl ? (
            <img
              src={restaurantImageUrl.startsWith("http") ? restaurantImageUrl : `${apiOrigin}${restaurantImageUrl}`}
              alt="Restaurant Logo"
              className="h-14 w-14 rounded-2xl object-cover border border-white/20 shadow-md"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-[#696cff] flex items-center justify-center font-black text-2xl text-white shadow-md shadow-[#696cff]/20">T</div>
          )}
          <div>
            <h2 className="text-xl font-black tracking-wide leading-none">{posName}</h2>
            <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider mt-1 block">Live Terminal Station</span>
          </div>
        </div>

        {/* Center/Bottom Section: Live Time & Date */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 text-white/60">
            <Clock size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Station Time</span>
          </div>
          <div className="text-6xl lg:text-7xl font-extrabold tracking-tight font-mono text-white/95 tabular-nums leading-none">
            {time || "00:00:00"}
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm font-semibold">
            <Calendar size={14} className="text-[#696cff]" />
            <span>{date || "Loading calendar..."}</span>
          </div>
        </div>

        {/* Bottom Section: System Status */}
        <div className="relative z-10 border-t border-white/10 pt-6 flex items-center justify-between text-[10px] font-bold text-white/65 tracking-widest uppercase">
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Server: Operational</span>
          </div>
         
        </div>
      </div>

      {/* Right panel: Login Form */}
      <div className={`w-full md:w-1/2 lg:w-[42%] flex items-center justify-center p-8 lg:p-16 relative z-10 transition-colors duration-300 ${dark ? "bg-[#181824]" : "bg-white"}`}>
        <div className="w-full max-w-[360px] space-y-8">
          
          {/* Header text */}
          <div>
            <div className="md:hidden flex items-center gap-3.5 mb-6">
              {restaurantImageUrl ? (
                <img
                  src={restaurantImageUrl.startsWith("http") ? restaurantImageUrl : `${apiOrigin}${restaurantImageUrl}`}
                  alt="Restaurant Logo"
                  className="h-12 w-12 rounded-xl object-cover border border-[#e5e7eb] dark:border-slate-800 shadow-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-[#696cff] flex items-center justify-center font-black text-white shadow-md shadow-[#696cff]/20">T</div>
              )}
              <div>
                <h2 className={`text-lg font-black tracking-wide leading-none ${dark ? "text-white" : "text-[#2c3e50]"}`}>{posName}</h2>
                <span className="text-[10px] text-[#8592a3] font-bold uppercase tracking-wider mt-1 block">Live Terminal Station</span>
              </div>
            </div>
            
            <h1 className={`font-brand text-3xl font-extrabold tracking-tight ${dark ? "text-white" : "text-[#2c3e50]"}`}>
              Welcome back
            </h1>
            <p className="text-xs text-[#8592a3] font-semibold mt-1">
              Access your station register by signing in below.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-600 flex items-center gap-2 animate-[shake_300ms_ease-in-out]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                {error}
              </div>
            )}

            {/* Email input */}
            <div className="space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-wider ${dark ? "text-slate-400" : "text-[#8592a3]"}`}>
                Staff Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-[#a1acb8]" size={16} />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="name@restaurant.com"
                  className={`w-full h-11 rounded-lg border pl-11 pr-4 text-sm font-semibold outline-none transition-all duration-200 ${
                    dark 
                      ? "border-slate-700 bg-[#232333] focus:border-[#696cff] focus:ring-2 focus:ring-[#696cff]/10" 
                      : "border-slate-200 bg-slate-50/50 focus:border-[#696cff] focus:ring-2 focus:ring-[#696cff]/5"
                  } ${dark ? "text-white" : "text-slate-800"}`}
                  required
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-wider ${dark ? "text-slate-400" : "text-[#8592a3]"}`}>
                 Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-[#a1acb8]" size={16} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className={`w-full h-11 rounded-lg border pl-11 pr-11 text-sm font-semibold outline-none transition-all duration-200 ${
                    dark 
                      ? "border-slate-700 bg-[#232333] focus:border-[#696cff] focus:ring-2 focus:ring-[#696cff]/10" 
                      : "border-slate-200 bg-slate-50/50 focus:border-[#696cff] focus:ring-2 focus:ring-[#696cff]/5"
                  } ${dark ? "text-white" : "text-slate-800"}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#696cff] hover:bg-[#5f61e6] active:scale-[0.99] transition-all text-sm font-bold text-white shadow-md shadow-[#696cff]/10 flex items-center justify-center gap-2 mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={15} /> : null}
              {loading ? "Verifying Station..." : "Sign In to Station"}
            </button>
          </form>

          {/* Footer security message */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 flex items-center gap-2.5 text-[9px] text-[#a1acb8] font-bold leading-normal uppercase">
            <Server size={12} className="text-[#696cff] shrink-0" />
            <span>Authorized Personnel Only. Connections are encrypted and audited.</span>
          </div>

        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </main>
  );
}

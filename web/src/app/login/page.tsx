"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiOrigin, getSettings, login } from "../../lib/api";
import { useAutoDismiss } from "../../lib/useAutoDismiss";
import { Eye, EyeOff } from "lucide-react";

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

  useEffect(() => {
    // Load local storage cache instantly on client-side mount
    const savedName = localStorage.getItem("pos_restaurant_name");
    const savedImage = localStorage.getItem("pos_restaurant_image_url");
    if (savedName) setPosName(savedName);
    if (savedImage) setRestaurantImageUrl(savedImage);

    // Sync fresh values dynamically from the API settings
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
      localStorage.setItem("pos_token", result.token);
      localStorage.setItem("pos_user", JSON.stringify(result.user));
      window.dispatchEvent(new Event("pos-auth-change"));
      
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      let targetPath = redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/admin";
      if (targetPath === "/admin") {
        const r = result.user?.role;
        const role = typeof r === "object" && r ? r.name : r;
        if (role === "Cashier") {
          targetPath = "/pos";
        } else if (role === "Staff") {
          targetPath = "/kds";
        }
      }
      router.replace(targetPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f9] px-4 py-10 relative overflow-hidden select-none">
      <div className="w-full max-w-[400px] bg-white rounded border border-[#e5e7eb] p-8 shadow-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          {restaurantImageUrl ? (
            <div className="flex justify-center mb-3">
              <img
                src={restaurantImageUrl.startsWith("http") ? restaurantImageUrl : `${apiOrigin}${restaurantImageUrl}`}
                alt="Restaurant Logo"
                className="h-16 w-16 rounded-full object-cover border border-[#e5e7eb] shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : null}
          <span className="text-2xl font-brand tracking-tight text-[#566a7f] capitalize block">
            {posName.toLowerCase().endsWith("pos") ? (
              <>
                {posName.slice(0, -3).trim()}{" "}
                <span className="font-bold text-[#696cff] uppercase text-xs tracking-wider ml-1">POS</span>
              </>
            ) : (
              <>
                {posName}{" "}
                <span className="font-bold text-[#696cff] uppercase text-xs tracking-wider ml-1">POS</span>
              </>
            )}
          </span>
        </div>

        {/* Welcome message */}
        <div className="mb-6 text-center">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Sign In
          </h2>
          <p className="text-sm text-[#697a8d] mt-1">
            Access the restaurant management dashboard
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[13.5px] font-semibold text-[#566a7f] mb-1.5">
              Email or Username
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Enter your email or username"
              className="w-full rounded border border-[#d9dee3] px-3.5 py-2 text-sm text-slate-800 outline-none placeholder-[#b4bdc6] focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 transition-all duration-150"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[13.5px] font-semibold text-[#566a7f]">
                Password
              </label>
              <a href="#" className="text-xs font-semibold text-[#696cff] hover:underline">
                Forgot Password?
              </a>
            </div>
            <div className="relative">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                className="w-full rounded border border-[#d9dee3] pr-10 pl-3.5 py-2 text-sm text-slate-800 outline-none placeholder-[#b4bdc6] focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 transition-all duration-150"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center mt-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#d9dee3] text-[#696cff] focus:ring-[#696cff] accent-[#696cff]"
              />
              Remember Me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#696cff] py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#696cff]/30 hover:bg-[#5f61e6] active:bg-[#5859d0] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}

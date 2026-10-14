"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  Globe,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { getSettings, resolveImageUrl } from "../lib/api";
import { useAppLanguage, setAppLanguage } from "../lib/language";
import { useAppTheme } from "../lib/theme";

const DEFAULT_POS_NAME = "PteasKanteay POS 60";

export default function Home() {
  const language = useAppLanguage();
  const [theme, setTheme] = useAppTheme();
  const dark = theme === "dark";
  const [restaurantName, setRestaurantName] = useState(DEFAULT_POS_NAME);
  const [restaurantImageUrl, setRestaurantImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("pos_restaurant_name");
    const savedImage = localStorage.getItem("pos_restaurant_image_url");
    if (savedName) setRestaurantName(savedName);
    if (savedImage) setRestaurantImageUrl(savedImage);

    getSettings()
      .then((settings) => {
        if (settings.restaurantName) {
          setRestaurantName(settings.restaurantName);
          localStorage.setItem("pos_restaurant_name", settings.restaurantName);
        }
        if (settings.restaurantImageUrl) {
          setRestaurantImageUrl(settings.restaurantImageUrl);
          setImageError(false);
          localStorage.setItem("pos_restaurant_image_url", settings.restaurantImageUrl);
        }
      })
      .catch(() => undefined);
  }, []);

  const toggleLanguage = () => {
    setAppLanguage(language === "km" ? "en" : "km");
  };

  const toggleTheme = () => {
    setTheme(dark ? "light" : "dark");
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-hidden transition-colors duration-200 ${dark ? "bg-[#12131c] text-slate-100" : "bg-[#f8faf9] text-slate-800"}`}>
      {/* Background Decorator Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[420px] w-[600px] rounded-full bg-emerald-500/10 blur-[130px] dark:bg-emerald-500/15" />
      </div>

      {/* Header */}
      <header className={`w-full border-b ${dark ? "border-[#252738] bg-[#1a1b28]/80" : "border-slate-200/70 bg-white/80"} backdrop-blur-md sticky top-0 z-50`}>
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            {restaurantImageUrl && !imageError ? (
              <div className="h-9 w-9 rounded-xl bg-transparent flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={resolveImageUrl(restaurantImageUrl)}
                  alt={restaurantName}
                  className="h-full w-full object-contain"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-xl bg-[#cbd0d9] dark:bg-slate-700 flex items-end justify-center overflow-hidden shrink-0 ring-1 ring-slate-200/60 dark:ring-slate-700/60 shadow-xs">
                <svg className="w-full h-full text-white dark:text-slate-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zm-9.5 22c0-5.25 4.25-9.5 9.5-9.5s9.5 4.25 9.5 9.5h-19z" />
                </svg>
              </div>
            )}
            <span className={`text-base font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"} ${language === "km" ? "font-khmer" : ""}`}>
              {restaurantName}
            </span>
          </div>

          {/* Quick Settings Controls (Language & Theme) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                dark
                  ? "border-slate-700/60 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                  : "border-slate-200 bg-slate-100/80 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Globe size={14} className="text-[#55a060]" />
              <span>{language === "km" ? "ខ្មែរ" : "EN"}</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                dark
                  ? "border-slate-700/60 bg-slate-800/80 text-amber-400 hover:bg-slate-700"
                  : "border-slate-200 bg-slate-100/80 text-slate-600 hover:bg-slate-200"
              }`}
              aria-label="Toggle Theme"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-12 md:py-16 max-w-4xl mx-auto w-full z-10">
        {/* Modern Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-6 shadow-xs">
          <Sparkles size={14} className="shrink-0" />
          <span>{language === "km" ? "ប្រព័ន្ធគ្រប់គ្រងការលក់ និងភោជនីយដ្ឋានទំនើប" : "Smart POS & Restaurant Solution"}</span>
        </div>

        {/* Hero Title */}
        <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight ${dark ? "text-white" : "text-slate-900"} max-w-3xl leading-[1.15] mb-8 ${language === "km" ? "font-khmer leading-snug" : ""}`}>
          {language === "km" ? (
            <>
              បទពិសោធន៍គ្រប់គ្រង <span className="text-[#55a060]">POS ទំនើប</span>
            </>
          ) : (
            <>
              The Modern <span className="text-[#55a060]">Point of Sale</span> Experience
            </>
          )}
        </h1>

        {/* Dual Primary Login Action Cards (ONLY ADMIN SIGN IN & CASHIER PIN LOGIN) */}
        <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-2xl border border-slate-200/70 dark:border-[#2f3146] bg-white/90 dark:bg-[#1e202f]/90 shadow-xl shadow-slate-200/40 dark:shadow-black/30 backdrop-blur-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Admin Login Button */}
            <Link
              href="/login?mode=admin"
              className="flex items-center justify-between p-4 rounded-xl bg-[#1d1e2c] hover:bg-[#26283b] text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 group active:scale-98 cursor-pointer border border-slate-800"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                    {language === "km" ? "អ្នកគ្រប់គ្រង" : "ADMIN PORTAL"}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {language === "km" ? "ចូល Admin Login" : "Admin Sign In"}
                  </div>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>

            {/* Cashier POS Login Button */}
            <Link
              href="/login?mode=cashier"
              className="flex items-center justify-between p-4 rounded-xl bg-[#55a060] hover:bg-[#488d52] text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 group active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-white group-hover:scale-105 transition-transform">
                  <Users size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-emerald-100 uppercase tracking-wider">
                    {language === "km" ? "អ្នកគិតលុយ / បុគ្គលិក" : "CASHIER & STAFF"}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {language === "km" ? "ចូល POS PIN Login" : "Cashier PIN Login"}
                  </div>
                </div>
              </div>
              <ArrowRight size={16} className="text-emerald-100 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`w-full py-4 border-t ${dark ? "border-[#252738] bg-[#12131c]" : "border-slate-200/70 bg-white"} text-center mt-auto z-10`}>
        <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"} ${language === "km" ? "font-khmer" : ""}`}>
          © {new Date().getFullYear()} {restaurantName} • All rights reserved.
        </p>
      </footer>
    </div>
  );
}

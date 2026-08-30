"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Store,
  BarChart3,
  ChefHat,
  QrCode,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Users,
} from "lucide-react";
import { getSettings, resolveImageUrl } from "../lib/api";
import { useAppLanguage } from "../lib/language";
import { useAppTheme } from "../lib/theme";

const DEFAULT_POS_NAME = "PteasKanteay POS 60";

export default function Home() {
  const language = useAppLanguage();
  const [theme] = useAppTheme();
  const dark = theme === "dark";
  const [restaurantName, setRestaurantName] = useState(DEFAULT_POS_NAME);
  const [restaurantImageUrl, setRestaurantImageUrl] = useState("");

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
          localStorage.setItem("pos_restaurant_image_url", settings.restaurantImageUrl);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${dark ? "bg-[#181926] text-slate-100" : "bg-[#f8faf9] text-slate-800"}`}>
      {/* Ultra-Clean Header */}
      <header className={`w-full border-b ${dark ? "border-[#2b2c40] bg-[#1e1f2e]/80" : "border-slate-200/70 bg-white/80"} backdrop-blur-md sticky top-0 z-50`}>
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#55a060] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              {restaurantImageUrl ? (
                <img
                  src={resolveImageUrl(restaurantImageUrl)}
                  alt={restaurantName}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div style={{ display: restaurantImageUrl ? "none" : "flex" }} className="w-full h-full items-center justify-center bg-[#55a060]">
                <img src="/favicon.svg" alt="POS Logo" className="w-5 h-5 object-contain" />
              </div>
            </div>
            <span className={`text-base font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"} ${language === "km" ? "font-khmer" : ""}`}>
              {restaurantName}
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-12 md:py-16 max-w-4xl mx-auto w-full">
        {/* Clean Hero Title */}
        <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight ${dark ? "text-white" : "text-slate-900"} max-w-3xl leading-[1.15] mb-10 ${language === "km" ? "font-khmer leading-snug" : ""}`}>
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

        {/* Dual Primary Login Action Buttons */}
        <div className="w-full max-w-xl mx-auto mb-14 p-2 sm:p-3 rounded-2xl border border-slate-200/70 dark:border-[#3b3c54] bg-white dark:bg-[#2b2c40] shadow-xl shadow-slate-200/50 dark:shadow-black/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Admin Login Button */}
            <Link
              href="/login"
              className="flex items-center justify-between p-4.5 rounded-xl bg-[#232333] hover:bg-[#2b2c40] text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 group active:scale-98 cursor-pointer"
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
              href="/login"
              className="flex items-center justify-between p-4.5 rounded-xl bg-[#55a060] hover:bg-[#488d52] text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 group active:scale-98 cursor-pointer"
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

        {/* Minimal Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {[
            {
              href: "/admin",
              icon: BarChart3,
              title: language === "km" ? "ផ្ទាំងគ្រប់គ្រង Admin" : "Smart Dashboard",
            },
            {
              href: "/pos",
              icon: Store,
              title: language === "km" ? "បញ្ជរ POS Counter" : "POS Counter",
            },
            {
              href: "/kds",
              icon: ChefHat,
              title: language === "km" ? "អេក្រង់ផ្ទះបាយ KDS" : "Kitchen Display",
            },
            {
              href: "/pos",
              icon: QrCode,
              title: language === "km" ? "កុម្ម៉ង់តាម QR Code" : "QR Ordering",
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={i}
                href={item.href}
                className={`flex items-center gap-3 text-left p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-md ${
                  dark
                    ? "border-[#3b3c54] bg-[#2b2c40] hover:border-[#55a060]"
                    : "border-slate-200/70 bg-white hover:border-[#55a060]"
                }`}
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#55a060] dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <Icon size={20} />
                </div>
                <h3 className={`text-xs sm:text-sm font-bold ${dark ? "text-slate-100" : "text-slate-900"} group-hover:text-[#55a060] transition-colors ${language === "km" ? "font-khmer" : ""}`}>
                  {item.title}
                </h3>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className={`w-full py-5 border-t ${dark ? "border-[#2b2c40] bg-[#181926]" : "border-slate-200/70 bg-white"} text-center mt-auto`}>
        <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"} ${language === "km" ? "font-khmer" : ""}`}>
          © {new Date().getFullYear()} {restaurantName} • All rights reserved.
        </p>
      </footer>
    </div>
  );
}

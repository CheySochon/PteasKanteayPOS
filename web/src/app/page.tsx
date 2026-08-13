"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ChefHat, QrCode, Utensils, Sun, Moon, ArrowRight } from "lucide-react";
import { useAppTheme } from "../lib/theme";

export default function Home() {
  const [theme, setTheme] = useAppTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const dark = theme === "dark";

  const workspaces = [
    {
      href: "/admin",
      title: "Admin Dashboard",
      desc: "Sales, orders, reports, tables, and users.",
      Icon: BarChart3,
      iconBg: dark ? "bg-violet-500/15" : "bg-violet-50",
      iconColor: "text-violet-500",
      badge: "Management",
      badgeCls: dark ? "bg-violet-500/15 text-violet-300" : "bg-violet-100 text-violet-600",
      border: "hover:border-violet-300/60",
    },
    {
      href: "/pos",
      title: "POS Terminal",
      desc: "Create orders from products and tables in real-time.",
      Icon: Utensils,
      iconBg: dark ? "bg-cyan-500/15" : "bg-cyan-50",
      iconColor: "text-cyan-500",
      badge: "Sales",
      badgeCls: dark ? "bg-cyan-500/15 text-cyan-300" : "bg-cyan-100 text-cyan-600",
      border: "hover:border-cyan-300/60",
    },
    {
      href: "/kds",
      title: "Kitchen Display",
      desc: "Track active orders and update kitchen status.",
      Icon: ChefHat,
      iconBg: dark ? "bg-orange-500/15" : "bg-orange-50",
      iconColor: "text-orange-500",
      badge: "Kitchen",
      badgeCls: dark ? "bg-orange-500/15 text-orange-300" : "bg-orange-100 text-orange-600",
      border: "hover:border-orange-300/60",
    },
    {
      href: "/qr/table-t-12",
      title: "QR Menu Demo",
      desc: "Guest self-ordering via QR code. Try table-t-12.",
      Icon: QrCode,
      iconBg: dark ? "bg-emerald-500/15" : "bg-emerald-50",
      iconColor: "text-emerald-500",
      badge: "Guest",
      badgeCls: dark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-600",
      border: "hover:border-emerald-300/60",
    },
  ];

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="h-5 w-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <main className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${dark ? "bg-[#111827]" : "bg-slate-50"}`}>

      {/* ── Header ── */}
      <header className="relative mx-auto w-full max-w-5xl flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
            <BarChart3 size={15} className="text-white" />
          </div>
          <span className="text-sm font-black tracking-tight bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
            TheTOFU POS
          </span>
        </div>

        {/* Center X close button */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Link
            href="/login"
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors duration-200 ${
              dark
                ? "bg-white/10 text-slate-300 hover:bg-white/20"
                : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
            aria-label="Close"
          >
            ✕
          </Link>
        </div>

        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors duration-200 ${
            dark
              ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 shadow-sm"
          }`}
        >
          {dark ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} />}
          {dark ? "Light" : "Dark"}
        </button>
      </header>

      {/* ── Hero ── */}
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 flex flex-col justify-center py-8">
        <div className="mb-10 text-center">
          <p className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${dark ? "text-slate-500" : "text-slate-400"}`}>
            Select Workspace
          </p>
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 ${dark ? "text-white" : "text-slate-900"}`}>
            Choose a{" "}
            <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
              workspace
            </span>
          </h1>
          <p className={`text-sm max-w-md mx-auto leading-relaxed ${dark ? "text-slate-400" : "text-slate-500"}`}>
            Select a workspace below to manage your restaurant, process orders, or display kitchen tasks.
          </p>
        </div>

        {/* ── Cards Grid ── */}
        <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto w-full">
          {workspaces.map(({ href, title, desc, Icon, iconBg, iconColor, badge, badgeCls, border }) => (
            <Link
              key={href}
              href={href}
              className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${border} ${
                dark
                  ? "bg-white/5 border-white/8 hover:bg-white/8 hover:shadow-black/30"
                  : "bg-white border-slate-200 hover:shadow-slate-200/60"
              }`}
            >
              {/* Icon */}
              <div className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
                <Icon size={21} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className={`text-sm font-bold truncate ${dark ? "text-white" : "text-slate-800"}`}>
                    {title}
                  </h2>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badgeCls}`}>
                    {badge}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${dark ? "text-slate-400" : "text-slate-500"}`}>
                  {desc}
                </p>
                <div className={`flex items-center gap-1 pt-1 text-[11px] font-semibold ${iconColor} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                  Open
                  <ArrowRight size={11} className="translate-x-0 group-hover:translate-x-0.5 transition-transform duration-200" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="mx-auto w-full max-w-5xl px-6 py-5 text-center">
        <p className={`text-[11px] ${dark ? "text-slate-600" : "text-slate-400"}`}>
          © {new Date().getFullYear()} TheTOFU POS · All rights reserved.
        </p>
      </footer>
    </main>
  );
}

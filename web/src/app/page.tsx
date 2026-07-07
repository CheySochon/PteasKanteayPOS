"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChefHat,
  QrCode,
  Utensils,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { useAppTheme } from "../lib/theme";

export default function Home() {
  const [theme, setTheme] = useAppTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dark = theme === "dark";
  const bgClass = dark ? "bg-[#232333]" : "bg-[#f5f5f9]";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";
  const cardBg = dark ? "bg-[#2b2c40]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]/50" : "border-slate-100";

  const links = [
    {
      href: "/admin",
      title: "Admin Dashboard",
      description: "Sales, orders, reports, tables, and users.",
      Icon: BarChart3,
      accentBg: dark ? "bg-[#696cff]/15" : "bg-[#696cff]/10",
      accentText: "text-[#696cff]",
      hoverBorder: "hover:border-[#696cff]/40",
      hoverShadow: "hover:shadow-[#696cff]/8",
    },
    {
      href: "/pos",
      title: "POS",
      description: "Create orders from products and tables.",
      Icon: Utensils,
      accentBg: dark ? "bg-[#03c3ec]/15" : "bg-[#03c3ec]/10",
      accentText: "text-[#03c3ec]",
      hoverBorder: "hover:border-[#03c3ec]/40",
      hoverShadow: "hover:shadow-[#03c3ec]/8",
    },
    {
      href: "/kds",
      title: "Kitchen Display",
      description: "Track active orders and update kitchen status.",
      Icon: ChefHat,
      accentBg: dark ? "bg-[#ff9f43]/15" : "bg-[#ff9f43]/10",
      accentText: "text-[#ff9f43]",
      hoverBorder: "hover:border-[#ff9f43]/40",
      hoverShadow: "hover:shadow-[#ff9f43]/8",
    },
    {
      href: "/qr/table-t-12",
      title: "QR Demo",
      description: "Guest ordering by table token. Try table-t-12.",
      Icon: QrCode,
      accentBg: dark ? "bg-[#71dd37]/15" : "bg-[#71dd37]/10",
      accentText: "text-[#71dd37]",
      hoverBorder: "hover:border-[#71dd37]/40",
      hoverShadow: "hover:shadow-[#71dd37]/8",
    },
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f9]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#696cff] border-t-transparent" />
      </div>
    );
  }

  return (
    <main className={`min-h-screen ${bgClass} transition-colors duration-300 font-sans p-6 flex flex-col justify-between`}>
      {/* Top Header Bar */}
      <header className="mx-auto w-full max-w-5xl flex justify-between items-center py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#696cff] to-[#03c3ec] text-white shadow-md shadow-[#696cff]/20">
            <Laptop size={18} />
          </div>
          <span className={`text-sm font-black tracking-wider uppercase bg-gradient-to-r from-[#1D9E75] to-[#696cff] bg-clip-text text-transparent`}>
            TheTofu POS
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={() => setTheme(dark ? "light" : "dark")}
          className={`p-2.5 rounded-xl border transition-all duration-300 active:scale-75 ${
            dark
              ? "border-[#4e4f6e] bg-[#2b2c40] text-amber-400 hover:bg-[#232333]"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="transition-transform duration-500 ease-out transform hover:rotate-[360deg] inline-flex">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </span>
        </button>
      </header>

      {/* Main Container */}
      <div className="mx-auto w-full max-w-5xl my-auto py-12">
        <div className="mb-10 text-center sm:text-left">
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${textPrimary}`}>
            Choose a workspace
          </h1>
          <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${textSecondary}`}>
            Select one of the workspace interfaces below to begin managing table operations, order flow, or testing guest QR code ordering.
          </p>
        </div>

        {/* Grid of Workspaces */}
        <div className="grid gap-6 md:grid-cols-2">
          {links.map(({ href, title, description, Icon, accentBg, accentText, hoverBorder, hoverShadow }) => (
            <Link
              key={href}
              href={href}
              className={`group flex items-start gap-4 p-5 rounded-2xl border-2 ${cardBg} ${borderCol} ${hoverBorder} transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${
                dark ? "hover:shadow-black/20" : "hover:shadow-slate-200/50"
              }`}
            >
              {/* Icon Wrapper with Custom Accent Theme */}
              <div className={`shrink-0 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${accentBg} ${accentText} group-hover:scale-110`}>
                <Icon size={24} />
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h2 className={`text-base font-black transition-colors ${textPrimary} group-hover:text-[#696cff]`}>
                  {title}
                </h2>
                <p className={`text-xs leading-relaxed ${textSecondary}`}>
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="mx-auto w-full max-w-5xl py-6 text-center">
        <p className={`text-xs ${textSecondary}`}>
          &copy; {new Date().getFullYear()} TheTofu POS · All rights reserved.
        </p>
      </footer>
    </main>
  );
}

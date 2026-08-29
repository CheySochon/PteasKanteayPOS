"use client";

import { useAppLanguage, setAppLanguage } from "../../../lib/language";
import { useAppTheme } from "../../../lib/theme";
import TopBar from "../../../components/TopBar";
import { useState, useEffect } from "react";

export default function LanguagePage() {
  const language = useAppLanguage();
  const [theme] = useAppTheme();
  const dark = theme === "dark";

  // State to read local storage user info for TopBar
  const [userName, setUserName] = useState("Admin");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pos_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.name) setUserName(u.name);
      }
    } catch {}
  }, []);

  const bg = dark ? "bg-[#232333]" : "bg-[#f8faf9]";
  const cardBg = dark ? "bg-[#2b2c40] border-[#4e4f6e]" : "bg-white border-slate-200/90 shadow-xs";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";

  return (
    <main className={`flex-1 overflow-y-auto ${bg}`}>

      <div 
        className="mx-auto w-full max-w-[1400px] px-6 pt-10 pb-20 flex flex-col items-center lang-page-container"
      >
        <h1 className={`text-xl font-light text-center mb-6 ${textPrimary}`}>
          Change Language
        </h1>

        <div className={`w-full max-w-sm rounded-[24px] border p-6 ${cardBg}`}>
          <div className="space-y-2">
            <label className="text-[11px] font-light text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Select Language
            </label>
            <select
              value={language}
              onChange={(e) => {
                const nextLang = e.target.value as "en" | "km";
                setAppLanguage(nextLang);
                window.dispatchEvent(new Event("storage"));
                // Trigger a custom event to notify other layout elements
                window.dispatchEvent(new Event("pos-auth-change"));
              }}
              className={`w-full h-10 rounded-xl border px-3 text-xs font-light outline-none cursor-pointer ${
                dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-850"
              }`}
            >
              <option value="en">English</option>
              <option value="km">ខ្មែរ (Khmer)</option>
            </select>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .lang-page-container,
        .lang-page-container * {
          font-family: var(--font-brand), var(--font-geist-sans), "Inter", "Plus Jakarta Sans", sans-serif !important;
        }
      `}} />
    </main>
  );
}

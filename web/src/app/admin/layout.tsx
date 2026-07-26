"use client";

import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAppLanguage } from "../../lib/language";
import { useAppTheme } from "../../lib/theme";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, setTheme] = useAppTheme();
  const language = useAppLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const bg = theme === "dark" ? "bg-[#232333]" : "bg-[#f3f6fb]";

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

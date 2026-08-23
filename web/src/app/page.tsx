"use client";

import Link from "next/link";
import { ArrowRight, Store, BarChart3, ChefHat, QrCode } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f3f6fb] flex flex-col font-sans">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
            <Store size={15} className="text-white" />
          </div>
          <span className="text-sm font-black tracking-tight bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
            TheTOFU POS
          </span>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-violet-700 transition-colors"
        >
          Login
          <ArrowRight size={14} />
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-12">
        <div className="max-w-2xl mt-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            System Online & Ready
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
            The Modern <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">Point of Sale</span> Experience
          </h1>
          
          <p className="text-base sm:text-lg text-slate-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Manage your restaurant, process orders in real-time, and streamline your kitchen workflow all in one unified platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center"
            >
              Sign In to Workspace
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto w-full">
          {[
            { icon: BarChart3, title: "Smart Dashboard", desc: "Real-time analytics and management" },
            { icon: ChefHat, title: "Kitchen Display", desc: "Instant order syncing for chefs" },
            { icon: QrCode, title: "QR Ordering", desc: "Seamless guest self-service" }
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
                <feature.icon size={24} />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{feature.title}</h3>
              <p className="text-xs text-slate-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center mt-auto">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} TheTOFU POS • All rights reserved.
        </p>
      </footer>
    </div>
  );
}

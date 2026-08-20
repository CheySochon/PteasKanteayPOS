"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Bell,
} from "lucide-react";
import KdsOrderCard from "../../components/KdsOrderCard";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { getOrders, updateOrderStatus } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import type { Order, OrderStatus } from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";
import { useAppTheme } from "../../lib/theme";
import { useAppLanguage, setAppLanguage } from "../../lib/language";

const visibleStatuses: OrderStatus[] = ["pending", "accepted", "preparing", "ready"];

let globalAudioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    void globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

function unlockAudioOnUserAction() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
}

function playKitchenBellSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1: High Bell Note (B5 - 987.77 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(987.77, now);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 1.2);

    // Tone 2: Kitchen Chime (E6 - 1318.51 Hz - 120ms delay)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.51, now + 0.12);
    gain2.gain.setValueAtTime(0.6, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.6);
  } catch (e) {
    console.error("Kitchen audio chime error:", e);
  }
}

export default function KdsPage() {
  const [theme, setTheme] = useAppTheme();
  const language = useAppLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const dark = theme === "dark";
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [message, setMessage] = useState("");
  useAutoDismiss(message, setMessage);

  // Auto unlock AudioContext on user interaction
  useEffect(() => {
    const handleUnlock = () => {
      unlockAudioOnUserAction();
      setAudioUnlocked(true);
    };

    window.addEventListener("click", handleUnlock);
    window.addEventListener("touchstart", handleUnlock);

    return () => {
      window.removeEventListener("click", handleUnlock);
      window.removeEventListener("touchstart", handleUnlock);
    };
  }, []);

  // Live Clock Update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Fetch orders and run 3-second live auto-sync + WebSocket events
  useEffect(() => {
    let mounted = true;

    function syncOrders() {
      getOrders()
        .then((fetchedOrders) => {
          if (!mounted) return;

          setOrders((current) => {
            // Check if there are any new orders not in current state
            const currentIds = new Set(current.map((o) => o.id));
            const hasNew = fetchedOrders.some((o) => !currentIds.has(o.id));

            if (hasNew && soundEnabledRef.current) {
              playKitchenBellSound();
            }

            return fetchedOrders;
          });
        })
        .catch((err) => {
          if (mounted) setMessage(err.message);
        });
    }

    // Initial fetch
    syncOrders();

    // 3-second live auto-polling safety net
    const pollInterval = setInterval(syncOrders, 3000);

    // Socket real-time push events
    const socket = getSocket();
    if (socket) {
      if (!socket.connected) {
        socket.connect();
      }

      const handleNewOrder = (order: Order) => {
        if (soundEnabledRef.current) {
          playKitchenBellSound();
        }

        setOrders((current) => {
          const exists = current.some((entry) => entry.id === order.id);
          return exists
            ? current.map((entry) => (entry.id === order.id ? order : entry))
            : [order, ...current];
        });
      };

      const handleUpdateOrder = (order: Order) => {
        setOrders((current) => {
          const exists = current.some((entry) => entry.id === order.id);
          return exists
            ? current.map((entry) => (entry.id === order.id ? order : entry))
            : [order, ...current];
        });
      };

      socket.on("order:created", handleNewOrder);
      socket.on("order:new", handleNewOrder);
      socket.on("order:updated", handleUpdateOrder);

      return () => {
        mounted = false;
        clearInterval(pollInterval);
        socket.off("order:created", handleNewOrder);
        socket.off("order:new", handleNewOrder);
        socket.off("order:updated", handleUpdateOrder);
      };
    }

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  const activeOrders = useMemo(() => {
    let rows = orders.filter((order) => {
      const s = (order.status || "pending").toLowerCase();
      return s !== "cancelled" && s !== "served" && s !== "completed";
    });

    if (statusFilter !== "all") {
      rows = rows.filter((order) => (order.status || "pending").toLowerCase() === statusFilter);
    }

    return rows.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [orders, statusFilter]);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;

  async function changeStatus(id: number, status: OrderStatus) {
    try {
      const updated = await updateOrderStatus(id, status);
      setOrders((current) => current.map((order) => (order.id === id ? updated : order)));
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `${err.message}. Login as Admin or Staff to update KDS.`
          : "Unable to update order",
      );
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  return (
    <div className={`flex h-screen h-[100dvh] overflow-hidden font-sans ${dark ? "bg-[#232333]" : "bg-white"} ${language === "km" ? "font-khmer" : ""}`}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        theme={theme}
        setTheme={setTheme}
      />
      <div className="flex-1 overflow-y-auto flex flex-col">
        <TopBar
          title={language === "km" ? "ផ្ទះបាយ (Kitchen)" : "Kitchen Display"}
          subtitle={language === "km" ? "គ្រប់គ្រង និងតាមដានការបញ្ជាទិញក្នុងផ្ទះបាយ" : "Live kitchen order queue and preparation status"}
          language={language}
          onLanguageChange={setAppLanguage}
          notifications={[]}
          dark={dark}
        />
        <main className={`flex-1 overflow-y-auto ${dark ? "bg-[#232333]" : "bg-white"} select-none pb-12`}>
          <div className="mx-auto w-full max-w-[1720px] px-3.5 sm:px-4 pt-2.5 pb-5 animate-[menuPageIn_520ms_ease-out]">
        
        {/* Sneat KDS Header Card */}
        <div className="mb-3 sm:mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Brand & Live Clock */}
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <h1 className={`text-2xl font-normal shrink-0 ${dark ? "text-slate-100" : "text-slate-800"}`}>
                Kitchen Display System
              </h1>
              <span className={`text-xs font-semibold ${dark ? "text-slate-400" : "text-slate-500"}`}>
                {currentTime || "00:00:00 AM"}
              </span>
            </div>
          </div>

          {/* Ticket Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 sm:ml-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-[#55a060] text-white shadow-sm shadow-[#55a060]/20"
                  : dark
                  ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              All ({activeOrders.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                  : dark
                  ? "bg-[#2b2c40] border border-amber-900/50 text-amber-400 hover:bg-amber-950/30"
                  : "bg-amber-50 text-amber-600 border border-amber-200/60 hover:bg-amber-100/80"
              }`}
            >
              <Clock size={13} />
              Pending ({pendingCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("preparing")}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "preparing"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                  : dark
                  ? "bg-[#2b2c40] border border-blue-900/50 text-blue-400 hover:bg-blue-950/30"
                  : "bg-blue-50 text-blue-600 border border-blue-200/60 hover:bg-blue-100/80"
              }`}
            >
              <Flame size={13} />
              Preparing ({preparingCount})
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/50 px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400 animate-bounce">
            {message}
          </div>
        )}

        {activeOrders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
            {activeOrders.map((order) => (
              <KdsOrderCard key={order.id} order={order} onUpdate={changeStatus} />
            ))}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-[#3b3c54] bg-white dark:bg-[#2b2c40] p-12 text-center transition-all">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-100 dark:border-emerald-900/50">
              <ChefHat size={30} strokeWidth={1.8} />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              {language === "km" ? "មិនមានការបញ្ជាទិញក្នុងផ្ទះបាយទេ" : "No Active Kitchen Orders"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              {language === "km" 
                ? "នៅពេលមានការបញ្ជាទិញថ្មីពីកន្លែងលក់ (POS) វានឹងបង្ហាញនៅលើអេក្រង់នេះដោយស្វ័យប្រវត្តិ។" 
                : "New customer orders sent from POS will automatically appear here in real-time."}
            </p>
          </div>
        )}
      </div>
    </main>
      </div>
    </div>
  );
}

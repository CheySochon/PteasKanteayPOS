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

const visibleStatuses: OrderStatus[] = ["pending", "preparing"];

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
      const s = (order.status || "pending").toLowerCase() as OrderStatus;
      return visibleStatuses.includes(s);
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
          <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6 animate-[menuPageIn_520ms_ease-out]">
        
        {/* Sneat KDS Header Card */}
        <div className="mb-6 pb-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Brand & Live Clock */}
          <div className="flex items-center gap-3.5">
            <div>
              <h1 className={`text-xl font-normal shrink-0 ${dark ? "text-slate-100" : "text-slate-800"}`}>
                Kitchen Display System
              </h1>
              <p className={`text-xs font-semibold mt-0.5 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                {currentTime || "00:00:00 AM"}
              </p>
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

        {activeOrders.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border ${
            dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-200/80"
          }`}>
            <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-3.5 ${
              dark ? "bg-emerald-500/10 text-emerald-400" : "bg-[#55a060]/10 text-[#55a060]"
            }`}>
              <ChefHat size={28} />
            </div>
            <h2 className={`text-base font-bold ${dark ? "text-slate-100" : "text-slate-800"}`}>
              All Kitchen Orders Clear!
            </h2>
            <p className={`text-xs font-medium mt-1 max-w-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
              New orders submitted from POS will appear here automatically in real time.
            </p>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mt-4 border ${
              dark ? "bg-emerald-950/60 text-emerald-400 border-emerald-900/60" : "bg-emerald-50 text-[#55a060] border-emerald-200/60"
            }`}>
              <span className="h-2 w-2 rounded-full bg-[#55a060] animate-pulse" />
              Kitchen Station Active &amp; Ready
            </span>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,280px))] items-start justify-start">
            {activeOrders.map((order) => (
              <KdsOrderCard key={order.id} order={order} onUpdate={changeStatus} />
            ))}
          </div>
        )}
      </div>
    </main>
      </div>
    </div>
  );
}

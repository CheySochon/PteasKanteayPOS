"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

export default function AnimatedToast({
  message,
  onClose,
  type = "success",
  duration = 4000,
}: {
  message: string;
  title?: string;
  onClose: () => void;
  type?: "success" | "error" | "login" | "logout" | "kitchen";
  duration?: number;
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!message) return;
    setExiting(false);

    const timer = setTimeout(() => {
      setExiting(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration]);

  useEffect(() => {
    if (exiting) {
      const exitTimer = setTimeout(() => {
        onClose();
        setExiting(false);
      }, 280);
      return () => clearTimeout(exitTimer);
    }
  }, [exiting, onClose]);

  if (!message) return null;

  const isError = type === "error";

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto flex items-center gap-3 py-2.5 px-4.5 rounded-2xl bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-lg shadow-slate-200/40 border border-slate-100/90 dark:border-slate-800 transition-all duration-300 ${
        exiting
          ? "animate-[liftToTop_280ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
          : "animate-[dropFromTop_350ms_cubic-bezier(0.16,1,0.3,1)]"
      }`}
    >
      <div
        className={`h-5 w-5 rounded-full flex items-center justify-center text-white shrink-0 ${
          isError ? "bg-rose-500" : "bg-[#48cf38]"
        }`}
      >
        {isError ? (
          <X size={11} strokeWidth={4.5} className="text-white" />
        ) : (
          <Check size={11} strokeWidth={4.5} className="text-white" />
        )}
      </div>

      <span className="whitespace-nowrap">{message}</span>

      <button
        type="button"
        onClick={() => setExiting(true)}
        className="ml-1 rounded-lg p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
        aria-label="Close notification"
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

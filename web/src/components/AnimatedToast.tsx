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
  onClose: () => void;
  type?: "success" | "error";
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

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 py-2.5 px-4.5 rounded-xl bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-[13px] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-100/80 dark:border-slate-850 transition-all duration-300 ${
        exiting
          ? "animate-[liftToTop_280ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
          : "animate-[dropFromTop_350ms_cubic-bezier(0.16,1,0.3,1)]"
      }`}
    >
      <div
        className={`h-5 w-5 rounded-full flex items-center justify-center text-white shrink-0 ${
          type === "success" ? "bg-[#48cf38]" : "bg-rose-500"
        }`}
      >
        {type === "success" ? (
          <Check size={11} strokeWidth={4.5} className="text-white" />
        ) : (
          <X size={11} strokeWidth={4.5} className="text-white" />
        )}
      </div>
      <span>{message}</span>
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

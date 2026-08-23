"use client";

import { Dispatch, SetStateAction, useEffect } from "react";

export function useAutoDismiss(
  value: string,
  setValue: Dispatch<SetStateAction<string>>,
  delay = 5000,
) {
  useEffect(() => {
    if (!value) return;

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pos-show-toast", { detail: value }));
    }

    const timer = window.setTimeout(() => {
      setValue("");
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, setValue, value]);
}

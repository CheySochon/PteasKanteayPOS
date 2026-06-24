"use client";

import { Dispatch, SetStateAction, useEffect } from "react";

export function useAutoDismiss(
  value: string,
  setValue: Dispatch<SetStateAction<string>>,
  delay = 5000,
) {
  useEffect(() => {
    if (!value) return;

    const timer = window.setTimeout(() => {
      setValue("");
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, setValue, value]);
}

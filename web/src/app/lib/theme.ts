"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "pos_theme";
const THEME_CHANGE_EVENT = "pos-theme-change";

function normalizeTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return normalizeTheme(localStorage.getItem(THEME_KEY));
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setStoredTheme(value: SetStateAction<Theme>) {
  const next = typeof value === "function" ? value(getStoredTheme()) : value;
  const theme = normalizeTheme(next);

  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

export function useAppTheme(): [Theme, Dispatch<SetStateAction<Theme>>] {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    function syncTheme() {
      setThemeState(getStoredTheme());
    }

    window.addEventListener("storage", syncTheme);
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
    };
  }, []);

  return [theme, setStoredTheme];
}

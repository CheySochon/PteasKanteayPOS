"use client";

import { useSyncExternalStore } from "react";

export type Language = "en" | "km";

export function setAppLanguage(language: Language) {
  localStorage.setItem("pos_language", language);
  window.dispatchEvent(new Event("pos-language-change"));
}

export function useAppLanguage(): Language {
  return useSyncExternalStore(
    subscribeToLanguageChanges,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );
}

function subscribeToLanguageChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-language-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-language-change", onStoreChange);
  };
}

function getLanguageSnapshot(): Language {
  return localStorage.getItem("pos_language") === "km" ? "km" : "en";
}

function getServerLanguageSnapshot(): Language {
  return "en";
}

export function resolveCategoryName(category?: { name: string; nameKm?: string | null } | null, language: Language = "en"): string {
  if (!category) return "";
  if (language === "km" && category.nameKm && category.nameKm.trim()) {
    return category.nameKm.trim();
  }
  return category.name || category.nameKm || "";
}

export function resolveProductName(product?: { name: string; nameKm?: string | null } | null, language: Language = "en"): string {
  if (!product) return "";
  if (language === "km" && product.nameKm && product.nameKm.trim()) {
    return product.nameKm.trim();
  }
  return product.name || product.nameKm || "";
}

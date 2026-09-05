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
  if (language === "km") {
    if (category.nameKm && category.nameKm.trim()) {
      return category.nameKm.trim();
    }
    const lower = (category.name || "").trim().toLowerCase();
    if (lower === "drink" || lower === "drinks" || lower === "beverage" || lower === "beverages") return "ភេសជ្ជៈ";
    if (lower === "food" || lower === "foods") return "ម្ហូបអាហារ";
    if (lower === "rice") return "បាយ";
    if (lower === "soup") return "ស៊ុប";
    if (lower === "dessert" || lower === "desserts") return "បង្អែម";
    if (lower === "inventory") return "ស្តុក";
    if (lower === "uncategorized") return "គ្មានប្រភេទ";
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

export function resolveProductDescription(
  product?: { description?: string | null; descriptionKm?: string | null } | null,
  language: Language = "en"
): string {
  if (!product) return "";
  if (language === "km" && product.descriptionKm && product.descriptionKm.trim()) {
    return product.descriptionKm.trim();
  }
  return product.description || product.descriptionKm || "";
}

export function resolveCategoryDescription(
  category?: { description?: string | null; descriptionKm?: string | null } | null,
  language: Language = "en"
): string {
  if (!category) return "";
  if (language === "km" && category.descriptionKm && category.descriptionKm.trim()) {
    return category.descriptionKm.trim();
  }
  return category.description || category.descriptionKm || "";
}

export function getProductCategoryBadgeName(
  product?: { name?: string; categoryId?: number | string; category?: { id?: number | string; name: string; nameKm?: string | null } | null } | null,
  categories: Array<{ id: number | string; name: string; nameKm?: string | null }> = [],
  language: Language = "en"
): string {
  if (!product) return "";

  let name = resolveCategoryName(product.category, language);

  if (!name || name.trim().toLowerCase() === "inventory" || name.trim() === "ស្តុក" || name.trim().toLowerCase() === "uncategorized") {
    if (product.categoryId && categories && categories.length > 0) {
      const foundCat = categories.find((c) => String(c.id) === String(product.categoryId));
      if (foundCat) {
        const resolvedFromCat = resolveCategoryName(foundCat, language);
        if (resolvedFromCat && resolvedFromCat.trim().toLowerCase() !== "inventory" && resolvedFromCat.trim() !== "ស្តុក") {
          name = resolvedFromCat;
        }
      }
    }
  }

  if (!name || name.trim().toLowerCase() === "inventory" || name.trim() === "ស្តុក" || name.trim().toLowerCase() === "uncategorized") {
    const prodNameLower = (product.name || "").toLowerCase();
    const isBeverage = [
      "coca", "cola", "sprite", "fanta", "pepsi", "water", "evian", "evlan",
      "drink", "beverage", "juice", "coffee", "tea", "frappe", "smoothie",
      "beer", "wine", "milk", "soda", "latte", "cappuccino", "espresso"
    ].some((kw) => prodNameLower.includes(kw));

    if (isBeverage) {
      const drinkCat = categories.find((c) =>
        (c.name && (c.name.toLowerCase().includes("drink") || c.name.toLowerCase().includes("beverage"))) ||
        (c.nameKm && (c.nameKm.includes("ភេសជ្ជៈ") || c.nameKm.includes("គ្រឿងផឹក")))
      );
      if (drinkCat) {
        name = resolveCategoryName(drinkCat, language);
      } else {
        name = language === "km" ? "ភេសជ្ជៈ" : "Drink";
      }
    }
  }

  return name;
}



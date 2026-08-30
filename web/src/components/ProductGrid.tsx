"use client";

import { ImageIcon } from "lucide-react";
import type { Product } from "../lib/types";
import { apiOrigin } from "../lib/api";

import { resolveCategoryName, resolveProductName, useAppLanguage } from "../lib/language";

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${apiOrigin}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

export default function ProductGrid({
  products,
  onAdd,
}: {
  products: Product[];
  onAdd: (product: Product) => void;
}) {
  const appLanguage = useAppLanguage();

  if (products.length === 0) {
    return <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No products available</div>;
  }

  return (
    <div className="grid h-fit content-start items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const imageUrl = resolveImageUrl(product.imageUrl);
        const displayName = resolveProductName(product, appLanguage);
        const displayCategory = resolveCategoryName(product.category, appLanguage) || "Uncategorized";

        const isOutOfStock = product.trackStock && Number(product.inventory?.quantity ?? 0) <= 0;
        const isDisabled = !product.isAvailable || isOutOfStock;

        return (
          <button
            key={product.id}
            onClick={() => onAdd(product)}
            disabled={isDisabled}
            className="group overflow-hidden rounded-lg border border-gray-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1D9E75] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 relative"
          >
            {isOutOfStock && (
              <div className="absolute top-2.5 left-2.5 z-10 rounded-md bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                Out of Stock
              </div>
            )}
            
            <div className="aspect-[5/4] overflow-hidden bg-gray-100">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={displayName}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-300">
                  <ImageIcon size={34} />
                </div>
              )}
            </div>

            <div className="p-3.5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-base font-bold leading-tight text-gray-900">{displayName}</div>
                  <div className="mt-1 truncate text-[11px] uppercase text-gray-400">{displayCategory}</div>
                </div>
                <div className="shrink-0 rounded-md bg-[#E1F5EE] px-2 py-1 text-xs font-bold text-[#0F6E56]">{money(product.basePrice)}</div>
              </div>
              <p className="line-clamp-2 min-h-[32px] text-xs leading-4 text-gray-500">{product.description || "Coffee shop item"}</p>

            </div>
          </button>
        );
      })}
    </div>
  );
}

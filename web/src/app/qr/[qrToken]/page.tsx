"use client";

import { use, useEffect, useState } from "react";
import {
  ShoppingBag,
  UtensilsCrossed,
  CheckCircle2,
  Sparkles,
  Search,
  Plus,
  Minus,
  ChefHat,
  Loader2,
  Table,
} from "lucide-react";
import { apiBaseUrl, apiOrigin } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";

type QrMenuData = {
  table: {
    id: number;
    name: string;
    capacity: number;
    zone: string;
    qrToken: string;
  };
  restaurant: {
    name: string;
    logoUrl?: string;
  };
  categories: {
    id: number;
    name: string;
    description?: string;
  }[];
  products: {
    id: number;
    name: string;
    basePrice: number;
    description?: string;
    imageUrl?: string;
    categoryId: number;
    isAvailable: boolean;
  }[];
};

type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
};

export default function TableQrPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const resolvedParams = use(params);
  const qrToken = resolvedParams.qrToken;

  const [menuData, setMenuData] = useState<QrMenuData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [orderNote, setOrderNote] = useState("");

  useEffect(() => {
    // Pre-connect socket for instant order emission
    const socket = getSocket();
    if (socket && !socket.connected) {
      socket.connect();
    }

    let mounted = true;

    async function fetchMenu() {
      try {
        const res = await fetch(`${apiBaseUrl}/tables/${encodeURIComponent(qrToken)}/menu`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load table menu");
        }

        if (mounted) {
          setMenuData(json.data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load menu for this table.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMenu();
  }, [qrToken]);

  function addToCart(product: QrMenuData["products"][0]) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.basePrice),
          quantity: 1,
        },
      ];
    });
  }

  function removeFromCart(productId: number) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing) return current;
      if (existing.quantity <= 1) {
        return current.filter((item) => item.productId !== productId);
      }
      return current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  }

  function getQuantity(productId: number) {
    return cart.find((item) => item.productId === productId)?.quantity || 0;
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function submitOrder() {
    if (cart.length === 0 || !menuData) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${apiBaseUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: menuData.table?.id,
          tableNo: menuData.table?.name,
          orderType: "dine-in",
          notes: orderNote,
          items: cart.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: totalPrice,
          tax: 0,
          discount: 0,
          totalAmount: totalPrice,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit order");
      }

      const socket = getSocket();
      if (socket) {
        if (socket.connected) {
          socket.emit("order:new", json.data);
        } else {
          socket.once("connect", () => {
            socket.emit("order:new", json.data);
          });
          socket.connect();
        }
      }

      setCart([]);
      setOrderNote("");
      setIsReviewOpen(false);
      setOrderSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place order.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-[#696cff]" />
          <p className="text-sm font-semibold text-slate-500">Loading Table Menu...</p>
        </div>
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500 mb-4 shadow-sm">
          <UtensilsCrossed size={32} />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Menu Unavailable</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">{error || "Invalid or inactive Table QR code."}</p>
      </div>
    );
  }

  const productsList = menuData.products || [];
  const categoriesList = menuData.categories || [];

  const filteredProducts = productsList.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800 pb-36 select-none">
      {/* Top Sneat Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#696cff]/10 text-[#696cff] shadow-sm">
                <ChefHat size={26} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#2c3e50] leading-tight">
                  {menuData.restaurant?.name || "Restaurant Menu"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#696cff]/10 px-3 py-0.5 text-xs font-bold text-[#696cff]">
                    <Table size={13} />
                    {menuData.table?.name || "Table"}
                  </span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {menuData.table?.zone || "Dine-in"} Zone
                  </span>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes, drinks..."
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none placeholder-slate-400 focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 transition-all"
              />
            </div>
          </div>

          {/* Category Filter Tabs (Sneat UI Style) */}
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                selectedCategory === "all"
                  ? "bg-[#696cff] text-white shadow-sm shadow-[#696cff]/20"
                  : "bg-slate-100/70 text-[#8592a3] hover:text-[#696cff] hover:bg-slate-200/50"
              }`}
            >
              All Items ({productsList.length})
            </button>
            {categoriesList.map((cat) => {
              const count = productsList.filter((p) => p.categoryId === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    selectedCategory === cat.id
                      ? "bg-[#696cff] text-white shadow-sm shadow-[#696cff]/20"
                      : "bg-slate-100/70 text-[#8592a3] hover:text-[#696cff] hover:bg-slate-200/50"
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-[userModalBackdrop_180ms_ease-out]">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl animate-[userModalIn_220ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Order Sent to Kitchen!</h2>
            <p className="mt-1.5 text-xs font-medium text-slate-500 leading-relaxed">
              Your order for <strong>{menuData.table?.name}</strong> has been received by our kitchen staff.
            </p>
            <button
              type="button"
              onClick={() => setOrderSuccess(false)}
              className="mt-5 w-full rounded-xl bg-[#696cff] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#696cff]/25 hover:bg-[#5f61e6] active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <UtensilsCrossed size={44} className="mx-auto mb-3 opacity-40 text-[#696cff]" />
            <p className="text-base font-bold text-slate-700">No dishes found</p>
            <p className="text-xs text-slate-400 mt-1">Try selecting a different category or search term.</p>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const qty = getQuantity(product.id);
              const img = product.imageUrl
                ? product.imageUrl.startsWith("http")
                  ? product.imageUrl
                  : `${apiOrigin}${product.imageUrl}`
                : null;

              return (
                <article
                  key={product.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4 border border-slate-100 hover:border-[#696cff]/50 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(105,108,255,0.06)] hover:-translate-y-0.5"
                >
                  <div>
                    {/* Food Photo Container */}
                    <div className="relative aspect-[1.3] sm:aspect-[1.2] w-full overflow-hidden rounded-lg sm:rounded-xl bg-white border border-slate-100/50 flex items-center justify-center p-1.5">
                      {img ? (
                        <img
                          src={img}
                          alt={product.name}
                          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-103"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <UtensilsCrossed size={20} className="sm:size-[28px]" />
                        </div>
                      )}
                    </div>

                    {/* Product Name & Description */}
                    <div className="mt-2.5">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-[#696cff] transition-colors">
                        {product.name}
                      </h3>
                      <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 leading-normal line-clamp-1 sm:line-clamp-2 min-h-[1.2rem] sm:min-h-[2rem]">
                        {product.description || "Freshly prepared dish"}
                      </p>
                    </div>
                  </div>

                  {/* Price & Cart Add Button */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100/70 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-slate-800">
                      ${Number(product.basePrice).toFixed(2)}
                    </span>

                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        className="inline-flex h-7 sm:h-8 items-center gap-0.5 rounded-lg sm:rounded-xl bg-[#696cff]/8 text-[10px] sm:text-xs font-black text-[#696cff] hover:bg-[#696cff] hover:text-white transition-all px-2 sm:px-3"
                      >
                        <Plus size={11} className="sm:size-[13px]" />
                        Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-0.5 rounded-lg sm:rounded-xl bg-slate-100/70 p-0.5 border border-slate-200/40">
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="flex h-6 sm:h-7 w-6 sm:w-7 items-center justify-center rounded bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
                        >
                          <Minus size={9} className="sm:size-[11px]" />
                        </button>
                        <span className="text-[10px] sm:text-xs font-extrabold text-slate-700 px-1 sm:px-2">{qty}</span>
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="flex h-6 sm:h-7 w-6 sm:w-7 items-center justify-center rounded bg-[#696cff] text-white shadow-sm hover:bg-[#5f61e6] transition-all"
                        >
                          <Plus size={9} className="sm:size-[11px]" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <button
            type="button"
            disabled={submitting}
            onClick={() => setIsReviewOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-[#696cff] px-6 py-4 text-white shadow-2xl shadow-[#696cff]/40 hover:bg-[#5f61e6] active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-black">
                {totalItems}
              </span>
              <span className="text-base font-bold">Send Order to Kitchen</span>
            </div>
            <span className="text-lg font-extrabold">${totalPrice.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Review Order Drawer / Modal */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          {/* Overlay click to close */}
          <div className="absolute inset-0" onClick={() => setIsReviewOpen(false)}></div>
          
          <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-250 sm:rounded-2xl z-10">
            {/* Grabber bar for mobile aesthetic */}
            <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-slate-200 sm:hidden"></div>

            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-800">Review Your Order</h3>
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200"
              >
                Add More
              </button>
            </div>

            {/* List of Cart Items */}
            <div className="max-h-48 overflow-y-auto space-y-3.5 mb-5 pr-1.5 no-scrollbar">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{item.name}</div>
                    <div className="text-xs font-semibold text-slate-400">
                      ${item.price.toFixed(2)} x {item.quantity}
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-slate-700">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Kitchen Note Input Field */}
            <div className="mb-6">
              <label htmlFor="order-note" className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Add note for kitchen (optional)
              </label>
              <textarea
                id="order-note"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="e.g., No spicy, less sweet, no onions..."
                rows={2}
                maxLength={500}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-medium outline-none placeholder-slate-400 focus:border-[#696cff] focus:bg-white transition-all resize-none text-slate-800"
              />
            </div>

            {/* Submit Actions */}
            <button
              type="button"
              disabled={submitting}
              onClick={submitOrder}
              className="flex w-full items-center justify-between rounded-2xl bg-[#696cff] px-6 py-4 text-white shadow-xl shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-98 transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-black">
                    {totalItems}
                  </span>
                )}
                <span className="text-sm font-bold">
                  {submitting ? "Sending..." : "Send Order to Kitchen"}
                </span>
              </div>
              <span className="text-base font-extrabold">${totalPrice.toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

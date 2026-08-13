"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import {
  Utensils,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Minus,
  ChefHat,
  Loader2,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { apiBaseUrl, apiOrigin } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";

const PRIMARY = "#0F522B";
const PRIMARY_LIGHT = "#E8F5ED";
const PROMO_COLOR = "#D32F2F";
const RIEL_RATE = 4100;

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
  imageUrl?: string;
};

type PageTab = "menu" | "order" | "confirmation" | "tracking";

const formatPrice = (usd: number, locale: "EN" | "KH") => {
  if (locale === "KH") {
    return `${Math.round(usd * RIEL_RATE).toLocaleString()}៛`;
  }
  return `$${usd.toFixed(2)}`;
};

const formatDualTotal = (usd: number) => {
  const khr = Math.round(usd * RIEL_RATE);
  return `$${usd.toFixed(2)} / ${khr.toLocaleString()}៛`;
};

function resolveImageUrl(value?: string | null) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:")) {
    return value;
  }
  return `${apiOrigin}${value}`;
}

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
  const [error, setError] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [logoUrlState, setLogoUrlState] = useState<string>("");

  // Navigation & Language States matching my-app
  const [locale, setLocale] = useState<"EN" | "KH">("KH");
  const [activePage, setActivePage] = useState<PageTab>("menu");
  const [highestAllowedPage, setHighestAllowedPage] = useState<PageTab>("menu");
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  useEffect(() => {
    if (menuData?.restaurant?.logoUrl) {
      setLogoUrlState(menuData.restaurant.logoUrl);
    } else {
      const savedImage = typeof window !== "undefined" ? localStorage.getItem("pos_restaurant_image_url") : null;
      if (savedImage) setLogoUrlState(savedImage);
    }
  }, [menuData]);

  useEffect(() => {
    let mounted = true;

    async function fetchMenu() {
      try {
        const res = await fetch(`${apiBaseUrl}/tables/${encodeURIComponent(qrToken)}/menu`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load table menu");
        if (mounted) setMenuData(json.data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Unable to load menu for this table.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function fetchActiveOrders() {
      try {
        const res = await fetch(`${apiBaseUrl}/orders/qr/${encodeURIComponent(qrToken)}`);
        const json = await res.json();
        if (res.ok && json.success && mounted) {
          const fetchedOrders = json.data || [];
          setActiveOrders(fetchedOrders);
          if (fetchedOrders.length > 0) {
            setHighestAllowedPage("tracking");
          }
        }
      } catch (err) {
        console.error("Failed to fetch active orders", err);
      }
    }

    fetchMenu();
    fetchActiveOrders();

    const socket = getSocket();
    if (socket) {
      if (!socket.connected) socket.connect();
      socket.on("order:created", fetchActiveOrders);
      socket.on("order:updated", fetchActiveOrders);
    }

    return () => {
      mounted = false;
      if (socket) {
        socket.off("order:created", fetchActiveOrders);
        socket.off("order:updated", fetchActiveOrders);
      }
    };
  }, [qrToken]);

  function addToCart(product: QrMenuData["products"][0]) {
    if (orderConfirmed) return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      let updated: CartItem[];
      if (existing) {
        updated = current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updated = [
          ...current,
          {
            productId: product.id,
            name: product.name,
            price: Number(product.basePrice),
            quantity: 1,
            imageUrl: product.imageUrl,
          },
        ];
      }

      const totalCount = updated.reduce((sum, i) => sum + i.quantity, 0);
      if (totalCount > 0 && !orderConfirmed) {
        setHighestAllowedPage("order");
      }
      return updated;
    });
  }

  function removeFromCart(productId: number) {
    if (orderConfirmed) return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing) return current;
      let updated: CartItem[];
      if (existing.quantity <= 1) {
        updated = current.filter((item) => item.productId !== productId);
      } else {
        updated = current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }

      const totalCount = updated.reduce((sum, i) => sum + i.quantity, 0);
      if (totalCount > 0 && !orderConfirmed) {
        setHighestAllowedPage("order");
      } else if (!orderConfirmed) {
        setHighestAllowedPage("menu");
      }
      return updated;
    });
  }

  function getQuantity(productId: number) {
    return cart.find((item) => item.productId === productId)?.quantity || 0;
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const filteredProducts = (menuData?.products || []).filter((product) => {
    const matchesCategory =
      selectedCategory === "all" || product.categoryId === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description &&
        product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch && product.isAvailable;
  });

  const isPageAccessible = (targetPage: PageTab): boolean => {
    const sequence: PageTab[] = ["menu", "order", "confirmation", "tracking"];
    return sequence.indexOf(targetPage) <= sequence.indexOf(highestAllowedPage);
  };

  const navigateToPage = (page: PageTab) => {
    if (isPageAccessible(page)) {
      setActivePage(page);
    }
  };

  const proceedToConfirmation = () => {
    setHighestAllowedPage("confirmation");
    setActivePage("confirmation");
  };

  async function handleConfirmOrder() {
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

      setOrderConfirmed(true);
      setCart([]);
      setHighestAllowedPage("tracking");
      setActivePage("tracking");

      // Refetch active orders for table
      try {
        const resOrders = await fetch(`${apiBaseUrl}/orders/qr/${encodeURIComponent(qrToken)}`);
        const jsonOrders = await resOrders.json();
        if (resOrders.ok && jsonOrders.success) {
          setActiveOrders(jsonOrders.data || []);
        }
      } catch (e) {
        console.error("Failed to refresh orders", e);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place order.");
    } finally {
      setSubmitting(false);
    }
  }

  const t = (en: string, kh: string) => (locale === "EN" ? en : kh);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] px-4 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-[#0F522B]" />
          <p className="text-sm font-bold text-slate-600">Loading Table Menu...</p>
        </div>
      </div>
    );
  }

  if (error && !menuData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] px-4 text-center font-sans">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500 mb-4 shadow-sm">
          <UtensilsCrossed size={32} />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Menu Unavailable</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-xs">{error}</p>
      </div>
    );
  }

  const restaurantName = menuData?.restaurant?.name || "ភោជនីយដ្ឋាន ផ្ទះកន្ធាយ ផ្លូវ៦០";
  const tableName = menuData?.table?.name || "Table";
  const isReadOnly = orderConfirmed;
  const finalLogoUrl = menuData?.restaurant?.logoUrl || logoUrlState || "";

  return (
    <div className="mx-auto max-w-[430px] min-h-screen bg-[#FAF9F6] pb-36 font-sans text-slate-800 relative selection:bg-emerald-100">
      
      {/* ── HEADER MOCKUP matching my-app ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#0F522B] ring-1 ring-[#0F522B]/20">
            {finalLogoUrl ? (
              <img
                src={resolveImageUrl(finalLogoUrl)}
                alt={restaurantName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white">
                <Utensils size={20} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="font-khmer truncate text-sm font-bold text-slate-900 leading-snug">
              {restaurantName}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-[#0F522B]">
              Table {tableName} • Active
            </div>
          </div>
        </div>

        {/* Language Switcher Pill */}
        <div className="relative flex h-8 w-20 shrink-0 rounded-full bg-[#F2F2F7] p-0.5">
          <div
            className={`absolute top-0.5 bottom-0.5 w-9 rounded-full bg-[#7ace7a] transition-all duration-300 ease-out z-0 ${
              locale === "EN" ? "left-0.5" : "left-[39px]"
            }`}
          />
          <button
            type="button"
            onClick={() => setLocale("EN")}
            className={`relative z-10 flex-1 text-[11px] font-extrabold transition-colors ${
              locale === "EN" ? "text-[#0F522B]" : "text-slate-400"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale("KH")}
            className={`relative z-10 flex-1 text-[11px] font-extrabold transition-colors ${
              locale === "KH" ? "text-[#0F522B]" : "text-slate-400"
            }`}
          >
            KH
          </button>
        </div>
      </header>

      {/* ERROR ALERT TOAST */}
      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
          {error}
        </div>
      )}

      {/* ── MENU PAGE TAB ── */}
      {activePage === "menu" && (
        <div>
          {/* Search Bar */}
          <div className="p-4 pb-3">
            <div className="relative flex items-center">
              <Search className="absolute left-4 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("Search for flavors...", "ស្វែងរកមុខម្ហូប...")}
                className="font-khmer w-full rounded-2xl border border-transparent bg-[#F2F2F7] py-3 pl-11 pr-4 text-xs font-semibold outline-none placeholder:text-slate-400/80 focus:bg-white focus:border-[#0F522B]/30 focus:ring-4 focus:ring-[#0F522B]/5 transition-all text-slate-900 duration-200"
              />
            </div>
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 rounded-xl px-5 py-2.5 text-xs font-bold font-khmer transition-all ${
                selectedCategory === "all"
                  ? "bg-[#0F522B] text-white shadow-sm"
                  : "bg-[#ECECED] text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t("All Menu", "ម៉ឺនុយទាំងអស់")}
            </button>
            {(menuData?.categories || []).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-xl px-5 py-2.5 text-xs font-bold font-khmer transition-all ${
                  selectedCategory === cat.id
                    ? "bg-[#0F522B] text-white shadow-sm"
                    : "bg-[#ECECED] text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Curated Menu Header */}
          <div className="flex items-center justify-between px-4 pb-3">
            <h3 className="font-khmer text-base font-bold text-slate-900 leading-snug">
              {selectedCategory === "all"
                ? t("Curated Menu", "មុខម្ហូបពិសេស")
                : menuData?.categories.find((c) => c.id === selectedCategory)?.name}
            </h3>
            <span className="font-khmer text-xs font-semibold text-slate-400">
              {filteredProducts.length} {t("items", "មុខ")}
            </span>
          </div>

          {/* 2-Column Menu Products Grid */}
          <div className="grid grid-cols-2 gap-3.5 px-4">
            {filteredProducts.map((product) => {
              const qty = getQuantity(product.id);
              const hasQty = qty > 0;
              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col rounded-2xl bg-white p-2.5 shadow-sm shadow-slate-200/50 border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Thumbnail Image Container */}
                  <div className="relative mb-2.5 aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#E8F5ED] to-[#d8ece0] flex items-center justify-center border border-[#0F522B]/5 shadow-inner">
                    {product.imageUrl ? (
                      <img
                        src={resolveImageUrl(product.imageUrl)}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-[#0F522B]/35">
                        <div className="p-2.5 rounded-full bg-white/60 shadow-xs backdrop-blur-xs flex items-center justify-center">
                          <Utensils size={24} className="stroke-[1.5]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-khmer text-xs font-bold text-slate-900 mb-1 leading-snug line-clamp-2 min-h-[32px]">
                    {product.name}
                  </h4>

                  {/* Price & Plus/Minus Quantity Pill */}
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-sm font-extrabold text-[#0F522B]">
                      {formatPrice(Number(product.basePrice), locale)}
                    </span>

                    {!hasQty ? (
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => addToCart(product)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F5ED] hover:bg-[#0F522B] hover:text-white text-[#0F522B] border border-[#0F522B]/15 hover:border-transparent active:scale-90 transition-all duration-200 shadow-sm"
                        title="Add to cart"
                      >
                        <Plus size={14} className="stroke-[2.5]" />
                      </button>
                    ) : (
                      <div className="flex items-center justify-between rounded-full bg-[#E8F5ED] border border-[#0F522B]/20 overflow-hidden h-8 w-[84px] shadow-xs transition-all duration-300">
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => removeFromCart(product.id)}
                          className="flex h-full w-8 items-center justify-center text-xs font-bold text-[#0F522B] hover:bg-[#0F522B]/10 active:scale-90 transition-all disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="text-xs font-extrabold text-[#0F522B]">
                          {qty}
                        </span>
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => addToCart(product)}
                          className="flex h-full w-8 items-center justify-center text-xs font-bold text-[#0F522B] hover:bg-[#0F522B]/10 active:scale-90 transition-all disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MY ORDER PAGE TAB ── */}
      {activePage === "order" && (
        <div className="p-4">
          <h2 className="text-xl font-bold text-slate-900">{t("Your Order", "ការបញ្ជាទិញ")}</h2>
          <p className="text-xs font-semibold text-slate-400 mb-4">Table {tableName}</p>

          {cart.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="text-5xl mb-3">🛒</div>
              <div className="text-sm font-bold text-slate-600">
                {t("Your order is empty", "មិនមានការបញ្ជាទិញ")}
              </div>
              <button
                type="button"
                onClick={() => navigateToPage("menu")}
                className="mt-4 rounded-xl bg-[#0F522B] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#0F522B]/20 hover:bg-[#0A3E20] transition-all"
              >
                {t("Browse Menu", "មើលម៉ឺនុយ")}
              </button>
            </div>
          ) : (
            <>
              {/* Cart Item Cards */}
              <div className="space-y-2.5 mb-4">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xs border border-slate-100"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#E8F5ED]">
                      {item.imageUrl ? (
                        <img
                          src={resolveImageUrl(item.imageUrl)}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#0F522B]">
                          <Utensils size={20} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="truncate text-sm font-bold text-slate-900">{item.name}</h4>
                      <div className="mt-0.5 text-xs font-extrabold text-[#0F522B]">
                        {formatPrice(item.price, locale)}
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center rounded-full bg-[#E8F5ED] border border-[#0F522B]/10 overflow-hidden">
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => removeFromCart(item.productId)}
                        className="flex h-8 w-7 items-center justify-center text-sm font-bold text-[#0F522B] hover:bg-[#0F522B]/10"
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center text-xs font-bold text-[#0F522B]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => addToCart({ id: item.productId, name: item.name, basePrice: item.price, categoryId: 0, isAvailable: true })}
                        className="flex h-8 w-7 items-center justify-center text-sm font-bold text-[#0F522B] hover:bg-[#0F522B]/10"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Order Notes */}
              <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-100 mb-4">
                <label htmlFor="order-note-field" className="block text-xs font-bold text-slate-900 mb-2">
                  {t("Order Notes", "កំណត់សម្គាល់")}
                </label>
                <textarea
                  id="order-note-field"
                  disabled={isReadOnly}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder={t("Add special requests (e.g., no spicy, less sweet...)", "បន្ថែមការស្នើសុំពិសេស (ឧ. មិនហិរ, ផ្អែមតិច...)...")}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-medium outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#0F522B] transition-all resize-none text-slate-800 disabled:bg-slate-100"
                />
              </div>

              {/* Total & Place Order Action */}
              <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-100">
                <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200">
                  <span className="text-sm font-black text-slate-900">{t("Total", "សរុប")}</span>
                  <span className="text-sm font-black text-[#0F522B]">
                    {formatDualTotal(totalPrice)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={proceedToConfirmation}
                  className="mt-3 flex w-full items-center justify-between rounded-xl bg-[#0F522B] px-5 py-3.5 text-white font-bold text-sm shadow-md shadow-[#0F522B]/20 hover:bg-[#0A3E20] active:scale-98 transition-all disabled:opacity-50"
                >
                  <span>{isReadOnly ? t("Order Locked", "ការកម្មង់ត្រូវបានចាក់សោ") : t("Place Order", "ដាក់ការបញ្ជាទិញ")}</span>
                  <span className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-black">
                    {formatDualTotal(totalPrice)}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CONFIRMATION PAGE TAB ── */}
      {activePage === "confirmation" && (
        <div className="pb-4">
          <div className="bg-[#0F522B] px-6 py-6 text-center text-white">
            <div className="text-[11px] uppercase tracking-widest font-extrabold text-white/70 mb-1">
              {t("Review your order", "ពិនិត្យការបញ្ជាទិញ")}
            </div>
            <h2 className="text-2xl font-black">Table {tableName}</h2>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-xs">
              <Clock size={15} />
              <span>{t("Est. ready in 10-15 mins", "រៀបចំរួចរាល់ក្នុងរយៈពេល 10-15 នាទី")}</span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Items Summary */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-xs border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-xs font-bold text-slate-900">{t("Order Items", "មុខម្ហូប")}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-500">
                  {cart.length} {t("items", "មុខ")}
                </span>
              </div>
              {cart.map((item, i) => (
                <div
                  key={item.productId}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < cart.length - 1 ? "border-b border-slate-50" : ""
                  }`}
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#E8F5ED]">
                    {item.imageUrl ? (
                      <img
                        src={resolveImageUrl(item.imageUrl)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#0F522B]">
                        <Utensils size={18} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-bold text-slate-900">{item.name}</div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      {formatPrice(item.price, locale)} × {item.quantity}
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-800">
                    {formatPrice(item.price * item.quantity, locale)}
                  </span>
                </div>
              ))}
            </div>

            {/* Notes if any */}
            {orderNote && (
              <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-100">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  {t("Special Notes", "កំណត់ពិសេស")}
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">{orderNote}</p>
              </div>
            )}

            {/* Bill Total */}
            <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900">{t("Total", "សរុប")}</span>
                <span className="text-base font-black text-[#0F522B]">
                  {formatDualTotal(totalPrice)}
                </span>
              </div>
            </div>

            {/* Confirmation Buttons */}
            {!orderConfirmed ? (
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmOrder}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F522B] py-3.5 text-sm font-bold text-white shadow-md shadow-[#0F522B]/20 hover:bg-[#0A3E20] active:scale-98 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <span>{t("Confirm", "បញ្ជាក់")}</span>
                      <Check size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigateToPage("order")}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <ArrowLeft size={14} />
                  <span>{t("Edit Order", "កែប្រែការបញ្ជាទិញ")}</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-[#E8F5ED] p-3.5 text-center text-xs font-extrabold text-[#0F522B]">
                ✓ {t("Sent to Kitchen", "បានផ្ញើទៅផ្ទះបាយរួចហើយ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRACKING PAGE TAB ── */}
      {activePage === "tracking" && (
        <div className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            TABLE {tableName}
          </p>
          <h2 className="text-xl font-bold text-slate-900 mb-4">{t("Track Order", "តាមដានការបញ្ជាទិញ")}</h2>

          {activeOrders.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-xs border border-slate-100">
              <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-xs font-bold text-slate-500">
                {t("No active orders found right now.", "មិនទាន់មានការបញ្ជាទិញកំពុងដំណើរការឡើយ")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => {
                const isReady = order.status === "ready" || order.status === "served";
                const isCooking = order.status === "preparing";
                const currentStepIndex = isReady ? 2 : isCooking ? 1 : 0;

                return (
                  <div key={order.id} className="rounded-2xl bg-white p-5 shadow-xs border border-slate-100">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Order #{order.orderNumber || order.id}</div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                        isReady ? "bg-emerald-100 text-emerald-700" :
                        isCooking ? "bg-[#E8F5ED] text-[#0F522B]" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Ordered Items List */}
                    <div className="space-y-1.5 mb-4">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{item.quantity}x {item.product?.name || item.name}</span>
                          <span className="font-extrabold text-[#0F522B]">{formatPrice(Number(item.price), locale)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tracking Step Timeline */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      {[
                        { key: "received", en: "Order Received", kh: "ទទួលការបញ្ជាទិញ" },
                        { key: "preparing", en: "Preparing / Cooking", kh: "កំពុងចម្អិន/រៀបចំ" },
                        { key: "ready", en: "Ready / Served", kh: "រួចរាល់/លើកជូន" },
                      ].map((step, idx) => {
                        const done = idx <= currentStepIndex;
                        const active = idx === currentStepIndex;
                        return (
                          <div key={step.key} className="flex items-center gap-3">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                              done ? "bg-[#0F522B] text-white" : "bg-slate-100 text-slate-400"
                            }`}>
                              {done ? "✓" : idx + 1}
                            </div>
                            <span className={`text-xs font-bold ${active ? "text-slate-900" : done ? "text-slate-700" : "text-slate-400"}`}>
                              {t(step.en, step.kh)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FLOATING ORDER BAR ── */}
      {totalItems > 0 && activePage === "menu" && !isReadOnly && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[398px] bg-[#0F522B] rounded-2xl p-3.5 px-5 flex items-center justify-between text-white shadow-xl shadow-[#0F522B]/30 z-30">
          <div>
            <div className="font-bold text-xs">
              {totalItems} {t("Items Selected", "មុខទំនិញ")}
            </div>
            <div className="text-[11px] opacity-90 mt-0.5">
              {t("Total", "សរុប")}: {formatDualTotal(totalPrice)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigateToPage("order")}
            className="bg-white text-[#0F522B] rounded-xl px-4 py-2 text-xs font-extrabold hover:bg-emerald-50 active:scale-95 transition-all shadow-sm"
          >
            {t("View Order →", "មើលការបញ្ជាទិញ →")}
          </button>
        </div>
      )}

      {/* ── ENFORCED BOTTOM NAVIGATION BAR matching my-app ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around py-3 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        {[
          { icon: Utensils, label: t("Menu", "ម៉ឺនុយ"), page: "menu" as PageTab },
          { icon: ShoppingBag, label: t("My Order", "ការកម្មង់"), page: "order" as PageTab },
          { icon: CheckCircle2, label: t("Confirmation", "ការបញ្ជាក់"), page: "confirmation" as PageTab },
          { icon: Clock, label: t("Tracking", "តាមដាន"), page: "tracking" as PageTab },
        ].map((nav) => {
          const isActive = nav.page === activePage;
          const allowed = isPageAccessible(nav.page);
          const Icon = nav.icon;

          return (
            <button
              key={nav.page}
              disabled={!allowed}
              type="button"
              onClick={() => navigateToPage(nav.page)}
              className={`flex flex-col items-center gap-1 transition-all active:scale-95 duration-200 ${
                allowed ? "opacity-100 cursor-pointer" : "opacity-30 cursor-not-allowed"
              }`}
            >
              <Icon
                size={20}
                className={`transition-all duration-200 ${isActive ? "text-[#0F522B] scale-105" : "text-slate-400"}`}
              />
              <span
                className={`font-khmer text-[10.5px] ${
                  isActive ? "font-bold text-[#0F522B]" : "font-semibold text-slate-400"
                }`}
              >
                {nav.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

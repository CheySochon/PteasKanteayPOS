"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChefHat,
  LayoutDashboard,
  Percent,
  Minus,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  Utensils,
  MapPin,
  Users,
  Tag,
  UsersRound,
} from "lucide-react";
import { cartItemFromProduct, type CartItem } from "../../components/CartPanel";
import {
  apiOrigin,
  createOrder,
  getCategories,
  getProducts,
  getSettings,
  getTables,
} from "../../lib/api";
import type { Category, DiningTable, Product } from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";

const SERVICE_RATE = 0.1;
const VAT_RATE = 0.12;
const DEFAULT_POS_NAME = "The Tofu";

const PROMO_CODES = [
  { code: "WELCOME10", label: "Welcome (10%)", value: 10 },
  { code: "HAPPYHOUR", label: "Happy Hour (15%)", value: 15 },
  { code: "STAFF20", label: "Staff (20%)", value: 20 },
];

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function resolveImageUrl(value?: string | null) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:")) {
    return value;
  }
  return `${apiOrigin}${value}`;
}

export default function PosPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [tableId, setTableId] = useState<number | undefined>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [ticketNumber, setTicketNumber] = useState("0000");
  const [posName, setPosName] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_POS_NAME;
    return localStorage.getItem("pos_restaurant_name") || DEFAULT_POS_NAME;
  });
  const [restaurantImageUrl, setRestaurantImageUrl] = useState("");
  const [serviceRate, setServiceRate] = useState(SERVICE_RATE);
  const [vatRate, setVatRate] = useState(VAT_RATE);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [splitCount, setSplitCount] = useState(2);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [message, setMessage] = useState("");
  useAutoDismiss(message, setMessage);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setTicketNumber(String(Date.now()).slice(-4));
    });

    Promise.all([getCategories(), getProducts(), getTables(), getSettings()])
      .then(([categoryRows, productRows, tableRows, appSettings]) => {
        setCategories(categoryRows);
        setProducts(productRows);
        setTables(tableRows.filter((table) => table.isActive));
        const nextName = appSettings.restaurantName || DEFAULT_POS_NAME;
        setPosName(nextName);
        setRestaurantImageUrl(appSettings.restaurantImageUrl || "");
        localStorage.setItem("pos_restaurant_name", nextName);
        setServiceRate(Number(appSettings.serviceChargeRate || 0) / 100);
        setVatRate(Number(appSettings.taxRate || 0) / 100);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Unable to load POS"));
  }, []);

  useEffect(() => {
    function syncPosName() {
      setPosName(localStorage.getItem("pos_restaurant_name") || DEFAULT_POS_NAME);
    }

    window.addEventListener("storage", syncPosName);
    window.addEventListener("pos-settings-change", syncPosName);

    return () => {
      window.removeEventListener("storage", syncPosName);
      window.removeEventListener("pos-settings-change", syncPosName);
    };
  }, []);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === tableId),
    [tableId, tables]
  );

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        categoryId === "all" || product.categoryId === categoryId;
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        (product.description || "").toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [categoryId, products, query]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = Math.min(subtotal, subtotal * (discountPercent / 100));
  const discountedSubtotal = Math.max(subtotal - discountAmount, 0);
  const serviceFee = discountedSubtotal * serviceRate;
  const vat = discountedSubtotal * vatRate;
  const total = discountedSubtotal + serviceFee + vat;
  const splitAmount = splitCount > 0 ? total / splitCount : total;

  function addProduct(product: Product) {
    const item = cartItemFromProduct(product);
    const key = `${item.productId}-${item.variantId || "base"}`;

    setCart((current) => {
      const exists = current.some((entry) => `${entry.productId}-${entry.variantId || "base"}` === key);
      if (!exists) return [...current, item];

      return current.map((entry) =>
        `${entry.productId}-${entry.variantId || "base"}` === key
          ? { ...entry, quantity: entry.quantity + 1 }
          : entry
      );
    });
  }

  async function checkout() {
    setLoading(true);
    setMessage("");

    try {
      const order = await createOrder({
        tableId,
        discountAmount,
        taxAmount: serviceFee + vat,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });
      setCart([]);
      setDiscountPercent(0);
      setSplitOpen(false);
      setDiscountOpen(false);
      setTicketNumber(String(Date.now()).slice(-4));
      setMessage(`Order ${order.orderNumber || order.orderId} created successfully.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to create order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f9] p-3 text-slate-700 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] max-w-[1440px] overflow-hidden rounded border border-[#e5e7eb] bg-white shadow-sm">
        
        {/* Left Side: Product Grid & Search */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[70px] items-center gap-3 border-b border-[#eceef1] px-4 sm:px-6">
            <div className="flex h-10 shrink-0 items-center gap-2 pr-2">
              {restaurantImageUrl ? (
                <img
                  src={resolveImageUrl(restaurantImageUrl)}
                  alt="POS Logo"
                  className="h-8 w-8 rounded-full object-cover border border-[#e5e7eb]"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-[#696cff] text-white">
                  <Utensils size={16} />
                </div>
              )}
              <span className="font-brand hidden max-w-[180px] truncate text-sm font-black uppercase tracking-[0.12em] text-[#566a7f] sm:block">
                {posName}
              </span>
            </div>

            {/* Live Search Bar */}
            <div className="relative max-w-[420px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a1acb8]" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search menu items..."
                className="h-10 w-full rounded border border-[#d9dee3] bg-white pl-10 pr-3 text-sm outline-none placeholder:text-[#b4bdc6] focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 transition-all duration-150"
              />
            </div>

            {/* Admin navigation shortcut link */}
            <Link
              href="/admin"
              className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded bg-[#696cff] px-4 text-xs font-semibold text-white hover:bg-[#5f61e6] active:scale-95 transition-all shadow-sm shadow-[#696cff]/20"
              title="Switch to admin dashboard"
            >
              <LayoutDashboard size={15} />
              <span className="hidden sm:inline">Admin Dashboard</span>
            </Link>

            <div className="hidden items-center gap-2 sm:flex">
              <IconButton label="Notifications">
                <div className="relative">
                  <Bell size={17} />
                  <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2 rounded-full bg-[#ff3e1d]" />
                </div>
              </IconButton>
              <IconButton label="Settings">
                <Settings size={17} />
              </IconButton>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {message && (
              <div className="mb-4 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {message}
              </div>
            )}

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#566a7f] sm:text-3xl">Terminal Menu</h1>
                <p className="mt-1 text-xs font-semibold text-[#a1acb8]">
                  {filteredProducts.length} items matching search criteria
                </p>
              </div>

              {/* Sneat Pills Category Tabs */}
              <div className="flex max-w-full gap-1.5 overflow-x-auto rounded bg-[#eceef1]/60 p-1">
                <CategoryTab active={categoryId === "all"} onClick={() => setCategoryId("all")}>
                  All Menu
                </CategoryTab>
                {categories.map((category) => (
                  <CategoryTab
                    key={category.id}
                    active={categoryId === category.id}
                    onClick={() => setCategoryId(category.id)}
                  >
                    {category.name}
                  </CategoryTab>
                ))}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded border border-dashed border-[#e5e7eb] bg-slate-50/50 p-12 text-center text-sm font-semibold text-[#8592a3]">
                <ChefHat size={32} className="mx-auto mb-3 text-slate-300" />
                No matching menu selections found.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onAdd={() => addProduct(product)} />
                ))}

                <button
                  type="button"
                  className="flex min-h-[190px] flex-col items-center justify-center rounded border border-dashed border-[#d9dee3] bg-slate-50/30 text-xs font-semibold text-[#8592a3] hover:bg-slate-50 transition-all"
                >
                  <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#d9dee3]">
                    <Plus size={16} />
                  </span>
                  Add Custom Item
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Order Ticket Checkout */}
        <aside className="hidden w-[380px] shrink-0 border-l border-[#eceef1] bg-white lg:flex lg:flex-col">
          <div className="flex h-[70px] items-center justify-between border-b border-[#eceef1] px-6">
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setDiscountPercent(0);
                setSplitOpen(false);
                setDiscountOpen(false);
                setTicketNumber(String(Date.now()).slice(-4));
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded bg-[#696cff] px-4 text-xs font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all"
            >
              <Plus size={14} />
              New Order
            </button>
            <button
              type="button"
              onClick={() => setCart([])}
              className="flex h-9 w-9 items-center justify-center rounded text-[#8592a3] hover:bg-red-50 hover:text-[#ff3e1d] transition-all"
              title="Clear current cart"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-[#566a7f]">Order Ticket</h2>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#a1acb8]">
                <MapPin size={11} className="text-[#a1acb8]" />
                <span>{selectedTable ? `${selectedTable.name} (${selectedTable.zone})` : "Walk-in / Takeaway"}</span>
              </div>
              
              {/* Tables Selection Dropdown */}
              <select
                value={tableId || ""}
                onChange={(event) => setTableId(event.target.value ? Number(event.target.value) : undefined)}
                className="mt-3 h-10 w-full rounded border border-[#d9dee3] bg-white px-3 text-sm font-semibold text-[#566a7f] outline-none focus:border-[#696cff] transition-all"
              >
                <option value="">Walk-in / Takeaway</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} - {table.zone} ({table.capacity} Seats)
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5 flex gap-2">
              <span className="rounded bg-[#e7e7ff] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#696cff]">
                {selectedTable ? "Dine In" : "Takeaway"}
              </span>
              <span className="rounded bg-[#eceef1] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8592a3]">
                #{ticketNumber || "0000"}
              </span>
            </div>

            {/* Cart Ticket List */}
            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="rounded border border-dashed border-[#e5e7eb] bg-slate-50/50 p-8 text-center text-xs font-semibold text-[#8592a3]">
                  <ShoppingBag size={22} className="mx-auto mb-2 text-slate-300" />
                  Select menu items to populate order ticket.
                </div>
              ) : (
                cart.map((item, index) => {
                  const product = productMap.get(item.productId);
                  return (
                    <TicketItem
                      key={`${item.productId}-${item.variantId || "base"}`}
                      item={item}
                      imageUrl={resolveImageUrl(product?.imageUrl)}
                      onIncrement={() =>
                        setCart((current) =>
                          current.map((entry, i) =>
                            i === index ? { ...entry, quantity: entry.quantity + 1 } : entry
                          )
                        )
                      }
                      onDecrement={() =>
                        setCart((current) =>
                          current.flatMap((entry, i) =>
                            i === index
                              ? entry.quantity <= 1
                                ? []
                                : [{ ...entry, quantity: entry.quantity - 1 }]
                              : [entry]
                          )
                        )
                      }
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Checkout Totals Summary Section */}
          <div className="border-t border-[#eceef1] px-6 py-5 bg-[#f5f5f9]/40">
            <SummaryRow label="Subtotal" value={money(subtotal)} />
            <SummaryRow
              label={`Split (${splitCount} guests)`}
              value={splitOpen ? `${money(splitAmount)} each` : "Off"}
            />
            <SummaryRow
              label={`Discount (${discountPercent}%)`}
              value={discountAmount > 0 ? `-${money(discountAmount)}` : money(0)}
            />

            {/* Expanding Custom Boxes (Split/Discount) */}
            {(splitOpen || discountOpen) && (
              <div className="my-4 space-y-3.5 rounded border border-[#e5e7eb] bg-white p-3.5 shadow-sm">
                {splitOpen && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#a1acb8]">Split Bill</span>
                      <span className="text-sm font-bold text-[#696cff]">{money(splitAmount)} each</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSplitCount((value) => Math.max(2, value - 1))}
                        className="flex h-9 w-9 items-center justify-center rounded border border-[#d9dee3] bg-white text-[#8592a3] hover:text-[#696cff] hover:bg-[#f5f5f9] transition-all"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min={2}
                        value={splitCount}
                        onChange={(event) => setSplitCount(Math.max(2, Number(event.target.value || 2)))}
                        className="h-9 min-w-0 flex-1 rounded border border-[#d9dee3] bg-white text-center text-sm font-bold outline-none focus:border-[#696cff] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setSplitCount((value) => value + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded border border-[#d9dee3] bg-white text-[#8592a3] hover:text-[#696cff] hover:bg-[#f5f5f9] transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {discountOpen && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#a1acb8]">Discount Overrides</span>
                      <span className="text-sm font-bold text-[#ff3e1d]">-{money(discountAmount)}</span>
                    </div>
                    
                    {/* Discount Input */}
                    <div className="relative mb-3">
                      <Percent className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a1acb8]" size={14} />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={discountPercent}
                        onChange={(event) =>
                          setDiscountPercent(Math.min(100, Math.max(0, Number(event.target.value || 0))))
                        }
                        className="h-10 w-full rounded border border-[#d9dee3] bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#696cff] transition-all"
                      />
                    </div>

                    {/* Dynamic Promo Presets (Showcase Idea!) */}
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#a1acb8] flex items-center gap-1.5">
                      <Tag size={11} />
                      Promo Presets
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {PROMO_CODES.map((promo) => (
                        <button
                          key={promo.code}
                          type="button"
                          onClick={() => setDiscountPercent(promo.value)}
                          className={`h-8 rounded text-[10px] font-bold tracking-wide uppercase transition-all ${
                            discountPercent === promo.value
                              ? "bg-[#696cff] text-white shadow-sm shadow-[#696cff]/20"
                              : "bg-[#f5f5f9] text-[#8592a3] border border-[#d9dee3]/60 hover:text-[#696cff]"
                          }`}
                          title={promo.code}
                        >
                          {promo.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <SummaryRow label={`Service Charge (${Math.round(serviceRate * 100)}%)`} value={money(serviceFee)} />
            <SummaryRow label={`VAT (${Math.round(vatRate * 100)}%)`} value={money(vat)} />

            <div className="mt-4 flex items-end justify-between border-t pt-3 border-[#eceef1]">
              <span className="text-sm font-bold uppercase tracking-wider text-[#8592a3]">Total Amount</span>
              <span className="text-3xl font-bold text-[#696cff]">{money(total)}</span>
            </div>

            {/* Split & Discount Buttons */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSplitOpen((value) => !value)}
                className={`h-10 rounded border text-xs font-semibold transition-all ${
                  splitOpen
                    ? "border-[#696cff]/20 bg-[#696cff]/10 text-[#696cff]"
                    : "border-[#d9dee3] text-[#8592a3] hover:bg-[#f5f5f9]"
                }`}
              >
                Split Bill
              </button>
              <button
                type="button"
                onClick={() => setDiscountOpen((value) => !value)}
                className={`h-10 rounded border text-xs font-semibold transition-all ${
                  discountOpen
                    ? "border-[#696cff]/20 bg-[#696cff]/10 text-[#696cff]"
                    : "border-[#d9dee3] text-[#8592a3] hover:bg-[#f5f5f9]"
                }`}
              >
                Discount
              </button>
            </div>

            {/* Pay Now Button */}
            <button
              onClick={checkout}
              disabled={cart.length === 0 || loading}
              className="mt-3.5 h-14 w-full rounded bg-[#696cff] text-sm font-bold text-white shadow-md shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating Order..." : "Pay Now & Print"}
            </button>
          </div>
        </aside>

        {/* Mobile bottom checkout panel */}
        <MobileTicket
          cart={cart}
          total={total}
          loading={loading}
          onCheckout={checkout}
        />
      </div>
    </main>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const imageUrl = resolveImageUrl(product.imageUrl);
  const unavailable = !product.isAvailable;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={unavailable}
      className="group overflow-hidden rounded border border-[#e5e7eb] bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 flex flex-col justify-between"
    >
      <div className="w-full aspect-[1.38] bg-slate-50 dark:bg-[#232333] relative overflow-hidden shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ChefHat size={30} />
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between w-full">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 min-w-0 text-xs font-bold leading-snug text-[#566a7f] group-hover:text-[#696cff] transition-colors">
              {product.name}
            </h3>
            <span className="shrink-0 text-xs font-bold text-[#696cff]">
              {money(product.basePrice)}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 min-h-[28px] text-[10px] font-medium leading-normal text-[#a1acb8]">
            {product.description || product.category?.name || "Fresh chef selection."}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5 border-[#f5f5f9]">
          <span className={`min-w-0 truncate rounded px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
            unavailable ? "bg-[#ffe5e5] text-[#ff3e1d]" : "bg-[#e8fadf] text-[#71dd37]"
          }`}>
            {unavailable ? "Out of stock" : product.category?.name || "Ready"}
          </span>
          
          <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-[#e7e7ff] text-[#696cff] group-hover:bg-[#696cff] group-hover:text-white transition-all">
            <Plus size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}

function TicketItem({
  item,
  imageUrl,
  onIncrement,
  onDecrement,
}: {
  item: CartItem;
  imageUrl: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex gap-3 items-center border-b pb-3 border-[#eceef1]/50 last:border-none last:pb-0">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-50 border">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ShoppingBag size={16} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xs font-bold text-[#566a7f]">{item.name}</h3>
            <p className="mt-0.5 text-[9.5px] font-semibold text-[#a1acb8]">
              {item.variantName || "Regular"} • {money(item.unitPrice)}
            </p>
          </div>
          <span className="text-xs font-bold text-[#566a7f]">
            {money(item.unitPrice * item.quantity)}
          </span>
        </div>

        {/* Quantity selectors */}
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrement}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5f5f9] text-[#8592a3] hover:bg-[#ffe5e5] hover:text-[#ff3e1d] transition-all"
          >
            <Minus size={11} />
          </button>
          <span className="w-4 text-center text-xs font-bold text-[#566a7f]">{item.quantity}</span>
          <button
            type="button"
            onClick={onIncrement}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e7e7ff] text-[#696cff] hover:bg-[#696cff] hover:text-white transition-all"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded px-4 text-xs font-bold transition-all ${
        active
          ? "bg-[#696cff] text-white shadow-sm shadow-[#696cff]/20"
          : "text-[#8592a3] hover:text-[#696cff] hover:bg-[#eceef1]/60"
      }`}
    >
      {children}
    </button>
  );
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-full text-[#8592a3] hover:bg-[#f5f5f9] hover:text-[#696cff] transition-all"
      title={label}
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
      <span className="text-[#a1acb8]">{label}</span>
      <span className="text-[#566a7f]">{value}</span>
    </div>
  );
}

function MobileTicket({
  cart,
  total,
  loading,
  onCheckout,
}: {
  cart: CartItem[];
  total: number;
  loading: boolean;
  onCheckout: () => void;
}) {
  return (
    <div className="fixed inset-x-3 bottom-3 rounded border border-[#e5e7eb] bg-white p-3 shadow-xl lg:hidden z-20">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#8592a3]">{cart.length} item(s)</span>
        <span className="text-xl font-bold text-[#696cff]">{money(total)}</span>
      </div>
      <button
        onClick={onCheckout}
        disabled={cart.length === 0 || loading}
        className="h-12 w-full rounded bg-[#696cff] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#5f61e6] active:scale-95 transition-all shadow-[#696cff]/20"
      >
        {loading ? "Creating..." : "Pay Now"}
      </button>
    </div>
  );
}

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
} from "lucide-react";
import { cartItemFromProduct, type CartItem } from "../components/CartPanel";
import {
  apiOrigin,
  createOrder,
  getCategories,
  getProducts,
  getSettings,
  getTables,
} from "../lib/api";
import type { Category, DiningTable, Product } from "../lib/types";
import { useAutoDismiss } from "../lib/useAutoDismiss";

const SERVICE_RATE = 0.1;
const VAT_RATE = 0.12;
const DEFAULT_POS_NAME = "The Tofu";

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
    <main className="min-h-screen bg-[#eef1f6] p-3 text-slate-950 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-[1440px] overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[68px] items-center gap-3 border-b border-slate-100 px-4 sm:px-6">
            <div className="flex h-10 shrink-0 items-center gap-2 pr-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Utensils size={18} />
              </div>
              <span className="font-brand hidden max-w-[180px] truncate text-sm uppercase tracking-[0.12em] text-slate-950 sm:block">
                {posName}
              </span>
            </div>

            <div className="relative max-w-[420px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search menu items..."
                className="h-10 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <Link
              href="/admin"
              className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-black text-white hover:bg-slate-800"
              title="Switch to admin"
            >
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Admin</span>
            </Link>

            <div className="hidden items-center gap-2 sm:flex">
              <IconButton label="Notifications">
                <Bell size={17} />
              </IconButton>
              <IconButton label="Settings">
                <Settings size={17} />
              </IconButton>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {message && (
              <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {message}
              </div>
            )}

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Main Course</h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {filteredProducts.length} premium selections available today
                </p>
              </div>

              <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                <CategoryTab active={categoryId === "all"} onClick={() => setCategoryId("all")}>
                  All
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
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-500">
                No menu items found
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onAdd={() => addProduct(product)} />
                ))}

                <button
                  type="button"
                  className="flex min-h-[190px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs font-black text-slate-400"
                >
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-200">
                    <Plus size={18} />
                  </span>
                  Add Custom Item
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="hidden w-[380px] shrink-0 border-l border-slate-100 bg-white lg:flex lg:flex-col">
          <div className="flex h-[68px] items-center justify-between border-b border-slate-100 px-6">
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setDiscountPercent(0);
                setSplitOpen(false);
                setDiscountOpen(false);
                setTicketNumber(String(Date.now()).slice(-4));
              }}
              className="rounded-xl bg-[#2563eb] px-4 py-2 text-xs font-black text-white shadow-sm shadow-blue-500/25"
            >
              New Order
            </button>
            <button
              type="button"
              onClick={() => setCart([])}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Clear ticket"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-5">
              <h2 className="text-lg font-black">Order Ticket</h2>
              <div className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                <span>{selectedTable ? selectedTable.name : "Walk-in"}</span>
                <span>{selectedTable ? selectedTable.zone : "takeaway"}</span>
              </div>
              <select
                value={tableId || ""}
                onChange={(event) => setTableId(event.target.value ? Number(event.target.value) : undefined)}
                className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Walk-in / takeaway</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} - {table.zone}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5 flex gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-blue-600">
                Dine In
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
                #{ticketNumber || "0000"}
              </span>
            </div>

            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">
                  Select menu items to start an order
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

          <div className="border-t border-slate-100 px-6 py-5">
            <SummaryRow label="Subtotal" value={money(subtotal)} />
            <SummaryRow
              label={`Split (${splitCount} people)`}
              value={splitOpen ? `${money(splitAmount)} each` : "Off"}
            />
            <SummaryRow
              label={`Discount (${discountPercent}%)`}
              value={discountAmount > 0 ? `-${money(discountAmount)}` : money(0)}
            />

            {(splitOpen || discountOpen) && (
              <div className="my-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {splitOpen && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-500">Split Bill</span>
                      <span className="text-sm font-black text-[#2563eb]">{money(splitAmount)} each</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSplitCount((value) => Math.max(2, value - 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min={2}
                        value={splitCount}
                        onChange={(event) => setSplitCount(Math.max(2, Number(event.target.value || 2)))}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white text-center text-sm font-black outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setSplitCount((value) => value + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {discountOpen && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-500">Discount</span>
                      <span className="text-sm font-black text-red-500">-{money(discountAmount)}</span>
                    </div>
                    <div className="relative">
                      <Percent className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={discountPercent}
                        onChange={(event) =>
                          setDiscountPercent(Math.min(100, Math.max(0, Number(event.target.value || 0))))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-black outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {[0, 5, 10, 15].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setDiscountPercent(value)}
                          className={`h-8 rounded-lg text-xs font-black ${
                            discountPercent === value
                              ? "bg-[#2563eb] text-white"
                              : "bg-white text-slate-500 ring-1 ring-slate-200"
                          }`}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <SummaryRow label={`Service Fee (${Math.round(serviceRate * 100)}%)`} value={money(serviceFee)} />
            <SummaryRow label={`VAT (${Math.round(vatRate * 100)}%)`} value={money(vat)} />

            <div className="mt-4 flex items-end justify-between">
              <span className="text-sm font-black uppercase">Total</span>
              <span className="text-3xl font-black text-[#2563eb]">{money(total)}</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSplitOpen((value) => !value)}
                className={`h-11 rounded-xl border text-sm font-black ${
                  splitOpen
                    ? "border-blue-200 bg-blue-50 text-[#2563eb]"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setDiscountOpen((value) => !value)}
                className={`h-11 rounded-xl border text-sm font-black ${
                  discountOpen
                    ? "border-blue-200 bg-blue-50 text-[#2563eb]"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Discount
              </button>
            </div>

            <button
              onClick={checkout}
              disabled={cart.length === 0 || loading}
              className="mt-3 h-14 w-full rounded-xl bg-[#2563eb] text-sm font-black text-white shadow-lg shadow-blue-500/25 hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating..." : "Pay Now"}
            </button>
          </div>
        </aside>

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
      className="group overflow-hidden rounded-lg border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="aspect-[1.38] bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
            <ChefHat size={30} />
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 min-w-0 text-sm font-black leading-tight text-slate-950">
            {product.name}
          </h3>
          <span className="shrink-0 text-xs font-black text-[#2563eb]">
            {money(product.basePrice)}
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 min-h-[32px] text-[11px] font-medium leading-4 text-slate-500">
          {product.description || product.category?.name || "Fresh menu selection."}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-600">
            {unavailable ? "Out of stock" : product.category?.name || "Ready"}
          </span>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <Plus size={15} />
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
    <div className="flex gap-3">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ShoppingBag size={18} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-slate-950">{item.name}</h3>
            <p className="mt-1 text-[10px] font-semibold text-slate-400">
              {item.variantName || "Regular"} - {money(item.unitPrice)}
            </p>
          </div>
          <span className="text-sm font-black text-slate-950">
            {money(item.unitPrice * item.quantity)}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrement}
            className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-500"
          >
            <Minus size={12} />
          </button>
          <span className="w-5 text-center text-xs font-black">{item.quantity}</span>
          <button
            type="button"
            onClick={onIncrement}
            className="flex h-5 w-5 items-center justify-center rounded bg-blue-50 text-blue-600"
          >
            <Plus size={12} />
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
      className={`h-9 shrink-0 rounded-lg px-4 text-xs font-black transition ${
        active ? "bg-white text-[#2563eb] shadow-sm" : "text-slate-500 hover:text-slate-900"
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
      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900"
      title={label}
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between text-xs font-bold">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-950">{value}</span>
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
    <div className="fixed inset-x-3 bottom-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xl lg:hidden">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-black">{cart.length} item(s)</span>
        <span className="text-xl font-black text-[#2563eb]">{money(total)}</span>
      </div>
      <button
        onClick={onCheckout}
        disabled={cart.length === 0 || loading}
        className="h-12 w-full rounded-xl bg-[#2563eb] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating..." : "Pay Now"}
      </button>
    </div>
  );
}

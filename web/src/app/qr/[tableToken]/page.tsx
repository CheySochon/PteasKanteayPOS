"use client";

import { use, useEffect, useMemo, useState } from "react";
import ProductGrid from "../../components/ProductGrid";
import CartPanel, { cartItemFromProduct, type CartItem } from "../../components/CartPanel";
import { createOrder, getQrMenu } from "../../lib/api";
import type { Category, DiningTable, Product } from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";

export default function QrOrderPage({ params }: { params: Promise<{ tableToken: string }> }) {
  const { tableToken } = use(params);
  const [table, setTable] = useState<DiningTable | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState("");
  useAutoDismiss(message, setMessage);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    getQrMenu(tableToken)
      .then((data) => {
        setTable(data.table);
        setCategories(data.categories);
        setProducts(data.products);
      })
      .catch((err) => setMessage(err.message));
  }, [tableToken]);

  const filteredProducts = useMemo(() => (
    categoryId === "all" ? products : products.filter((product) => product.categoryId === categoryId)
  ), [products, categoryId]);

  async function checkout() {
    if (!table) return;
    setLoading(true);
    setMessage("");
    try {
      const order = await createOrder({
        tableId: table.id,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });
      setCart([]);
      setMessage(`Thanks. Order ${order.orderNumber || order.orderId} was sent to the kitchen.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to create order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6f9] p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 rounded-lg bg-[#1D9E75] p-4 text-white">
          <div className="text-xs uppercase text-white/70">Guest ordering</div>
          <h1 className="text-2xl font-bold">{table ? table.name : "Loading table..."}</h1>
        </div>
        {message && <div className="mb-4 rounded-lg bg-white p-3 text-sm text-gray-700">{message}</div>}
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setCategoryId("all")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${categoryId === "all" ? "bg-[#1D9E75] text-white" : "bg-white text-gray-500"}`}>All</button>
          {categories.map((category) => (
            <button key={category.id} onClick={() => setCategoryId(category.id)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${categoryId === category.id ? "bg-[#1D9E75] text-white" : "bg-white text-gray-500"}`}>{category.name}</button>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <ProductGrid products={filteredProducts} onAdd={(product) => setCart((current) => [...current, cartItemFromProduct(product)])} />
          <CartPanel
            items={cart}
            loading={loading}
            onClear={() => setCart([])}
            onCheckout={checkout}
            onIncrement={(index) => setCart((current) => current.map((item, i) => i === index ? { ...item, quantity: item.quantity + 1 } : item))}
            onDecrement={(index) => setCart((current) => current.flatMap((item, i) => i === index ? (item.quantity <= 1 ? [] : [{ ...item, quantity: item.quantity - 1 }]) : [item]))}
          />
        </div>
      </div>
    </main>
  );
}

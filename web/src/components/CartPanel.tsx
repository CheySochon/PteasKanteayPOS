"use client";

export type CartItem = {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  itemDiscountPercent?: number;
  itemDiscountAmount?: number;
};

export function cartItemFromProduct(product: {
  id: number;
  name: string;
  basePrice: number | string;
}): CartItem {
  return {
    productId: product.id,
    name: product.name,
    unitPrice: Number(product.basePrice ?? 0),
    quantity: 1,
  };
}

export default function CartPanel({
  items,
  onIncrement,
  onDecrement,
  onClear,
  onCheckout,
  loading = false,
}: {
  items: CartItem[];
  onIncrement: (index: number) => void;
  onDecrement: (index: number) => void;
  onClear: () => void;
  onCheckout: () => void;
  loading?: boolean;
}) {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <aside className="w-full rounded-lg border border-gray-100 bg-white p-4 shadow-sm lg:w-[340px]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">Cart</h2>
        <button onClick={onClear} className="text-xs font-semibold text-gray-400 hover:text-red-500">Clear</button>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500">Select products to start an order</div>
        ) : items.map((item, index) => (
          <div key={`${item.productId}-${index}`} className="rounded-lg bg-gray-50 p-3">
            <div className="flex justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                <div className="text-[11px] text-gray-500">${item.unitPrice.toFixed(2)}</div>
              </div>
              <div className="text-sm font-bold text-gray-900">${(item.unitPrice * item.quantity).toFixed(2)}</div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => onDecrement(index)} className="h-7 w-7 rounded-md border bg-white text-sm">-</button>
              <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
              <button onClick={() => onIncrement(index)} className="h-7 w-7 rounded-md border bg-white text-sm">+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t pt-4">
        <div className="mb-4 flex justify-between text-sm">
          <span className="font-medium text-gray-500">Total</span>
          <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={items.length === 0 || loading}
          className="w-full rounded-lg bg-[#1D9E75] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Order"}
        </button>
      </div>
    </aside>
  );
}

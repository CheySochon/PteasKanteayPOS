"use client";

export default function PaymentModal({
  open,
  amount,
  onClose,
  onPay,
}: {
  open: boolean;
  amount: number;
  onClose: () => void;
  onPay: (method: "cash" | "qr") => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Payment</h2>
        <p className="mt-1 text-sm text-gray-500">Amount due: ${amount.toFixed(2)}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => onPay("cash")} className="rounded-lg bg-[#1D9E75] py-3 text-sm font-bold text-white">Cash</button>
          <button onClick={() => onPay("qr")} className="rounded-lg bg-gray-900 py-3 text-sm font-bold text-white">QR</button>
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-lg border py-2 text-sm font-semibold text-gray-500">Cancel</button>
      </div>
    </div>
  );
}

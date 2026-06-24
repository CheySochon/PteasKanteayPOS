"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  Edit3,
  Loader2,
  PackageCheck,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
import {
  createIngredient,
  createStockAdjustment,
  deleteIngredient,
  getIngredients,
  getLowStock,
  getStockMovements,
  updateIngredient,
} from "../../../lib/api";
import type { Ingredient, StockMovement, StockMovementType } from "../../../lib/types";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";


type IngredientForm = {
  id?: number;
  name: string;
  unit: string;
  currentStock: string;
  minStock: string;
  costPerUnit: string;
};

type AdjustmentForm = {
  ingredientId: string;
  type: StockMovementType;
  quantity: string;
  reason: string;
};

const EMPTY_INGREDIENT: IngredientForm = {
  name: "",
  unit: "",
  currentStock: "",
  minStock: "",
  costPerUnit: "",
};

const EMPTY_ADJUSTMENT: AdjustmentForm = {
  ingredientId: "",
  type: "adjustment",
  quantity: "",
  reason: "",
};

function decimal(value: number | string) {
  return Number(value || 0).toFixed(3).replace(/\.?0+$/, "");
}

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function InventoryPage() {
  const [theme] = useAppTheme();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [lowStock, setLowStock] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [ingredientForm, setIngredientForm] =
    useState<IngredientForm>(EMPTY_INGREDIENT);
  const [adjustmentForm, setAdjustmentForm] =
    useState<AdjustmentForm>(EMPTY_ADJUSTMENT);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "ok">("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useAutoDismiss(message, setMessage);
  useAutoDismiss(error, setError);
  const [loading, setLoading] = useState(true);
  const [savingIngredient, setSavingIngredient] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#111827]" : "bg-white";
  const softSurface = dark ? "bg-[#0f172a]" : "bg-slate-50";
  const borderCol = dark ? "border-slate-700/70" : "border-slate-200";
  const textPrimary = dark ? "text-slate-100" : "text-slate-900";
  const textSecondary = dark ? "text-slate-400" : "text-slate-500";

  const cardClass = `rounded-xl border ${borderCol} ${surface} shadow-sm`;

  const inputClass = `w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-emerald-500 ${
    dark
      ? "border-slate-700/70 bg-[#0f172a] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
  }`;

  useEffect(() => {
    let mounted = true;

    Promise.all([getIngredients(), getLowStock(), getStockMovements()])
      .then(([ingredientRows, lowRows, movementRows]) => {
        if (!mounted) return;
        setIngredients(ingredientRows);
        setLowStock(lowRows);
        setMovements(movementRows);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load inventory");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const lowStockIds = useMemo(
    () => new Set(lowStock.map((item) => item.id)),
    [lowStock],
  );

  const totalValue = useMemo(
    () =>
      ingredients.reduce(
        (sum, item) =>
          sum + Number(item.currentStock || 0) * Number(item.costPerUnit || 0),
        0,
      ),
    [ingredients],
  );

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ingredient) => {
      const isLow = lowStockIds.has(ingredient.id);

      const matchesFilter =
        stockFilter === "all" || (stockFilter === "low" ? isLow : !isLow);

      const matchesQuery =
        !query ||
        ingredient.name.toLowerCase().includes(query.toLowerCase()) ||
        ingredient.unit.toLowerCase().includes(query.toLowerCase());

      return matchesFilter && matchesQuery;
    });
  }, [ingredients, lowStockIds, query, stockFilter]);

  async function loadInventory() {
    const [ingredientRows, lowRows, movementRows] = await Promise.all([
      getIngredients(),
      getLowStock(),
      getStockMovements(),
    ]);

    setIngredients(ingredientRows);
    setLowStock(lowRows);
    setMovements(movementRows);
  }

  async function submitIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingIngredient(true);
    setMessage("");
    setError("");

    const payload = {
      name: ingredientForm.name,
      unit: ingredientForm.unit,
      currentStock: Number(ingredientForm.currentStock || 0),
      minStock: Number(ingredientForm.minStock || 0),
      costPerUnit: Number(ingredientForm.costPerUnit || 0),
    };

    try {
      if (ingredientForm.id) {
        await updateIngredient(ingredientForm.id, payload);
        setMessage("Ingredient updated successfully.");
      } else {
        await createIngredient(payload);
        setMessage("Ingredient created successfully.");
      }

      setIngredientForm(EMPTY_INGREDIENT);
      await loadInventory();
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Login as Admin, Super Admin, or Staff to save ingredients.`
          : "Unable to save ingredient",
      );
    } finally {
      setSavingIngredient(false);
    }
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAdjustment(true);
    setMessage("");
    setError("");

    try {
      await createStockAdjustment({
        ingredientId: Number(adjustmentForm.ingredientId),
        type: adjustmentForm.type,
        quantity: Number(adjustmentForm.quantity || 0),
        reason: adjustmentForm.reason,
      });

      setAdjustmentForm(EMPTY_ADJUSTMENT);
      await loadInventory();
      setMessage("Stock adjustment applied.");
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Login as Admin, Super Admin, or Staff to adjust stock.`
          : "Unable to adjust stock",
      );
    } finally {
      setSavingAdjustment(false);
    }
  }

  async function removeIngredient(ingredient: Ingredient) {
    const ok = window.confirm(`Delete ${ingredient.name}?`);
    if (!ok) return;

    setMessage("");
    setError("");

    try {
      await deleteIngredient(ingredient.id);

      if (ingredientForm.id === ingredient.id) {
        setIngredientForm(EMPTY_INGREDIENT);
      }

      await loadInventory();
      setMessage("Ingredient deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete ingredient");
    }
  }

  function editIngredient(ingredient: Ingredient) {
    setIngredientForm({
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      currentStock: String(ingredient.currentStock),
      minStock: String(ingredient.minStock),
      costPerUnit: String(ingredient.costPerUnit),
    });

    setMessage("");
    setError("");
  }

  return (
    <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
          <section className={`mb-4 rounded-xl border p-4 shadow-sm ${surface} ${borderCol}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-600">
                  <Warehouse size={14} />
                  Inventory Control
                </div>

                <h1 className={`text-2xl font-bold tracking-tight ${textPrimary}`}>
                  Inventory Control
                </h1>

                <p className={`mt-1 text-sm ${textSecondary}`}>
                  Track ingredients, stock value, low-stock alerts, and movement history.
                </p>
              </div>

              <button
                onClick={() => setIngredientForm(EMPTY_INGREDIENT)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <Plus size={17} />
                New Ingredient
              </button>
            </div>
          </section>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Items"
              value={ingredients.length}
              Icon={Archive}
              loading={loading}
              dark={dark}
            />

            <SummaryCard
              label="Low Stock"
              value={lowStock.length}
              Icon={AlertTriangle}
              loading={loading}
              dark={dark}
              tone="warning"
            />

            <SummaryCard
              label="Movements"
              value={movements.length}
              Icon={ClipboardList}
              loading={loading}
              dark={dark}
            />

            <SummaryCard
              label="Stock Value"
              value={money(totalValue)}
              Icon={PackageCheck}
              loading={loading}
              dark={dark}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className={`${cardClass} p-4`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-sm">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={17}
                    />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search ingredients"
                      className={`${inputClass} pl-10`}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <FilterButton
                      active={stockFilter === "all"}
                      onClick={() => setStockFilter("all")}
                      dark={dark}
                    >
                      All
                    </FilterButton>

                    <FilterButton
                      active={stockFilter === "low"}
                      onClick={() => setStockFilter("low")}
                      dark={dark}
                    >
                      Low Stock
                    </FilterButton>

                    <FilterButton
                      active={stockFilter === "ok"}
                      onClick={() => setStockFilter("ok")}
                      dark={dark}
                    >
                      Healthy
                    </FilterButton>
                  </div>
                </div>
              </div>

              <section className={`overflow-hidden ${cardClass}`}>
                <div className={`flex h-14 items-center justify-between border-b px-4 ${borderCol}`}>
                  <div>
                    <h2 className={`text-base font-bold ${textPrimary}`}>
                      Ingredients
                    </h2>
                    <p className={`hidden text-xs sm:block ${textSecondary}`}>
                      Create, edit, delete, and monitor stock levels.
                    </p>
                  </div>

                  {loading && (
                    <Loader2 className="animate-spin text-emerald-600" size={18} />
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead
                      className={`text-[11px] uppercase tracking-wide ${
                        dark
                          ? "bg-slate-800 text-slate-400"
                          : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      <tr>
                        <th className="px-4 py-3 font-bold">Ingredient</th>
                        <th className="px-4 py-3 font-bold">Current</th>
                        <th className="px-4 py-3 font-bold">Minimum</th>
                        <th className="px-4 py-3 font-bold">Value</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 text-right font-bold">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredIngredients.length === 0 && !loading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className={`p-8 text-center text-sm ${textSecondary}`}
                          >
                            No ingredients found
                          </td>
                        </tr>
                      ) : (
                        filteredIngredients.map((ingredient) => {
                          const isLow = lowStockIds.has(ingredient.id);

                          const value =
                            Number(ingredient.currentStock || 0) *
                            Number(ingredient.costPerUnit || 0);

                          return (
                            <tr
                              key={ingredient.id}
                              className={`border-t ${
                                dark
                                  ? "border-slate-700/70 hover:bg-slate-800/50"
                                  : `border-slate-100 hover:bg-slate-50 ${
                                      isLow ? "bg-orange-50/60" : ""
                                    }`
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className={`font-bold ${textPrimary}`}>
                                  {ingredient.name}
                                </div>
                                <div className={`text-xs ${textSecondary}`}>
                                  {money(ingredient.costPerUnit)} / {ingredient.unit}
                                </div>
                              </td>

                              <td className={`px-4 py-3 font-medium ${textPrimary}`}>
                                {decimal(ingredient.currentStock)} {ingredient.unit}
                              </td>

                              <td className={`px-4 py-3 font-medium ${textSecondary}`}>
                                {decimal(ingredient.minStock)} {ingredient.unit}
                              </td>

                              <td className={`px-4 py-3 font-bold ${textPrimary}`}>
                                {money(value)}
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                                    isLow
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {isLow ? "Low" : "Healthy"}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => editIngredient(ingredient)}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${borderCol} ${softSurface} ${textPrimary}`}
                                    title="Edit ingredient"
                                  >
                                    <Edit3 size={15} />
                                  </button>

                                  <button
                                    onClick={() => removeIngredient(ingredient)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                    title="Delete ingredient"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className={`${cardClass} p-4`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-base font-bold ${textPrimary}`}>
                      {ingredientForm.id ? "Edit Ingredient" : "Create Ingredient"}
                    </h2>
                    <p className={`mt-1 text-xs ${textSecondary}`}>
                      Set stock thresholds and unit cost.
                    </p>
                  </div>

                  {ingredientForm.id && (
                    <button
                      onClick={() => setIngredientForm(EMPTY_INGREDIENT)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${borderCol} ${softSurface} ${textPrimary}`}
                      title="Cancel edit"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <form onSubmit={submitIngredient} className="space-y-3">
                  <Field label="Ingredient Name">
                    <input
                      required
                      value={ingredientForm.name}
                      onChange={(event) =>
                        setIngredientForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Unit">
                      <input
                        required
                        value={ingredientForm.unit}
                        onChange={(event) =>
                          setIngredientForm((current) => ({
                            ...current,
                            unit: event.target.value,
                          }))
                        }
                        placeholder="kg, pcs, L"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Cost/Unit">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={ingredientForm.costPerUnit}
                        onChange={(event) =>
                          setIngredientForm((current) => ({
                            ...current,
                            costPerUnit: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Current">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={ingredientForm.currentStock}
                        onChange={(event) =>
                          setIngredientForm((current) => ({
                            ...current,
                            currentStock: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Minimum">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={ingredientForm.minStock}
                        onChange={(event) =>
                          setIngredientForm((current) => ({
                            ...current,
                            minStock: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <button
                    disabled={savingIngredient}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingIngredient ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <Save size={17} />
                    )}
                    {ingredientForm.id ? "Save Ingredient" : "Create Ingredient"}
                  </button>
                </form>
              </section>

              <section className={`${cardClass} p-4`}>
                <div className="mb-4">
                  <h2 className={`text-base font-bold ${textPrimary}`}>
                    Stock Adjustment
                  </h2>
                  <p className={`mt-1 text-xs ${textSecondary}`}>
                    Record inventory in, out, or manual correction.
                  </p>
                </div>

                <form onSubmit={submitAdjustment} className="space-y-3">
                  <Field label="Ingredient">
                    <select
                      required
                      value={adjustmentForm.ingredientId}
                      onChange={(event) =>
                        setAdjustmentForm((current) => ({
                          ...current,
                          ingredientId: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="">Select ingredient</option>
                      {ingredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["in", ArrowUpCircle, "In"],
                      ["out", ArrowDownCircle, "Out"],
                      ["adjustment", SlidersHorizontal, "Adjust"],
                    ] as const).map(([type, Icon, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setAdjustmentForm((current) => ({ ...current, type }))
                        }
                        className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-bold ${
                          adjustmentForm.type === type
                            ? "bg-emerald-600 text-white"
                            : dark
                              ? "bg-[#0f172a] text-slate-400"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>

                  <Field label="Quantity">
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.001"
                      value={adjustmentForm.quantity}
                      onChange={(event) =>
                        setAdjustmentForm((current) => ({
                          ...current,
                          quantity: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Reason">
                    <input
                      value={adjustmentForm.reason}
                      onChange={(event) =>
                        setAdjustmentForm((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                      placeholder="Supplier delivery, waste, count correction"
                      className={inputClass}
                    />
                  </Field>

                  <button
                    disabled={savingAdjustment}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingAdjustment ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <ClipboardList size={17} />
                    )}
                    Apply Adjustment
                  </button>
                </form>
              </section>

              <section className={`${cardClass} p-4`}>
                <h2 className={`mb-4 text-base font-bold ${textPrimary}`}>
                  Recent Movements
                </h2>

                {movements.length === 0 ? (
                  <div
                    className={`rounded-lg border px-3 py-6 text-center text-sm ${borderCol} ${softSurface} ${textSecondary}`}
                  >
                    No stock movements yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {movements.slice(0, 8).map((movement) => (
                      <div
                        key={movement.id}
                        className={`rounded-lg border px-3 py-2 ${borderCol} ${softSurface}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className={`truncate text-sm font-bold ${textPrimary}`}>
                            {movement.ingredient?.name ||
                              `Ingredient #${movement.ingredientId}`}
                          </div>

                          <MovementBadge type={movement.type} />
                        </div>

                        <div className={`mt-1 text-xs ${textSecondary}`}>
                          {decimal(movement.quantity)} ·{" "}
                          {movement.reason || "No reason"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </section>
        </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  Icon,
  loading,
  dark,
  tone = "default",
}: {
  label: string;
  value: number | string;
  Icon: LucideIcon;
  loading: boolean;
  dark: boolean;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        dark ? "border-slate-700/70 bg-[#111827]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>

          <div
            className={`mt-1 text-2xl font-bold tracking-tight ${
              dark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {loading ? "..." : value}
          </div>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            tone === "warning"
              ? "bg-orange-100 text-orange-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          <Icon size={18} />
        </div>
      </div>

      <div className="text-xs font-medium text-emerald-600">Live inventory</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterButton({
  active,
  onClick,
  children,
  dark,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  dark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-lg px-4 text-xs font-bold ${
        active
          ? "bg-emerald-600 text-white"
          : dark
            ? "border border-slate-700 bg-[#0f172a] text-slate-300 hover:bg-slate-800"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function MovementBadge({ type }: { type: StockMovementType }) {
  const styles = {
    in: "bg-emerald-100 text-emerald-700",
    out: "bg-red-100 text-red-700",
    adjustment: "bg-blue-100 text-blue-700",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${styles[type]}`}>
      {type}
    </span>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";

export type InvoiceExpense = {
  id: string;
  category: string;
  label: string;
  amount: number;
};

/** What to actually show for an expense: the category name, unless it's
 *  "Others", in which case the free-text label the user typed is the point. */
function displayText(expense: InvoiceExpense): string {
  return expense.category === "Others" ? expense.label || "Others" : expense.category;
}

export default function InvoiceExpensesCard({
  invoiceId,
  expenses,
  invoiceTotal,
  categories,
}: {
  invoiceId: string;
  expenses: InvoiceExpense[];
  invoiceTotal: number;
  categories: string[];
}) {
  const router = useRouter();
  const options = [...categories, "Others"];
  const [category, setCategory] = useState(options[0] || "Others");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const net = invoiceTotal - total;
  const isOthers = category === "Others";

  async function addExpense() {
    if (saving) return;
    if (isOthers && !label.trim()) {
      setError("Please describe this expense.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, label: label.trim(), amount: parsedAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add the expense.");
      setLabel("");
      setAmount("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/expenses/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove the expense.");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Wallet size={17} className="text-brand-600" />
        <h2 className="font-display text-lg font-semibold">Event expenses</h2>
        <span className="text-xs text-ink-faint ml-auto">Internal only — never shown to the client</span>
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm text-ink-muted">No expenses logged for this invoice yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <span className="text-sm text-ink truncate block">{displayText(e)}</span>
                {e.category !== "Others" && (
                  <span className="text-xs text-ink-faint">{e.category}</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-sm text-ink-muted">{formatCurrency(e.amount)}</span>
                <button
                  type="button"
                  onClick={() => removeExpense(e.id)}
                  disabled={deletingId === e.id}
                  aria-label="Remove expense"
                  className="text-ink-faint hover:text-danger-500 transition-colors"
                >
                  {deletingId === e.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {expenses.length > 0 && (
        <div className="flex flex-col gap-1 pt-1 border-t border-line text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Total expenses</span>
            <span className="font-mono font-medium">{formatCurrency(total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Net (invoice total − expenses)</span>
            <span className={`font-mono font-medium ${net < 0 ? "text-danger-500" : "text-ink"}`}>
              {formatCurrency(net)}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
        <div className="w-full sm:w-44">
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        {isOthers && (
          <div className="flex-1">
            <label className="label">Describe it</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Parking, last-minute supplies"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        )}
        <div className="w-full sm:w-36">
          <label className="label">Amount</label>
          <input
            type="number"
            step="any"
            min={0}
            className="input text-right"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={addExpense}
          disabled={saving || !amount || (isOthers && !label.trim())}
          className="btn-secondary shrink-0"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Add expense
        </button>
      </div>

      {categories.length === 0 && (
        <p className="text-xs text-ink-faint">
          Tip: add reusable categories (Venue, Staffing, Transport…) in Settings so you don&apos;t
          have to type them out every time.
        </p>
      )}
    </div>
  );
}

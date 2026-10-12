"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";

type Budget = { targetRevenue: number; targetExpenses: number } | null;

function varianceLine(label: string, actual: number, target: number) {
  const variance = actual - target;
  const pct = target === 0 ? null : (variance / Math.abs(target)) * 100;
  const favorable = label === "Expenses" ? variance <= 0 : variance >= 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">{label} variance</span>
      <span className={`font-mono font-medium ${favorable ? "text-emerald-600" : "text-danger-500"}`}>
        {variance >= 0 ? "+" : ""}
        {formatCurrency(variance)}
        {pct !== null && ` (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`}
      </span>
    </div>
  );
}

export default function BudgetEditor({
  year,
  month,
  actualRevenue,
  actualExpenses,
}: {
  year: number;
  month: number; // 1-12
  actualRevenue: number;
  actualExpenses: number;
}) {
  const router = useRouter();
  const [budget, setBudget] = useState<Budget>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [targetRevenue, setTargetRevenue] = useState("");
  const [targetExpenses, setTargetExpenses] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/budgets?year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        setBudget(data);
        setTargetRevenue(data ? String(data.targetRevenue) : "");
        setTargetExpenses(data ? String(data.targetExpenses) : "");
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/budgets?year=${year}&month=${month}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRevenue: parseFloat(targetRevenue) || 0,
          targetExpenses: parseFloat(targetExpenses) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the budget.");
      setBudget(data);
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading budget…</p>;
  }

  if (!budget || editing) {
    return (
      <div className="flex flex-col gap-3">
        {error && (
          <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div>
            <label className="label">Target revenue</label>
            <input
              type="number"
              step="any"
              min={0}
              className="input text-right"
              value={targetRevenue}
              onChange={(e) => setTargetRevenue(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Target expenses</label>
            <input
              type="number"
              step="any"
              min={0}
              className="input text-right"
              value={targetExpenses}
              onChange={(e) => setTargetExpenses(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={saving} className="btn-primary self-start">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save budget
          </button>
          {budget && (
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary self-start">
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-ink-muted">Target revenue</p>
          <p className="font-mono">{formatCurrency(budget.targetRevenue)}</p>
        </div>
        <div>
          <p className="text-ink-muted">Target expenses</p>
          <p className="font-mono">{formatCurrency(budget.targetExpenses)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1 pt-2 border-t border-line">
        {varianceLine("Revenue", actualRevenue, budget.targetRevenue)}
        {varianceLine("Expenses", actualExpenses, budget.targetExpenses)}
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm text-brand-500 hover:text-brand-600 self-start mt-1"
      >
        Edit budget
      </button>
    </div>
  );
}

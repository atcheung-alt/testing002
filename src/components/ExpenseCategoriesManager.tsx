"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, AlertCircle, Tag } from "lucide-react";

type ExpenseCategory = {
  id: string;
  name: string;
};

export default function ExpenseCategoriesManager() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/expense-categories")
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add the category.");
      setName("");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/expense-categories/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove the category.");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card p-5 flex flex-col gap-4 max-w-2xl">
      <div>
        <h2 className="font-display text-lg font-semibold">Expense categories</h2>
        <p className="text-sm text-ink-muted mt-0.5">
          Offered as a dropdown when logging expenses on an invoice. &ldquo;Others&rdquo; is
          always available and doesn&apos;t need to be added here.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No categories yet — add your first one below (e.g. &ldquo;Venue&rdquo;, &ldquo;Staffing&rdquo;).
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1.5 rounded-full border border-line bg-paper pl-3 pr-2 py-1.5 text-sm"
            >
              <Tag size={12} className="text-ink-faint" />
              {c.name}
              <button
                type="button"
                onClick={() => removeCategory(c.id)}
                disabled={deletingId === c.id}
                aria-label={`Remove ${c.name}`}
                className="text-ink-faint hover:text-danger-500 transition-colors ml-1"
              >
                {deletingId === c.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1"
          placeholder="e.g. Venue, Staffing, Transport"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
        />
        <button
          type="button"
          onClick={addCategory}
          disabled={saving || !name.trim()}
          className="btn-secondary shrink-0"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Add
        </button>
      </div>
    </div>
  );
}

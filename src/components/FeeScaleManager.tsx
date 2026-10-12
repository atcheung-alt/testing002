"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Table2 } from "lucide-react";
import type { FeeScaleRow } from "@/lib/recruitmentTerms";

type Category = "PERMANENT" | "CONTRACT";

type Draft = { packageLabel: string; fee: string; guaranteePeriod: string };

const emptyDraft: Draft = { packageLabel: "", fee: "", guaranteePeriod: "" };

function RowForm({
  initial,
  saving,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: Draft;
  saving: boolean;
  saveLabel: string;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!draft.packageLabel.trim()) {
      setError("This row needs a package label.");
      return;
    }
    setError(null);
    onSave(draft);
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Annual Remuneration Package</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. HK$1 mil or below"
            value={draft.packageLabel}
            onChange={(e) => setDraft((d) => ({ ...d, packageLabel: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Fee</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. 20% of annual salary package"
            value={draft.fee}
            onChange={(e) => setDraft((d) => ({ ...d, fee: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Guarantee Period</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. 12 weeks"
            value={draft.guaranteePeriod}
            onChange={(e) => setDraft((d) => ({ ...d, guaranteePeriod: e.target.value }))}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : saveLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}

function FeeScaleSection({
  title,
  description,
  rows,
  saving,
  onCreate,
  onUpdate,
  onDelete,
}: {
  title: string;
  description: string;
  rows: FeeScaleRow[];
  saving: boolean;
  onCreate: (draft: Draft) => Promise<void>;
  onUpdate: (id: string, draft: Draft) => Promise<void>;
  onDelete: (row: FeeScaleRow) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setAdding(true);
            }}
            className="btn-secondary !py-1.5 !px-3 text-xs"
          >
            <Plus size={14} /> Add row
          </button>
        )}
      </div>
      <p className="text-xs text-ink-muted mb-4">{description}</p>

      {adding && (
        <div className="mb-4 pb-4 border-b border-line">
          <RowForm
            initial={emptyDraft}
            saving={saving}
            saveLabel="Add row"
            onSave={async (draft) => {
              await onCreate(draft);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {rows.length === 0 && !adding ? (
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <Table2 size={24} className="text-ink-faint" />
          <p className="text-sm text-ink-muted">No rows yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint border-b border-line">
                <th className="py-2 pr-3 font-medium">Annual Remuneration Package</th>
                <th className="py-2 pr-3 font-medium">Fee</th>
                <th className="py-2 pr-3 font-medium">Guarantee Period</th>
                <th className="py-2 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) =>
                editingId === row.id ? (
                  <tr key={row.id}>
                    <td colSpan={4} className="py-3">
                      <RowForm
                        initial={{
                          packageLabel: row.packageLabel,
                          fee: row.fee,
                          guaranteePeriod: row.guaranteePeriod,
                        }}
                        saving={saving}
                        saveLabel="Save changes"
                        onSave={async (draft) => {
                          await onUpdate(row.id, draft);
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td className="py-2.5 pr-3">{row.packageLabel}</td>
                    <td className="py-2.5 pr-3">{row.fee}</td>
                    <td className="py-2.5 pr-3">{row.guaranteePeriod}</td>
                    <td className="py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setAdding(false);
                            setEditingId(row.id);
                          }}
                          aria-label="Edit row"
                          className="p-1.5 text-ink-faint hover:text-brand-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          aria-label="Delete row"
                          className="p-1.5 text-ink-faint hover:text-danger-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function FeeScaleManager() {
  const [permanent, setPermanent] = useState<FeeScaleRow[]>([]);
  const [contract, setContract] = useState<FeeScaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/recruitment/fee-scale");
    const data = await res.json();
    setPermanent(data.permanent || []);
    setContract(data.contract || []);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function create(category: Category, draft: Draft) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/recruitment/fee-scale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, ...draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the row.");
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, draft: Draft) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/recruitment/fee-scale/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the row.");
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: FeeScaleRow) {
    if (!window.confirm(`Delete the "${row.packageLabel}" row?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/recruitment/fee-scale/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete the row.");
      await refresh();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <FeeScaleSection
        title="Fee Scale for Permanent Placements"
        description="Pre-fills Clause 13.b's first table when staff start a new agreement."
        rows={permanent}
        saving={saving}
        onCreate={(draft) => create("PERMANENT", draft)}
        onUpdate={update}
        onDelete={remove}
      />

      <FeeScaleSection
        title="Fee Scale for Contract Placements"
        description="Pre-fills the second table directly below, in the same clause."
        rows={contract}
        saving={saving}
        onCreate={(draft) => create("CONTRACT", draft)}
        onUpdate={update}
        onDelete={remove}
      />

      <p className="text-xs text-ink-muted">
        These are just the starting rates for a <strong>new</strong> agreement — every agreement
        keeps its own editable copy from the moment it&apos;s created (on the New/Edit Agreement
        page), so changing rows here never affects any existing agreement, draft or signed.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import Portal from "@/components/Portal";

export default function DeleteButton({
  url,
  confirmNumber,
  itemLabel = "document",
  redirectTo,
  label = "Delete",
  extraWarning,
}: {
  url: string;
  /** The quotation/invoice/receipt number the user must type exactly to confirm. */
  confirmNumber: string;
  /** e.g. "quotation", "invoice", "receipt" — used in the modal's wording. */
  itemLabel?: string;
  redirectTo?: string;
  label?: string;
  /** Extra sentence shown above the confirmation input — e.g. warning that a
   *  linked record will be deleted too. */
  extraWarning?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = typed.trim() === confirmNumber;

  async function handleDelete() {
    if (!canConfirm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete.");

      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setTyped("");
    setError(null);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-danger">
        <Trash2 size={15} /> {label}
      </button>

      {open && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4 animate-fade-in">
          <div className="card p-6 max-w-sm w-full flex flex-col gap-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-danger-50 flex items-center justify-center text-danger-500 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">Delete this {itemLabel}?</h2>
                {extraWarning && (
                  <p className="text-sm text-danger-600 font-medium mt-1">{extraWarning}</p>
                )}
                <p className="text-sm text-ink-muted mt-1">
                  This cannot be undone. Type <strong className="font-mono">{confirmNumber}</strong> to
                  confirm.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <input
              type="text"
              className="input font-mono"
              placeholder={confirmNumber}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm || busy}
                className="btn-danger flex-1 min-w-0 justify-center"
              >
                {busy ? <Loader2 size={15} className="animate-spin shrink-0" /> : <Trash2 size={15} className="shrink-0" />}
                <span className="truncate">{busy ? "Deleting…" : "Delete"}</span>
              </button>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="btn-secondary flex-1 min-w-0 justify-center"
              >
                <span className="truncate">Cancel</span>
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}

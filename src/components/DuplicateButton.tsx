"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";

export default function DuplicateButton({
  kind,
  id,
}: {
  kind: "quotation" | "invoice";
  id: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = kind === "quotation" ? "quotations" : "invoices";

  async function handleDuplicate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/${base}/${id}/duplicate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not duplicate.");
      router.push(`/${base}/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleDuplicate} disabled={busy} className="btn-secondary">
        <Copy size={15} /> {busy ? "Duplicating…" : "Duplicate"}
      </button>
      {error && <span className="text-xs text-danger-500">{error}</span>}
    </div>
  );
}

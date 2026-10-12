"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function SyncDriveButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/sync-drive`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not sync to Google Drive.");
      setMessage(data.warning || "Synced successfully.");
      router.refresh();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={handleSync} disabled={busy} className="btn-secondary">
        <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
        {busy ? "Syncing…" : "Sync to Drive now"}
      </button>
      {message && (
        <span className="text-xs text-ink-muted max-w-md">{message}</span>
      )}
    </div>
  );
}

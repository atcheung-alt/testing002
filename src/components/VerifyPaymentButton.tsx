"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";

export default function VerifyPaymentButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (
      !window.confirm(
        "Confirm payment has landed and mark this invoice as Paid? This will generate the receipt and email it to the client."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify payment.");
      const warnings = [data.emailWarning, data.driveWarning].filter(Boolean);
      if (warnings.length) {
        setError(warnings.join(" "));
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleVerify} disabled={busy} className="btn-primary">
        <BadgeCheck size={15} /> {busy ? "Verifying…" : "Verify payment"}
      </button>
      {error && <span className="text-xs text-danger-500 max-w-[220px] text-right">{error}</span>}
    </div>
  );
}

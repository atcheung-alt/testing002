"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

/** Mirrors VerifyContractButton — a plain confirm + PATCH that marks MPF
 *  enrollment as verified for an employee. One-way, same as contract
 *  verification: no un-verify from the UI. */
export default function MpfVerifyButton({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (
      !window.confirm(
        "Confirm this employee's MPF scheme enrollment has actually been completed with the trustee?"
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/mpf`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not mark MPF as verified.");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleVerify} disabled={busy} className="btn-secondary">
        <ShieldCheck size={15} /> {busy ? "Saving…" : "Mark MPF verified"}
      </button>
      {error && <span className="text-xs text-danger-500 max-w-[220px] text-right">{error}</span>}
    </div>
  );
}

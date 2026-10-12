"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";

/** Mirrors VerifyPaymentButton — a plain confirm + PATCH, same "staff
 *  verifies something a client/employee already did" pattern. Verifying
 *  also flips the employee's own status from Onboarding to Active. */
export default function VerifyContractButton({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (
      !window.confirm(
        "Confirm the signed contract has been reviewed? This will mark the employee as Active."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/contract`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verify: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify the contract.");
      const warnings = [data.driveWarning].filter(Boolean);
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
        <BadgeCheck size={15} /> {busy ? "Verifying…" : "Verify contract"}
      </button>
      {error && <span className="text-xs text-danger-500 max-w-[220px] text-right">{error}</span>}
    </div>
  );
}

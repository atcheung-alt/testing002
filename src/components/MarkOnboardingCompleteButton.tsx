"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function MarkOnboardingCompleteButton({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (
      !window.confirm(
        "Mark this employee's onboarding as complete? This confirms all their personal details are on file and unlocks contract generation."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/onboarding/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not mark onboarding as complete.");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={handleClick} disabled={busy} className="btn-secondary">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        {busy ? "Marking complete…" : "Mark onboarding complete"}
      </button>
      {error && <span className="text-xs text-danger-500 max-w-[260px]">{error}</span>}
    </div>
  );
}

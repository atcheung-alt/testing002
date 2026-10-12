"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";

export default function SendOnboardingButton({
  employeeId,
  resend = false,
}: {
  employeeId: string;
  /** Just changes the label/wording — same endpoint either way. */
  resend?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const res = await fetch(`/api/employees/${employeeId}/onboarding/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send the onboarding email.");
      setSent(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={handleSend} disabled={busy} className="btn-secondary">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {busy ? "Sending…" : resend ? "Resend onboarding email" : "Send onboarding email"}
      </button>
      {error && <span className="text-xs text-danger-500 max-w-[260px]">{error}</span>}
      {sent && !error && <span className="text-xs text-emerald-600">Onboarding email sent.</span>}
    </div>
  );
}

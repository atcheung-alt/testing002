"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const QUOTATION_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "CHANGES_REQUESTED", "REJECTED"];
// "OVERDUE" is deliberately absent — it's derived live from the due date
// (see src/lib/invoiceStatus.ts) and is never something staff set manually.
const INVOICE_STATUSES = ["DRAFT", "UNPAID", "PENDING_VERIFICATION", "PAID", "CANCELLED"];
// "SIGNED" is normally set automatically by the client signing online, but
// staff can still set it manually (e.g. a paper-signed copy came back).
const RECRUITMENT_STATUSES = ["DRAFT", "SENT", "SIGNED", "CANCELLED"];

const KIND_CONFIG = {
  quotation: { statuses: QUOTATION_STATUSES, path: "quotations" },
  invoice: { statuses: INVOICE_STATUSES, path: "invoices" },
  recruitment: { statuses: RECRUITMENT_STATUSES, path: "recruitment" },
};

export default function StatusUpdater({
  kind,
  id,
  status,
  disabled,
}: {
  kind: "quotation" | "invoice" | "recruitment";
  id: string;
  status: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const { statuses: options, path } = KIND_CONFIG[kind];

  async function handleChange(newStatus: string) {
    // Manually moving an invoice into Paid auto-generates the receipt and
    // emails it to the client (see ensureReceiptForInvoice, called from the
    // PATCH route) — confirm first so that doesn't fire off a stray email
    // from an accidental dropdown selection. No other kind/status change
    // here has any email side effect, so nothing else needs this gate.
    if (kind === "invoice" && newStatus === "PAID" && status !== "PAID") {
      if (!window.confirm("Mark this invoice as Paid? This will generate the receipt and email it to the client.")) {
        return;
      }
    }
    setUpdating(true);
    setWarning(null);
    try {
      const res = await fetch(`/api/${path}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update status.");
      const warnings = [data.emailWarning, data.driveWarning].filter(Boolean);
      if (warnings.length) setWarning(warnings.join(" "));
      router.refresh();
    } catch (err: any) {
      setWarning(err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (disabled) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        className="input !w-auto py-1.5 text-sm font-medium"
        value={status}
        disabled={updating}
        onChange={(e) => handleChange(e.target.value)}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            Mark as {s}
          </option>
        ))}
      </select>
      {warning && <span className="text-xs text-danger-500 max-w-[260px] text-right">{warning}</span>}
    </div>
  );
}

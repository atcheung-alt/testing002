"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import StatusBadge from "@/components/StatusBadge";

// Mirrors StatusBadge's own styling for these three states, so the toggle
// looks identical to the plain badge everywhere else — just clickable.
const STYLES: Record<string, string> = {
  UNPAID: "border-accent-500 text-accent-600",
  PAID: "border-brand-500 text-brand-500 bg-brand-50",
  OVERDUE: "border-danger-500 text-danger-500",
};

/**
 * Drop-in replacement for `<StatusBadge status={...} />` on the invoice
 * list row — clickable specifically for Paid/Unpaid/Overdue, the states
 * staff actually flip day to day while chasing payment. Every other status
 * (Draft, Pending verification, Cancelled) falls back to the plain,
 * non-interactive StatusBadge unchanged — those transitions have real side
 * effects (emails, receipt generation) better made deliberately via the
 * full status dropdown on the detail page, not a stray list click.
 */
export default function InvoiceStatusToggle({
  id,
  displayStatus,
}: {
  id: string;
  /** The already-computed display status — "OVERDUE" if unpaid and past
   *  due, otherwise the raw stored status (see getInvoiceDisplayStatus). */
  displayStatus: string;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTogglable = displayStatus === "PAID" || displayStatus === "UNPAID" || displayStatus === "OVERDUE";
  if (!isTogglable) {
    return <StatusBadge status={displayStatus} />;
  }

  const nextStatus = displayStatus === "PAID" ? "UNPAID" : "PAID";

  async function handleClick(e: React.MouseEvent) {
    // The whole row is a <Link> to the detail page — stop that navigation
    // when the badge itself is what got clicked.
    e.preventDefault();
    e.stopPropagation();
    if (updating) return;
    // Marking Paid auto-generates the receipt and emails it to the client
    // (see ensureReceiptForInvoice, called from the PATCH route) — confirm
    // first so a stray click on the list doesn't fire that off. Going the
    // other way (Paid → Unpaid) has no email side effect, so no confirm
    // needed there.
    if (
      nextStatus === "PAID" &&
      !window.confirm("Mark this invoice as Paid? This will generate the receipt and email it to the client.")
    ) {
      return;
    }
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update status.");
      router.refresh();
      // Left `updating` true — router.refresh() re-renders this row with
      // the new status shortly, unmounting this instance; no need to reset.
    } catch (err: any) {
      setError(err.message || "Could not update status.");
      setUpdating(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={updating}
        title={`Mark as ${nextStatus === "PAID" ? "Paid" : "Unpaid"}`}
        className={clsx(
          "stamp cursor-pointer hover:brightness-95 transition disabled:opacity-60 disabled:cursor-wait",
          STYLES[displayStatus]
        )}
      >
        {updating ? "Updating…" : displayStatus}
      </button>
      {error && <span className="text-[10px] text-danger-500 mt-0.5">{error}</span>}
    </span>
  );
}

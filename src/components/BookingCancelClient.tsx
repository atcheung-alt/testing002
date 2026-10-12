"use client";

import { useState } from "react";
import { AlertCircle, Ban, CheckCircle2, Loader2 } from "lucide-react";
import PublicCompanyHeader, { type PublicCompany } from "@/components/PublicCompanyHeader";
import { formatSlotLabel, readJsonOrThrow } from "@/lib/bookingFormat";

export type CancelBookingInfo = {
  token: string;
  eventName: string;
  clientName: string;
  status: string; // CONFIRMED | CANCELLED | PENDING (legacy) | REJECTED (legacy)
  slotDate: string; // ISO
  slotStartTime: string;
  slotDurationMins: number;
};

/**
 * The page a client lands on from their confirmation email's cancel link
 * (see bookingConfirmedEmailContent) — a plain "cancel my booking" action,
 * no login. Mirrors the shape of the other token-scoped public pages
 * (/sign/[token], /leave/[token]) but with a single action rather than a
 * form.
 */
export default function BookingCancelClient({ booking, company }: { booking: CancelBookingInfo; company: PublicCompany }) {
  const [status, setStatus] = useState(booking.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotLabel = formatSlotLabel(booking.slotDate, booking.slotStartTime, booking.slotDurationMins);

  async function cancelBooking() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/bookings/cancel/${booking.token}`, { method: "POST" });
      const data = await readJsonOrThrow(res, "Could not cancel this booking.");
      setStatus(data.status);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
      <PublicCompanyHeader company={company} />

      <div className="card p-6 flex flex-col items-center text-center gap-3">
        {status === "CANCELLED" ? (
          <>
            <CheckCircle2 size={40} className="text-emerald-500" />
            <h1 className="font-display text-xl font-semibold text-ink">Booking cancelled</h1>
            <p className="text-sm text-ink-muted">
              {booking.eventName} — {slotLabel} has been cancelled. We hope to see you another time.
            </p>
          </>
        ) : status !== "CONFIRMED" && status !== "PENDING" ? (
          <>
            <AlertCircle size={40} className="text-ink-faint" />
            <h1 className="font-display text-xl font-semibold text-ink">This booking can&apos;t be cancelled here</h1>
            <p className="text-sm text-ink-muted">
              {booking.eventName} — {slotLabel} is no longer an active booking. Please get in touch if you need help.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-semibold text-ink">
              {status === "PENDING" ? "Withdraw your booking request?" : "Cancel your booking?"}
            </h1>
            <p className="text-sm text-ink-muted">
              {booking.eventName} — {slotLabel}, booked under {booking.clientName}.
              {status === "PENDING" && " This request hasn't been confirmed by staff yet."}
            </p>
            {error && (
              <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2 w-full text-left">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button type="button" onClick={cancelBooking} disabled={busy} className="btn-secondary mt-1">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
              {busy ? "Cancelling…" : status === "PENDING" ? "Withdraw my request" : "Cancel my booking"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

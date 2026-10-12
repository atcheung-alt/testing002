"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, AlertCircle, CheckCircle2, CalendarDays } from "lucide-react";
import clsx from "clsx";
import PublicCompanyHeader, { type PublicCompany } from "@/components/PublicCompanyHeader";
import PublicEventCalendar from "@/components/PublicEventCalendar";
import { formatTimeRangeLabel, formatSlotLabel, readJsonOrThrow } from "@/lib/bookingFormat";

type EventInfo = {
  id: string;
  name: string;
  description: string;
  startDate: string; // ISO
  endDate: string; // ISO
  requiresConfirmation: boolean;
};

type SlotOption = { id: string; startTime: string; durationMins: number; quota: number; available: number };

export default function PublicEventBookingClient({ event, company }: { event: EventInfo; company: PublicCompany }) {
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ date: string; startTime: string; durationMins: number; status: string } | null>(
    null
  );

  const selectedSlot = slots.find((s) => s.id === selectedSlotId) || null;

  async function refreshSlots(forDate: string) {
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const res = await fetch(`/api/public/bookings/events/${event.id}/slots?date=${encodeURIComponent(forDate)}`);
      const data = await readJsonOrThrow(res, "Could not load available times.");
      setSlots(data.slots || []);
    } catch (err: any) {
      setSlots([]);
      setSlotsError(err.message);
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    setSelectedSlotId(null);
    if (!date) {
      setSlots([]);
      return;
    }
    refreshSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!date || !selectedSlotId) {
      setSubmitError("Please pick a date and time first.");
      return;
    }
    if (!clientName.trim()) {
      setSubmitError("Please enter your name.");
      return;
    }
    if (!clientEmail.trim()) {
      setSubmitError("Please provide an email address so we can confirm your booking.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlotId,
          clientName,
          clientPhone,
          clientEmail,
          notes,
        }),
      });
      const data = await readJsonOrThrow(res, "Something went wrong. Please try again.");
      setConfirmed({ date: data.date, startTime: data.startTime, durationMins: data.durationMins, status: data.status });
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setNotes("");
      setSelectedSlotId(null);
      await refreshSlots(date);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    const isPending = confirmed.status === "PENDING";
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
        <PublicCompanyHeader company={company} />
        <div className="card p-6 flex flex-col items-center text-center gap-3">
          <CheckCircle2 size={40} className={isPending ? "text-amber-500" : "text-emerald-500"} />
          <h1 className="font-display text-xl font-semibold text-ink">
            {isPending ? "Booking request received" : "Booking confirmed"}
          </h1>
          <p className="text-sm text-ink-muted">
            {event.name} — {formatSlotLabel(confirmed.date, confirmed.startTime, confirmed.durationMins)}.{" "}
            {isPending
              ? "This isn't confirmed yet — we'll follow up shortly. We've emailed you the details, along with a link to withdraw your request if needed."
              : "We've sent a confirmation email with your booking details and a link to cancel if your plans change."}
          </p>
          <button type="button" onClick={() => setConfirmed(null)} className="btn-secondary mt-2">
            Make another booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
      <PublicCompanyHeader company={company} />

      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{event.name}</h1>
        {event.description && (
          <p className="text-sm text-ink-muted mt-0.5 whitespace-pre-wrap">{event.description}</p>
        )}
      </div>

      <form onSubmit={submit} className="card p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="label mb-2">Pick a date</label>
          <PublicEventCalendar
            eventId={event.id}
            minDate={new Date(event.startDate)}
            maxDate={new Date(event.endDate)}
            selectedDate={date}
            onSelectDate={setDate}
          />
        </div>

        <div className="flex flex-col gap-4 pt-4 border-t border-line lg:pt-0 lg:border-t-0 lg:border-l lg:pl-6">
          {!date ? (
            <p className="text-sm text-ink-muted">Select a date on the calendar to see available times.</p>
          ) : (
            <div>
              <label className="label flex items-center gap-1.5">
                <Clock size={13} /> Available times
              </label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-sm text-ink-muted py-3">
                  <Loader2 size={15} className="animate-spin" /> Loading times…
                </div>
              ) : slotsError ? (
                <p className="text-sm text-danger-600 py-2">{slotsError}</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-ink-muted py-2">No times available that day — please pick another date on the calendar.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {slots.map((slot) => {
                    const isSelected = slot.id === selectedSlotId;
                    const full = slot.available <= 0;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={full}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={clsx(
                          "rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors",
                          isSelected
                            ? "border-brand-600 bg-brand-600 text-white"
                            : full
                            ? "border-line text-ink-faint cursor-not-allowed opacity-60"
                            : "border-line hover:border-brand-300 hover:bg-brand-50 text-ink"
                        )}
                      >
                        <div>{formatTimeRangeLabel(slot.startTime, slot.durationMins)}</div>
                        <div className={clsx("text-xs font-normal", isSelected ? "text-brand-50" : "text-ink-faint")}>
                          {full ? "Full" : `${slot.available} spot${slot.available === 1 ? "" : "s"} left`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {date && selectedSlot && (
            <>
              <div className="border-t border-line pt-4 flex items-center gap-2 text-sm text-ink-muted">
                <CalendarDays size={15} className="text-brand-600" />
                {formatSlotLabel(date, selectedSlot.startTime, selectedSlot.durationMins)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Your name *</label>
                  <input type="text" className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Phone (optional)</label>
                  <input type="tel" className="input" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required />
                <p className="mt-1 text-xs text-ink-faint">We&apos;ll email you a confirmation with your booking details.</p>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input min-h-[70px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything else we should know"
                />
              </div>

              {submitError && (
                <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary self-start">
                {submitting && <Loader2 size={15} className="animate-spin" />}
                {submitting ? "Submitting…" : event.requiresConfirmation ? "Request booking" : "Confirm booking"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

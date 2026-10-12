"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { readJsonOrThrow } from "@/lib/bookingFormat";

export default function NewBookingEventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, companyName, description, startDate, endDate, requiresConfirmation }),
      });
      const data = await readJsonOrThrow(res, "Could not create this event.");
      router.push(`/bookings/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6 flex flex-col gap-4">
      <div>
        <label className="label">Event name *</label>
        <input
          type="text"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Massage, DIY Workshop"
          required
        />
      </div>

      <div>
        <label className="label">Company *</label>
        <input
          type="text"
          className="input"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Which company this event is being run for"
          required
        />
      </div>

      <div>
        <label className="label">Description (optional)</label>
        <textarea
          className="input min-h-[80px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shown to clients on this event's booking page"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Start date *</label>
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">End date *</label>
          <input
            type="date"
            className="input"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>
      <p className="text-xs text-ink-faint -mt-2">
        For a single-day event, use the same date for both. This is the range you&apos;ll be able to
        add time slots within.
      </p>

      <label className="flex items-start gap-2.5 rounded-xl border border-line p-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={requiresConfirmation}
          onChange={(e) => setRequiresConfirmation(e.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-ink">Require staff confirmation</span>
          <span className="block text-xs text-ink-muted mt-0.5">
            New bookings will wait for a staff member to confirm them here before the client&apos;s confirmation email
            is sent. Leave unchecked to accept every booking automatically.
          </span>
        </span>
      </label>

      {error && (
        <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        {submitting ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}

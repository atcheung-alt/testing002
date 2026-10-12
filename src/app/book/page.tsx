import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";
import { getEffectiveCompany } from "@/lib/appSettings";
import { listBookingEvents, formatDateLabel } from "@/lib/bookings";
import PublicCompanyHeader from "@/components/PublicCompanyHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book an appointment",
  // A generic public listing, not a per-client link — fine to index, unlike
  // the token-scoped public pages elsewhere in the app.
};

/** "24/08/2026" or "24/08/2026 – 26/08/2026" once an event spans more than
 *  one day. */
function dateRangeLabel(startDate: string, endDate: string): string {
  const start = formatDateLabel(startDate);
  const end = formatDateLabel(endDate);
  return start === end ? start : `${start} – ${end}`;
}

export default async function BookEventsPage() {
  const [company, events] = await Promise.all([getEffectiveCompany(), listBookingEvents({ activeOnly: true })]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
      <PublicCompanyHeader
        company={{ name: company.name, shortName: company.shortName, logoData: company.logoData, logoDataDark: company.logoDataDark }}
      />

      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Book an appointment</h1>
        <p className="text-sm text-ink-muted mt-0.5">Pick what you&apos;d like to book below.</p>
      </div>

      {events.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">Nothing is available to book right now.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/book/${e.id}`}
              className="card p-5 flex items-center justify-between gap-4 hover:border-brand-300 transition-colors"
            >
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-ink">{e.name}</h2>
                {e.description && <p className="text-sm text-ink-muted mt-0.5 line-clamp-2">{e.description}</p>}
                <p className="flex items-center gap-1.5 text-xs text-ink-faint mt-1.5">
                  <CalendarDays size={13} /> {dateRangeLabel(e.startDate.toISOString(), e.endDate.toISOString())}
                </p>
              </div>
              <ArrowRight size={18} className="text-brand-600 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

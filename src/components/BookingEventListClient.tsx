"use client";

import ClickableTableRow from "@/components/ClickableTableRow";
import { formatDateLabel } from "@/lib/bookingFormat";

export type BookingEventListItem = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

/** "24/08/2026" or "24/08/2026 – 26/08/2026" once an event spans more than
 *  one day. */
function dateRangeLabel(startDate: string, endDate: string): string {
  const start = formatDateLabel(startDate);
  const end = formatDateLabel(endDate);
  return start === end ? start : `${start} – ${end}`;
}

export default function BookingEventListClient({ events }: { events: BookingEventListItem[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <th className="px-5 py-3">Event</th>
            <th className="hidden sm:table-cell px-5 py-3">Dates</th>
            <th className="px-5 py-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <ClickableTableRow
              key={e.id}
              href={`/bookings/${e.id}`}
              className="border-b border-line last:border-0 hover:bg-brand-50/40"
            >
              <td className="px-5 py-3">
                <span className="font-medium text-brand-600">{e.name}</span>
                {e.description && (
                  <p className="text-xs text-ink-muted truncate max-w-xs">{e.description}</p>
                )}
              </td>
              <td className="hidden sm:table-cell px-5 py-3 text-ink-muted">
                {dateRangeLabel(e.startDate, e.endDate)}
              </td>
              <td className="px-5 py-3 text-right">
                <span
                  className={`stamp ${
                    e.active ? "border-brand-500 text-brand-500 bg-brand-50" : "border-ink-faint text-ink-faint"
                  }`}
                >
                  {e.active ? "Active" : "Hidden"}
                </span>
              </td>
            </ClickableTableRow>
          ))}
        </tbody>
      </table>
    </div>
  );
}

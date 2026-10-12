import { CalendarDays } from "lucide-react";
import { listEvents } from "@/lib/events";
import CalendarView, { type CalendarEvent } from "@/components/CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  // Calendar events are sourced entirely from the Event table (see the Event
  // model in schema.prisma / src/lib/events.ts) — created explicitly by
  // staff via "Mark on calendar" on an invoice, once its event date/time is
  // set. Unlike the old quotation-based calendar, a bare invoice with dates
  // filled in does NOT show up here on its own.
  const rows = await listEvents();

  const events: CalendarEvent[] = rows.map((e) => ({
    id: e.id,
    invoiceId: e.invoiceId,
    name: e.name,
    companyName: e.companyName,
    contactPerson: e.contactPerson,
    durationMins: e.durationMins,
    eventStartDate: e.startDate.toISOString(),
    eventStartTime: e.startTime,
    eventEndDate: e.endDate.toISOString(),
    eventEndTime: e.endTime,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1 flex items-center gap-2">
          <CalendarDays size={22} className="text-brand-600" />
          Calendar
        </h1>
        <p className="text-sm text-ink-muted">
          Every event marked on the calendar from an invoice — click one to see its details.
        </p>
      </div>

      <CalendarView events={events} />
    </div>
  );
}

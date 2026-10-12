import Link from "next/link";
import { Plus, CalendarCheck } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { listBookingEvents } from "@/lib/bookings";
import EmptyState from "@/components/EmptyState";
import BookingEventListClient from "@/components/BookingEventListClient";
import BookingEventsCalendar from "@/components/BookingEventsCalendar";

export const dynamic = "force-dynamic";

/**
 * Staff-facing entry point for the event-based booking system (Resource
 * System) — every bookable event (a massage day, a multi-day workshop,
 * etc.) staff have created, each with its own detail page for managing
 * slots and reviewing bookings. Lives under the (app) route group rather
 * than the HR System — see the note that used to live here before the
 * single-resource massage calendar was replaced by this event system.
 */
export default async function BookingsPage() {
  await requireAdminPage();

  const events = await listBookingEvents();
  const serializedEvents = events.map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate.toISOString(),
    active: e.active,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Bookings</h1>
          <p className="text-sm text-ink-muted">
            Create a bookable event — a massage day, a DIY workshop, anything with its own time
            slots and quota — then share its own booking page with clients.
          </p>
        </div>
        <Link href="/bookings/new" className="btn-primary shrink-0">
          <Plus size={15} /> New event
        </Link>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No booking events yet"
          description="Create your first event to start taking bookings."
          actionHref="/bookings/new"
          actionLabel="New event"
        />
      ) : (
        <>
          <BookingEventsCalendar events={serializedEvents} />
          <BookingEventListClient events={serializedEvents} />
        </>
      )}
    </div>
  );
}

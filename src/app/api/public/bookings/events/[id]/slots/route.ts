import { NextRequest, NextResponse } from "next/server";
import { getBookingEvent, isDateBookable, isSlotInFuture, listSlotsForEventOnDate, parseDateOnly } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET ?date=YYYY-MM-DD — this event's slots on that day, with how many
 * spots are still open on each (never who holds them). Past slots (today,
 * but the time already passed) are left out entirely rather than shown as
 * full, same as the old fixed-grid system.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const event = await getBookingEvent(params.id);
  if (!event || !event.active) {
    return NextResponse.json({ error: "This event isn't available for booking." }, { status: 404 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  const date = parseDateOnly(dateParam);
  if (!date) {
    return NextResponse.json({ error: "A valid date (YYYY-MM-DD) is required." }, { status: 400 });
  }
  if (!isDateBookable(date)) {
    return NextResponse.json({ date: dateParam, slots: [] });
  }

  const slots = await listSlotsForEventOnDate(params.id, date);
  return NextResponse.json({
    date: dateParam,
    slots: slots
      .filter((s) => isSlotInFuture(date, s.startTime))
      .map((s) => ({
        id: s.id,
        startTime: s.startTime,
        durationMins: s.durationMins,
        quota: s.quota,
        available: s.available,
      })),
  });
}

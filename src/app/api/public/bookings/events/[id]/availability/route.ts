import { NextRequest, NextResponse } from "next/server";
import { getBookingEvent, monthlyAvailabilityForEvent } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET ?month=YYYY-MM — how many spots are still open on each day of that
 * month for this one event, for the public per-event page's calendar to
 * render at-a-glance availability without exposing exact slots or who holds
 * them.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const event = await getBookingEvent(params.id);
  if (!event || !event.active) {
    return NextResponse.json({ error: "This event isn't available for booking." }, { status: 404 });
  }

  const monthParam = request.nextUrl.searchParams.get("month");
  const match = monthParam ? /^(\d{4})-(\d{2})$/.exec(monthParam) : null;
  if (!match) {
    return NextResponse.json({ error: "A valid month (YYYY-MM) is required." }, { status: 400 });
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const firstOfMonth = new Date(year, month, 1);
  const firstOfNextMonth = new Date(year, month + 1, 1);

  const days = await monthlyAvailabilityForEvent(params.id, firstOfMonth, firstOfNextMonth);
  return NextResponse.json({ month: monthParam, days });
}

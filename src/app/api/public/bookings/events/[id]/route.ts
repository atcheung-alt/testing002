import { NextResponse } from "next/server";
import { getBookingEvent } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — the basic info a client's per-event booking page needs (name,
 *  description, bookable date range). Returns 404 for an inactive event too
 *  — same "not discoverable at all" stance as the listing route. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const event = await getBookingEvent(params.id);
  if (!event || !event.active) {
    return NextResponse.json({ error: "This event isn't available for booking." }, { status: 404 });
  }
  return NextResponse.json({
    id: event.id,
    name: event.name,
    description: event.description,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { formatSlotLabel, getBookingByCancelToken, updateBookingStatus } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * A client cancelling their own booking from the link in their confirmation
 * (or "request received") email — no login, scoped only by the booking's own
 * random cancelToken rather than a staff session. Works whether the booking
 * is already CONFIRMED or still PENDING staff review (see
 * BookingEvent.requiresConfirmation) — a client can withdraw a request they
 * haven't heard back on yet the same way they'd cancel a confirmed one.
 * Never sends a notification email back to the client — they're the one who
 * just asked for this.
 */
export async function POST(_request: NextRequest, { params }: { params: { token: string } }) {
  const existing = await getBookingByCancelToken(params.token);
  if (!existing) {
    return NextResponse.json({ error: "This cancellation link is invalid." }, { status: 404 });
  }
  if (existing.status === "CANCELLED") {
    return NextResponse.json({ error: "This booking has already been cancelled." }, { status: 409 });
  }
  if (existing.status !== "CONFIRMED" && existing.status !== "PENDING") {
    return NextResponse.json({ error: "This booking can no longer be cancelled." }, { status: 409 });
  }

  const booking = await updateBookingStatus(existing.id, "CANCELLED", "Cancelled by client");

  await logActivity({
    documentType: "booking",
    documentId: existing.id,
    type: "EDITED",
    actor: "CLIENT",
    actorName: existing.clientName,
    description: `Booking for ${existing.clientName} (${existing.eventName}, ${formatSlotLabel(
      existing.slotDate,
      existing.slotStartTime,
      existing.slotDurationMins
    )}) cancelled by client`,
  });

  return NextResponse.json({ status: booking?.status || "CANCELLED" });
}

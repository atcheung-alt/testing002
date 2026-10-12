import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { countAnyBookingsForSlot, deleteSlot, formatSlotLabel, getBookingEventByManageToken, getSlot } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * Remove a slot from its event's public manage link — same guard as the
 * staff-only DELETE on /api/bookings/events/[id]/slots/[slotId]: blocked
 * once any booking (any status) has ever been made against it.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { token: string; slotId: string } }
) {
  const event = await getBookingEventByManageToken(params.token);
  if (!event) {
    return NextResponse.json({ error: "This manage link is invalid." }, { status: 404 });
  }

  const slot = await getSlot(params.slotId);
  if (!slot || slot.eventId !== event.id) {
    return NextResponse.json({ error: "Slot not found." }, { status: 404 });
  }

  const bookingCount = await countAnyBookingsForSlot(params.slotId);
  if (bookingCount > 0) {
    return NextResponse.json(
      { error: "This slot already has booking history and can't be deleted." },
      { status: 409 }
    );
  }

  await logActivity({
    documentType: "booking",
    documentId: event.id,
    type: "EDITED",
    actor: "CLIENT",
    description: `Slot removed via manage link: ${formatSlotLabel(slot.date, slot.startTime, slot.durationMins)}`,
  });

  await deleteSlot(params.slotId);

  return NextResponse.json({ success: true });
}

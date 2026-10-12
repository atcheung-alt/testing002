import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { countAnyBookingsForSlot, deleteSlot, formatSlotLabel, getSlot } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * Remove a slot that turned out not to be needed. Blocked entirely once any
 * booking (of any status, including cancelled/rejected) has ever been made
 * against it — deleting it would otherwise silently discard that history via
 * the cascade FK. Staff can still hide a slot's usefulness some other way
 * (e.g. it'll simply stop being offered once its date has passed); this is
 * only for cleaning up a slot added by mistake before anyone's booked it.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; slotId: string } }
) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const slot = await getSlot(params.slotId);
  if (!slot || slot.eventId !== params.id) {
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
    documentId: params.id,
    type: "EDITED",
    description: `Slot removed: ${formatSlotLabel(slot.date, slot.startTime, slot.durationMins)}`,
  });

  await deleteSlot(params.slotId);

  return NextResponse.json({ success: true });
}

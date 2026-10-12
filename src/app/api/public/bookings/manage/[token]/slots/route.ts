import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import {
  bulkSlotFieldsFrom,
  createSlot,
  createSlotsBulk,
  formatDateLabel,
  getBookingEventByManageToken,
  slotFieldsFrom,
} from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * Add slots to an event from its public manage link — same "single" vs
 * "bulk" body shapes as the staff-only POST on
 * /api/bookings/events/[id]/slots (see that route's header comment); this
 * one is just scoped by manageToken instead of a staff session.
 */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const event = await getBookingEventByManageToken(params.token);
  if (!event) {
    return NextResponse.json({ error: "This manage link is invalid." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.mode === "bulk") {
    const fields = bulkSlotFieldsFrom(body, event);
    if (fields.error) {
      return NextResponse.json({ error: fields.error }, { status: 400 });
    }
    const slots = await createSlotsBulk(event.id, {
      date: fields.date!,
      startTime: fields.startTime,
      endTime: fields.endTime,
      durationMins: fields.durationMins,
      quota: fields.quota,
    });
    await logActivity({
      documentType: "booking",
      documentId: event.id,
      type: "EDITED",
      actor: "CLIENT",
      description: `${slots.length} slot${slots.length === 1 ? "" : "s"} added to "${event.name}" on ${formatDateLabel(
        fields.date!
      )} via its manage link`,
    });
    return NextResponse.json({ slots }, { status: 201 });
  }

  const fields = slotFieldsFrom(body, event);
  if (fields.error) {
    return NextResponse.json({ error: fields.error }, { status: 400 });
  }
  const slot = await createSlot(event.id, {
    date: fields.date!,
    startTime: fields.startTime,
    durationMins: fields.durationMins,
    quota: fields.quota,
  });
  await logActivity({
    documentType: "booking",
    documentId: event.id,
    type: "EDITED",
    actor: "CLIENT",
    description: `Slot added to "${event.name}" on ${formatDateLabel(fields.date!)} at ${fields.startTime} via its manage link`,
  });
  return NextResponse.json(slot, { status: 201 });
}

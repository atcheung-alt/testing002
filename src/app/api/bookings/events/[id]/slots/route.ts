import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  bulkSlotFieldsFrom,
  createSlot,
  createSlotsBulk,
  formatDateLabel,
  getBookingEvent,
  slotFieldsFrom,
} from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * Add slots to an event, one day at a time (see the schema comment on
 * BookingEvent for why multi-day events are configured day-by-day rather
 * than from one repeating template). Two shapes, chosen by `body.mode`:
 *
 *   - "single": one slot — { date, startTime, durationMins, quota }.
 *   - "bulk": fills a shift window with consecutive slots of the same
 *     duration/quota — { date, startTime, endTime, durationMins, quota }.
 *
 * `durationMins` in both cases is whatever staff dragged the duration
 * slider to in the admin UI (see SLOT_DURATION_MIN/MAX_MINUTES).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const event = await getBookingEvent(params.id);
  if (!event) {
    return NextResponse.json({ error: "Booking event not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.mode === "bulk") {
    const fields = bulkSlotFieldsFrom(body, event);
    if (fields.error) {
      return NextResponse.json({ error: fields.error }, { status: 400 });
    }
    const slots = await createSlotsBulk(params.id, {
      date: fields.date!,
      startTime: fields.startTime,
      endTime: fields.endTime,
      durationMins: fields.durationMins,
      quota: fields.quota,
    });
    await logActivity({
      documentType: "booking",
      documentId: params.id,
      type: "EDITED",
      description: `${slots.length} slot${slots.length === 1 ? "" : "s"} added to "${event.name}" on ${formatDateLabel(
        fields.date!
      )}`,
    });
    return NextResponse.json({ slots }, { status: 201 });
  }

  const fields = slotFieldsFrom(body, event);
  if (fields.error) {
    return NextResponse.json({ error: fields.error }, { status: 400 });
  }
  const slot = await createSlot(params.id, {
    date: fields.date!,
    startTime: fields.startTime,
    durationMins: fields.durationMins,
    quota: fields.quota,
  });
  await logActivity({
    documentType: "booking",
    documentId: params.id,
    type: "EDITED",
    description: `Slot added to "${event.name}" on ${formatDateLabel(fields.date!)} at ${fields.startTime}`,
  });
  return NextResponse.json(slot, { status: 201 });
}

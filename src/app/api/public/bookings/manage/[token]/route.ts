import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { bookingEventFieldsFrom, getBookingEventByManageToken, updateBookingEvent } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * Edit an event's name/company/description/date range from its public
 * manage link (see manageBookingEventUrlFor) — no login, scoped only by the
 * random manageToken in the URL. Deliberately narrower than the staff-only
 * PATCH on /api/bookings/events/[id]: this route never touches `active` or
 * `requiresConfirmation`, so whoever has this link can't hide/show or (via
 * the sibling DELETE, which doesn't exist here at all) delete the event
 * itself, and can't turn off staff review for their own bookings either —
 * those stay staff-only.
 */
export async function PATCH(request: NextRequest, { params }: { params: { token: string } }) {
  const existing = await getBookingEventByManageToken(params.token);
  if (!existing) {
    return NextResponse.json({ error: "This manage link is invalid." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const fields = bookingEventFieldsFrom(body);
  if (fields.error) {
    return NextResponse.json({ error: fields.error }, { status: 400 });
  }

  const event = await updateBookingEvent(existing.id, {
    name: fields.name,
    description: fields.description,
    companyName: fields.companyName,
    startDate: fields.startDate!,
    endDate: fields.endDate!,
    active: existing.active,
    requiresConfirmation: existing.requiresConfirmation,
  });

  await logActivity({
    documentType: "booking",
    documentId: existing.id,
    type: "EDITED",
    actor: "CLIENT",
    description: `Booking event "${fields.name}" updated via its manage link`,
  });

  return NextResponse.json(event);
}

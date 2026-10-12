import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { sendDocumentEmail } from "@/lib/mailer";
import { bookingCancelledEmailContent } from "@/lib/settings";
import { getEffectiveCompany } from "@/lib/appSettings";
import {
  deleteBooking,
  formatSlotLabel,
  getBookingEventByManageToken,
  getBookingWithSlotAndEvent,
  updateBookingStatus,
} from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * Cancel a booking from its event's public manage link. Unlike the
 * staff-only PATCH on /api/bookings/[id], this route only ever moves a
 * booking to CANCELLED — there's no confirm/reject step to expose here since
 * every booking is already accepted on submission (see createBooking). Same
 * best-effort client-notification email as the staff route.
 */
export async function PATCH(request: NextRequest, { params }: { params: { token: string; bookingId: string } }) {
  const event = await getBookingEventByManageToken(params.token);
  if (!event) {
    return NextResponse.json({ error: "This manage link is invalid." }, { status: 404 });
  }

  const existing = await getBookingWithSlotAndEvent(params.bookingId);
  if (!existing || existing.eventId !== event.id) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (existing.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: `A ${existing.status.toLowerCase()} booking can't be cancelled.` },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const decidedNote = typeof body.decidedNote === "string" ? body.decidedNote.trim() || null : null;
  const booking = await updateBookingStatus(params.bookingId, "CANCELLED", decidedNote);

  const slotLabel = formatSlotLabel(existing.slotDate, existing.slotStartTime, existing.slotDurationMins);
  await logActivity({
    documentType: "booking",
    documentId: params.bookingId,
    type: "EDITED",
    actor: "CLIENT",
    description: `Booking for ${existing.clientName} (${existing.eventName}, ${slotLabel}) cancelled via manage link`,
  });

  let emailWarning: string | null = null;
  if (!existing.clientEmail) {
    emailWarning = "The client has no email on file — please let them know by phone instead.";
  } else {
    try {
      const company = await getEffectiveCompany();
      const { subject, body: emailBody } = bookingCancelledEmailContent({
        clientName: existing.clientName,
        slotLabel: `${existing.eventName} — ${slotLabel}`,
        decidedNote,
        companyName: company.shortName || company.name,
      });
      await sendDocumentEmail({ to: existing.clientEmail, subject, body: emailBody });
      await logActivity({
        documentType: "booking",
        documentId: params.bookingId,
        type: "EMAIL_SENT",
        actor: "SYSTEM",
        description: `Cancellation notice emailed to ${existing.clientEmail}`,
      });
    } catch (err: any) {
      emailWarning = err?.message || "Could not email the client about this cancellation.";
    }
  }

  return NextResponse.json({ ...booking, emailWarning });
}

/**
 * Permanently delete a booking from its event's public manage link — same
 * "test/fake requests only, no client notification" stance as the
 * staff-only DELETE on /api/bookings/[id]; a CONFIRMED booking can't be
 * deleted this way, only cancelled, so a real client is always told.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { token: string; bookingId: string } }) {
  const event = await getBookingEventByManageToken(params.token);
  if (!event) {
    return NextResponse.json({ error: "This manage link is invalid." }, { status: 404 });
  }

  const existing = await getBookingWithSlotAndEvent(params.bookingId);
  if (!existing || existing.eventId !== event.id) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (existing.status === "CONFIRMED") {
    return NextResponse.json(
      { error: "A confirmed booking can't be deleted — cancel it instead so the client is notified." },
      { status: 409 }
    );
  }

  await logActivity({
    documentType: "booking",
    documentId: existing.id,
    type: "DELETED",
    actor: "CLIENT",
    description: `Booking for ${existing.clientName} (${existing.eventName}, ${formatSlotLabel(
      existing.slotDate,
      existing.slotStartTime,
      existing.slotDurationMins
    )}) deleted via manage link — no client notification sent`,
  });

  await deleteBooking(params.bookingId);

  return NextResponse.json({ success: true });
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEffectiveCompany } from "@/lib/appSettings";
import { getBookingEventByManageToken, listBookingsForEvent, listSlotsForEvent } from "@/lib/bookings";
import { bookingEventUrlFromHeaders } from "@/lib/signing";
import PublicBookingManagerClient from "@/components/PublicBookingManagerClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const event = await getBookingEventByManageToken(params.token);
  return { title: event ? `Manage: ${event.name}` : "Manage booking event" };
}

/**
 * An event's own public "manage bookings" page — the destination of the
 * manage link staff copy from the internal /bookings/[id] detail page (see
 * manageBookingEventUrlFor in src/lib/signing.ts). No login: scoped purely
 * by the random manageToken in the URL, same stance as the client's own
 * /booking-cancel/[token] page. Whoever holds the link can edit this one
 * event's own details/slots and cancel/delete its bookings — everything
 * except hiding/showing or deleting the event itself, which stays behind
 * requireAdminPage on the staff-only detail page.
 */
export default async function ManageBookingEventPage({ params }: { params: { token: string } }) {
  const event = await getBookingEventByManageToken(params.token);
  if (!event) notFound();

  const [slots, bookings, company] = await Promise.all([
    listSlotsForEvent(event.id),
    listBookingsForEvent(event.id),
    getEffectiveCompany(),
  ]);

  const bookingUrl = bookingEventUrlFromHeaders(event.id);

  return (
    <PublicBookingManagerClient
      token={params.token}
      bookingUrl={bookingUrl}
      event={{
        id: event.id,
        name: event.name,
        companyName: event.companyName,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        active: event.active,
      }}
      slots={slots.map((s) => ({
        id: s.id,
        date: s.date.toISOString(),
        startTime: s.startTime,
        durationMins: s.durationMins,
        quota: s.quota,
        taken: s.taken,
        available: s.available,
      }))}
      bookings={bookings.map((b) => ({
        id: b.id,
        slotId: b.slotId,
        clientName: b.clientName,
        clientPhone: b.clientPhone,
        clientEmail: b.clientEmail,
        notes: b.notes,
        status: b.status,
        decidedNote: b.decidedNote,
        slotDate: b.slotDate.toISOString(),
        slotStartTime: b.slotStartTime,
        slotDurationMins: b.slotDurationMins,
      }))}
      company={{
        name: company.name,
        shortName: company.shortName,
        logoData: company.logoData,
        logoDataDark: company.logoDataDark,
      }}
    />
  );
}

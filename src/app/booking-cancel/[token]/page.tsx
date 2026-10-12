import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEffectiveCompany } from "@/lib/appSettings";
import { getBookingByCancelToken } from "@/lib/bookings";
import BookingCancelClient from "@/components/BookingCancelClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cancel your booking" };

/**
 * A client's self-service "cancel my booking" link — see the cancelToken
 * column on Booking and bookingCancelUrlFor in src/lib/signing.ts. No login,
 * scoped only by the random token in the URL, same stance as the other
 * public token pages (/sign/[token], /leave/[token]).
 */
export default async function BookingCancelPage({ params }: { params: { token: string } }) {
  const [booking, company] = await Promise.all([getBookingByCancelToken(params.token), getEffectiveCompany()]);
  if (!booking) notFound();

  return (
    <BookingCancelClient
      booking={{
        token: params.token,
        eventName: booking.eventName,
        clientName: booking.clientName,
        status: booking.status,
        slotDate: booking.slotDate.toISOString(),
        slotStartTime: booking.slotStartTime,
        slotDurationMins: booking.slotDurationMins,
      }}
      company={{
        name: company.name,
        shortName: company.shortName,
        logoData: company.logoData,
        logoDataDark: company.logoDataDark,
      }}
    />
  );
}

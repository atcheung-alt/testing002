import { NextResponse } from "next/server";
import { listBookingEvents } from "@/lib/bookings";

export const runtime = "nodejs";
// Without this, Next.js sees a param-less GET with no request-specific
// reads and tries to statically prerender it at BUILD time — which means
// running this query against whatever database the build environment sees
// before any migration has necessarily been applied there. Force it dynamic
// so it only ever runs per-request, same as every other DB-backed route.
export const dynamic = "force-dynamic";

/**
 * GET — every active booking event, for the public /book listing page.
 * Deliberately excludes inactive events entirely (not just visually
 * dimmed) — an event staff have hidden shouldn't be discoverable by anyone
 * guessing at the API.
 */
export async function GET() {
  const events = await listBookingEvents({ activeOnly: true });
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate.toISOString(),
    })),
  });
}

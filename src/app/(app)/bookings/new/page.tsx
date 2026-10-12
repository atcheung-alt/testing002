import { requireAdminPage } from "@/lib/auth";
import NewBookingEventForm from "@/components/NewBookingEventForm";

export const dynamic = "force-dynamic";

export default async function NewBookingEventPage() {
  await requireAdminPage();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">New booking event</h1>
        <p className="text-sm text-ink-muted">
          Give it a name and the range of days it can be booked on — you&apos;ll add its actual time
          slots and quota from its detail page next.
        </p>
      </div>

      <NewBookingEventForm />
    </div>
  );
}

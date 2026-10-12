import { redirect } from "next/navigation";
import { MailQuestion } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyProfileLeaveView } from "@/lib/myProfile";
import { formatDate } from "@/lib/calculations";
import { COMPANY } from "@/lib/company";
import MyLeaveClient from "@/components/MyLeaveClient";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink text-right">{value || "—"}</span>
    </div>
  );
}

export const dynamic = "force-dynamic";

/**
 * Every signed-in account's own self-service tab — the one page a
 * non-admin account can reach under /hr (see requireAdminPage() and its
 * callers, which now send non-admins here instead of /hr/employees).
 * Admins land here too if they click Profile, since an admin can also be an
 * employee with their own leave balance to check.
 */
export default async function MyProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const view = await getMyProfileLeaveView(user.email);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">
          {view ? `Hi, ${view.name}` : "Profile"}
        </h1>
        <p className="text-sm text-ink-muted">Your annual leave balance and request history.</p>
      </div>

      {view ? (
        <>
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold mb-3">Profile</h2>
            <div className="flex flex-col gap-2 text-sm">
              <InfoRow label="Full English name" value={view.name} />
              <InfoRow label="Title / Position" value={view.title} />
              <InfoRow label="Start date" value={formatDate(view.startDate)} />
            </div>
          </div>
          <MyLeaveClient initial={view} />
        </>
      ) : (
        <div className="card p-8 flex flex-col items-center text-center gap-3">
          <MailQuestion size={32} className="text-ink-faint" />
          <p className="text-sm font-medium text-ink">Your account isn&apos;t linked to an employee record yet.</p>
          <p className="text-sm text-ink-muted max-w-sm">
            HR needs to add <span className="font-mono text-ink">{user.email}</span> as your company email on
            your employee record before your leave balance can show up here. Please contact{" "}
            {COMPANY.contact?.email || COMPANY.shortName || COMPANY.name}.
          </p>
        </div>
      )}
    </div>
  );
}

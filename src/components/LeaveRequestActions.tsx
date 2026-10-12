"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/calculations";
import LeaveStatusBadge from "@/components/LeaveStatusBadge";
import type { LeaveRequest } from "@/types";

function RequestRow({
  employeeId,
  request,
  onDecided,
}: {
  employeeId: string;
  request: LeaveRequest;
  onDecided: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(status: "APPROVED" | "REJECTED") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/leave-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, decidedNote: status === "REJECTED" ? note : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      onDecided();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          {formatDate(request.startDate)}
          {request.endDate !== request.startDate ? ` – ${formatDate(request.endDate)}` : ""}
          {request.isHalfDay && (
            <span className="text-xs font-normal text-ink-muted">
              {" "}
              ({request.halfDayPeriod} half-day · 0.5 day)
            </span>
          )}
        </p>
        <LeaveStatusBadge status={request.status} />
      </div>
      {request.reason && <p className="text-xs text-ink-muted">{request.reason}</p>}
      {request.decidedNote && <p className="text-xs text-ink-faint italic">Note: {request.decidedNote}</p>}

      {request.status === "PENDING" && (
        <>
          {error && <p className="text-xs text-danger-600">{error}</p>}
          {rejecting ? (
            <div className="flex flex-col gap-2 mt-1">
              <textarea
                className="input text-xs min-h-[54px]"
                placeholder="Optional note shown to the employee…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide("REJECTED")}
                  className="btn-danger !py-1.5 !px-3 text-xs"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Confirm reject
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRejecting(false)}
                  className="btn-secondary !py-1.5 !px-3 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => decide("APPROVED")}
                className="btn-primary !py-1.5 !px-3 text-xs"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejecting(true)}
                className="btn-secondary !py-1.5 !px-3 text-xs"
              >
                <X size={13} /> Reject
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LeaveRequestActions({
  employeeId,
  requests,
}: {
  employeeId: string;
  requests: LeaveRequest[];
}) {
  const router = useRouter();

  if (requests.length === 0) {
    return <p className="text-sm text-ink-muted">No leave requests yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-line">
      {requests.map((r) => (
        <RequestRow key={r.id} employeeId={employeeId} request={r} onDecided={() => router.refresh()} />
      ))}
    </div>
  );
}

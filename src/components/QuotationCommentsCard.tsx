"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Loader2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/calculations";
import type { QuotationComment } from "@/types";

export default function QuotationCommentsCard({
  quotationId,
  comments,
}: {
  quotationId: string;
  comments: QuotationComment[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendReply() {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send the reply.");
      setMessage("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageSquare size={17} className="text-brand-600" />
        <h2 className="font-display text-lg font-semibold">Comments &amp; feedback</h2>
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No feedback yet. If the client requests changes on the signing page, it will show up
          here.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className={
                c.author === "STAFF"
                  ? "rounded-xl bg-brand-50/60 border border-brand-100 px-3 py-2"
                  : "rounded-xl bg-paper border border-line px-3 py-2"
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink">
                  {c.author === "STAFF" ? `${c.authorName} (HR Plus)` : c.authorName}
                </span>
                <span className="text-xs text-ink-faint">{formatDate(c.createdAt)}</span>
              </div>
              <p className="text-sm text-ink whitespace-pre-line mt-1">{c.message}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="label">Reply to the client</label>
        <textarea
          className="input min-h-[90px]"
          placeholder="Type a reply — the client will be emailed a copy."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="button"
          onClick={sendReply}
          disabled={sending || !message.trim()}
          className="btn-primary self-start"
        >
          {sending ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Send size={15} /> Send reply
            </>
          )}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Mail, X, CheckCircle2, AlertCircle, Loader2, Paperclip } from "lucide-react";
import Portal from "@/components/Portal";

// Mirrors the limits enforced server-side in src/lib/emailAttachments.ts —
// duplicated as literals (rather than imported) so this client component
// doesn't pull that file's server-only `mailer.ts` import into the browser
// bundle. Keep these two in sync if the server limits ever change.
const MAX_EMAIL_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8MB per file

type PickedAttachment = { name: string; size: number; dataUrl: string };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

type Props = {
  kind: "quotations" | "invoices" | "recruitment" | "employees";
  id: string;
  defaultTo: string;
  defaultSubject: string;
  defaultBody: string;
  emailValid: boolean;
  /** Offer a per-send CC field, in addition to any standing CC set in Settings. */
  showCc?: boolean;
  /** Override the default `/api/{kind}/{id}/email` POST target — needed for
   *  sub-resources like an employee's contract, which lives at
   *  `/api/employees/{id}/contract/email` instead. */
  endpoint?: string;
  /** Button label and modal heading — defaults to a plain "Send email" for
   *  the initial send. Pass something like "Send follow-up email" for a
   *  second, distinctly-labeled button on the same page (e.g. an unpaid
   *  invoice's payment reminder) so the two aren't visually interchangeable. */
  label?: string;
  /** Tags this send as a follow-up/reminder rather than the initial send —
   *  forwarded to the API route so the activity timeline logs "Follow-up
   *  reminder emailed to ..." instead of the generic "Emailed to ...". */
  isFollowUp?: boolean;
};

type Status =
  | { type: "idle" }
  | { type: "sending" }
  | { type: "success"; to: string }
  | { type: "error"; message: string };

export default function SendEmailButton({
  kind,
  id,
  defaultTo,
  defaultSubject,
  defaultBody,
  emailValid,
  showCc = false,
  endpoint,
  label = "Send email",
  isFollowUp = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const toValid = emailRe.test(to.trim());

  // Comma/semicolon-separated list of extra recipients for this one send —
  // case by case, on top of any standing CC configured in Settings.
  const ccList = cc
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
  const ccValid = ccList.every((e) => emailRe.test(e));

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    setAttachError(null);

    if (attachments.length + incoming.length > MAX_EMAIL_ATTACHMENTS) {
      setAttachError(`You can attach up to ${MAX_EMAIL_ATTACHMENTS} files.`);
      return;
    }
    const tooBig = incoming.find((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (tooBig) {
      setAttachError(`"${tooBig.name}" is larger than ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB.`);
      return;
    }

    try {
      const added = await Promise.all(
        incoming.map(async (f) => ({ name: f.name, size: f.size, dataUrl: await readFileAsDataUrl(f) }))
      );
      setAttachments((prev) => [...prev, ...added]);
    } catch {
      setAttachError("Could not read one of the selected files.");
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function send() {
    if (!toValid) {
      setStatus({ type: "error", message: "Please enter a valid recipient email address." });
      return;
    }
    if (!ccValid) {
      setStatus({ type: "error", message: "One of the CC email addresses doesn't look valid." });
      return;
    }
    setStatus({ type: "sending" });
    try {
      const res = await fetch(endpoint || `/api/${kind}/${id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          cc: ccList,
          subject,
          body,
          isFollowUp,
          attachments: attachments.map((a) => ({ filename: a.name, data: a.dataUrl })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send the email.");
      setStatus({ type: "success", to: data.to || to.trim() });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStatus({ type: "idle" });
          setAttachments([]);
          setAttachError(null);
          setOpen(true);
        }}
        className="btn-secondary"
        title={emailValid ? "Send by email" : "Add a customer email to enable sending"}
      >
        <Mail size={15} /> {label}
      </button>

      {open && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brand-950/30 backdrop-blur-sm animate-fade-in"
            onClick={() => status.type !== "sending" && setOpen(false)}
          />
          <div className="relative w-full max-w-lg card p-6 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">{label}</h2>
              <button
                type="button"
                onClick={() => status.type !== "sending" && setOpen(false)}
                className="text-ink-faint hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {status.type === "success" ? (
              <div className="flex flex-col items-center text-center gap-3 py-6">
                <CheckCircle2 size={40} className="text-emerald-500" />
                <p className="font-medium">Email sent</p>
                <p className="text-sm text-ink-muted">
                  The PDF was sent to <span className="text-ink">{status.to}</span>.
                </p>
                <button type="button" onClick={() => setOpen(false)} className="btn-primary mt-2">
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {status.type === "error" && (
                  <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{status.message}</span>
                  </div>
                )}

                <div>
                  <label className="label">To</label>
                  <input
                    type="email"
                    className="input"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="customer@example.com"
                  />
                  {!toValid && to.length > 0 && (
                    <p className="mt-1 text-xs text-danger-500">That doesn&apos;t look like a valid email.</p>
                  )}
                </div>

                {showCc && (
                  <div>
                    <label className="label">CC (optional)</label>
                    <input
                      type="text"
                      className="input"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="cc@example.com, another@example.com"
                    />
                    {!ccValid && (
                      <p className="mt-1 text-xs text-danger-500">
                        One of these doesn&apos;t look like a valid email.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="label">Subject</label>
                  <input
                    type="text"
                    className="input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Message</label>
                  <textarea
                    className="input min-h-[160px]"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">
                    The latest PDF is attached automatically, and an HR Plus signature is appended.
                    You can also attach extra files below.
                  </p>
                </div>

                <div>
                  <label className="label">Attachments (optional)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachments.length >= MAX_EMAIL_ATTACHMENTS}
                    className="btn-secondary"
                  >
                    <Paperclip size={14} /> Add files
                  </button>
                  {attachError && <p className="mt-1.5 text-xs text-danger-500">{attachError}</p>}
                  {attachments.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {attachments.map((a, i) => (
                        <li
                          key={`${a.name}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-sm"
                        >
                          <span className="truncate">
                            {a.name}{" "}
                            <span className="text-ink-faint text-xs">
                              ({(a.size / 1024).toFixed(0)} KB)
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(i)}
                            className="text-ink-faint hover:text-danger-500 shrink-0"
                            aria-label={`Remove ${a.name}`}
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1.5 text-xs text-ink-faint">
                    Up to {MAX_EMAIL_ATTACHMENTS} files, {MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB each.
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={status.type === "sending"}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={send}
                    disabled={status.type === "sending" || !toValid || !ccValid}
                    className="btn-primary"
                  >
                    {status.type === "sending" ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Mail size={15} /> Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}

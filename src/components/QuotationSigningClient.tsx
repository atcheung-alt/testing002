"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Send,
  Upload,
  FileText,
  PenLine,
  X,
} from "lucide-react";
import DocumentItemsTable from "@/components/DocumentItemsTable";
import DownloadPdfButton from "@/components/DownloadPdfButton";
import PublicSignaturePad from "@/components/PublicSignaturePad";
import CompanyLogo from "@/components/CompanyLogo";
import { formatDate } from "@/lib/calculations";
import type { PublicQuotationView } from "@/lib/publicQuotation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Comment = PublicQuotationView["comments"][number];

function CommentsCard({
  token,
  comments,
  companyShortName,
  fullName,
  email,
  onSubmitted,
}: {
  token: string;
  comments: Comment[];
  companyShortName: string;
  fullName: string;
  email: string;
  onSubmitted: (comment: Comment) => void;
}) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const nameValid = fullName.trim().length > 0;
  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = nameValid && emailValid && message.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/sign/${token}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          name: fullName.trim(),
          email: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      onSubmitted(data.comment);
      setMessage("");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-brand-600" />
        <h2 className="font-display text-lg font-semibold">Comments &amp; feedback</h2>
      </div>

      {comments.length > 0 && (
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
                  {c.author === "STAFF" ? `${c.authorName} (${companyShortName})` : c.authorName}
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

      {sent && (
        <p className="text-sm text-brand-600">
          Thanks — your feedback has been sent to {companyShortName}. You can still sign below once
          things have been sorted out, or leave another comment below.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label className="label">Not ready to accept as-is? Tell us what needs to change</label>
        <textarea
          className="input min-h-[90px]"
          placeholder="e.g. Could we adjust the quantity on item 2, or revisit the pricing?"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setSent(false);
          }}
        />
        {!nameValid || !emailValid ? (
          <p className="text-xs text-ink-faint">
            Fill in your full name and email above so we know who&apos;s asking.
          </p>
        ) : null}
        <button
          type="button"
          className="btn-secondary self-start"
          disabled={!canSubmit}
          onClick={submit}
        >
          {submitting ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Send size={15} /> Send feedback / request changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function CompanyHeader({ company }: { company: PublicQuotationView["company"] }) {
  return (
    <div className="flex justify-end mb-2">
      {company.logoData ? (
        <CompanyLogo
          logoData={company.logoData}
          logoDataDark={company.logoDataDark}
          name={company.name}
          className="h-9 object-contain"
        />
      ) : (
        <span className="font-display text-xl font-semibold text-brand-800">{company.name}</span>
      )}
    </div>
  );
}

function BilledToCard({ customer }: { customer: PublicQuotationView["customer"] }) {
  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
        Billed to
      </h2>
      <p className="font-medium text-sm">{customer.name}</p>
      {[customer.contact, customer.address, customer.email, customer.phone]
        .filter(Boolean)
        .map((line, i) => (
          <p key={i} className="text-sm text-ink-muted whitespace-pre-line">
            {line}
          </p>
        ))}
    </div>
  );
}

function SignedSummary({
  view,
  comments,
  justSigned,
}: {
  view: PublicQuotationView;
  comments: Comment[];
  justSigned?: {
    signerName: string;
    signedAt: string;
    invoiceNumber?: string | null;
    signedDocumentName?: string | null;
  } | null;
}) {
  const signerName = justSigned?.signerName || view.signerName;
  const signedAt = justSigned?.signedAt || view.signedAt;
  const signedDocumentName = justSigned?.signedDocumentName || view.signedDocumentName;
  const hasSignedDocument = Boolean(justSigned?.signedDocumentName) || view.hasSignedDocument;

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6 sm:p-8 flex flex-col items-center text-center gap-3">
        <CheckCircle2 size={44} className="text-emerald-500" />
        <h2 className="font-display text-xl font-semibold text-ink">
          {justSigned ? "Quotation accepted — thank you!" : "This quotation has already been signed"}
        </h2>
        <p className="text-sm text-ink-muted max-w-md">
          {justSigned
            ? `A copy of the signed quotation ${view.number} has been emailed to you and to ${
                view.company.shortName || view.company.name
              }.`
            : `Quotation ${view.number} was signed by ${signerName || "the client"}${
                signedAt ? ` on ${formatDate(signedAt)}` : ""
              }.`}
        </p>
        {justSigned?.invoiceNumber && (
          <p className="text-sm text-ink-muted max-w-md">
            Invoice {justSigned.invoiceNumber} has also been emailed to you, with a link to view
            it online and let us know once it&apos;s paid.
          </p>
        )}

        {hasSignedDocument ? (
          <div className="mt-2 flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2">
              <FileText size={16} className="text-brand-600" />
              <span className="text-sm text-ink">{signedDocumentName || "Signed document"}</span>
            </div>
            <p className="text-xs text-ink-faint">Uploaded by {signerName}</p>
          </div>
        ) : view.signatureData ? (
          <div className="mt-2 flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={view.signatureData}
              alt="Signature"
              className="max-h-20 bg-white rounded-lg border border-line"
            />
            <p className="text-xs text-ink-faint">{signerName}</p>
          </div>
        ) : null}
      </div>

      {comments.length > 0 && (
        <div className="card p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-brand-600" />
            <h2 className="font-display text-lg font-semibold">Comments &amp; feedback</h2>
          </div>
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
                  {c.author === "STAFF"
                    ? `${c.authorName} (${view.company.shortName || view.company.name})`
                    : c.authorName}
                </span>
                <span className="text-xs text-ink-faint">{formatDate(c.createdAt)}</span>
              </div>
              <p className="text-sm text-ink whitespace-pre-line mt-1">{c.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuotationSigningClient({
  token,
  initial,
}: {
  token: string;
  initial: PublicQuotationView;
}) {
  const [view] = useState(initial);
  const [comments, setComments] = useState<Comment[]>(initial.comments || []);
  const [fullName, setFullName] = useState(view.customer.contact || "");
  const [email, setEmail] = useState(view.customer.email || "");
  const [method, setMethod] = useState<"draw" | "upload">("draw");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileData, setUploadedFileData] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState<{
    signerName: string;
    signedAt: string;
    invoiceNumber?: string | null;
    signedDocumentName?: string | null;
  } | null>(null);

  const nameValid = fullName.trim().length > 0;
  const emailValid = EMAIL_RE.test(email.trim());
  const proofProvided = method === "draw" ? Boolean(signatureData) : Boolean(uploadedFileData);
  const canSubmit = nameValid && emailValid && proofProvided && !submitting;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file if they change their mind
    if (!file) return;

    setUploadError(null);
    setUploadedFileData(null);
    setUploadedFileName(null);

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please upload a PDF file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("That file is too large — please keep it under 15 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFileData(typeof reader.result === "string" ? reader.result : null);
      setUploadedFileName(file.name);
    };
    reader.onerror = () => setUploadError("Couldn't read that file — please try again.");
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureData: method === "draw" ? signatureData : undefined,
          signedDocumentData: method === "upload" ? uploadedFileData : undefined,
          signedDocumentName: method === "upload" ? uploadedFileName : undefined,
          signerName: fullName.trim(),
          signerEmail: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setJustSigned({
        signerName: fullName.trim(),
        signedAt: data.signedAt,
        invoiceNumber: data.invoiceNumber,
        signedDocumentName: method === "upload" ? uploadedFileName : null,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const alreadySigned = view.signed || Boolean(justSigned);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
      <CompanyHeader company={view.company} />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Quotation {view.number}
          </h1>
          {view.title && <p className="text-sm text-ink-muted mt-0.5">{view.title}</p>}
        </div>
        <DownloadPdfButton url={`/api/public/sign/${token}/pdf`} />
      </div>

      {alreadySigned ? (
        <SignedSummary view={view} comments={comments} justSigned={justSigned} />
      ) : !view.signable ? (
        <div className="card p-6 text-center text-sm text-ink-muted">
          This quotation is no longer available for online signing. Please contact{" "}
          {view.company.contact?.email || view.company.shortName || view.company.name} for
          assistance.
        </div>
      ) : (
        <>
          <BilledToCard customer={view.customer} />

          <DocumentItemsTable
            items={view.items}
            subtotal={view.subtotal}
            discount={view.discount}
            taxRate={view.taxRate}
            taxAmount={view.taxAmount}
            total={view.total}
            repeatCount={view.repeatCount}
            rawSubtotal={view.rawSubtotal}
          />

          {view.reminder && (
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                Reminder
              </h2>
              <p className="text-sm text-ink whitespace-pre-line">{view.reminder}</p>
            </div>
          )}

          {view.terms && (
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                Terms &amp; conditions
              </h2>
              <p className="text-sm text-ink whitespace-pre-line">{view.terms}</p>
            </div>
          )}

          <div className="card p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-600" />
              <h2 className="font-display text-lg font-semibold">Accept &amp; sign</h2>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {!emailValid && email.length > 0 && (
                  <p className="mt-1 text-xs text-danger-500">
                    That doesn&apos;t look like a valid email.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label">Confirm your acceptance *</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMethod("draw")}
                  className={
                    method === "draw"
                      ? "stamp gap-1 border-brand-500 text-brand-500"
                      : "stamp gap-1 border-line text-ink-muted"
                  }
                >
                  <PenLine size={13} /> Draw signature
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("upload")}
                  className={
                    method === "upload"
                      ? "stamp gap-1 border-brand-500 text-brand-500"
                      : "stamp gap-1 border-line text-ink-muted"
                  }
                >
                  <Upload size={13} /> Upload signed PDF
                </button>
              </div>

              {method === "draw" ? (
                <PublicSignaturePad
                  fullName={fullName}
                  value={signatureData}
                  onChange={setSignatureData}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-ink-muted">
                    Download the quotation, print it, sign it, scan or photograph it back into a
                    PDF, then upload it here.
                  </p>
                  {uploadedFileName ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-brand-600 shrink-0" />
                        <span className="text-sm text-ink truncate">{uploadedFileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFileData(null);
                          setUploadedFileName(null);
                        }}
                        aria-label="Remove file"
                        className="text-ink-faint hover:text-danger-500 transition-colors shrink-0"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-8 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                      <Upload size={22} className="text-ink-faint" />
                      <span className="text-sm text-ink-muted">Click to choose a PDF</span>
                      <span className="text-xs text-ink-faint">PDF only, up to 15 MB</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                  {uploadError && (
                    <p className="text-xs text-danger-500">{uploadError}</p>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-ink-faint">
              By clicking &ldquo;Accept &amp; Sign&rdquo;, you confirm that you have reviewed
              quotation {view.number} in full and agree to the terms and conditions stated above.
              Your name, email, {method === "draw" ? "signature" : "uploaded document"}, and IP
              address will be recorded with the timestamp of signing.
            </p>

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="btn-primary self-start"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <ShieldCheck size={15} /> Accept &amp; Sign
                </>
              )}
            </button>
          </div>

          <CommentsCard
            token={token}
            comments={comments}
            companyShortName={view.company.shortName || view.company.name}
            fullName={fullName}
            email={email}
            onSubmitted={(c) => setComments((prev) => [...prev, c])}
          />
        </>
      )}
    </div>
  );
}

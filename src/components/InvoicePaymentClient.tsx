"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, BadgeDollarSign, Clock } from "lucide-react";
import DocumentItemsTable from "@/components/DocumentItemsTable";
import DownloadPdfButton from "@/components/DownloadPdfButton";
import CompanyLogo from "@/components/CompanyLogo";
import { formatDate } from "@/lib/calculations";
import type { PublicInvoiceView } from "@/lib/publicInvoice";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CompanyHeader({ company }: { company: PublicInvoiceView["company"] }) {
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

function BilledToCard({ customer }: { customer: PublicInvoiceView["customer"] }) {
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

export default function InvoicePaymentClient({
  token,
  initial,
}: {
  token: string;
  initial: PublicInvoiceView;
}) {
  const [view, setView] = useState(initial);
  const [fullName, setFullName] = useState(view.customer.contact || "");
  const [email, setEmail] = useState(view.customer.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const nameValid = fullName.trim().length > 0;
  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = nameValid && emailValid && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/invoice/${token}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setJustSubmitted(true);
      setView((v) => ({ ...v, pendingVerification: true, payable: false }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
      <CompanyHeader company={view.company} />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Invoice {view.number}</h1>
          {view.title && <p className="text-sm text-ink-muted mt-0.5">{view.title}</p>}
        </div>
        <DownloadPdfButton url={`/api/public/invoice/${token}/pdf`} />
      </div>

      {view.paid ? (
        <div className="card p-6 sm:p-8 flex flex-col items-center text-center gap-3">
          <CheckCircle2 size={44} className="text-emerald-500" />
          <h2 className="font-display text-xl font-semibold text-ink">
            This invoice has been paid — thank you!
          </h2>
          {view.receiptNumber && (
            <p className="text-sm text-ink-muted max-w-md">
              A receipt ({view.receiptNumber}) has been emailed to you for your records.
            </p>
          )}
        </div>
      ) : view.pendingVerification ? (
        <div className="card p-6 sm:p-8 flex flex-col items-center text-center gap-3">
          <Clock size={44} className="text-brand-500" />
          <h2 className="font-display text-xl font-semibold text-ink">
            {justSubmitted ? "Thanks — payment noted!" : "Payment already submitted"}
          </h2>
          <p className="text-sm text-ink-muted max-w-md">{pendingVerificationNote(view)}</p>
        </div>
      ) : null}

      <BilledToCard customer={view.customer} />

      <DocumentItemsTable
        items={view.items}
        subtotal={view.subtotal}
        discount={view.discount}
        taxRate={view.taxRate}
        taxAmount={view.taxAmount}
        total={view.total}
      />

      {view.poNumber && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
            PO Number
          </h2>
          <p className="text-sm text-ink">{view.poNumber}</p>
        </div>
      )}

      {view.payable && (
        <div className="card p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <BadgeDollarSign size={18} className="text-brand-600" />
            <h2 className="font-display text-lg font-semibold">Mark as Paid</h2>
          </div>

          <p className="text-sm text-ink-muted">
            Already settled this invoice? Let us know so we can verify the payment and send your
            receipt.
          </p>

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

          <p className="text-xs text-ink-faint">
            By clicking &ldquo;Mark as Paid&rdquo;, you confirm that payment for invoice{" "}
            {view.number} has been sent. {view.company.shortName || view.company.name} will verify
            and email you a receipt once confirmed.
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
                <BadgeDollarSign size={15} /> Mark as Paid
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function pendingVerificationNote(view: PublicInvoiceView): string {
  const who = view.company.shortName || view.company.name;
  const when = view.paymentSubmittedAt ? ` on ${formatDate(view.paymentSubmittedAt)}` : "";
  return `We've recorded your payment${when} and ${who} is verifying it. You'll receive a receipt by email once confirmed.`;
}

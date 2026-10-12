import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/calculations";
import StatusBadge from "@/components/StatusBadge";
import StatusUpdater from "@/components/StatusUpdater";
import DownloadPdfButton from "@/components/DownloadPdfButton";
import SendEmailButton from "@/components/SendEmailButton";
import CopySigningLinkButton from "@/components/CopySigningLinkButton";
import DeleteButton from "@/components/DeleteButton";
import DuplicateButton from "@/components/DuplicateButton";
import ConvertToInvoiceButton from "@/components/ConvertToInvoiceButton";
import DocumentItemsTable from "@/components/DocumentItemsTable";
import QuotationCommentsCard from "@/components/QuotationCommentsCard";
import ActivityTimeline from "@/components/ActivityTimeline";
import { defaultEmailContent, isValidEmail } from "@/lib/settings";
import { COMPANY } from "@/lib/company";
import { ensureSigningToken, signingUrlFromHeaders } from "@/lib/signing";
import { withParsedMultipliersList } from "@/lib/multipliers";
import { withParsedFeesList } from "@/lib/fees";
import { getActivityTimeline } from "@/lib/activity";
import { computeTotals } from "@/lib/calculations";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({ params }: { params: { id: string } }) {
  const raw = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      invoice: { select: { id: true, number: true } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!raw) notFound();
  const quotation = { ...raw, items: withParsedFeesList(withParsedMultipliersList(raw.items)) };
  const timeline = await getActivityTimeline("quotation", quotation.id);

  const locked = quotation.status === "CONVERTED";
  const signed = Boolean(quotation.signedAt);

  const token = await ensureSigningToken(quotation.id);
  const signingUrl = token ? signingUrlFromHeaders(token) : null;

  const email = defaultEmailContent({
    kind: "Quotation",
    number: quotation.number,
    title: quotation.title,
    customerName: quotation.customerName,
    companyName: COMPANY.shortName || COMPANY.name,
    signingUrl,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl font-semibold text-ink">{quotation.number}</h1>
            <StatusBadge status={quotation.status} />
          </div>
          {quotation.title && (
            <p className="text-sm font-medium text-ink mb-0.5">{quotation.title}</p>
          )}
          <p className="text-sm text-ink-muted">
            <span className="text-brand-600 font-medium">{quotation.customerName}</span>{" "}
            · Issued {formatDate(quotation.issueDate)}
            {quotation.expiryDate ? ` · Valid until ${formatDate(quotation.expiryDate)}` : ""}
          </p>
          {quotation.invoice && (
            <p className="text-sm text-accent-600 mt-1">
              Converted to invoice{" "}
              <Link href={`/invoices/${quotation.invoice.id}`} className="underline">
                {quotation.invoice.number}
              </Link>
            </p>
          )}
        </div>
        {/* No shrink-0 here on purpose — that's what caused the overflow.
            shrink-0 told the browser this box may never get narrower than
            its "everything on one line" width, which blocked its own
            flex-wrap rows from ever actually wrapping at in-between
            viewport widths. Letting it shrink/wrap normally (and letting
            the outer row above wrap this whole block onto its own line via
            flex-wrap when there isn't room beside the heading) fixes every
            width, not just one breakpoint. */}
        <div className="flex flex-wrap gap-2 items-start sm:justify-end">
          <StatusUpdater kind="quotation" id={quotation.id} status={quotation.status} disabled={locked} />
          <DownloadPdfButton url={`/api/quotations/${quotation.id}/pdf`} />
          <SendEmailButton
            kind="quotations"
            id={quotation.id}
            defaultTo={quotation.customerEmail || ""}
            defaultSubject={email.subject}
            defaultBody={email.body}
            emailValid={isValidEmail(quotation.customerEmail)}
            showCc
          />
          {!signed && signingUrl && <CopySigningLinkButton url={signingUrl} />}
          {!locked && (
            <Link href={`/quotations/${quotation.id}/edit`} className="btn-secondary">
              <Pencil size={15} /> Edit
            </Link>
          )}
          <DuplicateButton kind="quotation" id={quotation.id} />
          <DeleteButton
            url={`/api/quotations/${quotation.id}`}
            confirmNumber={quotation.number}
            itemLabel="quotation"
            redirectTo="/quotations"
            extraWarning={
              quotation.invoice
                ? `This will also delete its linked invoice ${quotation.invoice.number} (and its receipt, if paid).`
                : undefined
            }
            />
        </div>
      </div>

      {quotation.status === "CHANGES_REQUESTED" && (
        <div className="card p-4 bg-accent-100/50 border-accent-300 text-sm text-accent-600">
          The client requested changes instead of accepting this quotation as-is — see their
          feedback below.
        </div>
      )}

      {!locked && quotation.status !== "REJECTED" && !quotation.invoice && (
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-brand-50/60 border-brand-100">
          <p className="text-sm text-brand-700">
            Ready to bill this? Converting locks the quotation and creates a matching invoice.
          </p>
          <ConvertToInvoiceButton quotationId={quotation.id} />
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
          Billed to
        </h2>
        <p className="font-medium text-sm">{quotation.customerName}</p>
        {[
          quotation.customerContact,
          quotation.customerAddress,
          quotation.customerEmail,
          quotation.customerPhone,
        ]
          .filter(Boolean)
          .map((line, i) => (
            <p key={i} className="text-sm text-ink-muted whitespace-pre-line">
              {line}
            </p>
          ))}
      </div>

      <DocumentItemsTable
        items={quotation.items}
        subtotal={quotation.subtotal}
        discount={quotation.discount}
        taxRate={quotation.taxRate}
        taxAmount={quotation.taxAmount}
        total={quotation.total}
        repeatCount={quotation.repeatCount}
        rawSubtotal={computeTotals(quotation.items, quotation.taxRate, quotation.discount, quotation.repeatCount).rawSubtotal}
      />

      {quotation.reminder && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
            Reminder
          </h2>
          <p className="text-sm text-ink whitespace-pre-line">{quotation.reminder}</p>
        </div>
      )}

      {(quotation.notes || quotation.terms) && (
        <div
          className={
            quotation.notes && quotation.terms
              ? "grid grid-cols-1 sm:grid-cols-2 gap-6"
              : "grid grid-cols-1 gap-6"
          }
        >
          {quotation.notes && (
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                Notes
              </h2>
              <p className="text-sm text-ink whitespace-pre-line">{quotation.notes}</p>
            </div>
          )}
          {quotation.terms && (
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                Terms
              </h2>
              <p className="text-sm text-ink whitespace-pre-line">{quotation.terms}</p>
            </div>
          )}
        </div>
      )}

      <QuotationCommentsCard
        quotationId={quotation.id}
        comments={quotation.comments.map((c) => ({
          id: c.id,
          author: c.author,
          authorName: c.authorName,
          message: c.message,
          createdAt: c.createdAt.toISOString(),
        }))}
      />

      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
          Client acceptance
        </h2>
        {signed ? (
          <div>
            {quotation.signedDocumentData ? (
              <a
                href={`/api/quotations/${quotation.id}/signed-document`}
                className="btn-secondary"
              >
                <FileDown size={15} />
                Download {quotation.signedDocumentName || "signed document"}
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quotation.signatureData || undefined}
                alt="Client signature"
                className="max-h-24 bg-white rounded-lg border border-line"
              />
            )}
            <p className="mt-2 text-sm text-ink">
              Signed by {quotation.signerName || quotation.customerName}
              {quotation.signerEmail ? ` (${quotation.signerEmail})` : ""}
            </p>
            <p className="text-xs text-ink-faint">
              {formatDate(quotation.signedAt!)}
              {quotation.signedIp ? ` · IP ${quotation.signedIp}` : ""}
              {quotation.signedDocumentData ? " · uploaded a scanned/printed document" : ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Not signed yet.{" "}
            {signingUrl && (
              <>
                Share the{" "}
                <Link href={signingUrl} target="_blank" className="text-brand-600 hover:underline">
                  signing link
                </Link>{" "}
                with the client, or use &ldquo;Send email&rdquo; above.
              </>
            )}
          </p>
        )}
      </div>

      <ActivityTimeline events={timeline} />
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { Receipt as ReceiptIcon, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/calculations";
import { dateRangeFilter } from "@/lib/dateRange";
import EmptyState from "@/components/EmptyState";
import SearchBox from "@/components/SearchBox";
import DateRangeFilter from "@/components/DateRangeFilter";
import DownloadPdfButton from "@/components/DownloadPdfButton";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

async function ReceiptList({ q, from, to }: { q?: string; from?: string; to?: string }) {
  const receipts = await prisma.receipt.findMany({
    where: {
      issueDate: dateRangeFilter(from, to),
      invoice: q
        ? {
            OR: [
              { customerName: { contains: q, mode: "insensitive" } },
              { customerEmail: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
    },
    include: {
      invoice: { select: { id: true, number: true, customerName: true, total: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  if (receipts.length === 0) {
    return (
      <EmptyState
        icon={ReceiptIcon}
        title="No receipts found"
        description="Try adjusting your filters. Receipts are generated automatically once an invoice is verified as Paid."
      />
    );
  }

  return (
    <div className="card divide-y divide-line">
      {receipts.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between px-4 sm:px-5 py-4 gap-3"
        >
          <Link href={r.invoice ? `/invoices/${r.invoice.id}` : "#"} className="min-w-0 hover:opacity-80">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">{r.number}</span>
              {r.invoice && (
                <span className="text-xs text-ink-faint">for {r.invoice.number}</span>
              )}
            </div>
            <p className="text-xs text-ink-muted truncate mt-0.5">
              {r.invoice?.customerName || "—"} · Issued {formatDate(r.issueDate)}
            </p>
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-sm font-medium">
              {formatCurrency(r.invoice?.total || 0)}
            </span>
            <DownloadPdfButton url={`/api/receipts/${r.id}/pdf`} />
            <DeleteButton
              url={`/api/receipts/${r.id}`}
              confirmNumber={r.number}
              itemLabel="receipt"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReceiptsPage({
  searchParams,
}: {
  searchParams: { q?: string; from?: string; to?: string };
}) {
  const exportParams = new URLSearchParams();
  if (searchParams.q) exportParams.set("q", searchParams.q);
  if (searchParams.from) exportParams.set("from", searchParams.from);
  if (searchParams.to) exportParams.set("to", searchParams.to);
  const exportHref = `/api/receipts/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Receipts</h1>
          <p className="text-sm text-ink-muted">
            Generated automatically whenever an invoice is verified as paid.
          </p>
        </div>
        <a href={exportHref} className="btn-secondary shrink-0">
          <Download size={15} /> Export CSV
        </a>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchBox placeholder="Search by customer…" />
        <DateRangeFilter />
      </div>

      <Suspense fallback={<div className="text-sm text-ink-muted">Loading…</div>}>
        <ReceiptList q={searchParams.q} from={searchParams.from} to={searchParams.to} />
      </Suspense>
    </div>
  );
}

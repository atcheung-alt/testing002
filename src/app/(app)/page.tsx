import Link from "next/link";
import { FileText, ReceiptText, Wallet, AlertTriangle, ArrowRight, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/calculations";
import { getInvoiceDisplayStatus, isOverdueInvoice } from "@/lib/invoiceStatus";
import { getCurrentMonthFinance } from "@/lib/finance";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [quotations, invoices, recentQuotations, recentInvoices, thisMonth] =
    await Promise.all([
      prisma.quotation.findMany({ select: { status: true, total: true } }),
      prisma.invoice.findMany({ select: { status: true, total: true, dueDate: true } }),
      prisma.quotation.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      getCurrentMonthFinance(),
    ]);

  const outstanding = invoices
    .filter(
      (i) =>
        i.status === "UNPAID" || i.status === "OVERDUE" || i.status === "PENDING_VERIFICATION"
    )
    .reduce((sum, i) => sum + i.total, 0);
  const quotedValue = quotations
    .filter((q) => q.status === "SENT" || q.status === "DRAFT")
    .reduce((sum, q) => sum + q.total, 0);

  const overdueInvoices = invoices.filter(isOverdueInvoice);
  const overdueCount = overdueInvoices.length;
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Dashboard</h1>
        <p className="text-sm text-ink-muted">
          A quick look at your pipeline of quotations and invoices.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">This month</h2>
          <Link
            href="/analysis"
            className="text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1"
          >
            Full analysis <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Revenue"
            value={formatCurrency(thisMonth.revenue)}
            icon={TrendingUp}
            accent="brand"
          />
          <StatCard
            label="Expenses"
            value={formatCurrency(thisMonth.expenses)}
            icon={TrendingDown}
            accent="danger"
          />
          <StatCard
            label="Net profit"
            value={formatCurrency(thisMonth.profit)}
            icon={PiggyBank}
            accent={thisMonth.profit < 0 ? "danger" : "accent"}
          />
        </div>
        <p className="text-xs text-ink-faint mt-2">
          Based on invoices paid this calendar month, minus their logged expenses.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Quotations" value={String(quotations.length)} icon={FileText} />
          <StatCard label="Invoices" value={String(invoices.length)} icon={ReceiptText} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Outstanding"
            value={formatCurrency(outstanding)}
            icon={Wallet}
            accent="accent"
          />
          <StatCard
            label="Overdue"
            value={formatCurrency(overdueAmount)}
            icon={AlertTriangle}
            accent="danger"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Recent quotations</h2>
            <Link
              href="/quotations"
              className="text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recentQuotations.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No quotations yet"
              description="Create your first quotation to start quoting customers for work."
              actionHref="/quotations/new"
              actionLabel="New quotation"
            />
          ) : (
            <div className="card divide-y divide-line">
              {recentQuotations.map((q) => (
                <Link
                  key={q.id}
                  href={`/quotations/${q.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-paper transition-colors"
                >
                  <div>
                    <p className="font-mono text-sm font-medium text-ink">{q.number}</p>
                    <p className="text-xs text-ink-muted">
                      {q.customerName} · {formatDate(q.issueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{formatCurrency(q.total)}</span>
                    <StatusBadge status={q.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Recent invoices</h2>
            <Link
              href="/invoices"
              className="text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No invoices yet"
              description="Convert an accepted quotation, or create an invoice directly."
              actionHref="/invoices/new"
              actionLabel="New invoice"
            />
          ) : (
            <div className="card divide-y divide-line">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-paper transition-colors"
                >
                  <div>
                    <p className="font-mono text-sm font-medium text-ink">{inv.number}</p>
                    <p className="text-xs text-ink-muted">
                      {inv.customerName} · {formatDate(inv.issueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{formatCurrency(inv.total)}</span>
                    <StatusBadge status={getInvoiceDisplayStatus(inv)} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {(quotedValue > 0 || overdueCount > 0) && (
        <div className="flex flex-col gap-1">
          {overdueCount > 0 && (
            <p className="text-xs text-danger-500">
              {overdueCount} invoice{overdueCount === 1 ? "" : "s"} overdue, totalling{" "}
              {formatCurrency(overdueAmount)}.
            </p>
          )}
          {quotedValue > 0 && (
            <p className="text-xs text-ink-muted">
              {formatCurrency(quotedValue)} in open quotations awaiting a response.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

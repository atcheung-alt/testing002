import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/calculations";
import { getInvoiceDisplayStatus } from "@/lib/invoiceStatus";
import { dateRangeFilter } from "@/lib/dateRange";
import { buildCsv, csvResponseHeaders } from "@/lib/csv";

/**
 * CSV export for the invoices list — takes the exact same `q`/`status`/
 * `from`/`to` query params as the /invoices page (including the "OVERDUE"
 * special case, which isn't a literal stored status — see
 * src/lib/invoiceStatus.ts) so "Export CSV" always reflects whatever
 * search and filters are active.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || undefined;
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const from = request.nextUrl.searchParams.get("from") || undefined;
  const to = request.nextUrl.searchParams.get("to") || undefined;

  const invoices = await prisma.invoice.findMany({
    where: {
      status: status === "OVERDUE" ? "UNPAID" : status || undefined,
      dueDate: status === "OVERDUE" ? { lt: new Date() } : undefined,
      issueDate: dateRangeFilter(from, to),
      OR: q
        ? [
            { customerName: { contains: q, mode: "insensitive" } },
            { customerEmail: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = invoices.map((inv) => {
    const displayStatus = getInvoiceDisplayStatus(inv);
    return [
      inv.number,
      inv.customerName,
      displayStatus,
      formatDate(inv.issueDate),
      formatDate(inv.dueDate),
      inv.total.toFixed(2),
      displayStatus === "PAID" ? "Paid" : "Unpaid",
    ];
  });

  const csv = buildCsv(
    ["Number", "Customer", "Status", "Issue Date", "Due Date", "Total", "Payment Status"],
    rows
  );

  return new NextResponse(csv, { headers: csvResponseHeaders("invoices.csv") });
}

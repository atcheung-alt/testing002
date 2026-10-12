import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/calculations";
import { dateRangeFilter } from "@/lib/dateRange";
import { buildCsv, csvResponseHeaders } from "@/lib/csv";

/**
 * CSV export for the receipts list — takes the same `q`/`from`/`to` query
 * params as the /receipts page. Receipts don't carry their own status/due
 * date (a receipt only ever exists for an invoice that's already Paid), so
 * those columns reflect the linked invoice for context rather than being
 * left blank.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || undefined;
  const from = request.nextUrl.searchParams.get("from") || undefined;
  const to = request.nextUrl.searchParams.get("to") || undefined;

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
      invoice: { select: { number: true, customerName: true, status: true, dueDate: true, total: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  const rows = receipts.map((r) => [
    r.number,
    r.invoice?.customerName || "",
    "PAID",
    formatDate(r.issueDate),
    formatDate(r.invoice?.dueDate || null),
    (r.invoice?.total || 0).toFixed(2),
    "Paid",
  ]);

  const csv = buildCsv(
    ["Number", "Customer", "Status", "Issue Date", "Due Date", "Total", "Payment Status"],
    rows
  );

  return new NextResponse(csv, { headers: csvResponseHeaders("receipts.csv") });
}

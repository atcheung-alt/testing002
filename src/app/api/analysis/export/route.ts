import { NextRequest, NextResponse } from "next/server";
import { getFinanceByPeriod, getAccountsReceivable, type FinanceGranularity } from "@/lib/finance";
import { formatCurrency } from "@/lib/calculations";
import { buildCsv, csvResponseHeaders } from "@/lib/csv";

export const dynamic = "force-dynamic";

const VALID_GRANULARITIES: FinanceGranularity[] = ["week", "month", "year"];

function parseGranularity(value: string | null): FinanceGranularity {
  return VALID_GRANULARITIES.includes(value as FinanceGranularity) ? (value as FinanceGranularity) : "month";
}

function parseRefDate(value: string | null): Date {
  if (value) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export async function GET(request: NextRequest) {
  const granularity = parseGranularity(request.nextUrl.searchParams.get("granularity"));
  const refDate = parseRefDate(request.nextUrl.searchParams.get("ref"));

  const { buckets, rangeLabel } = await getFinanceByPeriod(granularity, refDate);
  const ar = await getAccountsReceivable();

  const totalRevenue = buckets.reduce((sum, b) => sum + b.revenue, 0);
  const totalExpenses = buckets.reduce((sum, b) => sum + b.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  const periodHeader = granularity === "year" ? "Month" : "Day";
  const rows = buckets.map((b) => [
    b.label,
    b.revenue.toFixed(2),
    b.expenses.toFixed(2),
    b.profit.toFixed(2),
  ]);

  // Blank separator row, then an overall summary block for the period —
  // including Outstanding, which isn't a per-bucket figure (it's a live
  // snapshot of unpaid invoices as of right now, not something historical
  // buckets can meaningfully show).
  rows.push(["", "", "", ""]);
  rows.push(["Summary for " + rangeLabel, "", "", ""]);
  rows.push(["Total Revenue", formatCurrency(totalRevenue), "", ""]);
  rows.push(["Total Expenses", formatCurrency(totalExpenses), "", ""]);
  rows.push(["Net Profit", formatCurrency(totalProfit), "", ""]);
  rows.push(["Outstanding (as of today)", formatCurrency(ar.total), "", ""]);

  const csv = buildCsv([periodHeader, "Revenue", "Expenses", "Net Profit"], rows);

  return new NextResponse(csv, {
    headers: csvResponseHeaders(`analysis-${granularity}-${refDate.toISOString().slice(0, 10)}.csv`),
  });
}

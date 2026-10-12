import { NextRequest, NextResponse } from "next/server";
import { getBudget, upsertBudget } from "@/lib/finance";

export const dynamic = "force-dynamic";

function parseYearMonth(request: NextRequest): { year: number; month: number } | null {
  const year = Number(request.nextUrl.searchParams.get("year"));
  const month = Number(request.nextUrl.searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export async function GET(request: NextRequest) {
  const parsed = parseYearMonth(request);
  if (!parsed) {
    return NextResponse.json({ error: "Please provide a valid year and month (1-12)." }, { status: 400 });
  }
  const budget = await getBudget(parsed.year, parsed.month);
  return NextResponse.json(budget);
}

export async function PUT(request: NextRequest) {
  const parsed = parseYearMonth(request);
  if (!parsed) {
    return NextResponse.json({ error: "Please provide a valid year and month (1-12)." }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const targetRevenue = Number(body.targetRevenue);
  const targetExpenses = Number(body.targetExpenses);
  if (!Number.isFinite(targetRevenue) || targetRevenue < 0) {
    return NextResponse.json({ error: "Please enter a valid target revenue." }, { status: 400 });
  }
  if (!Number.isFinite(targetExpenses) || targetExpenses < 0) {
    return NextResponse.json({ error: "Please enter a valid target expenses." }, { status: 400 });
  }

  const budget = await upsertBudget(parsed.year, parsed.month, targetRevenue, targetExpenses);
  return NextResponse.json(budget);
}

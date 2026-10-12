import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeFees } from "@/lib/fees";
import { normalizeMultipliers } from "@/lib/multipliers";
import { lineItemTemplateKey } from "@/lib/lineItemTemplates";

export const dynamic = "force-dynamic";

/** Past invoice line items, grouped into reusable templates. Read-only:
 *  nothing here is written back to invoices or the item library. */
export async function GET() {
  const rows = await prisma.invoiceItem.findMany({
    where: { name: { not: "" } },
    orderBy: { invoice: { updatedAt: "desc" } },
    take: 800,
    select: {
      name: true,
      description: true,
      unit: true,
      unitPrice: true,
      multipliers: true,
      duration: true,
      fees: true,
    },
  });

  const grouped = new Map<
    string,
    {
      name: string;
      description: string;
      unit: string;
      unitPrice: number;
      multipliers: ReturnType<typeof normalizeMultipliers>;
      duration: string;
      fees: ReturnType<typeof normalizeFees>;
      useCount: number;
    }
  >();

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const key = lineItemTemplateKey(row);
    const existing = grouped.get(key);
    if (existing) {
      existing.useCount += 1;
      continue;
    }
    grouped.set(key, {
      name,
      description: (row.description || "").trim(),
      unit: (row.unit || "").trim(),
      unitPrice: row.unitPrice || 0,
      multipliers: normalizeMultipliers(row.multipliers),
      duration: (row.duration || "").trim(),
      fees: normalizeFees(row.fees),
      useCount: 1,
    });
  }

  const templates = [...grouped.values()]
    .sort((a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name))
    .slice(0, 200);

  return NextResponse.json(templates);
}

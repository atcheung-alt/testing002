import { prisma } from "./src/lib/prisma";
import { computeTotals } from "./src/lib/calculations";
import { normalizeFees } from "./src/lib/fees";
import { normalizeMultipliers } from "./src/lib/multipliers";

async function main() {
  const quotations = await prisma.quotation.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  let found = 0;
  for (const q of quotations) {
    const itemsWithFees = q.items.filter((i) => {
      const fees = normalizeFees(i.fees);
      return fees.length > 0;
    });
    if (itemsWithFees.length === 0) continue;
    found++;
    const items = q.items.map((i) => ({
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      multipliers: normalizeMultipliers(i.multipliers),
      fees: normalizeFees(i.fees),
    }));
    const recomputed = computeTotals(items, q.taxRate, q.discount);
    console.log(q.number, {
      storedSubtotal: q.subtotal,
      recomputedSubtotal: recomputed.subtotal,
      storedTotal: q.total,
      recomputedTotal: recomputed.total,
      match: q.subtotal === recomputed.subtotal && q.total === recomputed.total,
    });
  }
  console.log("Quotations with fees checked:", found, "of", quotations.length, "total scanned");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuotationForm from "@/components/QuotationForm";
import { withParsedMultipliersList } from "@/lib/multipliers";
import { withParsedFeesList } from "@/lib/fees";
import type { Quotation } from "@/types";

export const dynamic = "force-dynamic";

export default async function EditQuotationPage({ params }: { params: { id: string } }) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!quotation) notFound();
  if (quotation.status === "CONVERTED") redirect(`/quotations/${quotation.id}`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">
          Edit {quotation.number}
        </h1>
        <p className="text-sm text-ink-muted">Changes recalculate totals automatically.</p>
      </div>
      <QuotationForm
        quotation={
          {
            ...quotation,
            items: withParsedFeesList(withParsedMultipliersList(quotation.items)),
            issueDate: quotation.issueDate.toISOString(),
            expiryDate: quotation.expiryDate?.toISOString() || null,
            createdAt: quotation.createdAt.toISOString(),
            updatedAt: quotation.updatedAt.toISOString(),
          } as Quotation
        }
      />
    </div>
  );
}

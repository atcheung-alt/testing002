import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: params.id },
    include: { invoice: { select: { id: true, number: true } } },
  });
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  // Logged against the invoice's timeline (receipts don't have their own
  // detail page/timeline) with the receipt number in the description, since
  // this row itself is about to be gone.
  if (receipt.invoice) {
    await logActivity({
      documentType: "invoice",
      documentId: receipt.invoice.id,
      type: "DELETED",
      description: `Receipt ${receipt.number} deleted`,
    });
  }

  await prisma.receipt.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

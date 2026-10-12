import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.expenseCategory.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  // Expenses store the category name as a plain string (see schema comment),
  // so deleting a category never breaks or re-labels any expense already
  // logged under it — those rows simply keep showing that name going
  // forward, it just won't be offered as a dropdown option for new ones.
  await prisma.expenseCategory.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

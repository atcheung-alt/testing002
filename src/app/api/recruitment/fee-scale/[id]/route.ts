import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();

  const existing = await prisma.recruitmentFeeScaleRow.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Fee scale row not found." }, { status: 404 });
  }
  if (body.packageLabel !== undefined && !String(body.packageLabel).trim()) {
    return NextResponse.json({ error: "A fee scale row needs a package label." }, { status: 400 });
  }

  const row = await prisma.recruitmentFeeScaleRow.update({
    where: { id: params.id },
    data: {
      packageLabel: body.packageLabel !== undefined ? String(body.packageLabel).trim() : undefined,
      fee: body.fee !== undefined ? String(body.fee || "").trim() : undefined,
      guaranteePeriod:
        body.guaranteePeriod !== undefined ? String(body.guaranteePeriod || "").trim() : undefined,
    },
  });

  return NextResponse.json(row);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.recruitmentFeeScaleRow.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Fee scale row not found." }, { status: 404 });
  }

  await prisma.recruitmentFeeScaleRow.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

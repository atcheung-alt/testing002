import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeMultipliers, withParsedMultipliers } from "@/lib/multipliers";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.presetItem.findUnique({ where: { id: params.id } });
  if (!item) {
    return NextResponse.json({ error: "Preset item not found." }, { status: 404 });
  }
  return NextResponse.json(withParsedMultipliers(item));
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();

  const existing = await prisma.presetItem.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Preset item not found." }, { status: 404 });
  }
  if (body.name !== undefined && (!body.name || !body.name.trim())) {
    return NextResponse.json({ error: "A preset item needs a name." }, { status: 400 });
  }

  const item = await prisma.presetItem.update({
    where: { id: params.id },
    data: {
      name: body.name !== undefined ? body.name.trim() : undefined,
      description: body.description !== undefined ? (body.description || "").trim() : undefined,
      imageData: body.imageData !== undefined ? body.imageData || null : undefined,
      unit: body.unit !== undefined ? (body.unit || "").trim() : undefined,
      multipliers: body.multipliers !== undefined ? serializeMultipliers(body.multipliers) : undefined,
      unitPrice: body.unitPrice !== undefined ? Number(body.unitPrice) || 0 : undefined,
    },
  });

  return NextResponse.json(withParsedMultipliers(item));
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.presetItem.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Preset item not found." }, { status: 404 });
  }

  await prisma.presetItem.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

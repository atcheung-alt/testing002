import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeMultipliers, withParsedMultipliers, withParsedMultipliersList } from "@/lib/multipliers";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.presetItem.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(withParsedMultipliersList(items));
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "A preset item needs a name." }, { status: 400 });
  }

  const item = await prisma.presetItem.create({
    data: {
      name: body.name.trim(),
      description: (body.description || "").trim(),
      imageData: body.imageData || null,
      unit: (body.unit || "").trim(),
      multipliers: serializeMultipliers(body.multipliers),
      unitPrice: Number(body.unitPrice) || 0,
    },
  });

  return NextResponse.json(withParsedMultipliers(item), { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: { contacts: { orderBy: { createdAt: "asc" } } },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }
  return NextResponse.json(customer);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "A company name is required." }, { status: 400 });
  }

  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: {
      name: body.name !== undefined ? body.name.trim() : undefined,
      address: body.address !== undefined ? body.address.trim() || null : undefined,
    },
    include: { contacts: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(customer);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }
  await prisma.customer.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

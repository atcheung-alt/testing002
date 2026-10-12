import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "That doesn't look like a valid email address." }, { status: 400 });
  }
  // Name and email are both optional here too — see the matching comment in
  // /api/customers's POST handler.
  const name = typeof body.name === "string" ? body.name.trim() : "";

  // Only worth checking for a duplicate when there's actually an email to
  // match against.
  if (email) {
    const existing = await prisma.contactPerson.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A contact with that email is already in the library." },
        { status: 409 }
      );
    }
  }

  const contact = await prisma.contactPerson.create({
    data: { customerId: params.id, name: name || null, email: email || null },
  });

  return NextResponse.json(contact, { status: 201 });
}

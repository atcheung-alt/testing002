import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  const existing = await prisma.contactPerson.findUnique({ where: { id: params.contactId } });
  if (!existing || existing.customerId !== params.id) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const email = body.email !== undefined ? (body.email || "").trim().toLowerCase() : undefined;
  const nextName = body.name !== undefined ? (body.name || "").trim() || null : undefined;
  if (email !== undefined && email) {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "That doesn't look like a valid email address." }, { status: 400 });
    }
    // Only worth checking for a duplicate when there's actually an email to
    // match against.
    const clash = await prisma.contactPerson.findUnique({ where: { email } });
    if (clash && clash.id !== params.contactId) {
      return NextResponse.json(
        { error: "A contact with that email is already in the library." },
        { status: 409 }
      );
    }
  }
  // A contact still needs a name or an email after this update — check
  // against whichever one isn't being changed by this request.
  const resultingName = nextName !== undefined ? nextName : existing.name;
  const resultingEmail = email !== undefined ? email || null : existing.email;
  if (!resultingName && !resultingEmail) {
    return NextResponse.json(
      { error: "A contact needs a name or an email address." },
      { status: 400 }
    );
  }

  const contact = await prisma.contactPerson.update({
    where: { id: params.contactId },
    data: {
      name: nextName,
      email: email !== undefined ? email || null : undefined,
    },
  });

  return NextResponse.json(contact);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  const existing = await prisma.contactPerson.findUnique({ where: { id: params.contactId } });
  if (!existing || existing.customerId !== params.id) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  const count = await prisma.contactPerson.count({ where: { customerId: params.id } });
  if (count <= 1) {
    return NextResponse.json(
      { error: "Every company needs at least one contact person — add another before removing this one." },
      { status: 400 }
    );
  }

  await prisma.contactPerson.delete({ where: { id: params.contactId } });
  return NextResponse.json({ success: true });
}

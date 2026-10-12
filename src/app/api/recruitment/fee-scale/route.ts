import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_FEE_SCALE_PERMANENT, DEFAULT_FEE_SCALE_CONTRACT } from "@/lib/recruitmentTerms";

export const dynamic = "force-dynamic";

const CATEGORIES = ["PERMANENT", "CONTRACT"] as const;
type Category = (typeof CATEGORIES)[number];

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

/** Seeds a category's default rows the very first time it's read — mirrors
 *  how COMPANY's static defaults act as a fallback until Settings is
 *  configured, except here the "configuring" is just using the library, so
 *  we seed real, editable/deletable rows immediately rather than returning
 *  phantom ones with no id to PATCH/DELETE against. */
async function ensureSeeded(category: Category) {
  const count = await prisma.recruitmentFeeScaleRow.count({ where: { category } });
  if (count > 0) return;

  const defaults = category === "PERMANENT" ? DEFAULT_FEE_SCALE_PERMANENT : DEFAULT_FEE_SCALE_CONTRACT;
  await prisma.recruitmentFeeScaleRow.createMany({
    data: defaults.map((row, i) => ({ category, sortOrder: i, ...row })),
  });
}

export async function GET() {
  await Promise.all(CATEGORIES.map(ensureSeeded));

  const rows = await prisma.recruitmentFeeScaleRow.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    permanent: rows.filter((r) => r.category === "PERMANENT"),
    contract: rows.filter((r) => r.category === "CONTRACT"),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!isCategory(body.category)) {
    return NextResponse.json({ error: "category must be PERMANENT or CONTRACT." }, { status: 400 });
  }
  if (!body.packageLabel || !String(body.packageLabel).trim()) {
    return NextResponse.json({ error: "A fee scale row needs a package label." }, { status: 400 });
  }

  const last = await prisma.recruitmentFeeScaleRow.findFirst({
    where: { category: body.category },
    orderBy: { sortOrder: "desc" },
  });

  const row = await prisma.recruitmentFeeScaleRow.create({
    data: {
      category: body.category,
      packageLabel: String(body.packageLabel).trim(),
      fee: String(body.fee || "").trim(),
      guaranteePeriod: String(body.guaranteePeriod || "").trim(),
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(row, { status: 201 });
}

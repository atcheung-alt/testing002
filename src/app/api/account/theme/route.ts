import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserThemeMode, getEffectiveThemeMode } from "@/lib/appSettings";

export const dynamic = "force-dynamic";

const VALID_THEME_MODES = ["LIGHT", "DARK", "AUTO"];

/**
 * The signed-in user's own theme preference — deliberately open to any
 * signed-in account, not just admins (unlike most of /api/settings, this
 * is a personal preference, not company configuration).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const [themeMode, companyDefault] = await Promise.all([
    getUserThemeMode(user.userId),
    getEffectiveThemeMode(),
  ]);
  return NextResponse.json({ themeMode, companyDefault });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  // `null` clears the personal override, reverting to the company default.
  const themeMode = body.themeMode === null ? null : body.themeMode;
  if (themeMode !== null && !VALID_THEME_MODES.includes(themeMode)) {
    return NextResponse.json({ error: "Invalid theme mode." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.userId }, data: { themeMode } });
  return NextResponse.json({ themeMode });
}

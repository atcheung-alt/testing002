import { prisma } from "@/lib/prisma";
import { logClientView } from "@/lib/activity";
import { getEffectiveCompany } from "@/lib/appSettings";

export type PublicEmployeeOnboardingView = {
  id: string;
  name: string;
  // Pre-fills the surname/given-name fields below — best-effort split of
  // whatever single name string the invite step collected (see
  // splitNameGuess in src/lib/employees.ts). The employee can correct it.
  surnameEn: string;
  givenNameEn: string;
  // Once true, the public page shows a locked "thanks, submitted" card
  // instead of the form — see the POST /api/public/onboarding/[token]/submit
  // route, which rejects a second submission with the same check.
  completed: boolean;
  completedAt: string | null;
  // The admin-entered contact email, used only to pre-fill the "personal
  // email" field — the employee can still change it. Deliberately the only
  // piece of previously-known personal data ever sent to this public page;
  // nothing else already on file is echoed back here.
  prefillEmail: string;
  company: { name: string; shortName?: string; logoData?: string | null; logoDataDark?: string | null };
};

/**
 * Token-scoped, read-only view backing the /onboarding/[token] page and its
 * submit route. No authentication — the random onboarding token is the
 * access control, exactly like Employee.leaveToken / Quotation.signingToken.
 */
export async function getPublicEmployeeOnboardingView(
  token: string
): Promise<PublicEmployeeOnboardingView | null> {
  const employee = await prisma.employee.findUnique({
    where: { onboardingToken: token },
    select: {
      id: true,
      name: true,
      surnameEn: true,
      givenNameEn: true,
      email: true,
      onboardingCompletedAt: true,
    },
  });
  if (!employee) return null;

  await logClientView("employee", employee.id);

  const company = await getEffectiveCompany();

  return {
    id: employee.id,
    name: employee.name,
    surnameEn: employee.surnameEn,
    givenNameEn: employee.givenNameEn,
    completed: Boolean(employee.onboardingCompletedAt),
    completedAt: employee.onboardingCompletedAt ? employee.onboardingCompletedAt.toISOString() : null,
    prefillEmail: employee.email || "",
    company: {
      name: company.name,
      shortName: company.shortName,
      logoData: company.logoData,
      logoDataDark: company.logoDataDark,
    },
  };
}

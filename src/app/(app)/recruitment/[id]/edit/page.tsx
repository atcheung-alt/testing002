import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RecruitmentAgreementForm from "@/components/RecruitmentAgreementForm";
import {
  normalizeFeeScaleRows,
  DEFAULT_FEE_SCALE_PERMANENT,
  DEFAULT_FEE_SCALE_CONTRACT,
} from "@/lib/recruitmentTerms";

export const dynamic = "force-dynamic";

export default async function EditRecruitmentAgreementPage({ params }: { params: { id: string } }) {
  const agreement = await prisma.recruitmentAgreement.findUnique({ where: { id: params.id } });
  if (!agreement) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Edit {agreement.number}</h1>
        <p className="text-sm text-ink-muted">Changes here don&apos;t affect an already-signed agreement.</p>
      </div>
      <RecruitmentAgreementForm
        agreement={{
          id: agreement.id,
          companyName: agreement.companyName,
          companyEmail: agreement.companyEmail,
          paymentDueDays: agreement.paymentDueDays,
          terms: agreement.terms,
          feeScalePermanent: normalizeFeeScaleRows(agreement.feeScalePermanent, DEFAULT_FEE_SCALE_PERMANENT),
          feeScaleContract: normalizeFeeScaleRows(agreement.feeScaleContract, DEFAULT_FEE_SCALE_CONTRACT),
          language: (agreement.language as any) || "EN",
        }}
      />
    </div>
  );
}

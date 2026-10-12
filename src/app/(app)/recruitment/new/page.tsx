import RecruitmentAgreementForm from "@/components/RecruitmentAgreementForm";

export const dynamic = "force-dynamic";

export default function NewRecruitmentAgreementPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">New Recruitment Agreement</h1>
        <p className="text-sm text-ink-muted">
          Enter the client&apos;s company name, email, and payment terms — the terms of business
          below update automatically to match.
        </p>
      </div>
      <RecruitmentAgreementForm />
    </div>
  );
}

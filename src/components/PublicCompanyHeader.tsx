import CompanyLogo from "@/components/CompanyLogo";

export type PublicCompany = {
  name: string;
  shortName?: string;
  logoData?: string | null;
  logoDataDark?: string | null;
};

/** Plain JSX, no hooks — works identically from a server page (the /book
 *  listing) or inside a "use client" component (the per-event booking
 *  flow). */
export default function PublicCompanyHeader({ company }: { company: PublicCompany }) {
  return (
    <div className="flex justify-end mb-2">
      {company.logoData ? (
        <CompanyLogo logoData={company.logoData} logoDataDark={company.logoDataDark} name={company.name} className="h-9 object-contain" />
      ) : (
        <span className="font-display text-xl font-semibold text-brand-800">{company.name}</span>
      )}
    </div>
  );
}

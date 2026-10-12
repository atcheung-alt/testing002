import clsx from "clsx";

/**
 * Renders the company logo, swapping to the dark-mode variant purely via
 * CSS (see `.theme-logo-primary`/`.theme-logo-dark` in globals.css) when
 * both are configured — no JS theme detection, no flash, and it works
 * identically in a server component or a client one since it's plain JSX
 * with no hooks. Shared by the Sidebar, the login page, and every public
 * document page (quotation/invoice/recruitment signing, leave, onboarding)
 * so the dark logo shows up everywhere the primary one does, not just the
 * sidebar.
 *
 * Renders nothing at all if there's no primary logo — callers are
 * responsible for their own text fallback (e.g. the company name) in that
 * case, since different pages style that fallback differently.
 */
export default function CompanyLogo({
  logoData,
  logoDataDark,
  name,
  className,
}: {
  logoData?: string | null;
  logoDataDark?: string | null;
  name?: string;
  className?: string;
}) {
  if (!logoData) return null;

  if (logoDataDark) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoData}
          alt={name || "Company logo"}
          className={clsx(className, "theme-logo-primary")}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDataDark}
          alt={name || "Company logo"}
          className={clsx(className, "theme-logo-dark")}
        />
      </>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoData} alt={name || "Company logo"} className={className} />
  );
}

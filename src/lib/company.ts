import { LOGO_DATA } from "@/lib/logo";
import { CHOP_DATA } from "@/lib/chop";
import { AGENT_SIGNATURE_DATA } from "@/lib/agentSignature";

// Edit these values to personalize the exported quotation and invoice PDFs.
//
// The Settings page (Settings ▸ /settings) lets an admin override the
// company name, logo, and website, plus the standing CC list, without
// touching code — see src/lib/appSettings.ts (getEffectiveCompany /
// getEffectiveCc). Everywhere that renders a PDF or sends an email already
// reads through those helpers, so this file just supplies the defaults used
// until something is configured there, plus everything else (currency,
// banking, contact, chop) that isn't yet exposed on the Settings page.
export const COMPANY = {
  name: "HR Plus (Talent) Limited",
  shortName: "HR Plus", // used in section headings, e.g. "HR Plus Contact Information"
  email: "lamfung@hrplus.info",

  // Fallback CC list, only used if the Settings page's CC list has never
  // been configured (see getEffectiveCc in src/lib/appSettings.ts).
  defaultCc: ["Lamfung@hrplus.info", "Angelkwan@hrplus.info"],

  // Registered address & website, used on the invoice letterhead/footer.
  address: "Level 47, Lee Garden One, 33 Hysan Ave, Causeway Bay",
  website: "https://hrplustalent.com",

  // Logo shown at the top right of every exported PDF (PNG/JPEG data URL).
  // Set to null to show the company name as text instead.
  logoData: LOGO_DATA,

  // HR Plus company chop / round stamp, shown next to the client's signature
  // box on the quotation PDF as HR Plus's counter-authorization, and next to
  // the Agent's e-signature on the Recruitment Agreement PDF.
  chopData: CHOP_DATA,

  // The Agent side of the Recruitment Agreement PDF's signature block is
  // auto-filled with these three — no manual signing step for HR Plus's own
  // side, since the chop next to it is already the company's authorization.
  agentSignerName: "Emrys Lam",
  agentSignerTitle: "Managing Director",
  agentSignatureData: AGENT_SIGNATURE_DATA,

  // Currency used across the app and on PDFs.
  currency: "HKD",
  currencyLocale: "en-HK",

  // Contact person shown in the Contact Information section of every PDF.
  contact: {
    name: "Emrys Lam",
    title: "Managing Director",
    tel: "3905 0662",
    email: "lamfung@hrplus.info",
  },

  // Banking details shown in the Banking Information section of every PDF.
  banking: {
    accountName: "HR Plus (Talent) Limited",
    bank: "HSBC",
    branch: "HSBC SUN HUNG KAI CENTRE, 30 Harbour Road, Wan Chai",
    accountType: "HK Dollar",
    // Shown as its own "Bank Number" row on the invoice PDF, just before
    // Account Number — it's HSBC's 3-digit bank code, previously baked into
    // the account number's "004-" prefix (now split out, see accountNumber
    // below).
    bankNumber: "004",
    accountNumber: "582-648283-838",
    swiftCode: "HSBCHKHHHKH",
  },
};

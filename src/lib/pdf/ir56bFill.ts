import fs from "fs";
import path from "path";
import { PDFDocument, PDFFont, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// -----------------------------------------------------------------------------
// Fills the REAL government IR56B PDF (its own AcroForm fields) rather than
// rendering a react-pdf replica — see src/lib/pdf/templates/IR56B.pdf, a
// one-time-decrypted (see below), otherwise untouched copy of the official
// fillable form the user supplied.
//
// Two hard-won lessons baked into this file (see the session's prototyping
// in /tmp before this shipped, not reproducible here, but recorded so the
// next person doesn't have to rediscover them):
//
// 1. The template must be decrypted-only, nothing else. An earlier attempt
//    that also blanked every field's /V and set NeedAppearances=true (to
//    make it a reusable "blank" template) silently corrupted two static
//    Chinese instructional boxes on the form — poppler (and likely other
//    renderers) fell back to a non-CJK font when regenerating appearances
//    for every field, not just the ones actually touched. Leaving fields we
//    never map completely untouched (original /V and /AP intact) avoids
//    this entirely; only fields we explicitly call setText()/check() on
//    ever get a regenerated appearance stream (via the PER-FIELD
//    updateAppearances(), not the form-wide PDFForm.updateFieldAppearances()
//    — the latter regenerates every field on the form and reintroduces the
//    exact same corruption).
// 2. Several of the template's text fields have a malformed /DA (default
//    appearance) string — likely an artifact of whatever tool the
//    government originally used to author the form — that breaks pdf-lib's
//    own font-size lookup and silently falls back to auto-sizing (giant
//    text). Every field this module touches gets its /DA rewritten to a
//    clean, explicit `/Helv <size> Tf` (or the embedded CJK font, for the
//    two Chinese-name fields) before filling, sidestepping the bad string
//    entirely rather than trying to parse/repair it.
// -----------------------------------------------------------------------------

const TEMPLATE_DIR_CANDIDATES = [
  path.join(__dirname, "templates"),
  path.join(process.cwd(), "src", "lib", "pdf", "templates"),
  path.join(process.cwd(), ".next", "server", "src", "lib", "pdf", "templates"),
];

function findAsset(dirs: string[], filename: string): string | undefined {
  for (const dir of dirs) {
    const candidate = path.join(dir, filename);
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

const TEMPLATE_PATH = findAsset(TEMPLATE_DIR_CANDIDATES, "IR56B.pdf");

// Same font files @react-pdf/renderer uses elsewhere (see font.ts) — reused
// here for the two Chinese-name AcroForm fields, which is the only part of
// this form that ever needs CJK glyph coverage (everything else this app
// has a source of truth for is plain Latin/numeric).
const FONT_DIR_CANDIDATES = [
  path.join(__dirname, "fonts"),
  path.join(process.cwd(), "src", "lib", "pdf", "fonts"),
  path.join(process.cwd(), ".next", "server", "src", "lib", "pdf", "fonts"),
];
const NOTO_REGULAR_PATH = findAsset(FONT_DIR_CANDIDATES, "NotoSansSC-Regular.ttf");

export type IR56BFillFields = {
  reportingYear: string;
  nameOfEmployer: string;
  sheetNumber: string;
  // The form's own instruction is "先生/女士/小姐 (請將不適用的部分刪去)" —
  // "cross out whichever doesn't apply". So checking one of these three
  // boxes marks it as NOT applicable — the opposite of a normal checkbox —
  // and titleFor() below accounts for that.
  titleMr: boolean;
  titleMs: boolean;
  titleMiss: boolean;
  chineseSurname: string;
  chineseGivenName: string;
  englishSurname: string;
  englishGivenName: string;
  hkidPrefix: string;
  hkidDigits: string;
  hkidCheckDigit: string;
  sex: string; // "M" | "F" | ""
  residentialAddress: string;
  capacityEngaged: string;
  // Period columns for the (a) Salary/Wages and (e) Bonus income lines —
  // same employment-period window as startDate/endDate below (this app has
  // no notion of a salary figure covering a narrower range than that).
  salaryStartDate: string; // DDMMYYYY, no separators
  salaryEndDate: string; // DDMMYYYY, no separators
  amountSalaryWages: string;
  bonusStartDate: string; // DDMMYYYY, no separators
  bonusEndDate: string; // DDMMYYYY, no separators
  amountBonus: string;
  amountTotalIncomes: string;
  placeOfResidenceProvided: string; // "0" | "1" — always "0", see buildIR56BOfficialPdf
  sumPaidByNonHkCompany: string; // "0" | "1" — always "0", see buildIR56BOfficialPdf
  startDate: string; // DDMMYYYY, no separators
  endDate: string; // DDMMYYYY, no separators
  // Bottom-center declaration block — the company's authorized signer. See
  // buildIR56BPdf for the source (COMPANY.agentSignerName/agentSignerTitle,
  // the same "signs on behalf of the company" pair the Recruitment
  // Agreement PDF already uses).
  nameOfSigner: string;
  designation: string;
  dateOfSigning: string; // DDMMYYYY, no separators
};

/** "先生" (Mr) checked = crossed out = does NOT apply — see the titleMr/Ms/
 *  Miss comment above. We don't store marital status (deliberately removed
 *  from the DB — see the Employee model comment in schema.prisma), so
 *  Female defaults to leaving "Ms" un-crossed-out rather than guessing
 *  Miss vs Ms; an unknown/unset gender leaves all three un-crossed-out for
 *  whoever files this to fill in by hand. */
export function titleCheckboxesFor(gender: string | null | undefined): {
  titleMr: boolean;
  titleMs: boolean;
  titleMiss: boolean;
} {
  if (gender === "Male") return { titleMr: false, titleMs: true, titleMiss: true };
  if (gender === "Female") return { titleMr: true, titleMs: false, titleMiss: true };
  return { titleMr: false, titleMs: false, titleMiss: false };
}

/** Standard HKID format is 1-2 letters, 6 digits, then a check digit (0-9
 *  or A) in parentheses — e.g. "Y312513(9)" or "AB123456(0)". Anything that
 *  doesn't match this is left unsplit (whole string goes in the prefix box)
 *  rather than guessing wrong. */
export function parseHkid(hkid: string | null | undefined): {
  prefix: string;
  digits: string;
  checkDigit: string;
} {
  const cleaned = (hkid || "").trim().toUpperCase();
  if (!cleaned) return { prefix: "", digits: "", checkDigit: "" };
  const match = cleaned.match(/^([A-Z]{1,2})[\s-]?(\d{6})\s*\(?\s*([0-9A])\s*\)?$/);
  if (match) return { prefix: match[1], digits: match[2], checkDigit: match[3] };
  return { prefix: cleaned, digits: "", checkDigit: "" };
}

/** DDMMYYYY, no separators — matches the template's own "Start Date"/
 *  "End Date" fields (verified against the reference sample's own
 *  "01042025" for 1 April 2025). */
export function ddmmyyyy(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = String(date.getFullYear());
  return `${d}${m}${y}`;
}

/**
 * Fill the real IR56B AcroForm template with the given field values and
 * return the resulting PDF bytes. Every field this function touches gets
 * its /DA cleaned and its appearance regenerated per-field (see the header
 * comment above for why); every field NOT listed here is left completely
 * untouched, preserving its original appearance exactly as authored —
 * including the two Chinese instructional boxes and anything this app has
 * no data source for (spouse, passport, housing, employer file number,
 * etc. — all deliberately not stored, see schema.prisma).
 */
export async function fillIR56BTemplate(fields: IR56BFillFields): Promise<Uint8Array> {
  if (!TEMPLATE_PATH) {
    throw new Error(
      "IR56B template PDF not found in any expected location — checked: " +
        TEMPLATE_DIR_CANDIDATES.join(", ")
    );
  }

  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const form = doc.getForm();
  const helv = await doc.embedFont(StandardFonts.Helvetica);

  // Only pay the ~6MB embed cost when there's actually Chinese text to
  // write — most of this form's fields are plain Latin/numeric, and a
  // subset embed of this particular font silently produces invisible
  // glyphs (a pdf-lib/fontkit bug specific to this TTF's CJK outlines, confirmed by
  // comparing subset vs full embeds directly), so a full (non-subset)
  // embed is used whenever it's needed at all.
  let noto: PDFFont | null = null;
  const needsChineseFont = Boolean(fields.chineseSurname || fields.chineseGivenName);
  if (needsChineseFont) {
    if (!NOTO_REGULAR_PATH) {
      throw new Error(
        "NotoSansSC-Regular.ttf not found — required to fill Chinese Surname/Given Name. Checked: " +
          FONT_DIR_CANDIDATES.join(", ")
      );
    }
    noto = await doc.embedFont(fs.readFileSync(NOTO_REGULAR_PATH), { subset: false });
  }

  function setText(name: string, value: string, size: number, font: PDFFont) {
    const field = form.getTextField(name);
    field.acroField.setDefaultAppearance(`/${font.name} ${size} Tf 0 g`);
    field.setText(value);
    field.updateAppearances(font);
  }

  function setCheckbox(name: string, checked: boolean) {
    const box = form.getCheckBox(name);
    if (checked) box.check();
    else box.uncheck();
    box.updateAppearances();
  }

  setText("Reporting Year", fields.reportingYear, 12, helv);
  setText("Section Number of Employer's File", "", 9, helv);
  setText("Employer's File Number", "", 9, helv);
  setText("Name of Employer", fields.nameOfEmployer, 9, helv);
  setText("Sheet Number", fields.sheetNumber, 9, helv);

  setCheckbox("Title - Mr", fields.titleMr);
  setCheckbox("Title - Ms", fields.titleMs);
  setCheckbox("Title - Miss", fields.titleMiss);

  if (needsChineseFont && noto) {
    setText("Chinese Surname", fields.chineseSurname, 9, noto);
    setText("Chinese Given Name", fields.chineseGivenName, 9, noto);
  }
  setText("English Surname", fields.englishSurname, 9, helv);
  setText("English Given Name", fields.englishGivenName, 9, helv);

  setText("HKID Number - Prefix", fields.hkidPrefix, 9, helv);
  setText("HKID Number - Digits", fields.hkidDigits, 9, helv);
  setText("HKID Number - Check Digit", fields.hkidCheckDigit, 9, helv);

  setText("Indicator - Sex", fields.sex, 9, helv);
  // Marital status, spouse, passport, and correspondence address are
  // deliberately not stored (see schema.prisma) — always blank.
  setText("Indicator - Marital Status", "", 9, helv);

  setText("Residential Address", fields.residentialAddress, 8, helv);
  setText("Capacity Engaged", fields.capacityEngaged, 9, helv);

  setText("Start Date - Salary / Wages", fields.salaryStartDate, 9, helv);
  setText("End Date - Salary / Wages", fields.salaryEndDate, 9, helv);
  setText("Amount - Salary / Wages", fields.amountSalaryWages, 8, helv);
  setText("Start Date - Bonus", fields.bonusStartDate, 9, helv);
  setText("End Date - Bonus", fields.bonusEndDate, 9, helv);
  setText("Amount - Bonus", fields.amountBonus, 8, helv);
  setText("Amount - Total Incomes", fields.amountTotalIncomes, 8, helv);

  setText("Indicator - Place of Residence Provided", fields.placeOfResidenceProvided, 9, helv);
  setText("Indicator - Sum Paid by Non-HK Company", fields.sumPaidByNonHkCompany, 9, helv);

  // Employer's authorized signer — the bottom-center declaration block.
  setText("Name of Signer", fields.nameOfSigner, 9, helv);
  setText("Designation", fields.designation, 9, helv);
  setText("Date of Signing", fields.dateOfSigning, 9, helv);

  setText("Start Date", fields.startDate, 9, helv);
  setText("End Date", fields.endDate, 9, helv);

  return doc.save();
}

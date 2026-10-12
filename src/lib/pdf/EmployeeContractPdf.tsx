/* eslint-disable jsx-a11y/alt-text -- this file's <Image> is @react-pdf/renderer's PDF
   primitive, not an HTML <img> or next/image — it has no `alt` prop to give it. */
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { PDF_FONT, PDF_FONT_BOLD } from "@/lib/pdf/font";
import { pdfLanguage, pdfPhrase, websiteWord } from "@/lib/pdf/phrases";

// Same letterhead palette as the recruitment agreement PDF.
const NAVY = "#1F3864";

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT,
    fontSize: 9.5,
    padding: 54,
    paddingBottom: 76,
    color: "#111111",
    lineHeight: 1.4,
  },

  cornerBumpLeft: {
    position: "absolute",
    top: 96,
    left: -16,
    width: 30,
    height: 160,
    backgroundColor: NAVY,
    borderTopRightRadius: 90,
    borderBottomRightRadius: 90,
  },
  cornerBumpRight: {
    position: "absolute",
    bottom: 110,
    right: -16,
    width: 30,
    height: 160,
    backgroundColor: NAVY,
    borderTopLeftRadius: 90,
    borderBottomLeftRadius: 90,
  },

  privateConfidential: {
    fontFamily: PDF_FONT_BOLD, fontWeight: "bold",
    fontSize: 9,
    textDecoration: "underline",
    marginBottom: 2,
  },
  dateLine: { fontSize: 9.5, marginBottom: 14 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  logo: { width: 140, height: 46, objectFit: "contain" },
  companyName: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 13, color: NAVY },

  // The letter's addressee line ("Mr./Ms. {name}") shown just under the
  // letterhead, and the bold "Employment Contract" heading right before the
  // "Dear ..." greeting that starts the terms body.
  recipientLine: { fontSize: 9.5, marginBottom: 10 },
  contractHeading: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 9.5, marginBottom: 10 },

  clauseTitle: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 9.5, marginTop: 8, marginBottom: 2 },
  paragraph: { marginBottom: 6, textAlign: "justify" },
  // Ordered-list clause row — a fixed-width number column plus a flexible
  // text column, so wrapped lines hang under the clause text rather than
  // under the number (see the "§" convention in employeeContractTerms.ts).
  clauseRow: { flexDirection: "row", marginBottom: 6 },
  clauseNumber: { width: 16, textAlign: "left" },
  clauseText: { flex: 1, textAlign: "justify" },
  // The bold portion of any "**...**" inline markdown span — e.g. a
  // clause's label, or the employee's job title in the opening paragraph.
  inlineLabel: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold" },

  signatureSection: { marginTop: 24 },
  signatureHeadingRow: { flexDirection: "row", marginBottom: 22 },
  signatureHeading: { flex: 1, fontSize: 9.5 },
  signatureHeadingLine: { fontSize: 9.5, marginBottom: 2 },
  signatureFieldRow: { flexDirection: "row", marginBottom: 16 },
  signatureField: { flexDirection: "row", flex: 1, alignItems: "flex-end" },
  signatureFieldGap: { width: 24 },
  signatureLabel: { width: 92, fontSize: 9.5 },
  signatureValue: {
    flex: 1,
    fontSize: 9.5,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 2,
    minHeight: 14,
  },
  signatureValueRow: { flexDirection: "row", alignItems: "flex-end" },
  signatureImage: { maxHeight: 32, maxWidth: 140, objectFit: "contain" },
  // Shown in place of the signature image/blank line when the employee
  // accepted by uploading a scanned/printed document instead of drawing a
  // signature — see the `signedViaUpload` flag on EmployeeContractPdfData.
  signatureUploadNote: { fontSize: 8, color: "#555555" },
  chopImage: { maxHeight: 46, maxWidth: 46, objectFit: "contain", marginLeft: 10 },

  footer: {
    position: "absolute",
    bottom: 26,
    left: 54,
    right: 54,
    textAlign: "center",
  },
  footerText: { fontSize: 8, color: "#33415a" },
  footerBar: { marginTop: 6, height: 4, backgroundColor: NAVY },
});

export type EmployeeContractPdfData = {
  employeeName: string;
  // "Mr./Ms. {name}" — see greetingName() in employeeContractTerms.ts. Used
  // for the recipient line under the letterhead and as the signature
  // block's employee name (falls back to employeeName if gender isn't on
  // file, so there's never a blank).
  greetingName?: string | null;
  hkid?: string | null;
  status: string;
  createdAt: string;
  terms: string;
  // "Employment Contract" for most employment types, "Independent
  // Contractor Agreement" for Freelance — see contractDocumentTitleFor in
  // employeeContractTerms.ts. Defaults to "Employment Contract" when not
  // given, so any older/manually-built EmployeeContractPdfData still works.
  documentTitle?: string;
  language?: string | null;
  signerName?: string | null;
  employeeTitle?: string | null;
  signatureData?: string | null;
  // True when the employee accepted by uploading a scanned/printed
  // document instead of drawing a signature — signatureData is null in
  // that case (see the mutually-exclusive fields on the EmployeeContract
  // model).
  signedViaUpload?: boolean;
  signedAt?: string | null;
  company: {
    name: string;
    shortName?: string;
    logoData?: string | null;
    address?: string;
    website?: string;
    chopData?: string | null;
    agentSignerName?: string;
    agentSignerTitle?: string;
    agentSignatureData?: string | null;
  };
};

/** DD/MM/YYYY — the standard date format across every generated document. */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

/** Renders "**bold**" markdown spans within a block of text as inline bold
 *  runs (react-pdf's <Text> supports nesting <Text> children with their own
 *  style, which is how inline formatting works here) — used both for a
 *  clause's bolded label and for the employee's job title wherever
 *  {{title}} appears in the template. Plain segments pass through as-is. */
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={styles.inlineLabel}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </>
  );
}

/** Splits the terms text into blank-line-separated blocks. A block starting
 *  with "§" (see the convention documented in employeeContractTerms.ts) is
 *  rendered as the next number in an ordered list, with its "**label**"
 *  bolded inline — matching the numbered "Label – sentence" clause style of
 *  the HR Plus employment contract letter template. Everything else (the
 *  opening greeting, the recital paragraph, confidentiality sub-points,
 *  etc.) is a plain justified paragraph, with "**...**" spans still
 *  rendered bold inline. */
function TermsBody({ terms }: { terms: string }) {
  const blocks = terms.split(/\n\n+/);
  let clauseNumber = 0;
  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("§")) {
          clauseNumber += 1;
          return (
            <View key={i} style={styles.clauseRow}>
              <Text style={styles.clauseNumber}>{clauseNumber}.</Text>
              <Text style={styles.clauseText}>
                <InlineMarkdown text={trimmed.slice(1)} />
              </Text>
            </View>
          );
        }
        return (
          <Text key={i} style={styles.paragraph}>
            <InlineMarkdown text={block} />
          </Text>
        );
      })}
    </>
  );
}

function SignatureField({
  label,
  value,
  signatureData,
  signedViaUpload,
  uploadNote,
  chopData,
}: {
  label: string;
  value?: string | null;
  signatureData?: string | null;
  signedViaUpload?: boolean;
  uploadNote?: string;
  chopData?: string | null;
}) {
  return (
    <View style={styles.signatureField}>
      <Text style={styles.signatureLabel}>{label}</Text>
      <View style={[styles.signatureValue, chopData ? styles.signatureValueRow : {}]}>
        {signatureData ? (
          <Image style={styles.signatureImage} src={signatureData} />
        ) : signedViaUpload ? (
          <Text style={styles.signatureUploadNote}>{uploadNote}</Text>
        ) : (
          <Text>{value || ""}</Text>
        )}
        {chopData ? <Image style={styles.chopImage} src={chopData} /> : null}
      </View>
    </View>
  );
}

const CONTRACT_LABELS = {
  EN: {
    privateConfidential: "Private & Confidential",
    yoursFaithfully: "Yours faithfully,",
    forAndOnBehalf: "For and on behalf of",
    acceptEmployment:
      "I hereby accept the above terms of employment and have read and fully understand the Company's Health & Safety Policy.",
    acceptAgreement: "I hereby accept the above terms of this Agreement.",
    name: "Name:",
    jobTitle: "Job Title:",
    hkid: "HKID#:",
    date: "Date:",
    signature: "Signature:",
    signedViaUpload: "(Signed via uploaded document — see attached)",
  },
  ZH_HANT: {
    privateConfidential: "私人及機密",
    yoursFaithfully: "此致",
    forAndOnBehalf: "代表",
    acceptEmployment: "本人接受上述聘用條款，並已閱讀及完全明白本公司的健康及安全政策。",
    acceptAgreement: "本人接受本協議的上述條款。",
    name: "姓名：",
    jobTitle: "職位：",
    hkid: "香港身份證號碼：",
    date: "日期：",
    signature: "簽名：",
    signedViaUpload: "（經上載文件簽署 — 見附件）",
  },
  ZH_HANS: {
    privateConfidential: "私人及机密",
    yoursFaithfully: "此致",
    forAndOnBehalf: "代表",
    acceptEmployment: "本人接受上述聘用条款，并已阅读及完全明白本公司的健康及安全政策。",
    acceptAgreement: "本人接受本协议的上述条款。",
    name: "姓名：",
    jobTitle: "职位：",
    hkid: "香港身份证号码：",
    date: "日期：",
    signature: "签名：",
    signedViaUpload: "（经上传文件签署 — 见附件）",
  },
} as const;

export function EmployeeContractPdf({ data }: { data: EmployeeContractPdfData }) {
  const t = CONTRACT_LABELS[pdfLanguage(data.language)];
  const documentTitle = pdfPhrase(data.documentTitle || "Employment Contract", data.language);
  return (
    <Document title={`${documentTitle} - ${data.employeeName}`} author={data.company.name}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.cornerBumpLeft} fixed />
        <View style={styles.cornerBumpRight} fixed />

        <Text style={styles.privateConfidential}>{t.privateConfidential}</Text>
        <Text style={styles.dateLine}>{formatDate(data.createdAt)}</Text>

        <View style={styles.headerRow}>
          {data.company.logoData ? (
            <Image style={styles.logo} src={data.company.logoData} />
          ) : (
            <Text style={styles.companyName}>{data.company.name}</Text>
          )}
        </View>

        <Text style={styles.recipientLine}>{data.greetingName || data.employeeName}</Text>

        <Text style={styles.contractHeading}>{documentTitle}</Text>

        <TermsBody terms={data.terms} />

        <View style={styles.signatureSection}>
          <View style={styles.signatureHeadingRow}>
            <View style={styles.signatureHeading}>
              <Text style={styles.signatureHeadingLine}>{t.yoursFaithfully}</Text>
              <Text style={styles.signatureHeadingLine}>{t.forAndOnBehalf}</Text>
              <Text style={styles.signatureHeadingLine}>{data.company.name}</Text>
            </View>
            <Text style={styles.signatureHeading}>
              {data.documentTitle === "Independent Contractor Agreement" ? t.acceptAgreement : t.acceptEmployment}
            </Text>
          </View>

          <View style={styles.signatureFieldRow}>
            <SignatureField label={t.name} value={data.company.agentSignerName || "Emrys Lam"} />
            <View style={styles.signatureFieldGap} />
            <SignatureField label={t.name} value={data.signerName || data.greetingName || data.employeeName} />
          </View>
          <View style={styles.signatureFieldRow}>
            <SignatureField label={t.jobTitle} value={data.company.agentSignerTitle || "Managing Director"} />
            <View style={styles.signatureFieldGap} />
            <SignatureField label={t.hkid} value={data.hkid} />
          </View>
          <View style={styles.signatureFieldRow}>
            <SignatureField label={t.date} value={formatDate(data.createdAt)} />
            <View style={styles.signatureFieldGap} />
            <SignatureField label={t.date} value={data.signedAt ? formatDate(data.signedAt) : ""} />
          </View>
          <View style={styles.signatureFieldRow}>
            <SignatureField
              label={t.signature}
              signatureData={data.company.agentSignatureData}
              chopData={data.company.chopData}
            />
            <View style={styles.signatureFieldGap} />
            <SignatureField
              label={t.signature}
              signatureData={data.signatureData}
              signedViaUpload={data.signedViaUpload}
              uploadNote={t.signedViaUpload}
            />
          </View>
        </View>

        <View style={styles.footer} fixed>
          {data.company.address ? <Text style={styles.footerText}>{data.company.address}</Text> : null}
          {data.company.website ? (
            <Text style={styles.footerText}>{websiteWord(data.language)}: {data.company.website}</Text>
          ) : null}
          <View style={styles.footerBar} />
        </View>
      </Page>
    </Document>
  );
}

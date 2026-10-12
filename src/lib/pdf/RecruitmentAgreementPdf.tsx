/* eslint-disable jsx-a11y/alt-text -- this file's <Image> is @react-pdf/renderer's PDF
   primitive, not an HTML <img> or next/image — it has no `alt` prop to give it. */
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { PDF_FONT, PDF_FONT_BOLD } from "@/lib/pdf/font";

// Palette matching the HR Plus "Master Terms of Business" letterhead (the
// same navy used across the Q-I-R quotation/invoice PDFs).
const NAVY = "#1F3864";
const BORDER = "#000000";

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT,
    fontSize: 9.5,
    padding: 36,
    paddingBottom: 58,
    color: "#111111",
    lineHeight: 1.4,
  },

  // Decorative navy "bumps" bleeding off the left/right page edges, fixed on
  // every page — matches the Master Terms of Business letterhead template.
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

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  logo: { width: 140, height: 46, objectFit: "contain" },
  companyName: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 13, color: NAVY },
  headerMeta: { alignItems: "flex-end" },
  metaLine: { fontSize: 8.5, color: "#555555", marginBottom: 1 },

  clauseTitle: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 9.5, marginTop: 8, marginBottom: 2 },
  paragraph: { marginBottom: 6, textAlign: "justify" },
  // Chinese versions read left-aligned rather than justified — justify's
  // even-spacing behaves oddly with CJK punctuation. English keeps the
  // original justified alignment.
  paragraphLeft: { marginBottom: 6, textAlign: "left" },

  tableCaption: {
    fontFamily: PDF_FONT_BOLD, fontWeight: "bold",
    fontSize: 9.5,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  table: { borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  tableRow: { flexDirection: "row" },
  tableRowBody: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER },
  tableCellHeader: {
    fontFamily: PDF_FONT_BOLD, fontWeight: "bold",
    fontSize: 9,
    textAlign: "center",
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  tableCell: {
    fontSize: 9,
    textAlign: "center",
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },

  signatureSection: { marginTop: 24 },
  signatureHeadingRow: { flexDirection: "row", marginBottom: 22 },
  signatureHeading: { flex: 1, fontSize: 9.5 },
  signatureFieldRow: { flexDirection: "row", marginBottom: 16 },
  signatureField: { flexDirection: "row", flex: 1, alignItems: "flex-end" },
  signatureFieldGap: { width: 24 },
  signatureLabel: { width: 92, fontSize: 9.5 },
  signatureValue: {
    flex: 1,
    fontSize: 9.5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 2,
    minHeight: 14,
  },
  signatureValueRow: { flexDirection: "row", alignItems: "flex-end" },
  signatureImage: { maxHeight: 32, maxWidth: 140, objectFit: "contain" },
  // Shown in place of the signature image/blank line when the client
  // accepted by uploading a scanned/printed document instead of drawing a
  // signature — see the `signedViaUpload` flag on RecruitmentAgreementPdfData.
  signatureUploadNote: { fontSize: 8, color: "#555555" },
  chopImage: { maxHeight: 46, maxWidth: 46, objectFit: "contain", marginLeft: 10 },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    textAlign: "center",
  },
  footerText: { fontSize: 8, color: "#33415a" },
  footerBar: { marginTop: 6, height: 4, backgroundColor: NAVY },
});

// Fixed English UI strings around the signature block — the only parts of
// this PDF not driven by the (fully translated) `terms` text itself.
// Localized separately here rather than pulled from recruitmentTerms.ts
// since these are presentation labels, not contract clause content.
const PDF_LABELS: Record<string, {
  agreementNo: string;
  date: string;
  signedByClient: string;
  signedByAgent: string;
  name: string;
  companyName: string;
  jobTitle: string;
  signature: string;
}> = {
  EN: {
    agreementNo: "Agreement No.:",
    date: "Date:",
    signedByClient: "Signed for and on Behalf of the Client",
    signedByAgent: "Signed for and on behalf of the Agent",
    name: "Name:",
    companyName: "Company Name:",
    jobTitle: "Job Title:",
    signature: "Signature:",
  },
  ZH_HANS: {
    agreementNo: "协议编号：",
    date: "日期：",
    signedByClient: "代表客户签署",
    signedByAgent: "代表中介签署",
    name: "姓名：",
    companyName: "公司名称：",
    jobTitle: "职位：",
    signature: "签名：",
  },
  ZH_HANT: {
    agreementNo: "協議編號：",
    date: "日期：",
    signedByClient: "代表客戶簽署",
    signedByAgent: "代表中介簽署",
    name: "姓名：",
    companyName: "公司名稱：",
    jobTitle: "職位：",
    signature: "簽名：",
  },
};

export type RecruitmentAgreementPdfData = {
  number: string;
  companyName: string;
  companyEmail: string;
  status: string;
  createdAt: string;
  terms: string;
  language?: string | null;
  signerName?: string | null;
  signerCompanyName?: string | null;
  signerJobTitle?: string | null;
  signatureData?: string | null;
  // True when the client accepted by uploading a scanned/printed document
  // instead of drawing a signature — signatureData is null in that case
  // (see the mutually-exclusive fields on the RecruitmentAgreement model).
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

/** A block is a table (instead of clause prose) once any of its lines uses
 *  the `| cell | cell | cell |` syntax — used for the Clause 13 fee scales,
 *  which the Master Terms of Business letterhead renders as bordered tables
 *  rather than plain bullet text. Any lines before the first `|` line are
 *  kept as a bold, centered caption (e.g. "Fee Scale for Permanent
 *  Placements"). Staff editing the terms textarea can still add more of
 *  these tables using the same `| ... |` row syntax. */
function parsePipeTable(lines: string[]): { caption: string[]; rows: string[][] } | null {
  const firstTableLine = lines.findIndex((l) => l.trim().startsWith("|"));
  if (firstTableLine === -1) return null;
  const caption = lines.slice(0, firstTableLine).map((l) => l.trim()).filter(Boolean);
  const rows = lines
    .slice(firstTableLine)
    .filter((l) => l.trim().startsWith("|"))
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim())
    );
  return { caption, rows };
}

function FeeTable({ rows }: { rows: string[][] }) {
  const [header, ...body] = rows;
  return (
    <View style={styles.table} wrap={false}>
      <View style={styles.tableRow}>
        {header.map((cell, i) => (
          <Text
            key={i}
            style={[styles.tableCellHeader, i === header.length - 1 ? { borderRightWidth: 0 } : {}, { flex: i === 0 ? 2 : 1.1 }]}
          >
            {cell}
          </Text>
        ))}
      </View>
      {body.map((row, ri) => (
        <View key={ri} style={styles.tableRowBody}>
          {row.map((cell, ci) => (
            <Text
              key={ci}
              style={[styles.tableCell, ci === row.length - 1 ? { borderRightWidth: 0 } : {}, { flex: ci === 0 ? 2 : 1.1 }]}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Splits the terms text into blank-line-separated blocks. A block whose
 *  first line looks like a clause/sub-clause heading ("1. ..." or "a. ...")
 *  gets that line bolded and the rest rendered as a justified paragraph. A
 *  block containing `| ... |` rows renders as a bordered fee-scale table
 *  instead (see parsePipeTable). */
function TermsBody({ terms, language }: { terms: string; language?: string | null }) {
  const paragraphStyle = language === "ZH_HANS" || language === "ZH_HANT" ? styles.paragraphLeft : styles.paragraph;
  const blocks = terms.split(/\n\n+/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const table = parsePipeTable(lines);
        if (table) {
          return (
            <View key={i}>
              {table.caption.map((line, li) => (
                <Text key={li} style={styles.tableCaption}>
                  {line}
                </Text>
              ))}
              <FeeTable rows={table.rows} />
            </View>
          );
        }

        const isHeadingLine = /^(\d+|[a-zA-Z])\.\s+\S/.test(lines[0]);
        if (lines.length > 1 && isHeadingLine) {
          return (
            <View key={i}>
              <Text style={styles.clauseTitle}>{lines[0]}</Text>
              <Text style={paragraphStyle}>{lines.slice(1).join("\n")}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={isHeadingLine || i === 0 ? styles.clauseTitle : paragraphStyle}>
            {block}
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
  chopData,
}: {
  label: string;
  value?: string | null;
  signatureData?: string | null;
  signedViaUpload?: boolean;
  chopData?: string | null;
}) {
  return (
    <View style={styles.signatureField}>
      <Text style={styles.signatureLabel}>{label}</Text>
      <View style={[styles.signatureValue, chopData ? styles.signatureValueRow : {}]}>
        {signatureData ? (
          <Image style={styles.signatureImage} src={signatureData} />
        ) : signedViaUpload ? (
          <Text style={styles.signatureUploadNote}>(Signed via uploaded document — see attached)</Text>
        ) : (
          <Text>{value || ""}</Text>
        )}
        {chopData ? <Image style={styles.chopImage} src={chopData} /> : null}
      </View>
    </View>
  );
}

export function RecruitmentAgreementPdf({ data }: { data: RecruitmentAgreementPdfData }) {
  const t = PDF_LABELS[data.language || "EN"] || PDF_LABELS.EN;
  return (
    <Document title={`Recruitment Agreement ${data.number}`} author={data.company.name}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.cornerBumpLeft} fixed />
        <View style={styles.cornerBumpRight} fixed />

        <View style={styles.headerRow}>
          {data.company.logoData ? (
            <Image style={styles.logo} src={data.company.logoData} />
          ) : (
            <Text style={styles.companyName}>{data.company.name}</Text>
          )}
          <View style={styles.headerMeta}>
            <Text style={styles.metaLine}>{t.agreementNo} {data.number}</Text>
            <Text style={styles.metaLine}>{t.date} {formatDate(data.createdAt)}</Text>
          </View>
        </View>

        <TermsBody terms={data.terms} language={data.language} />

        <View style={styles.signatureSection}>
          <View style={styles.signatureHeadingRow}>
            <Text style={styles.signatureHeading}>{t.signedByClient}</Text>
            <Text style={styles.signatureHeading}>{t.signedByAgent}</Text>
          </View>

          <View style={styles.signatureFieldRow}>
            <SignatureField label={t.name} value={data.signerName} />
            <View style={styles.signatureFieldGap} />
            <SignatureField label={t.name} value={data.company.agentSignerName || "Emrys Lam"} />
          </View>
          <View style={styles.signatureFieldRow}>
            <SignatureField label={t.companyName} value={data.signerCompanyName} />
            <View style={styles.signatureFieldGap} />
            <SignatureField label={t.companyName} value={data.company.name} />
          </View>
          <View style={styles.signatureFieldRow}>
            <SignatureField label={t.jobTitle} value={data.signerJobTitle} />
            <View style={styles.signatureFieldGap} />
            <SignatureField label={t.jobTitle} value={data.company.agentSignerTitle || "Managing Director"} />
          </View>
          <View style={styles.signatureFieldRow}>
            <SignatureField label={t.date} value={data.signedAt ? formatDate(data.signedAt) : ""} />
            <View style={styles.signatureFieldGap} />
            {/* The Agent side is HR Plus's own standing counter-signature —
                auto-filled with today's agreement date rather than left
                blank for manual entry, since there's no separate agent
                signing step (the e-signature + chop below are always
                applied). */}
            <SignatureField label={t.date} value={formatDate(data.createdAt)} />
          </View>
          <View style={styles.signatureFieldRow}>
            <SignatureField
              label={t.signature}
              signatureData={data.signatureData}
              signedViaUpload={data.signedViaUpload}
            />
            <View style={styles.signatureFieldGap} />
            <SignatureField
              label={t.signature}
              signatureData={data.company.agentSignatureData}
              chopData={data.company.chopData}
            />
          </View>
        </View>

        <View style={styles.footer} fixed>
          {data.company.address ? <Text style={styles.footerText}>{data.company.address}</Text> : null}
          {data.company.website ? (
            <Text style={styles.footerText}>
              {data.language === "ZH_HANS" ? "网站" : data.language === "ZH_HANT" ? "網站" : "Website"}: {data.company.website}
            </Text>
          ) : null}
          <View style={styles.footerBar} />
        </View>
      </Page>
    </Document>
  );
}

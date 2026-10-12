/* eslint-disable jsx-a11y/alt-text -- this file's <Image> is @react-pdf/renderer's PDF
   primitive, not an HTML <img> or next/image — it has no `alt` prop to give it. */
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { PDF_FONT, PDF_FONT_BOLD } from "@/lib/pdf/font";

// -----------------------------------------------------------------------------
// A structured, bilingual reference copy of Hong Kong's IR56B(AY) form —
// "僱主填報的薪酬及退休金報稅表" / "Employer's Return of Remuneration and
// Pensions" — auto-filled from this employee's record + a tax year's worth
// of payroll history. Item numbers/labels below are copied from the actual
// IR56B(AY) (4/2024) form so this lines up with it section-by-section, but
// this is deliberately NOT a pixel-perfect reproduction of the government's
// printed form (no IRD seal/watermark, no per-character OCR boxes) — it's a
// working draft/data sheet for the employer to check and transcribe, same
// role the Salary Report PDF plays for payroll generally. Labelled clearly
// as such in the header and footer so it's never mistaken for an official
// IRD-issued document.
// -----------------------------------------------------------------------------

const NAVY = "#1F3864";
const INK = "#111111";
const BORDER = "#000000";
const MUTED = "#555555";

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT,
    fontSize: 8.5,
    color: INK,
    backgroundColor: "#FFFFFF",
    paddingTop: 36,
    paddingBottom: 46,
    paddingHorizontal: 40,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  logo: { width: 110, height: 36, objectFit: "contain" },
  companyName: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 12, color: NAVY },
  headerMeta: { alignItems: "flex-end" },
  metaTitleZh: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 12, color: NAVY },
  metaTitleEn: { fontSize: 8, color: MUTED, marginTop: 1 },
  metaBadge: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: NAVY,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 7.5,
    color: NAVY,
  },

  titleBlock: { alignItems: "center", marginBottom: 10 },
  titleZh: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 11, color: INK },
  titleEn: { fontSize: 8, color: MUTED, marginTop: 1 },
  taxYearLine: { fontSize: 8.5, color: INK, marginTop: 4, textAlign: "center" },
  taxYearBox: {
    fontFamily: PDF_FONT_BOLD,
    fontWeight: "bold",
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },

  section: {
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  sectionHeading: {
    backgroundColor: NAVY,
    color: "#FFFFFF",
    fontFamily: PDF_FONT_BOLD,
    fontWeight: "bold",
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },

  fieldRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 0.6,
    borderTopColor: "#CCCCCC",
  },
  field: {
    flexGrow: 1,
    flexBasis: "50%",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRightWidth: 0.6,
    borderRightColor: "#CCCCCC",
  },
  fieldFull: {
    flexGrow: 1,
    flexBasis: "100%",
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  fieldLabel: { fontSize: 6.8, color: MUTED, marginBottom: 1.5 },
  fieldValue: { fontSize: 8.5, fontFamily: PDF_FONT_BOLD, fontWeight: "bold" },
  fieldValueEmpty: { fontSize: 8.5, color: "#AAAAAA" },

  // Income table — items (a)-(l).
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#EFEFF5",
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderTopWidth: 0.6,
    borderTopColor: "#CCCCCC",
  },
  tableHeaderCell: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 7.5 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3.5,
    paddingHorizontal: 7,
    borderTopWidth: 0.6,
    borderTopColor: "#DDDDDD",
    alignItems: "flex-start",
  },
  tableRowAlt: { backgroundColor: "#FAFAFC" },
  tableCell: { fontSize: 7.8 },
  tableCellSub: { fontSize: 6.6, color: MUTED, marginTop: 0.5 },
  totalsRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: "#F0F2F8",
  },
  totalsCell: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 8 },

  colItem: { width: 16 },
  colLabel: { flex: 1 },
  colPeriod: { width: 92, textAlign: "center" },
  colAmount: { width: 78, textAlign: "right" },

  yesNoLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderTopWidth: 0.6,
    borderTopColor: "#CCCCCC",
  },
  yesNoLabel: { fontSize: 8, flex: 1 },
  yesNoValue: { fontSize: 8, fontFamily: PDF_FONT_BOLD, fontWeight: "bold" },

  remarksBox: { minHeight: 26, padding: 7, fontSize: 8 },

  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  signatureBlock: { width: "48%" },
  signatureLine: { borderTopWidth: 0.8, borderTopColor: BORDER, marginTop: 22, paddingTop: 3 },
  signatureCaption: { fontSize: 7.5, color: MUTED },
  signatureValue: { fontSize: 9, fontFamily: PDF_FONT_BOLD, fontWeight: "bold", marginTop: 10 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center",
  },
  footerText: { fontSize: 7, color: "#666666" },
  footerBar: { marginTop: 5, height: 3, backgroundColor: NAVY },
});

export type IR56BIncomeLine = {
  itemKey: string; // "a" .. "l"
  labelZh: string;
  labelEn: string;
  amount: number;
  periodLabel?: string | null;
  nature?: string | null; // only meaningful for item (k)
};

export type IR56BHousingDetails = {
  type: string;
  address: string;
  periodLabel: string;
  rentReimbursedByEmployer: number;
  rentPaidByEmployeeToEmployer: number;
  rentPaidByEmployerToLandlord: number;
  rentPaidByEmployeeToLandlord: number;
};

export type IR56BNonHkEntity = {
  name: string;
  address: string;
  amount: number;
};

export type IR56BPdfData = {
  taxYearEndLabel: string; // e.g. "2026"
  employerFileNumber: string;
  employerName: string;
  employeeName: string;
  employeeNameChinese?: string | null;
  hkid?: string | null;
  passportNumber?: string | null;
  passportPlaceOfIssue?: string | null;
  genderLabel: string; // "M" | "F" | ""
  maritalStatusLabel: string;
  spouseName?: string | null;
  spouseHkid?: string | null;
  address: string;
  correspondenceAddress?: string | null;
  position: string;
  employmentPeriodFromLabel: string;
  employmentPeriodToLabel: string;
  incomeLines: IR56BIncomeLine[];
  totalAmount: number;
  housing: IR56BHousingDetails | null;
  nonHkEntity: IR56BNonHkEntity | null;
  remarks?: string | null;
  signerName: string;
  signerPosition: string;
  signedDateLabel: string;
  generatedAtLabel: string;
  company: {
    name: string;
    shortName?: string;
    logoData?: string | null;
    address?: string;
    website?: string;
    currency?: string;
    currencyLocale?: string;
  };
};

function Field({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <View style={full ? styles.fieldFull : styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={value ? styles.fieldValue : styles.fieldValueEmpty}>{value || "—"}</Text>
    </View>
  );
}

export function IR56BPdf({ data }: { data: IR56BPdfData }) {
  const currency = (n: number) =>
    new Intl.NumberFormat(data.company.currencyLocale || "en-HK", {
      style: "currency",
      currency: data.company.currency || "HKD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n || 0);

  const employmentPeriodLabel = `${data.employmentPeriodFromLabel} – ${data.employmentPeriodToLabel}`;

  return (
    <Document
      title={`IR56B Draft - ${data.employeeName} - Year ending 31 Mar ${data.taxYearEndLabel}`}
      author={data.company.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {data.company.logoData ? (
            <Image style={styles.logo} src={data.company.logoData} />
          ) : (
            <Text style={styles.companyName}>{data.company.name}</Text>
          )}
          <View style={styles.headerMeta}>
            <Text style={styles.metaTitleZh}>稅務局 IR56B</Text>
            <Text style={styles.metaTitleEn}>Draft / reference copy — not an official IRD document</Text>
            <Text style={styles.metaBadge}>Generated {data.generatedAtLabel}</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.titleZh}>僱主填報的薪酬及退休金報稅表</Text>
          <Text style={styles.titleEn}>Employer&apos;s Return of Remuneration and Pensions</Text>
          <Text style={styles.taxYearLine}>
            截至 <Text style={styles.taxYearBox}>{data.taxYearEndLabel}</Text> 年 3 月 31 日止的 1 年度內{"  "}
            (For the year ending 31 March {data.taxYearEndLabel})
          </Text>
        </View>

        {/* Item 1 — Employer */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>1. 僱主檔案號碼 / 僱主名稱 — Employer file number / name</Text>
          <View style={styles.fieldRow}>
            <Field label="僱主檔案號碼 Employer file number" value={data.employerFileNumber} />
            <Field label="僱主名稱 Employer name" value={data.employerName} />
          </View>
        </View>

        {/* Items 2-10 — Employee */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>2–10. 僱員資料 — Employee details</Text>
          <View style={styles.fieldRow}>
            <Field label="2. 僱員姓名 Employee name" value={data.employeeName} />
            <Field label="中文姓名 Chinese name" value={data.employeeNameChinese} />
            <Field label="3(a). 香港身分證號碼 HKID" value={data.hkid} />
            <Field
              label="3(b). 護照號碼及簽發地點 Passport no. / place of issue"
              value={
                data.passportNumber
                  ? `${data.passportNumber}${data.passportPlaceOfIssue ? " / " + data.passportPlaceOfIssue : ""}`
                  : null
              }
            />
            <Field label="4. 性別 Gender (M/F)" value={data.genderLabel} />
            <Field label="5. 婚姻狀況 Marital status" value={data.maritalStatusLabel} />
            {data.maritalStatusLabel === "Married" && (
              <>
                <Field label="6(a). 配偶的姓名 Spouse's name" value={data.spouseName} />
                <Field label="6(b). 配偶的香港身分證號碼／護照號碼 Spouse's HKID / passport" value={data.spouseHkid} />
              </>
            )}
            <Field label="7. 住址 Home address" value={data.address} full={!data.correspondenceAddress} />
            {data.correspondenceAddress && (
              <Field label="8. 通訊地址 Correspondence address" value={data.correspondenceAddress} />
            )}
            <Field label="9. 受僱職位 Position" value={data.position} />
            <Field label="10. 是年內的僱用期間 Employment period this year" value={employmentPeriodLabel} />
          </View>
        </View>

        {/* Item 11 — Income breakdown */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionHeading}>
            11. 在上列第 10 項僱用期間內僱員所應獲得入息明細表 — Income for the employment period above
          </Text>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colItem]} />
            <Text style={[styles.tableHeaderCell, styles.colLabel]}>細則 Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colPeriod]}>期間 Period</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>款額 Amount (HKD)</Text>
          </View>
          {data.incomeLines.map((line, i) => (
            <View
              key={line.itemKey}
              style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
            >
              <Text style={[styles.tableCell, styles.colItem]}>({line.itemKey})</Text>
              <View style={styles.colLabel}>
                <Text style={styles.tableCell}>
                  {line.labelZh} {line.labelEn}
                </Text>
                {line.nature ? <Text style={styles.tableCellSub}>性質 Nature: {line.nature}</Text> : null}
              </View>
              <Text style={[styles.tableCell, styles.colPeriod]}>{line.periodLabel || employmentPeriodLabel}</Text>
              <Text style={[styles.tableCell, styles.colAmount]}>{line.amount ? currency(line.amount) : "—"}</Text>
            </View>
          ))}
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsCell, styles.colItem]} />
            <Text style={[styles.totalsCell, styles.colLabel]}>總額 Total</Text>
            <Text style={[styles.totalsCell, styles.colPeriod]} />
            <Text style={[styles.totalsCell, styles.colAmount]}>{currency(data.totalAmount)}</Text>
          </View>
        </View>

        {/* Item 12 — Housing */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionHeading}>12. 提供居所詳情 — Housing benefit</Text>
          <View style={styles.yesNoLine}>
            <Text style={styles.yesNoLabel}>提供居所 Housing provided (0 = No, 1 = Yes)</Text>
            <Text style={styles.yesNoValue}>{data.housing ? "1" : "0"}</Text>
          </View>
          {data.housing && (
            <View style={styles.fieldRow}>
              <Field label="類型 Type" value={data.housing.type} />
              <Field label="地址 Address" value={data.housing.address} />
              <Field label="提供居所期間 Period" value={data.housing.periodLabel} />
              <Field label="由僱主發還給僱員的租金 Reimbursed by employer" value={currency(data.housing.rentReimbursedByEmployer)} />
              <Field label="由僱員付給僱主的租金 Paid by employee to employer" value={currency(data.housing.rentPaidByEmployeeToEmployer)} />
              <Field label="由僱主付給業主的租金 Paid by employer to landlord" value={currency(data.housing.rentPaidByEmployerToLandlord)} />
              <Field label="由僱員付給業主的租金 Paid by employee to landlord" value={currency(data.housing.rentPaidByEmployeeToLandlord)} />
            </View>
          )}
        </View>

        {/* Item 13 — Non-HK entity */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionHeading}>
            13. 僱員的全部或部分入息是否由非香港實體支付 — Income paid by a non-Hong Kong entity
          </Text>
          <View style={styles.yesNoLine}>
            <Text style={styles.yesNoLabel}>非香港實體支付 Paid by non-HK entity (0 = No, 1 = Yes)</Text>
            <Text style={styles.yesNoValue}>{data.nonHkEntity ? "1" : "0"}</Text>
          </View>
          {data.nonHkEntity && (
            <View style={styles.fieldRow}>
              <Field label="該非香港實體名稱 Entity name" value={data.nonHkEntity.name} />
              <Field label="地址 Address" value={data.nonHkEntity.address} />
              <Field label="款額 Amount (included in item 11 above)" value={currency(data.nonHkEntity.amount)} />
            </View>
          )}
        </View>

        {/* Item 14 — Remarks */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionHeading}>14. 備註 — Remarks</Text>
          <Text style={styles.remarksBox}>{data.remarks || ""}</Text>
        </View>

        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureCaption}>簽署 Signature</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureCaption}>姓名 Name</Text>
            <Text style={styles.signatureValue}>{data.signerName || "—"}</Text>
            <Text style={[styles.signatureCaption, { marginTop: 6 }]}>職位 Position</Text>
            <Text style={styles.signatureValue}>{data.signerPosition || "—"}</Text>
            <Text style={[styles.signatureCaption, { marginTop: 6 }]}>日期 Date</Text>
            <Text style={styles.signatureValue}>{data.signedDateLabel || "—"}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          {data.company.address ? <Text style={styles.footerText}>{data.company.address}</Text> : null}
          <Text style={styles.footerText}>
            This is a computer-generated draft for internal review — verify every field before filing with the
            Inland Revenue Department.
          </Text>
          <View style={styles.footerBar} />
        </View>
      </Page>
    </Document>
  );
}

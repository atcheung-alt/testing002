/* eslint-disable jsx-a11y/alt-text -- this file's <Image> is @react-pdf/renderer's PDF
   primitive, not an HTML <img> or next/image — it has no `alt` prop to give it. */
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { PDF_FONT, PDF_FONT_BOLD } from "@/lib/pdf/font";
import { pdfLanguage, pdfPhrase, websiteWord } from "@/lib/pdf/phrases";

// Same letterhead palette as PayslipPdf/DocumentPdf — one consistent look
// across every generated document in the app.
const NAVY = "#1F3864";
const INK = "#111111";
const BORDER = "#000000";

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT,
    fontSize: 9,
    color: INK,
    backgroundColor: "#FFFFFF",
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 46,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  logo: { width: 130, height: 42, objectFit: "contain" },
  companyName: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 13, color: NAVY },
  headerMeta: { alignItems: "flex-end" },
  metaTitle: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 13, color: NAVY, marginBottom: 2 },
  metaLine: { fontSize: 8.5, color: "#555555", marginBottom: 1 },

  section: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FAFAFC",
    marginBottom: 14,
  },
  sectionHeading: {
    backgroundColor: NAVY,
    color: "#FFFFFF",
    fontFamily: PDF_FONT_BOLD,
    fontWeight: "bold",
    fontSize: 8.5,
    textAlign: "center",
    paddingVertical: 3.5,
  },
  kvRow: {
    flexDirection: "row",
    paddingVertical: 2.5,
    paddingHorizontal: 8,
  },
  kvLabel: { width: 130, fontSize: 9, color: "#444444" },
  kvValue: { flex: 1, fontSize: 9, fontFamily: PDF_FONT_BOLD, fontWeight: "bold" },

  // Table — period-by-period breakdown. Fixed-width numeric columns, a
  // flexible first column for the period label.
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: "#FFFFFF",
    fontFamily: PDF_FONT_BOLD,
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopWidth: 0.6,
    borderTopColor: "#DDDDDD",
  },
  tableRowAlt: {
    backgroundColor: "#F5F6FA",
  },
  tableCell: { fontSize: 8.5 },
  totalsRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: "#F0F2F8",
  },
  totalsCell: { fontFamily: PDF_FONT_BOLD, fontWeight: "bold", fontSize: 8.5 },

  colPeriod: { flex: 1.3 },
  colBasis: { flex: 1.1 },
  colIncome: { width: 68, textAlign: "right" },
  colBonus: { width: 58, textAlign: "right" },
  colMpfEmp: { width: 64, textAlign: "right" },
  colMpfEr: { width: 64, textAlign: "right" },
  colNet: { width: 68, textAlign: "right" },

  emptyNote: { fontSize: 9, color: "#666666", padding: 12, textAlign: "center" },

  employerNote: { fontSize: 7.5, color: "#666666", lineHeight: 1.5, marginBottom: 14, marginTop: -4 },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 46,
    right: 46,
    textAlign: "center",
  },
  footerText: { fontSize: 8, color: "#33415a" },
  footerBar: { marginTop: 6, height: 4, backgroundColor: NAVY },
});

export type SalaryReportRow = {
  periodLabel: string;
  payBasisLabel: string;
  grossPay: number;
  bonus: number;
  employeeMpf: number;
  employerMpf: number;
  netPay: number;
};

export type SalaryReportPdfData = {
  employeeName: string;
  employeeTitle: string;
  employmentTypeLabel: string;
  fromLabel: string;
  toLabel: string;
  rows: SalaryReportRow[];
  totals: {
    grossPay: number;
    bonus: number;
    employeeMpf: number;
    employerMpf: number;
    netPay: number;
  };
  language?: string | null;
  generatedAt: string;
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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

function KvRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

const REPORT_LABELS = {
  EN: {
    title: "Salary Report",
    period: "Period:",
    generated: "Generated:",
    employee: "Employee",
    name: "Name",
    jobTitle: "Job title",
    employmentType: "Employment type",
    colPeriod: "Period",
    colBasis: "Pay basis",
    colIncome: "Income",
    colBonus: "Bonus",
    colMpfEmp: "MPF (Emp.)",
    colMpfEr: "MPF (Empr.)",
    colNet: "Net pay",
    total: "Total",
    empty: "No payroll entries were found for this period.",
    generatedNote: "This is a computer-generated salary report.",
    mpfNote:
      '"MPF (Emp.)" is the employee\'s own Mandatory Provident Fund contribution, deducted from pay. "MPF (Empr.)" is the Company\'s separate employer contribution, paid on top of and not deducted from the employee\'s pay — shown here for reference only.',
  },
  ZH_HANT: {
    title: "薪金報告",
    period: "期間：",
    generated: "產生日期：",
    employee: "僱員",
    name: "姓名",
    jobTitle: "職位",
    employmentType: "聘用類型",
    colPeriod: "期間",
    colBasis: "支薪方式",
    colIncome: "入息",
    colBonus: "花紅",
    colMpfEmp: "強積金（僱員）",
    colMpfEr: "強積金（僱主）",
    colNet: "淨薪金",
    total: "合計",
    empty: "此期間沒有薪金紀錄。",
    generatedNote: "此乃電腦產生的薪金報告。",
    mpfNote:
      "「強積金（僱員）」是僱員本人的強制性公積金供款，從薪金中扣除。「強積金（僱主）」是本公司另付的僱主供款，並非從僱員薪金中扣除，僅供參考。",
  },
  ZH_HANS: {
    title: "薪金报告",
    period: "期间：",
    generated: "生成日期：",
    employee: "雇员",
    name: "姓名",
    jobTitle: "职位",
    employmentType: "聘用类型",
    colPeriod: "期间",
    colBasis: "支薪方式",
    colIncome: "入息",
    colBonus: "花红",
    colMpfEmp: "强积金（雇员）",
    colMpfEr: "强积金（雇主）",
    colNet: "净薪金",
    total: "合计",
    empty: "此期间没有薪金记录。",
    generatedNote: "此乃电脑生成的薪金报告。",
    mpfNote:
      "「强积金（雇员）」是雇员本人的强制性公积金供款，从薪金中扣除。「强积金（雇主）」是本公司另付的雇主供款，并非从雇员薪金中扣除，仅供参考。",
  },
} as const;

export function SalaryReportPdf({ data }: { data: SalaryReportPdfData }) {
  const t = REPORT_LABELS[pdfLanguage(data.language)];
  const currency = (n: number) =>
    new Intl.NumberFormat(data.company.currencyLocale || "en-HK", {
      style: "currency",
      currency: data.company.currency || "HKD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n || 0);

  const periodRangeLabel = data.fromLabel === data.toLabel ? data.fromLabel : `${data.fromLabel} – ${data.toLabel}`;
  const hasAnyMpf = data.rows.some((r) => r.employeeMpf || r.employerMpf) || data.totals.employeeMpf > 0;

  return (
    <Document title={`Salary Report - ${data.employeeName} - ${periodRangeLabel}`} author={data.company.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {data.company.logoData ? (
            <Image style={styles.logo} src={data.company.logoData} />
          ) : (
            <Text style={styles.companyName}>{data.company.name}</Text>
          )}
          <View style={styles.headerMeta}>
            <Text style={styles.metaTitle}>{t.title}</Text>
            <Text style={styles.metaLine}>{t.period} {periodRangeLabel}</Text>
            <Text style={styles.metaLine}>{t.generated} {formatDate(data.generatedAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{t.employee}</Text>
          <KvRow label={t.name} value={data.employeeName} />
          <KvRow label={t.jobTitle} value={data.employeeTitle} />
          <KvRow label={t.employmentType} value={pdfPhrase(data.employmentTypeLabel, data.language)} />
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colPeriod]}>{t.colPeriod}</Text>
            <Text style={[styles.tableHeaderCell, styles.colBasis]}>{t.colBasis}</Text>
            <Text style={[styles.tableHeaderCell, styles.colIncome]}>{t.colIncome}</Text>
            <Text style={[styles.tableHeaderCell, styles.colBonus]}>{t.colBonus}</Text>
            <Text style={[styles.tableHeaderCell, styles.colMpfEmp]}>{t.colMpfEmp}</Text>
            <Text style={[styles.tableHeaderCell, styles.colMpfEr]}>{t.colMpfEr}</Text>
            <Text style={[styles.tableHeaderCell, styles.colNet]}>{t.colNet}</Text>
          </View>

          {data.rows.length === 0 ? (
            <Text style={styles.emptyNote}>{t.empty}</Text>
          ) : (
            data.rows.map((row, i) => (
              <View
                key={`${row.periodLabel}-${i}`}
                style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
              >
                <Text style={[styles.tableCell, styles.colPeriod]}>{row.periodLabel}</Text>
                <Text style={[styles.tableCell, styles.colBasis]}>{pdfPhrase(row.payBasisLabel, data.language)}</Text>
                <Text style={[styles.tableCell, styles.colIncome]}>{currency(row.grossPay)}</Text>
                <Text style={[styles.tableCell, styles.colBonus]}>{row.bonus ? currency(row.bonus) : "—"}</Text>
                <Text style={[styles.tableCell, styles.colMpfEmp]}>{currency(row.employeeMpf)}</Text>
                <Text style={[styles.tableCell, styles.colMpfEr]}>{currency(row.employerMpf)}</Text>
                <Text style={[styles.tableCell, styles.colNet]}>{currency(row.netPay)}</Text>
              </View>
            ))
          )}

          {data.rows.length > 0 && (
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsCell, styles.colPeriod]}>{t.total}</Text>
              <Text style={[styles.totalsCell, styles.colBasis]} />
              <Text style={[styles.totalsCell, styles.colIncome]}>{currency(data.totals.grossPay)}</Text>
              <Text style={[styles.totalsCell, styles.colBonus]}>
                {data.totals.bonus ? currency(data.totals.bonus) : "—"}
              </Text>
              <Text style={[styles.totalsCell, styles.colMpfEmp]}>{currency(data.totals.employeeMpf)}</Text>
              <Text style={[styles.totalsCell, styles.colMpfEr]}>{currency(data.totals.employerMpf)}</Text>
              <Text style={[styles.totalsCell, styles.colNet]}>{currency(data.totals.netPay)}</Text>
            </View>
          )}
        </View>

        {hasAnyMpf && (
          <Text style={styles.employerNote}>
            {t.mpfNote}
          </Text>
        )}

        <View style={styles.footer} fixed>
          {data.company.address ? <Text style={styles.footerText}>{data.company.address}</Text> : null}
          {data.company.website ? (
            <Text style={styles.footerText}>{websiteWord(data.language)}: {data.company.website}</Text>
          ) : null}
          <Text style={styles.footerText}>{t.generatedNote}</Text>
          <View style={styles.footerBar} />
        </View>
      </Page>
    </Document>
  );
}

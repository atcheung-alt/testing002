type PdfLanguage = "EN" | "ZH_HANT" | "ZH_HANS";

export function pdfLanguage(value?: string | null): PdfLanguage {
  return value === "ZH_HANT" || value === "ZH_HANS" ? value : "EN";
}

/** Standard labels that are stored or built in English, then shown in the
 *  language of this particular PDF. Unknown text is left as written. */
const PHRASES: Record<string, Record<Exclude<PdfLanguage, "EN">, string>> = {
  "Monthly salary": { ZH_HANT: "月薪", ZH_HANS: "月薪" },
  "Daily rate": { ZH_HANT: "日薪", ZH_HANS: "日薪" },
  "Hourly rate": { ZH_HANT: "時薪", ZH_HANS: "时薪" },
  "Fixed project fee": { ZH_HANT: "固定項目費用", ZH_HANS: "固定项目费用" },
  "Full time": { ZH_HANT: "全職", ZH_HANS: "全职" },
  "Part time": { ZH_HANT: "兼職", ZH_HANS: "兼职" },
  Intern: { ZH_HANT: "實習生", ZH_HANS: "实习生" },
  Freelance: { ZH_HANT: "自由職業", ZH_HANS: "自由职业" },
  "day(s)": { ZH_HANT: "日", ZH_HANS: "日" },
  "hour(s)": { ZH_HANT: "小時", ZH_HANS: "小时" },
  "Employment Contract": { ZH_HANT: "僱傭合約", ZH_HANS: "雇佣合约" },
  "Independent Contractor Agreement": { ZH_HANT: "獨立承辦商協議", ZH_HANS: "独立承办商协议" },
};

export function pdfPhrase(text: string, language?: string | null): string {
  const lang = pdfLanguage(language);
  if (lang === "EN") return text;
  return PHRASES[text]?.[lang] || text;
}

export function websiteWord(language?: string | null): string {
  const lang = pdfLanguage(language);
  if (lang === "ZH_HANS") return "网站";
  if (lang === "ZH_HANT") return "網站";
  return "Website";
}

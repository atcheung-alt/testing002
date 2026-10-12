import path from "path";
import fs from "fs";
import { Font } from "@react-pdf/renderer";

// The 14 built-in PDF fonts (Helvetica, etc.) only cover Latin-1 — any CJK
// character (Chinese company names, in particular) silently renders as
// garbled/missing glyphs with them.
//
// Noto Sans SC was chosen over Noto Sans TC after hitting real garbling on
// a mainland Chinese company name: verified directly against both fonts'
// cmap tables (via fontTools) that Noto Sans TC is missing several
// Simplified-only characters (e.g. 应, 链) that have no shared codepoint
// with their Traditional form. Noto Sans SC, despite the name, covers both
// — verified against the same Simplified test data *and* an earlier
// Traditional-Chinese test batch (Hong Kong company/address/terms text) —
// full coverage on both, so one font handles both scripts here rather than
// needing per-character font-switching. It also covers standard Latin text
// fine, so it replaces Helvetica everywhere it's used.
//
// Static Regular/Bold instances, not the variable font directly: Google's
// only distributed build is a variable font whose DEFAULT instance (no
// variation coordinates applied) is Thin (wght=100), not Regular (400) —
// confirmed directly via fontTools' fvar table. Registering that file
// under fontWeight "normal"/"bold" and hoping the renderer resolves the
// right named instance produced exactly the "text is too thin" complaint
// this caused in production — variable font weight axes generally aren't
// reliably resolved through PDF embedding, which traditionally expects a
// static glyph outline per weight, not a variation to interpolate. Fixed
// by statically instantiating the exact Regular (400) and Bold (700)
// instances from the variable font with fontTools' varLib.instancer,
// producing real static TTFs with the correct weight baked into the
// glyph outlines themselves — no runtime axis resolution involved at all.
const FONT_DIR_CANDIDATES = [
  path.join(__dirname, "fonts"),
  path.join(process.cwd(), "src", "lib", "pdf", "fonts"),
  path.join(process.cwd(), ".next", "server", "src", "lib", "pdf", "fonts"),
];

function findFont(filename: string): string | undefined {
  for (const dir of FONT_DIR_CANDIDATES) {
    const candidate = path.join(dir, filename);
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

const REGULAR = findFont("NotoSansSC-Regular.ttf");
const BOLD = findFont("NotoSansSC-Bold.ttf");

if (!REGULAR || !BOLD) {
  console.error(
    "[pdf] NotoSansSC static font files not found in any expected location — falling back to Helvetica (CJK text will garble, and weight will be wrong). Checked directories:",
    FONT_DIR_CANDIDATES
  );
} else {
  Font.register({
    family: "NotoSansSC",
    fonts: [
      { src: REGULAR, fontWeight: "normal" },
      { src: BOLD, fontWeight: "bold" },
    ],
  });
}

// Used everywhere instead of the literal family name, so missing font
// files degrade to the original (CJK-garbling, but functional) Helvetica
// behavior rather than breaking PDF generation entirely.
export const PDF_FONT = REGULAR && BOLD ? "NotoSansSC" : "Helvetica";
export const PDF_FONT_BOLD = REGULAR && BOLD ? "NotoSansSC" : "Helvetica-Bold";

// Disable hyphenation for genuine single "words" (so labels like
// "Pricing (HKD)" and unit strings like "HK$1,000/Location(s)" wrap at
// spaces instead of getting an ugly mid-word hyphen) — but CJK text has no
// spaces between characters at all, so react-pdf's word-splitter treats an
// entire run of Chinese/Japanese/Korean characters as a single "word" and,
// without this exception, that whole run would never be allowed to break,
// overflowing straight past its column's right edge instead of wrapping.
// Real CJK typography allows a line break between almost any two
// characters, so runs of CJK characters are split into individually
// breakable units here; non-CJK runs (English words, units, numbers) are
// left exactly as before, fully unbroken.
const CJK_RANGES =
  /[\u3000-\u303F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\uAC00-\uD7A3]/;

Font.registerHyphenationCallback((word) => {
  if (!CJK_RANGES.test(word)) return [word];

  // Group consecutive non-CJK characters together (so an embedded English
  // term or number inside mostly-CJK text isn't split character-by-character
  // too), but split every CJK character out as its own breakable unit.
  const parts: string[] = [];
  let buffer = "";
  for (const char of word) {
    if (CJK_RANGES.test(char)) {
      if (buffer) {
        parts.push(buffer);
        buffer = "";
      }
      parts.push(char);
    } else {
      buffer += char;
    }
  }
  if (buffer) parts.push(buffer);
  return parts;
});

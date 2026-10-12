// -----------------------------------------------------------------------------
// Script-agnostic substring search — lets a user type a query in either
// Traditional or Simplified Chinese and match item names/descriptions
// stored in the other script.
//
// Built on `opencc-js`, not a plain one-to-one character-mapping library:
// several Simplified characters legitimately merge multiple distinct
// Traditional characters (e.g. 布 merges 布 "cloth" and 佈 "arrange" — a
// search for 布置 "setup/decoration" needs to become 佈置, not 布置, to find
// an item saved in Traditional). A naive per-character swap gets this
// specific, very plausible business term wrong; OpenCC's phrase-level
// dictionary resolves it correctly in both directions.
//
// The approach: convert only the *query* into both scripts (its own script
// is already one of the two, so that branch is a no-op) and test all three
// variants against the untouched haystack. Non-Chinese characters (English,
// numbers, punctuation) pass through unchanged, so this also works
// unmodified for plain English/mixed-text searches — it never makes
// matching stricter, only more permissive.
// -----------------------------------------------------------------------------

import { Converter } from "opencc-js";

// Built once per module load, not per keystroke — Converter() does the
// (relatively expensive) dictionary setup internally.
const toSimplified = Converter({ from: "tw", to: "cn" });
const toTraditional = Converter({ from: "cn", to: "tw" });

/** Case-insensitive substring match of `query` against `text`, matching
 *  regardless of which Chinese script either one happens to be written in.
 *  An empty/whitespace-only query always matches (treat as "no filter"). */
export function matchesQuery(text: string | null | undefined, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = (text || "").toLowerCase();
  if (haystack.includes(q)) return true;
  const simplified = toSimplified(q).toLowerCase();
  const traditional = toTraditional(q).toLowerCase();
  return (simplified !== q && haystack.includes(simplified)) ||
    (traditional !== q && haystack.includes(traditional));
}

/** True if `query` matches any of the given fields — convenience for
 *  filtering by e.g. both name and description in one call. */
export function matchesAnyField(query: string, ...fields: (string | null | undefined)[]): boolean {
  return fields.some((field) => matchesQuery(field, query));
}

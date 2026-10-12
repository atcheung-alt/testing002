"use client";

import { RotateCcw } from "lucide-react";
import {
  DEFAULT_REMINDER_TEMPLATES,
  DEFAULT_TERMS_TEMPLATES,
  VALID_DOCUMENT_LANGUAGES,
  DOCUMENT_LANGUAGE_LABELS,
  renderTerms,
  type DocumentLanguage,
} from "@/lib/settings";

type Props = {
  notes: string;
  onNotesChange: (v: string) => void;
  paymentDueDays: number;
  onPaymentDueDaysChange: (v: number) => void;
  reminder: string;
  onReminderChange: (v: string) => void;
  terms: string;
  onTermsChange: (v: string) => void;
  /** Quotations use a Reminder + Terms & Conditions block; invoices don't. */
  showReminderAndTerms?: boolean;
  /** Which language the Reminder/Terms text (and the generated PDF's static
   *  labels) are in — see DocumentLanguage in src/lib/settings.ts. */
  language: DocumentLanguage;
  onLanguageChange: (v: DocumentLanguage) => void;
};

/**
 * Shared editor for the standardized document footer: Notes, Payment Due (Days),
 * Language, Reminder, and Terms & Conditions. The payment window is woven into
 * the terms template, and both reminder and terms can be reset to the
 * standardized defaults (in the selected language) with one click.
 */
export default function DocumentMetaFields({
  notes,
  onNotesChange,
  paymentDueDays,
  onPaymentDueDaysChange,
  reminder,
  onReminderChange,
  terms,
  onTermsChange,
  showReminderAndTerms = true,
  language,
  onLanguageChange,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="card p-5">
        <label className="label">Notes for customer</label>
        <textarea
          className="input min-h-[80px]"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Thank you for the opportunity to work with you."
        />
      </div>

      <div className="card p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Payment due (days)</label>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className="input"
              value={paymentDueDays}
              onChange={(e) => {
                const raw = parseInt(e.target.value, 10);
                onPaymentDueDaysChange(Number.isFinite(raw) && raw >= 0 ? raw : 0);
              }}
            />
            <p className="mt-1.5 text-xs text-ink-faint">
              Sets the invoice due date and the &ldquo;Payment Terms&rdquo; line shown on invoices.
            </p>
          </div>

          <div>
            <label className="label">Language</label>
            <select
              className="input"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as DocumentLanguage)}
            >
              {VALID_DOCUMENT_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {DOCUMENT_LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink-faint">
              Regenerates the Reminder/Terms text below and the generated PDF&rsquo;s labels in
              the selected language.
            </p>
          </div>
        </div>

        {showReminderAndTerms && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Reminder</label>
                <button
                  type="button"
                  onClick={() => onReminderChange(DEFAULT_REMINDER_TEMPLATES[language])}
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                >
                  <RotateCcw size={12} /> Reset to default
                </button>
              </div>
              <textarea
                className="input min-h-[90px]"
                value={reminder}
                onChange={(e) => onReminderChange(e.target.value)}
                placeholder={DEFAULT_REMINDER_TEMPLATES[language]}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Terms &amp; conditions</label>
                <button
                  type="button"
                  onClick={() =>
                    onTermsChange(renderTerms(DEFAULT_TERMS_TEMPLATES[language], paymentDueDays))
                  }
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                >
                  <RotateCcw size={12} /> Reset to standard template
                </button>
              </div>
              <textarea
                className="input min-h-[150px] font-mono text-xs leading-relaxed"
                value={terms}
                onChange={(e) => onTermsChange(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                Auto-filled from the standardized template. Editing here only affects this
                document; the shared template lives in{" "}
                <code className="text-ink-muted">src/lib/settings.ts</code>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

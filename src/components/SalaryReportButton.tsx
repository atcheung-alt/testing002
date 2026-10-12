"use client";

import { useState } from "react";
import { FileDown, X, AlertCircle } from "lucide-react";
import Portal from "@/components/Portal";
import { currentPeriod } from "@/lib/payroll";
import { PDF_DOWNLOAD_BUTTONS, type PdfDownloadLanguage } from "@/lib/pdf/language";

/** Opens a small "pick a date range" modal, then downloads a PDF salary
 *  report for this employee covering every payroll run in that range (see
 *  GET /api/employees/[id]/salary-report/pdf). Mirrors NewPayrollRunButton's
 *  modal shape, but the end action is a plain download rather than a POST —
 *  no server state changes here. */
export default function SalaryReportButton({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(currentPeriod());
  const [to, setTo] = useState(currentPeriod());
  const [error, setError] = useState<string | null>(null);

  function download(language: PdfDownloadLanguage) {
    if (!from || !to) {
      setError("Please choose both a start and end month.");
      return;
    }
    if (from > to) {
      setError("The start month must be on or before the end month.");
      return;
    }
    setError(null);
    window.open(
      `/api/employees/${employeeId}/salary-report/pdf?from=${from}&to=${to}&lang=${language}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        <FileDown size={15} /> Salary report
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-brand-950/30 backdrop-blur-sm animate-fade-in"
              onClick={() => setOpen(false)}
            />
            <div className="relative w-full max-w-sm card p-6 animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold">Export salary report</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-ink-faint hover:text-ink"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/30 text-danger-600 text-sm rounded-xl px-3 py-2 mb-4">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="label">From</label>
                  <input type="month" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <label className="label">To</label>
                  <input type="month" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-ink-faint mb-4">
                Covers every payroll run in this range — income, bonus, and MPF (employee and employer) per month,
                plus totals. Headings follow the button you pick.
              </p>

              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                {PDF_DOWNLOAD_BUTTONS.map((option) => (
                  <button
                    key={option.lang}
                    type="button"
                    onClick={() => download(option.lang)}
                    disabled={!from || !to}
                    className="btn-secondary whitespace-nowrap"
                  >
                    <FileDown size={15} /> {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

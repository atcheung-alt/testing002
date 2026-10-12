"use client";

import { useState } from "react";
import { FileDown, FileText, X, AlertCircle } from "lucide-react";
import { PDF_DOWNLOAD_BUTTONS } from "@/lib/pdf/language";
import Portal from "@/components/Portal";

/** The HK tax year (ending 31 March) currently in progress — Jan/Feb/Mar
 *  fall inside the year ending THIS March 31; Apr–Dec fall inside the year
 *  ending NEXT March 31. Just a sensible default for the picker below. */
function currentTaxYearEnd(): number {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan
  return month <= 2 ? now.getFullYear() : now.getFullYear() + 1;
}

/** Opens a small "pick a tax year" modal, then downloads a draft/reference
 *  IR56B PDF for this employee for that year (see GET
 *  /api/employees/[id]/ir56b/pdf). Mirrors SalaryReportButton's modal shape —
 *  a plain download, no server state changes.
 *
 *  Of everything the IR56B tax-filing section can collect, HKID and address
 *  are the two that actually matter — every other field there (marital
 *  status, spouse, passport, correspondence address, housing, non-HK-entity
 *  payment) is genuinely optional and stays that way with no warning here if
 *  left blank. This only flags HKID/address specifically, since a form
 *  without either of those is missing what it needs to be useful at all. */
export default function IR56BButton({
  employeeId,
  hkid,
  address,
}: {
  employeeId: string;
  hkid?: string | null;
  address?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(currentTaxYearEnd());
  const [error, setError] = useState<string | null>(null);

  const missing: string[] = [];
  if (!hkid?.trim()) missing.push("HKID");
  if (!address?.trim()) missing.push("address");

  function download() {
    if (!year || year < 2000 || year > 2100) {
      setError("Please choose a valid tax year.");
      return;
    }
    setError(null);
    window.open(`/api/employees/${employeeId}/ir56b/pdf?year=${year}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        <FileText size={15} /> IR56B
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
                <h2 className="font-display text-lg font-semibold">Export IR56B</h2>
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

              {missing.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-500/30 text-amber-700 text-sm rounded-xl px-3 py-2 mb-4">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    This employee has no {missing.join(" or ")} on file — add{" "}
                    {missing.length > 1 ? "them" : "it"} on the edit page for a complete export.
                  </span>
                </div>
              )}

              <div className="mb-2">
                <label className="label">Tax year ending 31 March</label>
                <input
                  type="number"
                  className="input"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value) || 0)}
                />
              </div>
              <p className="text-xs text-ink-faint mb-4">
                Fills the actual official IR56B form from IRD — name, HKID, address, position, employment
                dates, and salary + bonus totaled from payroll history for that year. The government form is
                already printed in English and Chinese on the same page, so both buttons download that one
                form. Marital status, spouse, passport, housing, and employer file number aren&apos;t stored
                anywhere in this app, so those sections are left blank on the form for you to fill in by hand
                before filing.
              </p>

              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                {PDF_DOWNLOAD_BUTTONS.map((option) => (
                  <button
                    key={option.lang}
                    type="button"
                    onClick={download}
                    disabled={!year}
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

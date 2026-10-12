"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";

const GRANULARITIES: { value: "week" | "month" | "year"; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function AnalysisFilters({
  granularity,
  refDate,
}: {
  granularity: "week" | "month" | "year";
  refDate: Date;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i); // last 5 years .. next year

  function navigate(nextGranularity: string, nextRef: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("granularity", nextGranularity);
    params.set("ref", nextRef);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setYearMonth(year: number, month: number) {
    navigate("month", toDateInputValue(new Date(year, month, 1)));
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex gap-2">
        {GRANULARITIES.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => navigate(g.value, toDateInputValue(refDate))}
            className={clsx(
              "stamp",
              granularity === g.value
                ? "border-brand-500 text-brand-500"
                : "border-line text-ink-muted"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      {granularity === "week" && (
        <input
          type="date"
          className="input !w-auto"
          value={toDateInputValue(refDate)}
          onChange={(e) => e.target.value && navigate("week", e.target.value)}
        />
      )}

      {granularity === "month" && (
        <div className="flex gap-2">
          <select
            className="input !w-auto"
            value={refDate.getMonth()}
            onChange={(e) => setYearMonth(refDate.getFullYear(), Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="input !w-auto"
            value={refDate.getFullYear()}
            onChange={(e) => setYearMonth(Number(e.target.value), refDate.getMonth())}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {granularity === "year" && (
        <select
          className="input !w-auto"
          value={refDate.getFullYear()}
          onChange={(e) => navigate("year", toDateInputValue(new Date(Number(e.target.value), 0, 1)))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

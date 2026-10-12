"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sun, Moon, Monitor, Building2 } from "lucide-react";
import clsx from "clsx";
import type { ThemeMode } from "@/types";

// `null` = "no personal override — use the company default from Settings".
type Choice = ThemeMode | null;

const OPTIONS: { value: Choice; label: string; icon: typeof Sun }[] = [
  { value: null, label: "Company default", icon: Building2 },
  { value: "LIGHT", label: "Light", icon: Sun },
  { value: "DARK", label: "Dark", icon: Moon },
  { value: "AUTO", label: "Automatic", icon: Monitor },
];

/**
 * Personal, per-account theme override — independent of the company-wide
 * default configured elsewhere on this page. Applies only to the signed-in
 * user's own sessions/devices, saves immediately on click (no separate Save
 * button, since this never touches company-wide state), and live-previews
 * instantly via the same `data-theme` attribute the root layout stamps on
 * `<html>` — see globals.css for how "light"/"dark"/"auto" actually resolve.
 */
export default function ThemeModeControl() {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice>(null);
  const [companyDefault, setCompanyDefault] = useState<ThemeMode>("LIGHT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/theme")
      .then((res) => res.json())
      .then((data) => {
        setChoice(data.themeMode ?? null);
        setCompanyDefault(data.companyDefault || "LIGHT");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function pick(value: Choice) {
    if (value === choice || saving) return;
    setChoice(value);
    setSaved(false);
    setError(null);
    // Live-preview immediately, same trick the company-wide toggle uses.
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = (value ?? companyDefault).toLowerCase();
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeMode: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your preference.");
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div>
      {error && <p className="text-xs text-danger-500 mb-1.5">{error}</p>}
      <div className="inline-flex flex-wrap rounded-full border border-line bg-paper p-1 gap-1 self-start">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => pick(value)}
            aria-pressed={choice === value}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
              choice === value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        {saved && (
          <span className="flex items-center gap-1 px-2 text-xs text-emerald-600">
            <CheckCircle2 size={13} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}

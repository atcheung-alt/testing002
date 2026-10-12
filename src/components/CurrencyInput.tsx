"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Formats a raw typed string for display: keeps only digits and a single
 * decimal point, strips leading zeros from the integer part ("007" -> "7",
 * but "0.5" stays "0.5"), and inserts thousands separators. Deliberately
 * string-in/string-out — this only controls how the number *looks* while
 * typing; parsing back to a real number happens in toNumber below.
 */
function formatDigits(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }

  const [rawIntPart, decPart] = cleaned.split(".");
  const intPart = rawIntPart.replace(/^0+(?=\d)/, "");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decPart === undefined) return withCommas;
  return `${withCommas || "0"}.${decPart}`;
}

function toNumber(formatted: string): number {
  const n = parseFloat(formatted.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Plain-number text input that auto-formats as you type: thousands
 * separators go in ("15000" -> "15,000") and leading zeros come out ("007"
 * -> "7"), while still allowing a decimal in progress (e.g. an hourly rate
 * like "15.5"). Built as a text input rather than type="number" since native
 * number inputs can't display comma separators at all.
 */
export default function CurrencyInput({
  value,
  onChange,
  className,
  placeholder,
  min = 0,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  min?: number;
}) {
  const [display, setDisplay] = useState(() => (value ? formatDigits(String(value)) : ""));
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocused = useRef(false);

  // Keep the display in sync with external resets (e.g. switching employment
  // type zeroes this field out elsewhere) as long as the user isn't actively
  // typing in it — otherwise this would fight their keystrokes.
  useEffect(() => {
    if (!isFocused.current) {
      setDisplay(value ? formatDigits(String(value)) : "");
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, "").length;

    const formatted = formatDigits(input.value);
    setDisplay(formatted);
    onChange(Math.max(min, toNumber(formatted)));

    // Re-place the caret after the same number of digits it followed before
    // formatting, so a comma inserted mid-type doesn't shove the cursor to
    // the end of the field.
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let seen = 0;
      let pos = formatted.length;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) seen++;
        if (seen === digitsBeforeCaret) {
          pos = i + 1;
          break;
        }
      }
      if (digitsBeforeCaret === 0) pos = 0;
      inputRef.current.setSelectionRange(pos, pos);
    });
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      value={display}
      onFocus={() => {
        isFocused.current = true;
      }}
      onBlur={() => {
        isFocused.current = false;
        setDisplay(value ? formatDigits(String(value)) : "");
      }}
      onChange={handleChange}
    />
  );
}

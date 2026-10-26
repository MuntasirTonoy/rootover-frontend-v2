"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

// The 6-digit email code as one box per digit. Typing moves to the next box,
// Backspace goes back, and pasting (or the phone's code autofill) fills them
// all. `value` is the digits entered so far; `id` goes on the first box so a
// <label htmlFor> focuses it.
export default function OtpInput({
  id,
  value,
  onChange,
  length = 6,
  invalid = false,
  disabled = false,
  autoFocus = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focus = (i: number) => {
    const box = boxes.current[Math.max(0, Math.min(length - 1, i))];
    box?.focus();
    box?.select();
  };

  // Writes `typed` starting at box `from` (several digits = paste or autofill)
  const fill = (from: number, typed: string) => {
    const incoming = typed.replace(/\D/g, "");
    if (!incoming) return;
    const next = digits.slice();
    incoming
      .slice(0, length - from)
      .split("")
      .forEach((d, k) => (next[from + k] = d));
    onChange(next.join(""));
    focus(from + incoming.length);
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      // Clear this box, or the one before it when this one is already empty
      const at = digits[i] ? i : i - 1;
      if (at < 0) return;
      onChange(value.slice(0, at) + value.slice(at + 1));
      focus(at);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const onPaste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fill(i, e.clipboardData.getData("text"));
  };

  return (
    <div className="flex justify-between gap-2 sm:justify-center sm:gap-3" role="group" aria-label="Verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          id={i === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          // Lets phones offer the code from the SMS/email autofill bar
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid}
          // Boxes after the first gap can't be typed into yet
          onFocus={(e) => {
            if (i > value.length) focus(value.length);
            else e.target.select();
          }}
          onChange={(e) => {
            const typed = e.target.value;
            // Typing over a filled box: keep only the new digit
            fill(i, digit && typed.length === 2 ? typed.replace(digit, "") : typed);
          }}
          onKeyDown={onKeyDown(i)}
          onPaste={onPaste(i)}
          className={`h-12 w-11 rounded-md border bg-background text-center font-mono text-xl font-bold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 sm:h-14 sm:w-12 sm:text-2xl ${
            invalid ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : digit ? "border-primary/60" : "border-border"
          }`}
        />
      ))}
    </div>
  );
}

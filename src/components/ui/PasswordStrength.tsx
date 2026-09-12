"use client";

/**
 * Live password-requirement feedback shown while typing (AUTH-02).
 *
 * Mirrors the server policy in `tvsbackend/src/utils/passwordPolicy.ts`
 * (8+ chars with upper, lower, digit and a special character). Only the
 * pass/fail of each requirement is revealed — never the password itself.
 */

import type { ReactNode } from "react";
import Ltr from "@/components/Ltr";
import { n } from "@/lib/num";

const RULES: ReadonlyArray<{
  id: string;
  label: ReactNode;
  test: (v: string) => boolean;
}> = [
  { id: "min", label: `${n(8)} أحرف على الأقل`, test: (v: string) => v.length >= 8 },
  {
    id: "lower",
    label: (
      <>
        حرف لاتيني صغير واحد (<Ltr>a-z</Ltr>)
      </>
    ),
    test: (v: string) => /[a-z]/.test(v),
  },
  {
    id: "upper",
    label: (
      <>
        حرف لاتيني كبير واحد (<Ltr>A-Z</Ltr>)
      </>
    ),
    test: (v: string) => /[A-Z]/.test(v),
  },
  { id: "digit", label: "رقم واحد", test: (v: string) => /\d/.test(v) },
  {
    id: "special",
    label: (
      <>
        رمز خاص واحد (مثل <Ltr>@ # $ !</Ltr>)
      </>
    ),
    test: (v: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(v),
  },
];

export default function PasswordStrength({ value }: { value: string }) {
  const typed = value.length > 0;
  if (!typed) return null;

  const passed = RULES.filter((r) => r.test(value)).length;
  const allPassed = passed === RULES.length;

  return (
    <div
      aria-live="polite"
      className="mt-2 rounded-lg border border-sutra-line bg-sutra-bg px-3 py-2.5"
    >
      <p className="sr-only">
        {allPassed
          ? "كلمة المرور تستوفي جميع المتطلبات."
          : `تم استيفاء ${n(passed)} من متطلبات كلمة المرور البالغ عددها ${n(RULES.length)}.`}
      </p>
      <ul className="grid grid-cols-1 gap-1">
        {RULES.map((r) => {
          const ok = r.test(value);
          return (
            <li
              key={r.id}
              className={`flex items-center gap-1.5 text-[11.5px] ${
                ok ? "text-green-700" : "text-sutra-ink-3"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3 flex-none"
                aria-hidden
              >
                {ok ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="9" />}
              </svg>
              <span>{r.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

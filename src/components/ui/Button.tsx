"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "icon" | "ghost";

const STYLES: Record<Variant, string> = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-8 h-11 text-[15px] font-semibold text-white transition-colors hover:bg-navy-dark disabled:opacity-60",
  icon:
    "grid place-items-center w-9 h-9 rounded-md bg-transparent text-sutra-ink-3 transition-colors hover:text-sutra-ink-2 hover:bg-tint",
  ghost:
    "inline-flex items-center justify-center gap-2 bg-transparent border-0 text-[13px] font-medium text-sutra-ink-2 hover:text-navy cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-25"
      />
      <path
        d="M4 12a8 8 0 0 1 8-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={`${STYLES[variant]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export { Spinner };

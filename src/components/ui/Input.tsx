"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailing?: ReactNode;
};

export default function Input({ label, trailing, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      <label htmlFor={inputId} className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className={`w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[15px] text-sutra-ink transition-colors outline-none focus:border-navy focus-visible:outline-none placeholder:text-sutra-ink-3 ${
            trailing ? "pe-12" : ""
          } ${className}`}
          {...props}
          autoComplete={props.autoComplete ?? "off"}
        />
        {trailing && (
          <span className="absolute end-1 top-1/2 -translate-y-1/2">{trailing}</span>
        )}
      </div>
    </div>
  );
}

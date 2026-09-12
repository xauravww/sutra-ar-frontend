"use client";

import type { InputHTMLAttributes } from "react";
import Input from "./Input";
import Button from "./Button";
import { usePasswordToggle } from "@/hooks/usePasswordToggle";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export default function PasswordInput({ label, ...props }: PasswordInputProps) {
  const { visible, toggle, type } = usePasswordToggle();

  return (
    <Input
      label={label}
      type={type}
      trailing={
        <Button
          variant="icon"
          onClick={toggle}
          aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
              <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
              <path d="M6.6 6.6C3.6 8.24 2 12 2 12s3.5 7 10 7a9.3 9.3 0 0 0 5.4-1.6" />
              <path d="m2 2 20 20" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </Button>
      }
      {...props}
    />
  );
}

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";

export type RegisterRole = "legal_practitioner" | "judiciary";

/** Reusable registration form state + submit. */
export function useRegisterForm() {
  const router = useRouter();

  const [role, setRole] = useState<RegisterRole>("legal_practitioner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        await auth.register({ email, password, role });
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "تعذّر إنشاء الحساب");
      } finally {
        setLoading(false);
      }
    },
    [email, password, role, router]
  );

  return { role, setRole, email, setEmail, password, setPassword, error, loading, submit };
}

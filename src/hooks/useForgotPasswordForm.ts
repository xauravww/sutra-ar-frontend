"use client";

import { useCallback, useState } from "react";
import { auth } from "@/lib/api";

/** Reusable forgot-password form state + submit. */
export function useForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    if (!email) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await auth.forgotPassword(email);
      setSuccess("إذا كان هناك حساب مرتبط بهذا البريد الإلكتروني، فقد أُرسل إليه رابط إعادة تعيين.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تعذّر إرسال رابط إعادة التعيين");
    } finally {
      setLoading(false);
    }
  }, [email]);

  return { email, setEmail, error, success, loading, submit };
}

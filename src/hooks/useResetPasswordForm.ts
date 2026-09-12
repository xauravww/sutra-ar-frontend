"use client";

import { useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "@/lib/api";

/** Reusable reset-password form state + submit. */
export function useResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    if (!token) {
      setError("رابط إعادة التعيين غير صالح أو منتهي الصلاحية.");
      return;
    }
    if (!password) {
      setError("يرجى إدخال كلمة المرور الجديدة.");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await auth.resetPassword(token, password);
      setSuccess("تمت إعادة تعيين كلمة المرور بنجاح! جارٍ تحويلك إلى صفحة تسجيل الدخول…");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تعذّرت إعادة التعيين");
    } finally {
      setLoading(false);
    }
  }, [token, password, confirmPassword, router]);

  return { password, setPassword, confirmPassword, setConfirmPassword, error, success, loading, submit, hasToken: !!token };
}

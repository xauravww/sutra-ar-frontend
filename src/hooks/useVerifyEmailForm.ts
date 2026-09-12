"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "@/lib/api";

const COOLDOWN_SECONDS = 60;

/** Reusable verify-email form state + submit. */
export function useVerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get("email") ?? "";
  const reason = searchParams.get("reason") ?? "";

  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? (clearInterval(timerRef.current!), 0) : c - 1));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cooldown]);

  const sendOtp = useCallback(async () => {
    if (!email || cooldown > 0) return;
    setError("");
    setSending(true);
    try {
      const res = await auth.sendOtp(email);
      // In dev mode, backend returns the OTP in the response
      if (res.data?.otpCode) {
        setDevOtp(res.data.otpCode);
      }
      setCooldown(COOLDOWN_SECONDS);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تعذّر إرسال رمز التحقق");
    } finally {
      setSending(false);
    }
  }, [email, cooldown]);

  const verify = useCallback(async () => {
    if (!email || !otp) return;
    setError("");
    setLoading(true);
    try {
      await auth.verifyOtp(email, otp);
      setSuccess("تم التحقق من الحساب. جارٍ التحويل إلى تسجيل الدخول…");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تعذّر التحقق");
    } finally {
      setLoading(false);
    }
  }, [email, otp, router]);

  return { email, reason, otp, setOtp, devOtp, error, success, loading, sending, cooldown, sendOtp, verify };
}

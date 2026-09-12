"use client";

import { Suspense } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Input from "@/components/ui/Input";
import Button, { Spinner } from "@/components/ui/Button";
import Ltr from "@/components/Ltr";
import { count, n } from "@/lib/num";
import { useVerifyEmailForm } from "@/hooks/useVerifyEmailForm";

function VerifyEmailForm() {
  const { email, reason, otp, setOtp, devOtp, error, success, loading, sending, cooldown, sendOtp, verify } =
    useVerifyEmailForm();

  return (
    <div className="w-full max-w-[380px] rounded-xl border border-sutra-line bg-white p-5 sm:p-7">
      <h2 className="text-[15px] font-bold text-sutra-ink mb-1">تحقق من بريدك الإلكتروني</h2>
      <p className="text-[13px] text-sutra-ink-3 mb-4">
        أدخل الرمز المكوّن من {n(6)} أرقام المرسل إلى{" "}
        {email ? (
          <Ltr className="font-semibold text-sutra-ink-2">{email}</Ltr>
        ) : (
          <span className="font-semibold text-sutra-ink-2">بريدك الإلكتروني</span>
        )}
      </p>

      {reason === "pending" && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-snug text-amber-800">
          تم تسجيل حسابك ولكن لم يتم التحقق منه بعد. أُرسل إليك رمز جديد عبر البريد
          الإلكتروني — وإذا انتهت صلاحيته، فاستخدم{" "}
          <span className="font-semibold">إعادة إرسال الرمز</span> أدناه.
        </div>
      )}

      <div className="mb-4">
        <Input
          label="رمز التحقق"
          name="otp"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
        />
      </div>

      {devOtp && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5">
          <p className="text-[12px] font-semibold text-amber-800">وضع التطوير — رمز التحقق</p>
          <p className="text-[18px] font-bold text-amber-900">
            <Ltr>{devOtp}</Ltr>
          </p>
        </div>
      )}

      {error && <p className="mt-1 text-[13px] text-red-700">{error}</p>}
      {success && <p className="mt-1 text-[13px] text-green-700">{success}</p>}

      {/* Verify — submits the form */}
      <form onSubmit={(e) => { e.preventDefault(); verify(); }}>
        <div className="mt-4 flex justify-center">
          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            {loading ? "جارٍ التحقق…" : "تحقق"}
          </Button>
        </div>
      </form>

      {/* Resend OTP — outside the form, standalone button */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={sendOtp}
          disabled={sending || cooldown > 0}
          className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-sutra-ink-2 hover:text-navy bg-transparent border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending && <Spinner className="w-3.5 h-3.5" />}
          {cooldown > 0
            ? `إعادة إرسال الرمز (${count(cooldown, { one: "ثانية", two: "ثانيتان", few: "ثوانٍ", many: "ثانية", other: "ثانية" })})`
            : "إعادة إرسال الرمز"}
        </button>
      </div>

      <div className="mt-3 text-center">
        <Link
          href="/login"
          className="text-[13px] font-medium text-sutra-ink-3 no-underline hover:text-navy"
        >
          العودة إلى تسجيل الدخول
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-sutra-bg">
      <header className="flex-none border-b border-sutra-line bg-white px-5 py-3.5 sm:px-8">
        <Logo className="h-7 sm:h-8 w-auto" />
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 grid place-items-center px-4 py-5 sm:px-6">
        <Suspense
          fallback={
            <div className="w-full max-w-[380px] rounded-xl border border-sutra-line bg-white p-5 sm:p-7 space-y-4">
              <div className="h-4 w-48 bg-sutra-line-2 rounded animate-pulse" />
              <div className="h-3 w-64 bg-sutra-line-2 rounded animate-pulse" />
              <div className="h-11 w-full bg-sutra-line-2 rounded-lg animate-pulse" />
              <div className="h-11 w-full bg-sutra-line-2 rounded-lg animate-pulse" />
            </div>
          }
        >
          <VerifyEmailForm />
        </Suspense>
      </main>
    </div>
  );
}

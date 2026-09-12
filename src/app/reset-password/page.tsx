"use client";

import { Suspense } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";
import { useResetPasswordForm } from "@/hooks/useResetPasswordForm";

function ResetPasswordForm() {
  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    success,
    loading,
    submit,
    hasToken,
  } = useResetPasswordForm();

  if (!hasToken) {
    return (
      <div className="w-full max-w-[380px] rounded-xl border border-sutra-line bg-white p-5 sm:p-7 text-center">
        <p className="text-[14px] text-red-700 mb-4">رابط إعادة التعيين غير صالح أو منتهي الصلاحية.</p>
        <Link
          href="/forgot-password"
          className="text-[13px] font-medium text-navy no-underline hover:underline"
        >
          طلب رابط إعادة تعيين جديد
        </Link>
      </div>
    );
  }

  // method="post" (bug #1605): a native/pre-hydration submit without it falls
  // back to GET and puts the new password in the query string.
  return (
    <form
      method="post"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="w-full max-w-[380px] rounded-xl border border-sutra-line bg-white p-5 sm:p-7"
    >
      <h2 className="text-[15px] font-bold text-sutra-ink mb-1">إعادة تعيين كلمة المرور</h2>
      <p className="text-[13px] text-sutra-ink-3 mb-5">
        أدخل كلمة المرور الجديدة أدناه.
      </p>

      <div className="mb-4">
        <PasswordInput
          label="كلمة المرور الجديدة"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="mb-4">
        <PasswordInput
          label="تأكيد كلمة المرور"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {error && <p className="mt-1 text-[13px] text-red-700">{error}</p>}
      {success && <p className="mt-1 text-[13px] text-green-700">{success}</p>}

      <div className="mt-5 flex justify-center">
        <Button type="submit" loading={loading} className="w-full sm:w-auto">
          {loading ? "جارٍ إعادة التعيين…" : "إعادة تعيين كلمة المرور"}
        </Button>
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/login"
          className="text-[13px] font-medium text-sutra-ink-3 no-underline hover:text-navy"
        >
          العودة إلى تسجيل الدخول
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
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
              <div className="h-3 w-56 bg-sutra-line-2 rounded animate-pulse" />
              <div className="h-11 w-full bg-sutra-line-2 rounded-lg animate-pulse" />
              <div className="h-11 w-full bg-sutra-line-2 rounded-lg animate-pulse" />
              <div className="h-11 w-40 mx-auto bg-sutra-line-2 rounded-lg animate-pulse" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}

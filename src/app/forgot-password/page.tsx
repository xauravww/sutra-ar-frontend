"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useForgotPasswordForm } from "@/hooks/useForgotPasswordForm";

export default function ForgotPasswordPage() {
  const { email, setEmail, error, success, loading, submit } = useForgotPasswordForm();

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-sutra-bg">
      <header className="flex-none border-b border-sutra-line bg-white px-5 py-3.5 sm:px-8">
        <Logo className="h-7 sm:h-8 w-auto" />
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 grid place-items-center px-4 py-5 sm:px-6">
        {/* method="post" (bug #1605): keep the submitted email out of the URL
            on a native/pre-hydration submit. */}
        <form
          method="post"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="w-full max-w-[380px] rounded-xl border border-sutra-line bg-white p-5 sm:p-7"
        >
          <h2 className="text-[15px] font-bold text-sutra-ink mb-1">هل نسيت كلمة المرور؟</h2>
          <p className="text-[13px] text-sutra-ink-3 mb-5">
            أدخل بريدك الإلكتروني وسنرسل إليك رابطًا لإعادة تعيينها.
          </p>

          <div className="mb-4">
            <Input
              label="البريد الإلكتروني"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && <p className="mt-1 text-[13px] text-red-700">{error}</p>}
          {success && <p className="mt-1 text-[13px] text-green-700">{success}</p>}

          <div className="mt-5 flex justify-center">
            <Button type="submit" loading={loading} className="w-full sm:w-auto">
              {loading ? "جارٍ الإرسال…" : "إرسال رابط إعادة التعيين"}
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
      </main>
    </div>
  );
}

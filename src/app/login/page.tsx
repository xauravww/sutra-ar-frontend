"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";
import { useLoginForm } from "@/hooks/useLoginForm";

export default function LoginPage() {
  const { email, setEmail, password, setPassword, error, loading, submit } =
    useLoginForm();

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-sutra-bg">
      <header className="flex-none border-b border-sutra-line bg-white px-5 py-3.5 sm:px-8">
        <Logo className="h-7 sm:h-8 w-auto" />
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 grid place-items-center px-4 py-5 sm:px-6">
        {/* method="post" is required (bug #1605): without it a native submit —
            before hydration, or with JS disabled — falls back to GET and puts
            email/password in the query string (CWE-598), which then lands in
            browser history, proxy logs and Referer headers. onSubmit still
            preventDefaults for the normal hydrated path. */}
        <form
          method="post"
          onSubmit={submit}
          className="w-full max-w-[380px] rounded-xl border border-sutra-line bg-white p-5 sm:p-7"
        >
          <h1 className="text-[17px] font-bold text-sutra-ink mb-1">تسجيل الدخول</h1>
          <p className="text-[12.5px] text-sutra-ink-3 mb-5">
            سننقلك مباشرةً إلى بوابتك.
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

          <PasswordInput
            label="كلمة المرور"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="mt-2 text-end">
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-medium text-sutra-ink-2 no-underline hover:text-navy"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>

          {error && (
            <div className="mt-3">
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-5 flex justify-center">
            <Button type="submit" loading={loading} className="w-full sm:w-auto">
              {loading ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/register"
              className="text-[13px] font-medium text-sutra-ink-2 no-underline hover:text-navy"
            >
              إنشاء حساب جديد
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import PasswordStrength from "@/components/ui/PasswordStrength";
import Radio from "@/components/ui/Radio";
import Button from "@/components/ui/Button";
import { useRegisterForm, type RegisterRole } from "@/hooks/useRegisterForm";

const ROLES: { value: RegisterRole; label: string }[] = [
  { value: "legal_practitioner", label: "ممارس قانوني" },
  { value: "judiciary", label: "السلطة القضائية" },
];

export default function RegisterPage() {
  const { role, setRole, email, setEmail, password, setPassword, error, loading, submit } =
    useRegisterForm();

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-sutra-bg">
      <header className="flex-none border-b border-sutra-line bg-white px-5 py-3.5 sm:px-8">
        <Logo className="h-7 sm:h-8 w-auto" />
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 grid place-items-center px-4 py-5 sm:px-6">
        {/* method="post" (bug #1605): native/pre-hydration submit defaults to
            GET, which would put the password in the URL query string. */}
        <form
          method="post"
          onSubmit={submit}
          className="w-full max-w-[380px] rounded-xl border border-sutra-line bg-white p-5 sm:p-7"
        >
          <h1 className="text-[17px] font-bold text-sutra-ink mb-1">إنشاء حساب</h1>
          <p className="text-[12.5px] text-sutra-ink-3 mb-5">
            اختر دورك للبدء.
          </p>

          <fieldset>
            <legend className="text-[13px] font-semibold text-sutra-ink-2 mb-2">أنا</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2">
              {ROLES.map((r) => (
                <Radio
                  key={r.value}
                  name="role"
                  value={r.value}
                  label={r.label}
                  checked={role === r.value}
                  onChange={(v) => setRole(v as RegisterRole)}
                />
              ))}
            </div>
            <p className="text-[11px] text-sutra-ink-3 mb-5">
              {role === "judiciary"
                ? "رفع ملفات القضايا وتحليلها باستخدام الذكاء القضائي"
                : "تيسير مفاوضات الطرفين من خلال جلسات الوساطة"}
            </p>
          </fieldset>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PasswordStrength value={password} />

          {error && (
            <div className="mt-3">
              <p className="text-[13px] text-red-700">{error}</p>
              {error.toLowerCase().includes("already exists") && (
                <Link
                  href="/login"
                  className="text-[13px] font-semibold text-navy hover:underline mt-1 inline-block"
                >
                  جرّب تسجيل الدخول بدلاً من ذلك{" "}
                  <span className="rtl-flip">→</span>
                </Link>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-center">
            <Button type="submit" loading={loading} className="w-full sm:w-auto whitespace-nowrap">
              {loading ? "جارٍ إنشاء الحساب…" : "إنشاء حساب"}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-[13px] font-medium text-sutra-ink-2 no-underline hover:text-navy"
            >
              لديك حساب بالفعل؟ تسجيل الدخول
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

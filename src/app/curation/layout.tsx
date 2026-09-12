"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ROLE_HOME } from "@/hooks/useLoginForm";
import { canUpload } from "@/lib/corpus-roles";
import CurationShell from "@/components/curation/CurationShell";

export default function CurationLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // Anyone without a corpus permission gets bounced to their own home.
    if (!canUpload(user.role)) {
      router.replace(ROLE_HOME[user.role] ?? "/workspace");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-sutra-bg grid place-items-center">
        <div className="w-8 h-8 border-2 border-sutra-line-2 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !canUpload(user.role)) {
    return null; // useEffect handles the redirect
  }

  return <CurationShell>{children}</CurationShell>;
}

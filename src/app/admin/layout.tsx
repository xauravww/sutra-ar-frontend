"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ROLE_HOME } from "@/hooks/useLoginForm";
import AdminShell from "@/components/admin/AdminShell";

const ADMIN_ROLES = ["admin", "owner"];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!ADMIN_ROLES.includes(user.role)) {
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

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return null; // useEffect handles the redirect
  }

  return <AdminShell>{children}</AdminShell>;
}

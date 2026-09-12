"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Ltr from "@/components/Ltr";
import { roleLabel } from "@/components/admin/ui";

/**
 * Persistent header strip shown while an admin/owner is signed in through
 * account impersonation. Every action taken in that session is audited
 * server-side against the impersonator — this bar makes the state visible
 * and offers a one-click way back to the real account.
 */
export default function ImpersonationBanner() {
  const { impersonator, user, stopImpersonating } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!impersonator || !user) return null;

  return (
    <div className="w-full bg-amber-bg border-b border-amber-dot/25 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="text-[12.5px] text-amber-ink flex items-center gap-2 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-dot flex-none animate-pulse" aria-hidden />
        <span className="truncate">
          أنت تنتحل هوية <strong><Ltr>{user.email}</Ltr></strong> بصفتك {roleLabel(user.role)} — يُسجَّل كل إجراء
        </span>
      </p>
      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          try {
            await stopImpersonating();
          } catch {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="flex-none text-[12px] font-bold text-white bg-amber-ink rounded-lg px-3 py-1.5 hover:bg-amber-dot disabled:opacity-50 transition-colors"
      >
        {busy ? "جارٍ الخروج…" : "إنهاء انتحال الهوية"}
      </button>
    </div>
  );
}

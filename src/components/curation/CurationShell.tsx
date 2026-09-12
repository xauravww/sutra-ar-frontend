"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { canCurate, canUpload, isCorpusRole } from "@/lib/corpus-roles";
import Logo from "@/components/Logo";
import Ltr from "@/components/Ltr";
import ImpersonationBanner from "@/components/ImpersonationBanner";

/**
 * Curation Panel shell.
 *
 * Internal tool for building the case-law corpus. Deliberately separate from
 * /admin: a corpus researcher is not an administrator and must not see the
 * admin surface, and curation is the only thing these roles do.
 */

const NAV = [
  {
    href: "/curation",
    label: "قائمة الانتظار",
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/curation/upload",
    label: "رفع",
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </svg>
    ),
  },
  {
    href: "/curation/activity",
    label: "النشاط",
    exact: false,
    curatorOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
  },
  // Coverage is UPLOADERS-gated on the server, so uploaders see it too — a
  // researcher sourcing judgments needs to know which states/years are thin.
  {
    href: "/curation/coverage",
    label: "التغطية",
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
    ),
  },
  {
    href: "/curation/queue-health",
    label: "الاستيعاب",
    exact: false,
    curatorOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    href: "/curation/analytics",
    label: "التحليلات",
    exact: false,
    curatorOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M3 3v18h18" />
        <path d="M7 15v-3M12 15V8M17 15v-6" />
      </svg>
    ),
  },
];

export default function CurationShell({
  children,
}: {
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isUploader = user ? canUpload(user.role) : false;
  const isCurator = user ? canCurate(user.role) : false;

  // Close the user menu when navigating
  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  const roleLabel = !isCorpusRole(user?.role)
    ? "مسؤول"
    : isCurator
    ? "مُراجِع"
    : "باحث";

  return (
    <div className="min-h-screen bg-sutra-bg">
      <header className="sticky top-0 z-30 bg-white border-b border-sutra-line">
        <ImpersonationBanner />
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-[4.5rem] gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Logo className="w-9 h-9 flex-none" />
              <div className="min-w-0">
                <p className="font-bold text-sutra-ink leading-snug truncate text-[15px]">
                  مراجعة السوابق القضائية
                </p>
              </div>
            </div>

            {/* User menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border border-sutra-line hover:bg-tint transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                  {(user?.email?.[0] || user?.role?.[0] || "U").toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-sutra-ink hidden sm:block">
                  {roleLabel}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-3.5 h-3.5 text-sutra-ink-3 transition-transform duration-200 ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute end-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-sutra-line py-2 z-40"
                >
                  <div className="px-5 py-3 border-b border-sutra-line mb-1">
                    <p className="text-[11px] font-bold text-sutra-ink-3 mb-0.5">
                      مسجّل الدخول باسم
                    </p>
                    <p className="text-sm font-bold text-sutra-ink truncate">
                      <Ltr>{user?.email}</Ltr>
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    role="menuitem"
                    className="w-full text-start px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 rtl-flip">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          </div>
          <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
            {NAV.filter((item) => !item.curatorOnly || isCurator).map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors no-underline ${
                    isActive
                      ? "border-navy text-navy"
                      : "border-transparent text-sutra-ink-3 hover:text-sutra-ink hover:border-sutra-line"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Gavel,
  CreditCard,
  Package,
  LifeBuoy,
  BarChart3,
  History,
  Settings,
  BookOpen,
  Coins,
  Gauge,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";
import Ltr from "@/components/Ltr";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { roleLabel } from "@/components/admin/ui";

export const ADMIN_NAV: Array<{ href: string; label: string; icon: LucideIcon; ownerOnly?: boolean }> = [
  { href: "/admin", label: "لوحة المعلومات", icon: LayoutDashboard },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/cases", label: "القضايا", icon: Gavel },
  { href: "/knowledge-base", label: "قاعدة المعرفة", icon: BookOpen, ownerOnly: true },
  { href: "/admin/subscriptions", label: "الاشتراكات", icon: CreditCard },
  { href: "/admin/packages", label: "الباقات", icon: Package },
  { href: "/admin/support", label: "الدعم", icon: LifeBuoy },
  { href: "/admin/reports", label: "التقارير", icon: BarChart3 },
  { href: "/admin/usage", label: "استخدام الذكاء الاصطناعي", icon: Coins, ownerOnly: true },
  { href: "/admin/rate-limits", label: "حدود المعدل", icon: Gauge, ownerOnly: true },
  { href: "/admin/activity-logs", label: "سجلات النشاط", icon: History },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" || pathname === "/admin/dashboard" : pathname.startsWith(href);

  const initials = user?.email?.charAt(0).toUpperCase() ?? "A";
  const name = user?.email?.split("@")[0] ?? "";
  // Only the admin and owner roles can reach /admin (see ADMIN_ROLES in
  // src/app/admin/layout.tsx), so the panel title maps from those two.
  const panelTitle = user?.role === "owner" ? "لوحة المالك" : "لوحة الإدارة";

  /**
   * Sidebar body, shared by the desktop rail and the mobile drawer.
   *
   * Collapse is a desktop-only affordance. The drawer is always full width with
   * labels, and closes with its own X — previously the drawer inherited the
   * collapse toggle from this footer while the matching expand button was
   * desktop-only, so collapsing on a phone left no way to expand again.
   */
  const renderSidebar = (mobile = false) => {
    const slim = collapsed && !mobile;

    return (
    <div
      className={`h-full bg-white border-e border-sutra-line flex flex-col transition-all duration-300 ease-in-out ${
        slim ? "w-[68px]" : "w-64"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center border-b border-sutra-line ${
          slim ? "justify-center py-3.5" : "justify-between px-4 py-3.5"
        }`}
      >
        <Link href="/admin" className="no-underline">
          <Logo className="h-6 w-auto" />
        </Link>
        {mobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 -me-1 rounded-lg text-sutra-ink-3 hover:bg-sutra-bg hover:text-sutra-ink transition-colors"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto">
        <ul className="space-y-1">
          {ADMIN_NAV.filter((item) => !item.ownerOnly || user?.role === "owner").map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={slim ? item.label : undefined}
                  className={`group relative flex items-center rounded-lg transition-colors ${
                    slim ? "justify-center w-11 h-11 mx-auto" : "gap-2.5 px-3 py-2.5"
                  } ${
                    active
                      ? "bg-tint text-navy"
                      : "text-sutra-ink-2 hover:bg-sutra-bg hover:text-sutra-ink"
                  }`}
                >
                  {active && (
                    <span className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-navy rounded-e-full" />
                  )}
                  <item.icon className="w-[20px] h-[20px] flex-none" strokeWidth={1.7} />
                  {!slim && (
                    <span className="text-[13.5px] font-semibold truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sutra-line p-2.5 space-y-2">
        {!slim && user && (
          <Link
            href="/profile"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sutra-bg transition-colors no-underline"
          >
            <span
              aria-hidden="true"
              data-initial={initials}
              className="avatar-initial w-8 h-8 rounded-full bg-navy text-white grid place-items-center font-bold text-[13px] flex-none"
            />
            <span className="min-w-0">
              <Ltr className="block text-[13px] font-semibold text-sutra-ink truncate">{name}</Ltr>
              <span className="block text-[11px] text-sutra-ink-3">{roleLabel(user.role)}</span>
            </span>
          </Link>
        )}
        <button
          onClick={logout}
          className={`flex items-center rounded-lg transition-colors text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 ${
            slim ? "justify-center w-11 h-11 mx-auto" : "gap-2.5 px-3 py-2.5 w-full"
          }`}
          title={slim ? "تسجيل الخروج" : undefined}
        >
          <LogOut className="w-[20px] h-[20px] flex-none rtl-flip" strokeWidth={1.7} />
          {!slim && <span className="text-[13.5px] font-semibold">تسجيل الخروج</span>}
        </button>
        {!slim && !mobile && (
          <div className="text-center">
            <button
              onClick={() => setCollapsed(true)}
              className="mx-auto p-1.5 rounded-lg text-sutra-ink-3 hover:bg-sutra-bg transition-colors"
              aria-label="طيّ الشريط الجانبي"
            >
              <PanelLeftClose className="w-[18px] h-[18px] rtl-flip" strokeWidth={1.7} />
            </button>
          </div>
        )}
      </div>
    </div>
    );
  };

  // While the drawer is open: Escape closes it, and the page behind stops
  // scrolling so the drawer does not drag the document with it.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh bg-sutra-bg flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block flex-shrink-0 sticky top-0 h-dvh">{renderSidebar()}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-64 shadow-xl">{renderSidebar(true)}</div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header — role-based panel title + user, impersonation strip on top when active */}
        <header className="sticky top-0 z-30 bg-white border-b border-sutra-line">
          <ImpersonationBanner />
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ms-2 rounded-lg hover:bg-sutra-bg transition-colors"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5 text-sutra-ink" strokeWidth={1.8} />
            </button>
            <p className="text-[15px] font-bold text-sutra-ink truncate">{panelTitle}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 rounded-lg text-sutra-ink-3 hover:bg-sutra-bg border border-sutra-line transition-colors"
              aria-label={collapsed ? "توسيع الشريط الجانبي" : "طيّ الشريط الجانبي"}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-[18px] h-[18px] rtl-flip" strokeWidth={1.7} />
              ) : (
                <PanelLeftClose className="w-[18px] h-[18px] rtl-flip" strokeWidth={1.7} />
              )}
            </button>
            {user && (
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sutra-bg transition-colors no-underline"
              >
                <span
                  aria-hidden="true"
                  data-initial={initials}
                  className="avatar-initial w-8 h-8 rounded-full bg-navy text-white grid place-items-center font-bold text-[13px] flex-none"
                />
                <span className="hidden sm:block text-start">
                  <Ltr className="block text-[12.5px] font-semibold text-sutra-ink truncate max-w-[140px]">{name}</Ltr>
                  <span className="block text-[10.5px] text-sutra-ink-3">{roleLabel(user.role)}</span>
                </span>
              </Link>
            )}
          </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-16 max-w-[1200px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

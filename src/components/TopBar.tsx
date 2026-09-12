"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";
import Ltr from "@/components/Ltr";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { notifications, type AppNotification } from "@/lib/api";
import { date, n, relative } from "@/lib/num";

export default function TopBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  // The Mediation link is redundant while already inside the mediation area.
  const onMediationPage = pathname === "/mediation" || (!!pathname && /^\/mediation\/\d+/.test(pathname));

  const isJudiciary = user?.role === "judiciary";
  const isPractitioner = user?.role === "legal_practitioner";
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isCorpus = user?.role === "corpus_researcher" || user?.role === "corpus_curator";

  const home = isJudiciary
    ? "/cases"
    : isPractitioner
      ? "/mediation"
      : isAdmin
        ? "/admin"
        : isCorpus
          ? "/curation"
          : "/workspace";

  // ── Notifications (bell) ─────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const loadStats = useCallback(() => {
    if (!user) return;
    notifications.stats().then((r) => setUnread(r.data?.unread ?? 0)).catch(() => undefined);
  }, [user]);

  const loadList = useCallback(() => {
    if (!user) return;
    setLoading(true);
    notifications
      .list({ limit: 10, unread_only: true })
      .then((r) => {
        const nextItems = r.data?.notifications ?? [];
        setItems(nextItems);
        // Keep the badge authoritative from the stats endpoint; the list is paginated.
        notifications.stats().then((stats) => setUnread(stats.data?.unread ?? 0)).catch(() => undefined);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  // Prime the unread badge on mount, and whenever the session changes.
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggleBell = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const openNotification = async (item: AppNotification) => {
    if (!item.read_at) {
      notifications.markRead(item.id).catch(() => undefined);
      setUnread((v) => Math.max(0, v - 1));
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    }
    setOpen(false);
    if (item.action_url) {
      // Internal paths navigate with the SPA shell; external links open in a tab.
      const url = item.action_url;
      if (url.startsWith("/")) window.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const markAllRead = async () => {
    notifications.markAllRead().catch(() => undefined);
    setUnread(0);
    setItems([]);
  };

  // Relative "when" label for a notification, routed through lib/num so the
  // digits are Arabic-Indic and the wording comes from the locale rather than
  // from hand-built English strings like "3m ago".
  const fmtWhen = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const m = Math.floor(diff / 60000);
    if (m < 1) return relative(iso, "second");
    if (m < 60) return relative(iso, "minute");
    const h = Math.floor(m / 60);
    if (h < 24) return relative(iso, "hour");
    const days = Math.floor(h / 24);
    if (days < 7) return relative(iso, "day");
    return date(iso);
  };

  return (
    <header className="bg-white border-b border-sutra-line sticky top-0 z-20">
      <ImpersonationBanner />
      <div className="max-w-[940px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <Link href={home} className="flex items-center no-underline flex-none min-w-0">
          <Logo className="h-7 sm:h-9 w-auto max-w-[150px] sm:max-w-none object-contain" />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {isJudiciary && (
            <Link href="/cases" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              القضايا
            </Link>
          )}
          {isPractitioner && !onMediationPage && (
            <Link href="/mediation" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              الوساطة
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              الإدارة
            </Link>
          )}
          {user?.role === "owner" && (
            <Link href="/knowledge-base" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              قاعدة المعرفة
            </Link>
          )}
          {isCorpus && (
            <Link href="/curation" className="hidden sm:inline-block text-sm font-semibold text-sutra-ink-2 hover:text-navy px-3 py-2 rounded-lg transition-colors">
              المراجعة
            </Link>
          )}

          <div className="relative flex-none" ref={bellRef}>
            <button
              onClick={toggleBell}
              className={`w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] rounded-[10px] sm:rounded-[11px] border border-sutra-line bg-white grid place-items-center relative hover:border-[#C6CDD7] hover:bg-[#FCFDFE] transition-colors flex-none ${
                open ? "text-navy border-navy/40 bg-tint/60" : "text-sutra-ink-2"
              }`}
              aria-label={
                open
                  ? "إغلاق الإشعارات"
                  : unread > 0
                    ? `فتح الإشعارات، ${n(unread)} غير مقروءة`
                    : "فتح الإشعارات"
              }
              aria-haspopup="true"
              aria-expanded={open}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5 sm:w-[23px] sm:h-[23px]">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
              </svg>
              {/* Decorative — the count is already in the button's label. */}
              {unread > 0 && (
                <span
                  aria-hidden="true"
                  data-count={unread > 99 ? `${n(99)}+` : n(unread)}
                  className="notif-badge absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center border-2 border-white"
                />
              )}
            </button>

            {open && (
              <div className="absolute end-0 top-[calc(100%+8px)] w-[min(360px,calc(100vw-32px))] bg-white border border-sutra-line rounded-2xl shadow-xl shadow-black/10 z-50 overflow-hidden animate-in">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-sutra-line bg-white">
                  <p className="text-[14px] font-bold text-sutra-ink">الإشعارات</p>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-[12px] font-semibold text-navy hover:underline">
                      تعليم الكل كمقروء
                    </button>
                  )}
                </div>

                <div className="max-h-[360px] overflow-y-auto divide-y divide-sutra-line-2">
                  {loading && items.length === 0 ? (
                    <div className="px-4 py-6 space-y-2">
                      <div className="h-3.5 bg-sutra-line-2 rounded animate-pulse" />
                      <div className="h-3.5 bg-sutra-line-2 rounded animate-pulse w-3/4" />
                      <div className="h-3.5 bg-sutra-line-2 rounded animate-pulse w-1/2" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <div className="w-11 h-11 rounded-full bg-tint text-navy grid place-items-center mx-auto mb-3">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-5 h-5">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
                        </svg>
                      </div>
                      <p className="text-[13.5px] font-semibold text-sutra-ink">لقد اطّلعت على جميع الإشعارات</p>
                      <p className="text-[12px] text-sutra-ink-3 mt-0.5">ستظهر التنبيهات الجديدة هنا.</p>
                    </div>
                  ) : (
                    items.map((item) => {
                      const read = !!item.read_at || item.status === "read";
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openNotification(item)}
                          className="w-full text-start px-4 py-3 hover:bg-sutra-bg/60 transition-colors flex gap-3"
                        >
                          <span className={`flex-none w-2 h-2 rounded-full mt-1.5 ${read ? "bg-transparent" : "bg-red-500"}`} aria-hidden />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[13px] leading-snug ${read ? "font-medium text-sutra-ink-2" : "font-semibold text-sutra-ink"}`}>{item.title || "إشعار"}</span>
                              <span className="text-[10.5px] text-sutra-ink-3 whitespace-nowrap">{fmtWhen(item.created_at)}</span>
                            </span>
                            {item.message && <span className={`block mt-0.5 text-[12px] leading-snug ${read ? "text-sutra-ink-3" : "text-sutra-ink-2"}`}>{item.message}</span>}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-sutra-line px-4 py-2.5 bg-white">
                  <button type="button" onClick={() => setOpen(false)} className="block w-full text-center text-[12.5px] font-semibold text-sutra-ink-2 hover:text-navy py-1">
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>

          {user && (
            <Link
              href="/profile"
              aria-label={`ملفك الشخصي — ${user.email.split("@")[0]}`}
              className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 border border-sutra-line rounded-full bg-white no-underline hover:border-[#C6CDD7] transition-colors flex-none"
            >
              {/* Initial is drawn from data-initial so it stays out of the
                  link's text, which otherwise read "Oowner" (#1610). */}
              <span
                aria-hidden="true"
                data-initial={user.email.charAt(0).toUpperCase()}
                className="avatar-initial w-[32px] h-[32px] rounded-full bg-navy text-white grid place-items-center font-bold text-[14px]"
              />
              <b aria-hidden="true" className="text-[14px] font-semibold text-sutra-ink max-w-[100px] truncate"><Ltr>{user.email.split("@")[0]}</Ltr></b>
            </Link>
          )}

          {/* Mobile: just show avatar */}
          {user && (
            <Link
              href="/profile"
              aria-label="ملفك الشخصي"
              className="sm:hidden w-[36px] h-[36px] rounded-full bg-navy text-white grid place-items-center font-bold text-[14px] no-underline flex-none avatar-initial"
              data-initial={user.email.charAt(0).toUpperCase()}
            />
          )}

          <button
            onClick={logout}
            title="تسجيل الخروج"
            aria-label="تسجيل الخروج"
            className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto text-xs sm:text-sm font-semibold text-sutra-ink-3 hover:text-navy px-0 sm:px-3 py-2 rounded-lg transition-colors flex-none hover:bg-tint sm:hover:bg-transparent"
          >
            <svg className="w-[18px] h-[18px] sm:hidden rtl-flip" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}

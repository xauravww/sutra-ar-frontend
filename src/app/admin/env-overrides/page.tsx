"use client";

import { useCallback, useEffect, useState } from "react";
import { adminEnvOverrides, type AdminEnvKeyInfo } from "@/lib/api";
import { useNotify } from "@/components/ui/Notify";
import { PageHeader, ErrorState } from "@/components/admin/ui";
import { KeyRound, RotateCcw, Save, Eye, EyeOff } from "lucide-react";

/**
 * Admin → Env Overrides.
 *
 * Shows the limited whitelist of keys the backend allows overriding, plus
 * readonly infrastructure anchors (database, secrets) for reference. Secret
 * values arrive masked from the API ("••••••••") and are never echoed back —
 * an input left untouched is simply not included in the save payload.
 */
export default function AdminEnvOverridesPage() {
  const { toast } = useNotify();
  const [entries, setEntries] = useState<AdminEnvKeyInfo[]>([]);
  const [editableKeys, setEditableKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  /** key → draft new value; only touched keys are sent on save. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  /** Fetch masked entries; callable from the effect and after saves. */
  const fetchEntries = useCallback(async () => {
    try {
      const r = await adminEnvOverrides.list();
      setEntries(r.data.entries ?? []);
      setEditableKeys(r.data.editable_keys ?? []);
      setDrafts({});
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "تعذّر تحميل المفاتيح");
    } finally {
      setLoading(false);
    }
    return true;
  }, []);

  useEffect(() => {
    // Promise wrapper keeps the async call out of the effect's sync body so
    // no setState happens during the render pass.
    void Promise.resolve().then(() => fetchEntries());
  }, [fetchEntries]);

  // Derived count of drafted (touched) keys drives the sticky save bar.
  const dirtyCount = Object.values(drafts).filter((v) => v !== "").length;

  const save = async () => {
    const dirtyKeys = Object.keys(drafts).filter((k) => drafts[k] !== "");
    if (dirtyKeys.length === 0) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const key of dirtyKeys) payload[key] = drafts[key];
      await adminEnvOverrides.save(payload);
      toast("تم حفظ المفاتيح وتطبيقها فورًا", "success");
      fetchEntries(); // re-fetch masked state; drafts reset
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const clearOverride = async (key: string) => {
    setSaving(true);
    try {
      await adminEnvOverrides.clear(key);
      toast(`تمت إزالة التجاوز عن ${key} — عادت القيمة الأصلية`, "success");
      fetchEntries();
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّرت الإزالة", "error");
    } finally {
      setSaving(false);
    }
  };

  const overridable = entries.filter((e) => !e.readonly);
  const readonlyKeys = entries.filter((e) => e.readonly);
  const inputCls =
    "w-full h-10 rounded-lg border border-sutra-line bg-white px-3 text-[13.5px] text-sutra-ink outline-none focus:border-navy font-mono";
  // Secrets render as password fields; nothing else displays stored values here.

  return (
    <div>
      <PageHeader
        title="مفاتيح البيئة"
        subtitle="تجاوز محدود للمفاتيح المسموحة فقط — القيم السرية تُخفى دائمًا"
      />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-4">
              <div className="h-5 w-1/3 bg-sutra-line-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState title="تعذّر تحميل المفاتيح" message={loadError} onRetry={fetchEntries} />
      ) : (
        <>
          {/* Sticky save bar appears once something is drafted */}
          {dirtyCount > 0 && (
            <div className="sticky top-2 z-20 mb-4 flex items-center justify-between gap-3 rounded-xl border border-navy/30 bg-tint px-4 py-3">
              <p className="text-[13px] font-semibold text-navy">
                {dirtyCount} مفتاح(ات) بانتظار الحفظ — تُطبَّق فورًا بعد الحفظ
              </p>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "جارٍ الحفظ…" : "حفظ وتطبيق"}
              </button>
            </div>
          )}

          {/* Overridable keys */}
          <div className="mb-6 space-y-2">
            <h3 className="flex items-center gap-2 px-1 text-[12px] font-bold uppercase text-sutra-ink-3">
              <KeyRound className="h-4 w-4 text-navy" />
              مفاتيح قابلة للتجاوز
            </h3>
            {overridable.map((entry) => {
              const editable = editableKeys.includes(entry.key);
              const draft = drafts[entry.key];
              return (
                <div
                  key={entry.key}
                  className="rounded-xl border border-sutra-line bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-sutra-ink">
                        {entry.label}
                        {entry.overridden && (
                          <span className="ms-2 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                            متجاوز
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 max-w-[560px] text-[12.5px] text-sutra-ink-3">
                        {entry.description}
                      </p>
                    </div>
                    <code className="rounded-md bg-sutra-bg px-2 py-1 text-[11.5px] text-navy">
                      <span dir="ltr">{entry.key}</span>
                    </code>
                  </div>

                  {editable ? (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={entry.secret && !revealed[entry.key] ? "password" : "text"}
                          dir="ltr"
                          value={draft ?? ""}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [entry.key]: e.target.value }))
                          }
                          placeholder={
                            entry.secret
                              ? "اتركه فارغًا للإبقاء على القيمة الحالية"
                              : entry.value
                                ? String(entry.value)
                                : "غير معيَّن"
                          }
                          className={inputCls}
                          autoComplete="off"
                        />
                        {entry.secret && (
                          <button
                            type="button"
                            onClick={() =>
                              setRevealed((prev) => ({ ...prev, [entry.key]: !prev[entry.key] }))
                            }
                            className="absolute end-2 top-1/2 -translate-y-1/2 text-sutra-ink-3 hover:text-navy"
                            title={revealed[entry.key] ? "إخفاء" : "إظهار الجديد"}
                          >
                            {revealed[entry.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      {entry.overridden && (
                        <button
                          onClick={() => clearOverride(entry.key)}
                          disabled={saving}
                          title="إزالة التجاوز والعودة إلى قيمة البيئة الأصلية"
                          className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-sutra-line px-3 py-2 text-[12.5px] font-semibold text-sutra-ink-2 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          إزالة التجاوز
                        </button>
                      )}
                      {/* Masked current value shown next to a secret's input */}
                      {entry.secret && !draft && (
                        <span className="flex-none text-[11.5px] text-sutra-ink-3">
                          الحالي: <span dir="ltr">••••••••</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-sutra-bg px-3 py-2 text-[12.5px] text-sutra-ink-3">
                      غير قابل للتجاوز — عدِّله من ملف البيئة أو إعدادات النشر.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Readonly anchors */}
          <div className="space-y-2 pb-8">
            <h3 className="flex items-center gap-2 px-1 text-[12px] font-bold uppercase text-sutra-ink-3">
              مرجعية فقط — لا تُعرض قيمها أبدًا
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {readonlyKeys.map((entry) => (
                <div
                  key={entry.key}
                  className="rounded-xl border border-sutra-line bg-sutra-bg p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-bold text-sutra-ink">{entry.label}</p>
                    <code className="rounded-md bg-white px-2 py-0.5 text-[11px] text-sutra-ink-2">
                      <span dir="ltr">{entry.key}</span>
                    </code>
                  </div>
                  <p className="mt-1 text-[12px] text-sutra-ink-3">{entry.description}</p>
                  <p className="mt-2 font-mono text-[12.5px] text-sutra-ink-2" dir="ltr">
                    {entry.is_set ? "••••••••" : "—"}
                  </p>
                </div>
              ))}
            </div>
            <p className="px-1 pt-2 text-[11.5px] text-sutra-ink-3">
              تُدار هذه المفاتيح من الخادم فقط — تعديلها يتطلب إعادة نشر، وليس من هذه اللوحة.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

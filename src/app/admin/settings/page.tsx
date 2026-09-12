"use client";

import { useEffect, useState } from "react";
import { systemSettings, admin, type AdminUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotify } from "@/components/ui/Notify";
import { PageHeader, ErrorState } from "@/components/admin/ui";
import Ltr from "@/components/Ltr";
import { n } from "@/lib/num";

/** Delete-mode codes the API stores, named for the confirmation toast. */
const DELETE_MODE_LABEL: Record<string, string> = {
  soft: "حذف ناعم",
  hard: "حذف نهائي",
};

export default function AdminSettingsPage() {
  const { toast } = useNotify();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  const isOwner = user?.role === "owner";
  const deleteMode = settings.delete_mode === "hard" ? "hard" : "soft";

  // Help desk unassigned-ticket policy (owner-managed)
  const helpdeskMode = settings["helpdesk.unassigned_visibility"] ?? "all";
  let trustedIds: number[] = [];
  try {
    trustedIds = JSON.parse(settings["helpdesk.trusted_admin_ids"] ?? "[]");
  } catch {
    trustedIds = [];
  }

  useEffect(() => {
    if (!isOwner) return;
    admin
      .listUsers({ role: "admin", limit: 100 })
      .then((r) => setAdmins(r.data.data))
      .catch(() => setAdmins([]));
  }, [isOwner]);

  // WhatsApp removed — not surfaced in admin UI anymore.

  const load = () => {
    setLoading(true);
    setLoadError("");
    systemSettings
      .get()
      .then((r) => {
        setSettings((r.data as Record<string, string>) ?? {});
        setLoadError("");
      })
      .catch((e) => {
        setSettings({});
        setLoadError(e instanceof Error ? e.message : "تعذّر تحميل الإعدادات");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Save a patch to the whole settings object, optimistically updating UI state.
  const savePatch = async (patch: Record<string, string>, msg: string) => {
    setSaving(true);
    try {
      const next = { ...settings, ...patch };
      setSettings(next);
      await systemSettings.update(next);
      toast(msg, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذّر حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  };

  const applyDeleteMode = (mode: "soft" | "hard") =>
    savePatch({ delete_mode: mode }, `تم تعيين نمط الحذف إلى «${DELETE_MODE_LABEL[mode]}»`);

  const applyHelpDesk = (patch: Record<string, string>) =>
    savePatch(patch, "تم تحديث سياسة مكتب المساعدة");

  // Session timeout (idle logout), applies to every logged-in user.
  const sessionMinutes = settings.session_timeout_minutes ?? "0";
  const saveSessionTimeout = () => {
    const mins = parseInt(sessionMinutes, 10);
    const value = Number.isNaN(mins) || mins < 0 ? "0" : String(mins);
    setSettings((prev) => ({ ...prev, session_timeout_minutes: value }));
    savePatch({ session_timeout_minutes: value }, "تم حفظ مهلة الجلسة");
  };

  const inputCls =
    "w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy";
  const labelCls = "block text-[13px] font-semibold text-sutra-ink-2 mb-1.5";

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="إعدادات النظام يديرها المالك" />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-4">
              <div className="h-5 w-1/3 bg-sutra-line-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState title="تعذّر تحميل الإعدادات" message={loadError} onRetry={load} />
      ) : !isOwner ? (
        <div className="bg-white border border-sutra-line rounded-xl p-5">
          <p className="text-[14px] font-bold text-sutra-ink">الإعدادات يديرها المالك</p>
          <p className="text-[13px] text-sutra-ink-3 mt-1 max-w-[480px]">
            نمط الحذف وصلاحية مكتب المساعدة ومهلة الجلسة كلها بيد المالك. اطلب من المالك
            إجراء التعديلات من هنا.
          </p>
        </div>
      ) : (
        <>
          {/* Delete mode */}
          <div className="bg-white border border-sutra-line rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-sutra-ink">نمط الحذف</h3>
                <p className="text-[13px] text-sutra-ink-3 mt-0.5 max-w-[460px]">
                  يسري على كل عملية حذف في النظام.
                  <span className="block mt-1">
                    <strong className="text-green-ink">ناعم</strong> — يُعلَّم السجل كمحذوف،
                    ويُخفى في كل مكان، وتبقى البيانات قابلة للاستعادة.
                  </span>
                  <span className="block">
                    <strong className="text-red-700">نهائي</strong> — يُحذف السجل نهائيًا.
                    لا يمكن استعادته.
                  </span>
                </p>
              </div>
              <div className="flex rounded-xl border border-sutra-line bg-white overflow-hidden flex-none">
                <button
                  onClick={() => applyDeleteMode("soft")}
                  disabled={saving}
                  className={`px-5 py-2.5 text-[13.5px] font-semibold transition-colors disabled:opacity-50 ${
                    deleteMode === "soft" ? "bg-green-ink text-white" : "text-sutra-ink-2 hover:bg-tint"
                  }`}
                >
                  حذف ناعم
                </button>
                <button
                  onClick={() => applyDeleteMode("hard")}
                  disabled={saving}
                  className={`px-5 py-2.5 text-[13.5px] font-semibold transition-colors disabled:opacity-50 ${
                    deleteMode === "hard" ? "bg-red-600 text-white" : "text-sutra-ink-2 hover:bg-tint"
                  }`}
                >
                  حذف نهائي
                </button>
              </div>
            </div>
          </div>

          {/* Help desk access */}
          <div className="bg-white border border-sutra-line rounded-xl p-5 mb-6">
            <h3 className="text-[15px] font-bold text-sutra-ink">صلاحية مكتب المساعدة</h3>
            <p className="text-[13px] text-sutra-ink-3 mt-0.5 mb-4 max-w-[520px]">
              من يمكنه رؤية التذاكر التي لم تُعيَّن بعد. التذاكر التي تعيّنها لمسؤول محدّد
              لا يراها إلا ذلك المسؤول وأنت.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {(
                [
                  ["all", "كل المسؤولين", "كل مسؤول يرى قائمة التذاكر غير المعيَّنة."],
                  ["trusted", "المالك والمسؤولون الموثوقون", "المسؤولون الذين تعلّمهم كموثوقين أدناه فقط."],
                  ["owner", "المالك فقط", "أنت وحدك ترى التذاكر غير المعيَّنة."],
                ] as const
              ).map(([val, label, desc]) => (
                <button
                  key={val}
                  onClick={() => applyHelpDesk({ "helpdesk.unassigned_visibility": val })}
                  disabled={saving}
                  className={`rounded-xl border px-4 py-3 text-start transition-colors disabled:opacity-50 ${
                    helpdeskMode === val ? "border-navy bg-tint" : "border-sutra-line bg-white hover:bg-sutra-bg"
                  }`}
                >
                  <p className={`text-[13.5px] font-bold ${helpdeskMode === val ? "text-navy" : "text-sutra-ink"}`}>
                    {label}
                  </p>
                  <p className="text-[12px] text-sutra-ink-3 mt-1">{desc}</p>
                </button>
              ))}
            </div>

            {helpdeskMode === "trusted" && (
              <div>
                <p className="text-[13px] font-semibold text-sutra-ink-2 mb-2">المسؤولون الموثوقون</p>
                <div className="flex flex-wrap gap-2">
                  {admins.map((a) => {
                    const on = trustedIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          const nextIds = on
                            ? trustedIds.filter((x) => x !== a.id)
                            : [...trustedIds, a.id];
                          applyHelpDesk({ "helpdesk.trusted_admin_ids": JSON.stringify(nextIds) });
                        }}
                        disabled={saving}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${
                          on ? "bg-navy border-navy text-white" : "border-sutra-line bg-white text-sutra-ink-2 hover:bg-tint"
                        }`}
                      >
                        <Ltr>{a.email}</Ltr>
                      </button>
                    );
                  })}
                  {admins.length === 0 && (
                    <p className="text-[12.5px] text-sutra-ink-3">لا توجد حسابات مسؤولين.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Session timeout */}
          <div className="bg-white border border-sutra-line rounded-xl p-5">
            <h3 className="text-[15px] font-bold text-sutra-ink">مهلة الجلسة</h3>
            <p className="text-[13px] text-sutra-ink-3 mt-0.5 mb-5 max-w-[520px]">
              دقائق الخمول قبل تسجيل خروج أي مستخدم تلقائيًا. تسري على كل الأدوار — المالك
              والمسؤول والمستخدمين العاديين. اجعلها ٠ لتعطيل الخروج التلقائي.
            </p>

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-40">
                <label className={labelCls}>الدقائق</label>
                <input
                  type="number"
                  min={0}
                  value={sessionMinutes}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, session_timeout_minutes: e.target.value }))
                  }
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <button
                onClick={saveSessionTimeout}
                disabled={saving}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {saving ? "جارٍ الحفظ…" : "حفظ المهلة"}
              </button>
            </div>

            <p className="text-[12px] text-sutra-ink-3 mt-3">
              {Number(sessionMinutes) > 0
                ? `سيُسجَّل خروج المستخدمين بعد ${n(Number(sessionMinutes))} دقيقة من الخمول.`
                : "الخروج التلقائي معطّل. يبقى المستخدمون مسجّلين حتى يخرجوا بأنفسهم."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

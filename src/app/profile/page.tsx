"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import Input from "@/components/ui/Input";
import Button, { Spinner } from "@/components/ui/Button";
import { user, type UserProfile } from "@/lib/api";
import Ltr from "@/components/Ltr";
import { date } from "@/lib/num";

/** Role codes the API stores, named for the read-only Role row. */
const ROLE_LABEL: Record<string, string> = {
  owner: "المالك",
  admin: "مسؤول",
  corpus_researcher: "باحث في المدونة",
  corpus_curator: "مراجع المدونة",
  legal_practitioner: "ممارس قانوني",
  judiciary: "السلطة القضائية",
  mediator: "وسيط",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [cadreService, setCadreService] = useState("");
  const [designation, setDesignation] = useState("");
  const [headOffice, setHeadOffice] = useState("");
  const [branchOffice, setBranchOffice] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await user.getProfile();
      const p = res.data;
      setProfile(p);
      setFirstName(p.profile?.first_name || "");
      setLastName(p.profile?.last_name || "");
      setEmployeeId(p.profile?.employee_id || "");
      setCadreService(p.profile?.cadre_service || "");
      setDesignation(p.profile?.designation_rank || "");
      setHeadOffice(p.profile?.head_office_address || "");
      setBranchOffice(p.profile?.branch_office_address || "");
      setCountry(p.profile?.country || "");
      setState(p.profile?.state || "");
      setDistrict(p.profile?.district || "");
      setCity(p.profile?.city || "");
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await user.updateProfile({
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        employee_id: employeeId || undefined,
        cadre_service: cadreService || undefined,
        designation_rank: designation || undefined,
        head_office_address: headOffice || undefined,
        branch_office_address: branchOffice || undefined,
        country: country || undefined,
        state: state || undefined,
        district: district || undefined,
        city: city || undefined,
      });
      setSuccess("تم تحديث الملف الشخصي بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تعذّر تحديث الملف الشخصي");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh">
        <TopBar />
        <main id="main-content" tabIndex={-1} className="max-w-[640px] mx-auto px-6 py-8">
          <div className="space-y-4">
            <div className="h-8 w-40 bg-sutra-line-2 rounded animate-pulse" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 w-full bg-sutra-line-2 rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Falls through to the raw role code, isolated, for anything the map omits.
  const roleLabel = profile?.role
    ? (ROLE_LABEL[profile.role] ?? <Ltr>{profile.role}</Ltr>)
    : "—";

  return (
    <div className="min-h-dvh">
      <TopBar />
      <main id="main-content" tabIndex={-1} className="max-w-[640px] mx-auto px-4 sm:px-6 py-8 pb-21">
        <h1 className="text-[28px] font-bold mb-1">الملف الشخصي</h1>
        <p className="text-[15px] text-sutra-ink-3 mb-8">
          إدارة بياناتك الشخصية والمهنية
        </p>

        {/* Account info (read-only) */}
        <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6 mb-6">
          <h2 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-4">
            الحساب
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <span className="block text-[12px] font-semibold text-sutra-ink-3 mb-1">البريد الإلكتروني</span>
              <span className="block text-[15px] text-sutra-ink font-medium break-all">{profile?.email ? <Ltr>{profile.email}</Ltr> : "—"}</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[12px] font-semibold text-sutra-ink-3 mb-1">الدور</span>
              <span className="block text-[15px] text-sutra-ink font-medium break-words">{roleLabel}</span>
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-sutra-ink-3 mb-1">الحالة</span>
              <span className={`inline-flex items-center gap-1.5 text-[14px] font-semibold ${
                profile?.account_status === "active" ? "text-green-700" : "text-amber-700"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  profile?.account_status === "active" ? "bg-green-500" : "bg-amber-500"
                }`} />
                {profile?.account_status === "active" ? "نشط" : profile?.account_status ? <Ltr>{profile.account_status}</Ltr> : "—"}
              </span>
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-sutra-ink-3 mb-1">عضو منذ</span>
              <span className="text-[15px] text-sutra-ink font-medium">
                {profile?.created_at ? date(profile.created_at) : "—"}
              </span>
            </div>
          </div>
        </section>

        {/* Personal details */}
        <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6 mb-6">
          <h2 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-4">
            البيانات الشخصية
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="الاسم الأول" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="مثال: راشد" />
            <Input label="اسم العائلة" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="مثال: الكعبي" />
          </div>
        </section>

        {/* Professional details */}
        <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6 mb-6">
          <h2 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-4">
            البيانات المهنية
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="الرقم الوظيفي" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="مثال: EMP-12345" />
            <Input label="السلك / الخدمة" value={cadreService} onChange={(e) => setCadreService(e.target.value)} placeholder="مثال: السلك القضائي" />
            <div className="col-span-1 sm:col-span-2">
              <Input label="المسمى / الرتبة" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="مثال: قاضي المحكمة الابتدائية" />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-6 mb-6">
          <h2 className="text-[13px] font-bold uppercase text-sutra-ink-3 mb-4">
            العنوان
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <Input label="عنوان المقر الرئيسي" value={headOffice} onChange={(e) => setHeadOffice(e.target.value)} placeholder="العنوان كاملًا" />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Input label="عنوان الفرع" value={branchOffice} onChange={(e) => setBranchOffice(e.target.value)} placeholder="العنوان كاملًا" />
            </div>
            <Input label="الدولة" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="مثال: الإمارات" />
            <Input label="الولاية" value={state} onChange={(e) => setState(e.target.value)} placeholder="مثال: دبي" />
            <Input label="المنطقة" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="مثال: ديرة" />
            <Input label="المدينة" value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: دبي" />
          </div>
        </section>

        {/* Feedback */}
        {error && <p className="text-[13px] text-red-700 mb-4">{error}</p>}
        {success && <p className="text-[13px] text-green-700 mb-4">{success}</p>}

        {/* Save */}
        <div className="flex justify-end">
          <Button loading={saving} onClick={handleSave}>
            {saving ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </Button>
        </div>
      </main>
    </div>
  );
}

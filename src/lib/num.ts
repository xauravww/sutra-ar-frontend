/**
 * Arabic number and date formatting.
 *
 * The app is Arabic-only, so every number the *user reads* is rendered in
 * Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) and every date is written the Arabic way.
 * Routing that through one module rather than through `Intl` at each call site
 * is what keeps the app consistent: a page cannot accidentally ship Latin
 * digits because it called `toLocaleString()` with no locale, which silently
 * uses the server's default and would render `1,234` in the middle of an
 * otherwise Arabic screen.
 *
 * ## What this module deliberately does NOT do
 *
 * **Identifiers stay Latin.** Case numbers, user ids, emails, phone numbers,
 * API keys, URLs, file paths and search queries are data, not prose — the user
 * needs to copy them, paste them, read them back to someone and match them
 * against the backend. Converting the digits of `CRL/2024/00123` to
 * `CRL/٢٠٢٤/٠٠١٢٣` makes it stop matching what is stored, what a search box
 * expects, and what the API returns. So identifiers are rendered as-is and are
 * never passed through these helpers. `n()` is for quantities — counts, totals,
 * percentages, pagination, statistics — and dates.
 *
 * **Ordering is not reversed.** Arabic-Indic digits are read left-to-right
 * within their number, exactly like Latin digits; only the surrounding text
 * runs right-to-left. `Intl` already emits the correctly ordered string and the
 * browser's bidi algorithm handles where it sits in a sentence, so nothing here
 * reverses anything. A number appears "backwards" only if something upstream
 * reverses it, which would be a bug.
 *
 * ## Locale choice
 *
 * `ar-EG` with explicit Unicode extensions rather than a bare `ar`:
 *
 * - `-nu-arab` pins the numbering system to Arabic-Indic. A bare `ar` resolves
 *   the numbering system from CLDR defaults, which differ by region and by ICU
 *   version — most `ar-*` locales default to `arab`, but relying on that means
 *   an ICU upgrade can silently flip the whole app to Latin digits.
 * - `-ca-gregory` pins the calendar. This matters: `ar-SA` defaults to the
 *   Islamic (Umm al-Qura) calendar, so a locale change or an ICU default shift
 *   would renumber every date in the product by roughly 1,447 years. Legal
 *   records are dated in the Gregorian calendar, and the backend stores ISO
 *   timestamps, so the display must stay Gregorian.
 *
 * Month names come out in their Arabic form (سبتمبر, not September).
 */

/** Arabic-Indic digits, indexed by their Latin value. */
const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;

/** Numbers: Arabic-Indic digits, Arabic thousands separator (٬). */
const NUM = "ar-EG-u-nu-arab";

/** Dates: as above, plus the Gregorian calendar pinned explicitly. */
const DATE = "ar-EG-u-nu-arab-ca-gregory";

/** Anything that can plausibly arrive from the API for a numeric field. */
type Numeric = number | string | null | undefined;

/**
 * Coerce an API value to a finite number, or `null`.
 *
 * The API is loose about numeric types: totals arrive as numbers from the
 * aggregation endpoints and as strings from the ones that read a `count` off a
 * raw SQL row. Returning `null` rather than `NaN` for unparseable input lets
 * the caller distinguish "no value" from "zero" — a dashboard that shows ٠ for
 * a failed request is worse than one that shows nothing.
 */
function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Replace Latin digits in a string with Arabic-Indic ones, leaving the rest of
 * the string alone.
 *
 * For the cases where a number is already embedded in text — a range like
 * "3 of 12" that arrives pre-formatted, a plan called "Pro 2", a version
 * string — and only the digits need converting. Do NOT use this on
 * identifiers: it would rewrite the digits of a case number and break the
 * copy/paste and search behaviour described above.
 */
export function arabicDigits(value: string): string {
  return value.replace(/[0-9]/g, (digit) => ARABIC_INDIC[Number(digit)]);
}

/**
 * A quantity: counts, totals, statistics, pagination numbers.
 *
 * `n(1234)` → `١٬٢٣٤`. Renders an empty string for a missing value, so callers
 * that want a dash supply it themselves (`n(x) || "—"`) and callers that want
 * nothing get nothing.
 */
export function n(value: Numeric): string {
  const parsed = toNumber(value);
  if (parsed === null) return "";
  return new Intl.NumberFormat(NUM).format(parsed);
}

/**
 * A decimal quantity with a bounded number of fraction digits, e.g. an average
 * cost per call: `nDec(0.0345, 2)` → `٠٫٠٣`.
 *
 * The bound is required rather than optional: without a maximum, `Intl` prints
 * up to three fraction digits by default, and computed averages arrive with
 * full float noise.
 */
export function nDec(value: Numeric, maximumFractionDigits = 2): string {
  const parsed = toNumber(value);
  if (parsed === null) return "";
  return new Intl.NumberFormat(NUM, { maximumFractionDigits }).format(parsed);
}

/**
 * An amount of money.
 *
 * The currency *code* is not localised away: `ar-EG` renders INR as `₹`, and
 * the amount in Arabic-Indic digits — `‏٤٥٬٠٠٠ ₹`. Letting `Intl` place the
 * symbol means the string is correct for the locale's own conventions instead
 * of a hand-built `"₹" + n(x)` that would put the symbol on the wrong side.
 */
export function money(value: Numeric, currency = "INR", maximumFractionDigits = 0): string {
  const parsed = toNumber(value);
  if (parsed === null) return "";
  return new Intl.NumberFormat(NUM, {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(parsed);
}

/**
 * A large count in short form — `١٢ ألف`, `٣٫٤ مليون`.
 *
 * `Intl` with `notation: "compact"` picks the Arabic scale word (ألف، مليون،
 * مليار) and applies the locale's own rounding, which is not the same as
 * dividing by 1000 and appending a letter.
 */
export function compact(value: Numeric): string {
  const parsed = toNumber(value);
  if (parsed === null) return "";
  return new Intl.NumberFormat(NUM, { notation: "compact", maximumFractionDigits: 1 }).format(
    parsed,
  );
}

/** Arabic singular/dual/plural forms of a counted noun. */
export interface PluralForms {
  /** 1 — دقيقة */
  one: string;
  /** 2 — دقيقتان */
  two: string;
  /** 3–10 — دقائق */
  few: string;
  /** 11+ — دقيقة */
  many: string;
  /** 0 and fractions — دقيقة */
  other: string;
}

/**
 * A counted noun with its number, agreeing in Arabic.
 *
 * Arabic does not have English's simple two-form plural. It distinguishes
 * zero, one, two (a dual form that changes the *noun*, not just its ending),
 * a "few" for 3–10, and a separate form for 11 and above — so a naive
 * `` `${n(count)} ${count === 1 ? "دقيقة" : "دقائق"}` `` is wrong for two,
 * and wrong again for eleven. `Intl.PluralRules` reads that category off the
 * locale, and the caller supplies the matching forms.
 *
 * The number is formatted with `n()`, so it is Arabic-Indic, and the noun
 * follows it inside the same string — the browser's bidi algorithm keeps the
 * pair reading correctly in an RTL sentence.
 */
export function count(value: Numeric, forms: PluralForms): string {
  const parsed = toNumber(value);
  if (parsed === null) return "";
  const category = new Intl.PluralRules(NUM).select(parsed);
  const noun =
    category === "one"
      ? forms.one
      : category === "two"
        ? forms.two
        : category === "few"
          ? forms.few
          : category === "many"
            ? forms.many
            : forms.other;
  return `${n(parsed)} ${noun}`;
}

/* ── Dates ─────────────────────────────────────────────────────────────
 *
 * Every helper takes an ISO 8601 string (what the API returns), a Date, or a
 * millisecond timestamp, and returns a formatted Arabic string. An
 * unparseable or missing value returns `""` — the caller decides between a
 * dash and an empty cell, so a bad timestamp can never stringify to
 * "Invalid Date" and reach the screen in English.
 */

/** Parsed date, or `null` if the input is missing or unparseable. */
function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | number | Date | null | undefined, options: Intl.DateTimeFormatOptions): string {
  const date = toDate(value);
  if (date === null) return "";
  return new Intl.DateTimeFormat(DATE, options).format(date);
}

/** `١٢ سبتمبر ٢٠٢٦` — the default date used across the app's tables. */
export function date(value: string | number | Date | null | undefined): string {
  return formatDate(value, { day: "numeric", month: "short", year: "numeric" });
}

/** `١٢ سبتمبر ٢٠٢٦` with the month spelled out in full. */
export function dateLong(value: string | number | Date | null | undefined): string {
  return formatDate(value, { day: "2-digit", month: "long", year: "numeric" });
}

/** `١٢ سبتمبر ٢٠٢٦، ٤:٠٠ م` — a date and its time of day. */
export function dateTime(value: string | number | Date | null | undefined): string {
  return formatDate(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** `١٢ سبتمبر، ٤:٠٠ م` — recent activity, where the year is noise. */
export function dayMonthTime(value: string | number | Date | null | undefined): string {
  return formatDate(value, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** `١٢ سبتمبر` — a day and month with no year. */
export function dayMonth(value: string | number | Date | null | undefined): string {
  return formatDate(value, { day: "numeric", month: "short" });
}

/** `٤:٠٠ م` — the time of day alone. `hour12` is left to the locale. */
export function time(value: string | number | Date | null | undefined): string {
  return formatDate(value, { hour: "numeric", minute: "2-digit" });
}

/** `السبت` — the weekday, short form. */
export function weekday(value: string | number | Date | null | undefined): string {
  return formatDate(value, { weekday: "short" });
}

/** `سبتمبر` — the month alone, for grouping rows. */
export function monthShort(value: string | number | Date | null | undefined): string {
  return formatDate(value, { month: "short" });
}

/**
 * A relative time — `قبل ٣ أيام`, `بعد ساعتين`.
 *
 * `numeric: "auto"` lets the locale use its own word for "yesterday" and
 * "tomorrow" rather than "1 day ago", and the Arabic dual form for two.
 */
export function relative(value: string | number | Date | null | undefined, unit: Intl.RelativeTimeFormatUnit = "day"): string {
  const date = toDate(value);
  if (date === null) return "";
  const delta = date.getTime() - Date.now();
  const perUnit: Record<string, number> = {
    second: 1000,
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
    month: 2_629_800_000,
    year: 31_557_600_000,
  };
  const ms = perUnit[unit] ?? 86_400_000;
  return new Intl.RelativeTimeFormat(NUM, { numeric: "auto" }).format(
    Math.round(delta / ms),
    unit,
  );
}

/** Arabic forms of the units the app counts in. */
export const UNITS = {
  minute: { one: "دقيقة", two: "دقيقتان", few: "دقائق", many: "دقيقة", other: "دقيقة" },
  hour: { one: "ساعة", two: "ساعتان", few: "ساعات", many: "ساعة", other: "ساعة" },
  day: { one: "يوم", two: "يومان", few: "أيام", many: "يومًا", other: "يوم" },
  month: { one: "شهر", two: "شهران", few: "أشهر", many: "شهرًا", other: "شهر" },
  year: { one: "سنة", two: "سنتان", few: "سنوات", many: "سنة", other: "سنة" },
  case: { one: "قضية", two: "قضيتان", few: "قضايا", many: "قضية", other: "قضية" },
  document: { one: "مستند", two: "مستندان", few: "مستندات", many: "مستندًا", other: "مستند" },
  result: { one: "نتيجة", two: "نتيجتان", few: "نتائج", many: "نتيجة", other: "نتيجة" },
  user: { one: "مستخدم", two: "مستخدمان", few: "مستخدمون", many: "مستخدمًا", other: "مستخدم" },
  call: { one: "طلب", two: "طلبان", few: "طلبات", many: "طلبًا", other: "طلب" },
  session: { one: "جلسة", two: "جلستان", few: "جلسات", many: "جلسة", other: "جلسة" },
} as const satisfies Record<string, PluralForms>;

/**
 * A file size — `١٫٢ ميجابايت`.
 *
 * Units are Arabic words rather than the usual KB/MB abbreviations: the
 * abbreviations are Latin-script and would sit as an LTR island inside an RTL
 * sentence, and Arabic has settled words for these that read better in prose.
 * Scale is 1024-based, matching what the OS reports for the same file.
 */
export function bytes(value: Numeric): string {
  const parsed = toNumber(value);
  if (parsed === null) return "";
  const units = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت", "تيرابايت"];
  let size = parsed;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  // Bytes are whole; anything larger is shown to one decimal place, except
  // whole numbers, where the decimal would be noise (١ ميجابايت, not ١٫٠).
  const rounded = unit === 0 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${nDec(rounded, unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/**
 * A duration in seconds — `٣ دقائق و١٢ ثانية`, or `٤٥ ثانية` when under a
 * minute.
 *
 * The two parts are joined with the Arabic conjunction و ("and"), which
 * attaches directly to the following word with no space — و١٢, not و ١٢.
 */
export function duration(totalSeconds: Numeric): string {
  const seconds = toNumber(totalSeconds);
  if (seconds === null) return "";
  const whole = Math.max(0, Math.round(seconds));
  if (whole < 60) return count(whole, { one: "ثانية", two: "ثانيتان", few: "ثوانٍ", many: "ثانية", other: "ثانية" });
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  const minutePart = count(minutes, UNITS.minute);
  const secondPart = count(rest, { one: "ثانية", two: "ثانيتان", few: "ثوانٍ", many: "ثانية", other: "ثانية" });
  return rest === 0 ? minutePart : `${minutePart} و${secondPart}`;
}

/**
 * A percentage — `٨٥٪`.
 *
 * Uses the Arabic percent sign ٪ (U+066A), not the Latin %. Both exist and they
 * are different characters; the Latin one is the wrong script next to
 * Arabic-Indic digits.
 */
export function percent(value: Numeric, maximumFractionDigits = 0): string {
  const parsed = toNumber(value);
  if (parsed === null) return "";
  return `${nDec(parsed, maximumFractionDigits)}٪`;
}

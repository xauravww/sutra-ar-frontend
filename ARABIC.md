# Arabic copy and terminology

This repository is the **Arabic-only** build of the Sutra frontend. There is no
locale switch, no dictionary and no English fallback — Arabic is written into
the markup directly. This file is the reference for that copy: the terminology
to use, and the mechanical rules for making a left-to-right layout work
right-to-left.

The English `sutra-frontend` repository remains the source of truth for
behaviour. This one should differ from it only in language, layout direction
and number formatting.

---

## 1. Register and voice

The product is used by advocates, mediators and court staff, and it discusses
live matters. Copy is **formal** (فصحى), not colloquial, and states what
happened or what to do — no exclamation marks, no "Oops!", no jokes.

- Second person is the polite plural/formal, matching software convention:
  "يمكنك حفظ التغييرات" rather than a colloquial imperative.
- Errors say what failed and what to do. "تعذّر تحميل القضايا. حاول مرة أخرى."
  Not "حدث خطأ!" alone.
- Buttons are one or two words — Arabic runs longer than English at the same
  size and the primary buttons sit in fixed-width rows.
- No English left in user-visible copy. The exceptions are listed in §5.

---

## 2. Terminology

Use these consistently. A term translated two ways in two modules reads as two
different features.

### Domain

| English | Arabic | Notes |
|---|---|---|
| case | قضية | plural قضايا |
| mediation | الوساطة | |
| mediation session | جلسة وساطة | |
| party (A / B) | الطرف الأول / الطرف الثاني | |
| dispute | النزاع | |
| settlement | التسوية | |
| settlement notes | ملاحظات التسوية | |
| hearing | جلسة استماع | not جلسة alone — that is a mediation session |
| judgment | الحكم | |
| court | المحكمة | |
| judge | قاضٍ | |
| advocate / practitioner | محامٍ / ممارس قانوني | |
| judiciary | السلطة القضائية | |
| petitioner | مقدّم الالتماس | |
| respondent | المدّعى عليه | |
| evidence | الأدلة | |
| precedent | السابقة القضائية | |
| provision / clause | البند | |
| section (of an act) | المادة | |
| statute / act | القانون | |
| citation | الاستشهاد | |
| limitation period | مدة التقادم | |
| cause of action | سبب الدعوى | |
| relief sought | الطلب | |
| affidavit | الإفادة الخطية | |
| power of attorney | التوكيل | |

### Product surface

| English | Arabic | Notes |
|---|---|---|
| workspace | مساحة العمل | |
| knowledge base | قاعدة المعرفة | |
| curation | المراجعة | the human review queue for corpus documents |
| curated / published | منشور | |
| chunk (indexed) | مقطع | مقاطع مُفهرسة |
| embedding | التضمين | |
| coverage | التغطية | |
| queue health | حالة قائمة الانتظار | |
| case assistant | مساعد القضايا | the chat panel |
| analysis | التحليل | |
| summary | الملخص | |
| confidence | درجة الثقة | |
| timeline | الخط الزمني | |
| insight | استنتاج | |
| admin | الإدارة | |
| user | مستخدم | |
| role | الدور | |
| permission | الصلاحية | |
| audit log / activity log | سجل النشاط | |
| subscription | الاشتراك | |
| plan / package | الباقة | |
| usage | الاستخدام | |
| tokens | الرموز | LLM tokens; disambiguate in context |
| rate limit | حدّ المعدل | |
| policy | السياسة | |
| support ticket | تذكرة الدعم | |
| dashboard | لوحة المعلومات | |
| report | التقرير | |
| document | مستند | |
| draft | مسودة | |
| pending | قيد الانتظار | |
| in review | قيد المراجعة | |
| approved | معتمد | |
| rejected | مرفوض | |
| flagged | مُعلَّم | |
| upload | رفع | |
| download | تنزيل | |
| export | تصدير | |

### Interface verbs and states

| English | Arabic |
|---|---|
| save / save changes | حفظ / حفظ التغييرات |
| cancel | إلغاء |
| close | إغلاق |
| delete | حذف |
| edit | تعديل |
| create | إنشاء |
| search | بحث |
| clear | مسح |
| retry | إعادة المحاولة |
| confirm | تأكيد |
| back / next / previous | رجوع / التالي / السابق |
| filter | عامل تصفية (plural عوامل التصفية) |
| sort | ترتيب |
| refresh | تحديث |
| copy / copied | نسخ / تم النسخ |
| select | اختر |
| all | الكل |
| none | لا شيء |
| optional / required | اختياري / مطلوب |
| loading… | جارٍ التحميل… |
| saving… | جارٍ الحفظ… |
| creating… | جارٍ الإنشاء… |
| sending… | جارٍ الإرسال… |
| verifications | التحقق |
| sign in / sign out | تسجيل الدخول / تسجيل الخروج |
| email | البريد الإلكتروني |
| password | كلمة المرور |
| forgot password? | نسيت كلمة المرور؟ |
| something went wrong | حدث خطأ ما |
| try again | حاول مرة أخرى |
| no results | لا توجد نتائج |
| try adjusting the filters | جرّب تعديل عوامل التصفية |
| not found | غير موجود |
| you do not have permission to view this | ليس لديك إذن لعرض هذا |
| are you sure? | هل أنت متأكد؟ |
| this cannot be undone | لا يمكن التراجع عن هذا الإجراء. |

---

## 3. Numbers

Every number the **user reads** is Arabic-Indic (`٠١٢٣٤٥٦٧٨٩`). Every
**identifier** stays Latin. The line between them is whether the value is a
quantity or a key.

Use the helpers in `src/lib/num.ts` — never call `Intl` or `toLocaleString`
directly, and never write `toLocaleString()` with no locale (it uses the
server's default and silently emits Latin digits).

| Helper | Renders |
|---|---|
| `n(x)` | `١٬٢٣٤` — counts, totals, pagination |
| `nDec(x, 2)` | `٠٫٠٣` — averages, ratios |
| `money(x)` | `٤٥٬٠٠٠ ₹` |
| `compact(x)` | `١٢ ألف`, `٣٫٤ مليون` |
| `percent(x)` | `٨٥٪` — Arabic percent sign, U+066A |
| `count(x, UNITS.case)` | `٣ قضايا` — agrees in Arabic |
| `bytes(x)` | `١٫٢ ميجابايت` |
| `duration(sec)` | `٣ دقائق و١٢ ثانية` |
| `date(x)` | `١٢ سبتمبر ٢٠٢٦` |
| `dateLong(x)` | `١٢ سبتمبر ٢٠٢٦` (month spelled out) |
| `dateTime(x)` | `١٢ سبتمبر ٢٠٢٦، ٤:٠٠ م` |
| `dayMonth(x)` | `١٢ سبتمبر` |
| `time(x)` | `٤:٠٠ م` |
| `weekday(x)` | `السبت` |
| `relative(x, "day")` | `قبل ٣ أيام` |
| `arabicDigits(s)` | digits inside an already-formatted string |

**Never pass an identifier to a helper.** Case numbers, user ids, emails,
phone numbers, API keys, URLs, file paths, invoice numbers and search queries
are rendered verbatim, because the user copies them, pastes them into a search
box and matches them against what the backend stores. `CRL/٢٠٢٤/٠٠١٢٣` does not
match `CRL/2024/00123`, and that is a bug in a legal product.

The helpers return `""` for a missing or unparseable value. Callers that want
a dash supply it: `n(x) || "—"`. Never let `Invalid Date` reach the screen.

Wrap identifiers in `<Ltr>` (`src/components/Ltr.tsx`) so the bidi algorithm
cannot reorder their punctuation — see §4.

---

## 4. Layout direction

The document is `<html lang="ar" dir="rtl">`. Most mirroring is automatic if
physical CSS is replaced with logical CSS, because the browser flips logical
properties itself.

### Replace physical direction classes with logical ones

| Physical (wrong) | Logical (right) |
|---|---|
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `left-*` / `right-*` | `start-*` / `end-*` |
| `-ml-*` / `-mr-*` | `-ms-*` / `-me-*` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `border-l*` / `border-r*` | `border-s*` / `border-e*` |
| `rounded-l*` / `rounded-r*` | `rounded-s*` / `rounded-e*` |
| `origin-left` / `origin-right` | `origin-[start]` / `origin-[end]` or restructure |

Verified against the installed Tailwind v4.3.3: all of the logical utilities
above compile to `margin-inline-*`, `padding-inline-*`, `inset-inline-*`,
`border-inline-*` and `text-align: start/end`. `space-x-*` already compiles to
`margin-inline-start/end`, so it needs no change.

`translate-x-*` compiles to the physical `translate` property and does **not**
flip. Animation and drawer offsets written with it must be checked by hand and
usually negated.

CSS in `globals.css` uses `padding-inline-*`, `border-inline-*` and
`text-align: start`. Keep it that way — do not add `left`/`right`/`margin-left`.

### Icons and glyphs need `.rtl-flip`

CSS can mirror a box but not the artwork inside an SVG. A right-pointing
chevron stays right-pointing and now points the wrong way relative to its text,
and an `ArrowLeft` used as "back" points forward. Add the `rtl-flip` class
(defined in `globals.css`) to those elements.

Common cases: `ArrowLeft`, `ArrowRight`, `ChevronLeft`, `ChevronRight`,
`ArrowUpRight`, `CornerDownRight`, `Undo2`, `Redo2`, `LogOut`, `Send`,
`Reply`, `IndentIncrease`, `ListOrdered`, and literal arrow characters
(`→`, `←`, `»`, `«`) in strings.

**If the icon also carries a rotation** (a chevron that rotates 90° when a
section expands), put `rtl-flip` on a **wrapper** element, not on the svg.
Both transforms on one element leave the expanded state pointing sideways
instead of down.

Icons that are symmetric or non-directional (`Search`, `Trash2`, `Plus`,
`X`, `Check`) must **not** be flipped.

### Bidi isolation for Latin values

Wrap every Latin identifier in `<Ltr>`:

```tsx
<Ltr className="inline-block">{caseNumber}</Ltr>
```

Without it, the neutral punctuation in a value like `CRL/2024/00123` can
resolve against the surrounding Arabic run and reorder, which produces a
mis-rendered identifier that still looks plausible.

### Letter-spacing

Arabic letters join contextually; tracking inserts space between glyphs after
shaping and breaks a word into disconnected letterforms. **Remove every
`tracking-*` utility.** `globals.css` also normalises `letter-spacing` on `*`
as a backstop, but the classes must still go.

`uppercase` is a no-op on Arabic (the script is unicameral) and is harmless,
but remove it where it only exists to style a Latin label.

---

## 5. What stays in Latin

Not averse to translation — these are values, not prose. Leave them exactly as
they are, and wrap in `<Ltr>` where they appear in a sentence or table cell:

- Case numbers, user ids, invoice numbers, ticket references.
- Email addresses, phone numbers, URLs, file paths, file names.
- API keys, tokens, model names (`gpt-4o`, `claude-sonnet-5`), enum values
  shown as a fallback (`status: "in_review"`).
- ISO dates and timestamps in raw form, ISO currency codes where they are a
  value rather than a label.
- Code, JSON, stack traces, log lines, and anything in a `<pre>` or `<code>`.
- The product name **Sutra** where it is part of a logo or wordmark image. In
  prose, use **سوترا**.

Field values returned by the API are data and are rendered as-is. Only the
labels, headers, placeholders, button text, empty states, error messages,
tooltips, `title`, `aria-label` and `alt` text around them are translated.

---

## 6. Browser translation

The app is Arabic, and visitors who do not read Arabic may run the page
through a browser translator. That works only if nothing blocks or hides the
text, so:

- **Never add `translate="no"`, `class="notranslate"`, or
  `<meta name="google" content="notranslate">`.** None exist today; do not
  introduce them.
- **Keep `lang="ar"` and `dir="rtl"` on `<html>`.** A correct `lang` is what
  makes Chrome offer to translate the page, and what makes a screen reader
  pick the right voice.
- **Never put user-facing text in CSS `content:`.** Translators walk the DOM's
  text nodes and never see pseudo-element content, so a string written into a
  stylesheet is untranslatable and invisible to assistive tech. The one place
  this existed — the settlement editor's empty-state prompt — is now a real
  element rendered by the component. `globals.css` still uses `content:` for
  the avatar initial and the notification badge count, which are decoration
  backed by `aria-label` (bugs #1610, #1611) and carry no translatable prose.
- **Prefer text in the markup over text in JavaScript string constants** where
  it is a static label, so it is present in the DOM for the translator to act
  on. Strings composed in JS and rendered are still translatable once
  rendered; strings built into attributes are less reliably handled.
- Translators rewrite the DOM, and a React re-render can replace a translated
  node. Avoid re-rendering static chrome unnecessarily.

---

## 7. Accessibility

- `aria-label`, `title` and `alt` are user-facing: translate them, and keep
  them describing the same thing as the visible text.
- Icon-only buttons must have a translated `aria-label` — there is no visible
  text to fall back on.
- `<html lang="ar">` is set once in `src/app/layout.tsx` and in
  `src/app/global-error.tsx`, which renders its own document because the root
  layout is what failed. Both must keep `lang` and `dir`.
- The skip link ("تخطَّ إلى المحتوى الرئيسي") must remain the first focusable
  element.

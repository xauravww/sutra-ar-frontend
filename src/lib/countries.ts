/**
 * Target countries, for the corpus upload and metadata selects.
 *
 * This replaces the previous Indian-states list: the product's target market is
 * the Arab world, so the jurisdiction select offers the 22 Arab League states
 * rather than Indian states and union territories.
 *
 * ## The value is an ISO code, not the Arabic name
 *
 * `<option value>` carries the ISO 3166-1 alpha-2 code (`SA`, `AE`, `EG`) and
 * the label carries the Arabic name. Two reasons:
 *
 * - It matches what the API already expects. The previous list sent the English
 *   state *name* and the backend resolved it through a name→code lookup
 *   (`getStateCode` in `tvsbackend/src/utils/stateMapping.ts`). Sending a code
 *   keeps that shape — a short ASCII key rather than free text — and removes a
 *   lookup that could fail silently.
 * - The value on the wire stays ASCII and stable regardless of how the Arabic
 *   label is later edited, so re-wording a label never orphans stored rows.
 *
 * **Backend follow-up:** `getStateCode()` still maps Indian state names and
 * returns `"DL"` for anything it does not recognise, so it will need to be
 * replaced with a country-code map. Until then every record here resolves to
 * the same default code. The API field is still called `state` — only the UI
 * label changed to الدولة — so no payload shape changed.
 */

export interface Country {
  /** ISO 3166-1 alpha-2, sent to the API as the `state` value. */
  code: string;
  /** Arabic display name. */
  name: string;
}

/**
 * The 22 Arab League member states.
 *
 * Grouped by region rather than sorted alphabetically: the Gulf states are the
 * primary market, and a reader looking for السعودية expects it at the top of a
 * short list rather than below a run of North African entries. Each option also
 * carries an `optgroup` label in the UI, so the grouping is visible.
 */
export const COUNTRIES: Country[] = [
  // Gulf
  { code: "SA", name: "السعودية" },
  { code: "AE", name: "الإمارات" },
  { code: "QA", name: "قطر" },
  { code: "KW", name: "الكويت" },
  { code: "BH", name: "البحرين" },
  { code: "OM", name: "عُمان" },
  // Levant & Iraq
  { code: "JO", name: "الأردن" },
  { code: "LB", name: "لبنان" },
  { code: "SY", name: "سوريا" },
  { code: "IQ", name: "العراق" },
  { code: "PS", name: "فلسطين" },
  { code: "YE", name: "اليمن" },
  // North Africa
  { code: "EG", name: "مصر" },
  { code: "LY", name: "ليبيا" },
  { code: "TN", name: "تونس" },
  { code: "DZ", name: "الجزائر" },
  { code: "MA", name: "المغرب" },
  { code: "SD", name: "السودان" },
  { code: "MR", name: "موريتانيا" },
  // Horn of Africa & islands
  { code: "SO", name: "الصومال" },
  { code: "DJ", name: "جيبوتي" },
  { code: "KM", name: "جزر القمر" },
];

/** Arabic names for the region groupings, used as `<optgroup>` labels. */
export const COUNTRY_GROUPS: { label: string; codes: string[] }[] = [
  { label: "الخليج", codes: ["SA", "AE", "QA", "KW", "BH", "OM"] },
  { label: "المشرق العربي", codes: ["JO", "LB", "SY", "IQ", "PS", "YE"] },
  { label: "شمال أفريقيا", codes: ["EG", "LY", "TN", "DZ", "MA", "SD", "MR"] },
  { label: "القرن الأفريقي والجزر", codes: ["SO", "DJ", "KM"] },
];

/** ISO code → Arabic name, for rendering a stored value back to the user. */
export const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((country) => [country.code, country.name]),
);

/**
 * A stored `state` value rendered for display.
 *
 * Values written before this list existed are English state names, and a value
 * the backend accepted but the frontend does not know should not render as
 * blank — so anything not in `COUNTRY_NAMES` is shown verbatim.
 */
export function countryLabel(value?: string | null): string {
  if (!value) return "";
  return COUNTRY_NAMES[value] ?? value;
}

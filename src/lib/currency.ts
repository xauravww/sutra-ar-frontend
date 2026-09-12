/**
 * The currency plan prices and revenue figures are shown in.
 *
 * ## Why this is one constant and not a per-call currency argument
 *
 * The backend stores `plan.price_monthly` as a bare number with no currency
 * column (see `tvsbackend/src/models/plan.model.ts`), so nothing on the wire
 * says what unit an amount is in. The old frontend filled that gap by
 * hard-coding the rupee — `"₹" + n.toLocaleString("en-IN")` — which was right
 * when the product was India-only and is wrong for a platform sold across the
 * Arab world.
 *
 * Rather than leave a second hard-coded guess in place, the currency is named
 * once, here, and every amount goes through `amount()`. When the backend grows
 * a currency column, or when a deployment bills in a single local currency,
 * this is the one line that changes.
 *
 * ## Setting it
 *
 * `NEXT_PUBLIC_CURRENCY` in `.env.local`, as an ISO 4217 code. Unset, it falls
 * back to `USD`, which is the neutral choice for a multi-country product: no
 * single Arab state's currency is the obvious default, and picking one would
 * mislabel every other market's figures.
 *
 * The code is validated against `Intl` before use. An unrecognised code makes
 * `Intl.NumberFormat` throw a `RangeError` at render time, which would take out
 * the whole page rather than just misformat a number — so a bad value degrades
 * to the fallback and warns in development instead.
 *
 * ## This is display only
 *
 * Nothing here converts between currencies, and nothing here changes what is
 * charged. Prices are stored, and payment is taken, in whatever the billing
 * provider is configured for — the payment integration is Razorpay, which
 * settles in INR. So on a deployment that bills through Razorpay, set
 * `NEXT_PUBLIC_CURRENCY=INR`: the display constant and the gateway must agree,
 * or the page shows a figure in one currency and charges another.
 */

import { money } from "./num";

/** Used when `NEXT_PUBLIC_CURRENCY` is unset or invalid. */
const FALLBACK_CURRENCY = "USD";

/** Resolves an ISO 4217 code, or `null` if `Intl` does not know it. */
function resolve(code: string | undefined): string | null {
  if (!code) return null;
  const candidate = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(candidate)) return null;
  try {
    new Intl.NumberFormat("ar-EG", { style: "currency", currency: candidate });
    return candidate;
  } catch {
    return null;
  }
}

/** The currency code every amount in the app is displayed in. */
export const CURRENCY: string = (() => {
  const configured = resolve(process.env.NEXT_PUBLIC_CURRENCY);
  if (configured) return configured;
  if (process.env.NEXT_PUBLIC_CURRENCY && process.env.NODE_ENV !== "production") {
    console.warn(
      `NEXT_PUBLIC_CURRENCY="${process.env.NEXT_PUBLIC_CURRENCY}" is not a valid ISO 4217 code; ` +
        `falling back to ${FALLBACK_CURRENCY}.`,
    );
  }
  return FALLBACK_CURRENCY;
})();

/**
 * An amount in the app's configured currency, in Arabic-Indic digits.
 *
 * Every money value in the UI goes through here rather than through
 * `money()` directly, so no call site can quietly pick its own currency.
 */
export function amount(value: Parameters<typeof money>[0], maximumFractionDigits = 0): string {
  return money(value, CURRENCY, maximumFractionDigits);
}

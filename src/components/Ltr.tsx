import type { ReactNode } from "react";

/**
 * A bidi isolation boundary for left-to-right content inside the Arabic UI.
 *
 * The page is `dir="rtl"`, but a lot of what it renders is *not* Arabic: case
 * numbers, user ids, email addresses, phone numbers, API keys, URLs, file
 * names and version strings. Those are left-to-right runs sitting inside a
 * right-to-left paragraph, and the Unicode bidi algorithm resolves them
 * against their surroundings rather than in isolation.
 *
 * The failure that causes is subtle and data-dependent, which is why it is
 * worth a component. Digits are "weak" and punctuation like `/ . : - ( )` is
 * "neutral": neutral characters take the direction of whatever surrounds
 * them. So a bare `CRL/2024/00123` in an RTL cell can have its trailing slash
 * or a wrapping bracket resolve to the RTL run and jump to the other end of
 * the string, producing something that looks like a typo in the identifier —
 * and it does so only for *some* values, so it passes a casual visual check
 * and fails on a real record. The identifier is also what the user copies,
 * searches on and matches against the backend, so a mis-ordered rendering is
 * a correctness bug in a legal product, not a cosmetic one.
 *
 * `dir="ltr"` puts the element at the start of its own directional run and
 * isolates it, so the contents lay out left-to-right and their position in the
 * surrounding RTL sentence is decided by the sentence alone. `unicodeBidi:
 * "isolate"` is set explicitly: browsers do apply it to `[dir]` elements from
 * the UA stylesheet, but relying on that makes the behaviour depend on a
 * stylesheet this app does not control.
 *
 * Rendered as `<span>` so it flows inline in a sentence. `inline-block` is
 * used for values in table cells, where the isolation box should not wrap
 * mid-identifier.
 *
 * Not for Arabic text, and not a general-purpose wrapper — wrapping everything
 * would defeat the isolation it exists to provide.
 */
export default function Ltr({
  children,
  className,
}: {
  children: ReactNode;
  /** Add `inline-block` for table cells; omit to stay in the text flow. */
  className?: string;
}) {
  return (
    <span dir="ltr" className={className} style={{ unicodeBidi: "isolate" }}>
      {children}
    </span>
  );
}

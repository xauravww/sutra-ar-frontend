/**
 * "Skip to main content" link — WCAG 2.1 SC 2.4.1 (Bypass Blocks), bug #1600.
 *
 * Rendered as the very first focusable element in the document (root layout,
 * ahead of all header/navigation chrome), so the first Tab press lands on it
 * and a keyboard or screen-reader user can jump straight into the page's
 * `<main id="main-content">` instead of tabbing through the whole nav.
 *
 * Visually hidden until focused, then shown as a floating pill at the top-left
 * so a sighted keyboard user can see where focus went.
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[100] focus:inline-flex focus:items-center focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2.5 focus:text-[13px] focus:font-semibold focus:text-white focus:no-underline focus:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      تخطَّ إلى المحتوى الرئيسي
    </a>
  );
}

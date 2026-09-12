import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import ClientProviders from "@/components/ClientProviders";
import SkipLink from "@/components/SkipLink";
import "./globals.css";

/*
 * The app is Arabic-only: there is no locale switch, no dictionary and no
 * second language to fall back to. Everything below — `<html lang>`, `<html
 * dir>`, the font and the copy — is fixed Arabic rather than resolved at
 * runtime, so the first painted byte is already right-to-left and there is no
 * flash of a left-to-right layout before hydration.
 *
 * IBM Plex Sans Arabic is the whole font stack, not one entry in it. It
 * carries both the Arabic and the Latin glyphs the UI needs (case identifiers,
 * email addresses, API keys stay Latin), so a single family covers the page
 * and there is no fallback mismatch mid-sentence.
 */
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "سوترا · مساحة العمل القانونية الذكية",
  description: "تحليل القضايا بمساعدة الذكاء الاصطناعي للمحامين والقضاء",
  icons: {
    icon: "/logo-mark.png",
    apple: "/logo-mark.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${plexArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Bug #1600 (WCAG 2.1 SC 2.4.1): first focusable element in the
            document, ahead of every header/nav, so the first Tab press can
            bypass the navigation and jump to <main id="main-content">. */}
        <SkipLink />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

"use client";

/*
 * Last-resort boundary: this renders when the root layout itself failed, so it
 * has to supply its own <html> and cannot rely on any of the app's providers,
 * fonts or stylesheets.
 *
 * `lang="ar" dir="rtl"` are therefore repeated here rather than inherited — the
 * layout that would normally set them is exactly what threw. Without them the
 * one screen a user sees when the app is broken would render their Arabic
 * error left-to-right. The font falls back to the system Arabic face for the
 * same reason the app's webfont cannot be used: no stylesheet is guaranteed to
 * have loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>حدث خطأ ما</h2>
        <p style={{ color: "#6B7481", marginBottom: 20 }}>{error?.message}</p>
        <button onClick={() => reset()} style={{ background: "#1E4E79", color: "#fff", border: 0, borderRadius: 12, padding: "12px 24px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
          حاول مرة أخرى
        </button>
      </body>
    </html>
  );
}

import type { NextConfig } from "next";

/**
 * Origin the browser talks to for API calls.
 *
 * `src/lib/api.ts` builds every request as `${BASE}${path}` where BASE is
 * `process.env.NEXT_PUBLIC_API_URL`, so the CSP must allow that origin. It is
 * read from the same variable the client bundle was compiled with, which keeps
 * the policy and the bundle in agreement.
 */
const apiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return "http://localhost:3015";
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
})();

/**
 * Content Security Policy (bug #1595).
 *
 * Notes on the choices:
 * - `script-src 'unsafe-inline'` is required: the App Router streams its
 *   hydration payload as inline <script> tags. Without it the app does not
 *   boot. A nonce-based policy would need the app to be restructured around
 *   middleware, which is out of scope for a headers fix.
 * - No `upgrade-insecure-requests`: the deployment is served over plain HTTP
 *   and the API is HTTP too, so that directive would rewrite the API calls to
 *   https and break every request.
 * - `img-src`/`frame-src` allow `https:` because document previews and
 *   profile photos are loaded from Wasabi S3, and mediation previews use
 *   `blob:` URLs.
 * - `frame-ancestors 'none'` plus `X-Frame-Options: DENY` block clickjacking.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`,
  "frame-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Only honoured over HTTPS; harmless while the deployment is HTTP and
  // already correct the moment it moves behind TLS.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework version (bug #1595).
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  // Proxy API requests to the backend in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3015"}/api/:path*`,
      },
    ];
  },
  // Security headers on every response (bug #1595).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

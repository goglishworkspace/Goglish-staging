import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local Supabase auth redirects go to 127.0.0.1:3000 or localhost:3000
  // (matches supabase/config.toml's site_url + additional_redirect_urls);
  // without both origins listed, Next dev blocks the HMR socket for whichever
  // one isn't allowed and silently force-reloads the page on every reconnect
  // attempt - visible as a repeating "[Fast Refresh] rebuilding" loop.
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Section 32/Phase 12 - next/image needs every external host it's ever
  // asked to optimize allow-listed up front. Course covers, teacher photos,
  // and media-library files are all Supabase Storage signed URLs - local dev
  // serves those from 127.0.0.1:54321, production from *.supabase.co.
  //
  // unoptimized in dev only: Next's image optimizer has a hardcoded SSRF
  // guard that refuses to fetch from private IPs (127.0.0.1 included) no
  // matter what remotePatterns allows, so local dev images would 400
  // otherwise. Production's *.supabase.co is a public host and gets full
  // optimization.
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: "/storage/v1/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/**" },
    ],
  },

  // Section 32 - security headers. CSP is enforced (P2.4 follow-up - it ran
  // Report-Only first to confirm a clean run across every page type before
  // this switch). X-Frame-Options below was never report-only - it blocked
  // framing immediately from the start.
  //
  // Bunny Stream (lib/video/bunny.provider.ts) is deliberately NOT allow-
  // listed here: it has no live library to test against yet, and that
  // file's own comment flags its `vz-{id}.b-cdn.net` hostname as unconfirmed
  // against a real Bunny account. Guessing a host into a production CSP
  // that neither runs today nor was verified would be worse than leaving it
  // out - add the real host (and iframe.mediadelivery.net if the embed
  // fallback ever gets used) as part of whatever change actually wires
  // Bunny into a player.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.youtube.com",
              "frame-src https://www.youtube.com https://js.stripe.com https://checkout.stripe.com",
              "img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "media-src 'self' https://www.youtube.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

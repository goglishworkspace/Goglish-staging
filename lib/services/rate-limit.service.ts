import type { NextRequest } from "next/server";

/**
 * Postgres-backed rate limiting (Section 0 / Section 22 - no Redis).
 * Calls the `check_rate_limit` RPC over Supabase's REST endpoint via plain
 * fetch so this also works from Edge Middleware (no TCP Postgres access there).
 */

/** True only on Vercel's own build/runtime (set automatically, never by a
 * client request) - see
 * https://vercel.com/docs/environment-variables/system-environment-variables. */
const isVercel = !!process.env.VERCEL;

/** On Vercel, `x-real-ip` and the LAST entry of `x-forwarded-for` are both
 * set by Vercel's edge network itself (appended after whatever the client
 * sent), so neither can be spoofed - a client-supplied `x-forwarded-for` is
 * overwritten/appended to, never trusted as-is. Off Vercel (local dev,
 * `npm test`), there's no trusted proxy in front of `next dev` at all, so
 * the leftmost `x-forwarded-for` entry is kept as a best-effort fallback -
 * it has no real security value locally, but preserves existing dev/test
 * rate-limit behavior. Shared by proxy.ts (the per-IP request-volume gate)
 * and the login route (the per-account failure gate below) so there's one
 * IP-trust story, not two. */
export function getClientIp(request: NextRequest): string {
  if (isVercel) {
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      const ips = forwardedFor.split(",").map((ip) => ip.trim());
      return ips[ips.length - 1] || "unknown";
    }
    return "unknown";
  }

  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export type RateLimitRule = {
  /** Prefix matched against the request pathname. */
  pathPrefix: string;
  key: string;
  maxCount: number;
  windowSeconds: number;
  /** If true, a rate-limit check failure (the RPC call itself erroring)
   * blocks the request instead of the default fail-open behavior below.
   * Reserved for login - the platform's single highest-value brute-force
   * target - where "the limiter broke" should degrade to "temporarily
   * blocked," not "wide open." Every other rule keeps the fail-open
   * posture (see checkRateLimit and proxy.ts's CSRF Origin-check comment
   * for the same trade-off applied elsewhere). */
  failClosed?: boolean;
};

export const RATE_LIMIT_RULES: RateLimitRule[] = [
  // Deliberately loose - this is the IP-wide "someone is hammering this
  // endpoint" gate (scripted abuse / DoS-ish volume), counting every
  // request regardless of outcome. The actual brute-force defense (wrong
  // passwords against one specific account) is the separate, much
  // stricter LOGIN_FAILURE_RATE_LIMIT enforced inside the login route
  // itself, keyed by IP+email - that split means a student who logs in
  // correctly several times never eats into the same budget as someone
  // guessing a password, and one student's wrong attempts on a shared
  // school/home IP can't lock out everyone else on that IP.
  { pathPrefix: "/api/auth/login", key: "login", maxCount: 20, windowSeconds: 15 * 60, failClosed: true },
  // More specific than the /api/auth/register rule below, so it must come
  // first - resolveRateLimitRule() takes the first prefix match. This fires
  // once per signUp() call (new attempt or retry alike, see
  // app/(auth)/register/page.tsx), so it needs a budget close to how often
  // people actually retry registration, not the stricter 3/hour meant to
  // bound distinct full signups on /api/auth/register itself.
  { pathPrefix: "/api/auth/register/sync-metadata", key: "register-sync", maxCount: 20, windowSeconds: 60 * 60 },
  { pathPrefix: "/api/auth/register", key: "register", maxCount: 3, windowSeconds: 60 * 60 },
  { pathPrefix: "/api/auth/forgot-password", key: "forgot-password", maxCount: 3, windowSeconds: 60 * 60 },
  { pathPrefix: "/api/auth/verify-phone/request", key: "phone-otp-request", maxCount: 5, windowSeconds: 60 * 60 },
];

export const DEFAULT_RATE_LIMIT: Omit<RateLimitRule, "pathPrefix" | "key"> = {
  maxCount: 60,
  windowSeconds: 60,
};

/** The real brute-force gate for login (see the RATE_LIMIT_RULES comment
 * above for the split from the loose IP-wide rule) - checked inside
 * app/api/auth/login/route.ts itself, keyed by IP+email, before every
 * signInWithPassword() attempt. Cleared via resetRateLimit() the moment a
 * login succeeds. */
export const LOGIN_FAILURE_RATE_LIMIT = { maxCount: 5, windowSeconds: 15 * 60 };

export function resolveRateLimitRule(pathname: string): RateLimitRule {
  const matched = RATE_LIMIT_RULES.find((rule) => pathname.startsWith(rule.pathPrefix));
  if (matched) return matched;
  return { pathPrefix: "/api", key: "api", ...DEFAULT_RATE_LIMIT };
}

export async function checkRateLimit(
  key: string,
  maxCount: number,
  windowSeconds: number,
  failClosed = false,
): Promise<boolean> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/check_rate_limit`;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_key: key,
        p_max_count: maxCount,
        p_window_seconds: windowSeconds,
      }),
    });

    if (!response.ok) {
      console.error("check_rate_limit RPC failed", response.status, await response.text());
      // Fail-open by default: a rate-limit infra hiccup shouldn't take the
      // whole API down. failClosed flips this for login specifically - if
      // the check itself is broken, brute-force protection on that endpoint
      // should degrade to "temporarily blocked," not "wide open."
      return !failClosed;
    }

    return (await response.json()) === true;
  } catch (error) {
    // fetch() itself can throw (Supabase unreachable, DNS/network failure) -
    // without this catch, that exception would propagate out of proxy.ts
    // unhandled, taking down every /api/* route rather than degrading
    // gracefully either way. Same fail-open/fail-closed split as above.
    console.error("check_rate_limit RPC unreachable", error);
    return !failClosed;
  }
}

/** Clears a rate-limit key's counter entirely - used to wipe the login
 * failure-gate the moment a password check actually succeeds, so that
 * charge never throttles this same account/IP's next legitimate login.
 * Best-effort by design: the caller (login route) always .catch()s this -
 * a reset that fails just means the counter clears on the next natural
 * window instead, never something worth failing or delaying an
 * already-successful, already-authenticated login over. */
export async function resetRateLimit(key: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/reset_rate_limit`;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ p_key: key }),
  });

  if (!response.ok) {
    console.error("reset_rate_limit RPC failed", response.status, await response.text());
  }
}

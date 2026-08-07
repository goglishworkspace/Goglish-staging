/**
 * Postgres-backed rate limiting (Section 0 / Section 22 - no Redis).
 * Calls the `check_rate_limit` RPC over Supabase's REST endpoint via plain
 * fetch so this also works from Edge Middleware (no TCP Postgres access there).
 */
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
  { pathPrefix: "/api/auth/login", key: "login", maxCount: 5, windowSeconds: 15 * 60, failClosed: true },
  { pathPrefix: "/api/auth/register", key: "register", maxCount: 3, windowSeconds: 60 * 60 },
  { pathPrefix: "/api/auth/forgot-password", key: "forgot-password", maxCount: 3, windowSeconds: 60 * 60 },
  { pathPrefix: "/api/auth/verify-phone/request", key: "phone-otp-request", maxCount: 5, windowSeconds: 60 * 60 },
];

export const DEFAULT_RATE_LIMIT: Omit<RateLimitRule, "pathPrefix" | "key"> = {
  maxCount: 60,
  windowSeconds: 60,
};

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

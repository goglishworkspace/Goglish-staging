import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit, resolveRateLimitRule } from "@/lib/services/rate-limit.service";

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
 * rate-limit behavior. */
function getClientIp(request: NextRequest): string {
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

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Endpoints authenticated by a shared secret/HMAC signature instead of the
 * session cookie (Stripe/gateway webhooks, pg_cron-triggered jobs, the mock
 * payment simulator) - CSRF is an attack on cookie-based auth, so these are
 * legitimately exempt from the Origin check below. */
const CSRF_EXEMPT_PREFIXES = [
  "/api/payments/webhooks/",
  "/api/payments/reconcile",
  "/api/admin/users/hard-delete-due",
  "/api/checkout/mock/",
];

/** Section 22 - CSRF. SameSite=Lax (the @supabase/ssr default, unmodified
 * here) already blocks the session cookie on cross-site fetch/form
 * submissions, which is the primary defense. This Origin check is
 * defense-in-depth on top of that - if Origin is missing (some non-browser
 * or older-browser requests), it fails open rather than blocking unknown
 * legitimate traffic, matching this codebase's existing fail-open posture
 * for secondary defenses (see checkRateLimit's RPC-failure handling). */
function isCrossSiteWrite(request: NextRequest): boolean {
  if (!UNSAFE_METHODS.has(request.method)) return false;
  if (CSRF_EXEMPT_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) return false;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).host !== request.nextUrl.host;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (isCrossSiteWrite(request)) {
      return NextResponse.json(
        { success: false, message: "الطلب مرفوض (Origin غير موثوق)", data: null, errors: null },
        { status: 403 },
      );
    }

    const rule = resolveRateLimitRule(request.nextUrl.pathname);
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`${rule.key}:${ip}`, rule.maxCount, rule.windowSeconds, rule.failClosed);

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "عدد الطلبات كتير قوي، حاول تاني بعد شوية",
          data: null,
          errors: null,
        },
        { status: 429 },
      );
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

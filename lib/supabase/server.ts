import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Session-scoped Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads/writes the user's auth cookies, so RLS policies
 * apply exactly as they would for the logged-in user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // @supabase/ssr defaults to httpOnly:false (see its
      // DEFAULT_COOKIE_OPTIONS), which leaves the session token readable by
      // any JS on the page - i.e. stealable by an XSS payload. The session
      // is only ever needed server-side here (route handlers, Server
      // Components) and refreshed by proxy.ts on every request, so nothing
      // legitimate needs to read it from JS.
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component - safe to ignore because
            // middleware refreshes the session on every request anyway.
          }
        },
      },
    },
  );
}

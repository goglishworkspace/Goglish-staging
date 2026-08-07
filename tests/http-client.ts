import { TEST_BASE_URL } from "./test-env";

type JsonResponse<T = unknown> = {
  status: number;
  json: {
    success: boolean;
    message: string;
    data: T | null;
    errors: Record<string, string[]> | null;
  } | null;
};

/** Minimal cookie-jar fetch wrapper so tests can simulate a browser session
 * across requests (Supabase auth cookies + the device_id cookie). */
export function createTestClient(baseUrl: string = TEST_BASE_URL) {
  const cookies = new Map<string, string>();

  function cookieHeader(): string {
    return Array.from(cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  function storeSetCookies(res: Response) {
    const setCookies =
      typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const pair = raw.split(";")[0];
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      cookies.set(pair.slice(0, eqIdx), pair.slice(eqIdx + 1));
    }
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<JsonResponse<T>> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader() ? { Cookie: cookieHeader() } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    storeSetCookies(res);
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  }

  async function postForm<T>(path: string, formData: FormData): Promise<JsonResponse<T>> {
    // No Content-Type header here on purpose - fetch sets the multipart
    // boundary itself; setting it manually breaks the boundary parsing.
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { ...(cookieHeader() ? { Cookie: cookieHeader() } : {}) },
      body: formData,
    });
    storeSetCookies(res);
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  }

  return {
    post: <T = unknown>(path: string, body?: unknown) => request<T>("POST", path, body),
    postForm: <T = unknown>(path: string, formData: FormData) => postForm<T>(path, formData),
    get: <T = unknown>(path: string) => request<T>("GET", path),
    patch: <T = unknown>(path: string, body?: unknown) => request<T>("PATCH", path, body),
    delete: <T = unknown>(path: string) => request<T>("DELETE", path),
    reset: () => cookies.clear(),
  };
}

export type TestClient = ReturnType<typeof createTestClient>;

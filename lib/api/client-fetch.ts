import type { ApiError, ApiSuccess } from "@/lib/api/response";

export async function postJson<T>(
  url: string,
  body: unknown,
): Promise<ApiSuccess<T> | ApiError> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // An unhandled exception in a route handler produces a non-JSON error
  // page (not our apiError() shape) - without this, response.json() itself
  // throws, and that exception propagates uncaught into every caller unless
  // each one wraps its await in try/catch. Callers should be able to trust
  // this always resolves to a real ApiSuccess/ApiError instead.
  try {
    return await response.json();
  } catch {
    return { success: false, message: "حصل خطأ غير متوقع، حاول تاني", data: null, errors: null };
  }
}

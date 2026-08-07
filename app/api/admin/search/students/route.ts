import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";

const VIEW_ROLES = ["admin", "super_admin", "support"];

/** Section 18 - "Student Search (للأدمن فقط)". profiles is private (own or
 * staff RLS) so this only ever returns results for a staff caller anyway,
 * but the explicit role check keeps the 403 message honest. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return apiError("q مطلوب", null, 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, VIEW_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, grade")
    .is("deleted_at", null)
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .limit(20);
  if (error) return apiError("تعذر البحث عن الطلاب", null, 500);
  return apiSuccess(data, "نتائج البحث");
}

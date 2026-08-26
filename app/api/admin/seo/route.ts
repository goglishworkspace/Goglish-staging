import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { upsertSeoSchema } from "@/lib/validation/seo.schemas";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

// Deliberately public (see `seo_settings`'s RLS: anon+authenticated SELECT) -
// public pages/metadata generation need to read this without a session.
// Only PATCH is staff-only.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const path = request.nextUrl.searchParams.get("path");
  let query = supabase.from("seo_settings").select("*").order("path");
  if (path) query = query.eq("path", path);

  const { data, error } = await query;
  if (error) return apiError("تعذر جلب إعدادات SEO", null, 500);
  return apiSuccess(data, "تم جلب إعدادات SEO");
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = upsertSeoSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("seo_settings")
    .upsert(parsed.data, { onConflict: "path" })
    .select()
    .single();
  if (error) return apiError("تعذر تحديث إعدادات SEO", null, 400);
  return apiSuccess(data, "تم تحديث إعدادات SEO");
}

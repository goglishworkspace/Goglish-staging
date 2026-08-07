import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createBundleSchema } from "@/lib/validation/bundle.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_bundles")
    .select("*, bundle_courses(course_id, courses(id, title, slug, cover_image_url))")
    .eq("is_active", true);

  if (error) return apiError("تعذر جلب الباقات", null, 500);
  return apiSuccess(data, "تم جلب الباقات");
}

export async function POST(request: NextRequest) {
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
  const parsed = createBundleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { course_ids, ...bundleFields } = parsed.data;
  const { data: bundle, error: bundleError } = await supabase
    .from("course_bundles")
    .insert({ ...bundleFields, created_by: user.id })
    .select()
    .single();
  if (bundleError) return apiError("تعذر إنشاء الباقة", null, 400);

  const { error: coursesError } = await supabase
    .from("bundle_courses")
    .insert(course_ids.map((course_id) => ({ bundle_id: bundle.id, course_id })));
  if (coursesError) {
    await supabase.from("course_bundles").delete().eq("id", bundle.id);
    return apiError("تعذر ربط الكورسات بالباقة", null, 400);
  }

  return apiSuccess({ ...bundle, course_ids }, "تم إنشاء الباقة", 201);
}

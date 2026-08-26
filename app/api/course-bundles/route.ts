import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createBundleSchema } from "@/lib/validation/bundle.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { attachTeachersToBundles } from "@/lib/services/course-teachers.service";
import { attachAccessToBundles } from "@/lib/services/entitlement.service";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subject_id");
  const supabase = await createClient();
  let query = supabase
    .from("course_bundles")
    .select("*, bundle_courses(course_id, courses(*))");

  // Public/student browsing only ever needs active bundles; admins managing
  // the catalog need to see inactive ones too (to reactivate/edit them), same
  // distinction the coupons list makes via is_active without a separate route.
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    query = query.eq("is_active", true);
  }

  if (subjectId) {
    // course_bundles has no subject_id of its own - a bundle "belongs" to a
    // subject through the courses it contains, so this is the same two-step
    // M:M lookup style used for the teacher_id filter on GET /api/courses.
    const { data: subjectCourses, error: subjectCoursesError } = await supabase
      .from("courses")
      .select("id")
      .eq("subject_id", subjectId);
    if (subjectCoursesError) return apiError("تعذر جلب باقات المادة", null, 500);
    const courseIds = (subjectCourses ?? []).map((row) => row.id);
    if (!courseIds.length) return apiSuccess([], "تم جلب الباقات");

    const { data: bundleLinks, error: bundleLinksError } = await supabase
      .from("bundle_courses")
      .select("bundle_id")
      .in("course_id", courseIds);
    if (bundleLinksError) return apiError("تعذر جلب باقات المادة", null, 500);
    const bundleIds = [...new Set((bundleLinks ?? []).map((row) => row.bundle_id))];
    if (!bundleIds.length) return apiSuccess([], "تم جلب الباقات");
    query = query.in("id", bundleIds);
  }

  const { data, error } = await query;
  if (error) return apiError("تعذر جلب الباقات", null, 500);

  const withTeachers = await attachTeachersToBundles(supabase, data ?? []);
  // Two separate has_access flags in this response: the bundle's own (for
  // "اشتراك في الباقة" vs "إكمال التعلم" on BundleCard) via
  // attachBundleHasAccess below, and each embedded course's own (so
  // CourseCard rendered inside the bundle detail page shows the same state
  // it would anywhere else) via attachAccessToBundles.
  const withCourseAccess = await attachAccessToBundles(supabase, withTeachers);
  const withAccess = await attachBundleHasAccess(supabase, withCourseAccess);
  return apiSuccess(withAccess, "تم جلب الباقات");
}

/** Same purpose as GET /api/courses' attachHasAccess - lets BundleCard show
 * "اشتراك في الباقة" vs "إكمال التعلم" without a per-bundle round-trip to
 * GET /api/course-bundles/[id]. A bundle is "owned" once its order
 * completes, same check hasBundleAccess() does for one bundle at a time. */
async function attachBundleHasAccess<T extends { id: string }>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bundles: T[],
): Promise<Array<T & { has_access: boolean }>> {
  if (!bundles.length) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bundles.map((bundle) => ({ ...bundle, has_access: false }));

  const { data: orders } = await supabase
    .from("orders")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("item_type", "bundle")
    .eq("status", "completed")
    .in(
      "item_id",
      bundles.map((b) => b.id),
    );
  const purchasedIds = new Set((orders ?? []).map((o) => o.item_id));

  return bundles.map((bundle) => ({ ...bundle, has_access: purchasedIds.has(bundle.id) }));
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

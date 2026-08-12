import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateBundleSchema } from "@/lib/validation/bundle.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";
import {
  hasBundleAccess,
  grantNewBundleCoursesToExistingBuyers,
  attachAccessToBundles,
} from "@/lib/services/entitlement.service";
import { notifyBundleCoursesAdded } from "@/lib/services/content-notification.service";
import { attachTeachersToBundles } from "@/lib/services/course-teachers.service";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("course_bundles")
    .select("*, bundle_courses(course_id, courses(*))")
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError("تعذر جلب الباقة", null, 500);
  if (!data) return apiError("الباقة غير موجودة", null, 404);

  const [withTeachers] = await attachTeachersToBundles(supabase, [data]);
  const [withCourseAccess] = await attachAccessToBundles(supabase, [withTeachers]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const has_access = user ? await hasBundleAccess(supabase, user.id, id) : false;

  return apiSuccess({ ...withCourseAccess, has_access }, "تم جلب الباقة");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const parsed = updateBundleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { course_ids, ...bundleFields } = parsed.data;
  if (Object.keys(bundleFields).length > 0) {
    const { error } = await supabase.from("course_bundles").update(bundleFields).eq("id", id);
    if (error) return apiError("تعذر تحديث الباقة", null, 400);
  }

  if (course_ids) {
    const { data: existingRows } = await supabase.from("bundle_courses").select("course_id").eq("bundle_id", id);
    const existingIds = new Set((existingRows ?? []).map((row) => row.course_id));
    const addedIds = course_ids.filter((courseId) => !existingIds.has(courseId));

    await supabase.from("bundle_courses").delete().eq("bundle_id", id);
    const { error: coursesError } = await supabase
      .from("bundle_courses")
      .insert(course_ids.map((course_id) => ({ bundle_id: id, course_id })));
    if (coursesError) return apiError("تعذر تحديث كورسات الباقة", null, 400);

    if (addedIds.length) {
      await grantNewBundleCoursesToExistingBuyers(id, addedIds);
      await notifyBundleCoursesAdded(id, addedIds);
    }
  }

  const { data } = await supabase
    .from("course_bundles")
    .select("*, bundle_courses(course_id)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return apiError("الباقة غير موجودة", null, 404);
  return apiSuccess(data, "تم تحديث الباقة");
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const { error, count } = await supabase.from("course_bundles").delete({ count: "exact" }).eq("id", id);
  if (error) return apiError("تعذر حذف الباقة", null, 400);
  if (!count) return apiError("الباقة غير موجودة", null, 404);
  return apiSuccess(null, "تم حذف الباقة");
}

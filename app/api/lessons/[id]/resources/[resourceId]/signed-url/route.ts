import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCourseAccess } from "@/lib/services/entitlement.service";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/roles";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; resourceId: string }> },
) {
  const { id, resourceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  // SEC-03: Verify user has course access (or staff/teacher permissions)
  // before generating signed download URL.
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, is_preview, modules(course_id)")
    .eq("id", id)
    .maybeSingle();

  if (lessonError || !lesson) return apiError("الدرس غير موجود", null, 404);

  const modules = lesson.modules as { course_id: string }[] | { course_id: string } | null;
  const courseId = Array.isArray(modules) ? modules[0]?.course_id : modules?.course_id;

  if (courseId) {
    const isStaff = await userHasAnyRole(supabase, STAFF_ROLES).catch(() => false);
    if (!isStaff) {
      const hasAccess = await hasCourseAccess(supabase, user.id, courseId);
      if (!hasAccess) {
        const { data: course } = await supabase
          .from("courses")
          .select("teacher_id")
          .eq("id", courseId)
          .maybeSingle();
        if (course?.teacher_id !== user.id) {
          return apiError("مش مشترك في الكورس ده", null, 403);
        }
      }
    }
  }

  // Session client so RLS confirms the caller can actually see this resource
  // before we hand out a signed download link.
  const { data: resource, error } = await supabase
    .from("lesson_resources")
    .select("id, storage_path")
    .eq("id", resourceId)
    .eq("lesson_id", id)
    .maybeSingle();

  if (error) return apiError("تعذر جلب المورد", null, 500);
  if (!resource) return apiError("المورد غير موجود", null, 404);

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from("lesson-resources")
    .createSignedUrl(resource.storage_path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed) return apiError("تعذر توليد رابط التحميل", null, 500);

  return apiSuccess(
    { url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS },
    "تم توليد رابط التحميل",
  );
}

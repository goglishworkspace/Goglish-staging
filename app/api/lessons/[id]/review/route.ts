import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { reviewContentSchema } from "@/lib/validation/content-workflow.schemas";
import { reviewContent } from "@/lib/services/content-workflow.service";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { notifyNewLessonPublished } from "@/lib/services/content-notification.service";

const REVIEW_ROLES = ["admin", "super_admin", "moderator", "content_manager"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, REVIEW_ROLES))) {
    return apiError("مش مسموح لك بمراجعة المحتوى", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = reviewContentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const data = await reviewContent(
    supabase,
    "lessons",
    id,
    user.id,
    parsed.data.decision,
    parsed.data.rejection_reason ?? null,
  ).catch(() => null);

  if (!data) return apiError("الدرس غير موجود", null, 404);

  if (parsed.data.decision === "published") await notifyNewLessonPublished(id);

  return apiSuccess(
    data,
    parsed.data.decision === "published" ? "تم نشر الدرس" : "تم رفض الدرس",
  );
}

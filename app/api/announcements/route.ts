import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAnnouncementSchema } from "@/lib/validation/announcement.schemas";
import { createAnnouncementAndNotify } from "@/lib/services/announcement.service";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false });

  if (error) return apiError("تعذر جلب الإعلانات", null, 500);
  return apiSuccess(data, "تم جلب الإعلانات");
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
  const parsed = createAnnouncementSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const announcement = await createAnnouncementAndNotify({
    title: parsed.data.title,
    body: parsed.data.body,
    target: parsed.data.target,
    targetGrade: parsed.data.target_grade ?? null,
    createdBy: user.id,
    expiresAt: parsed.data.expires_at ?? null,
  });

  return apiSuccess(announcement, "تم إنشاء الإعلان وإرسال الإشعارات", 201);
}

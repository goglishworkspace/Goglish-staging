import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { commentBanSchema } from "@/lib/validation/comment.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";

/** Manual ban/unban, outside the 3-strike auto-filter system (Section 11 -
 * "الأدمن يقدر يعمل Ban يدوي من كتابة التعليقات من خارج نظام التحذيرات"). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, ["admin", "super_admin", "moderator"]))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = commentBanSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      comment_banned: parsed.data.banned,
      comment_ban_reason: parsed.data.banned ? (parsed.data.reason ?? "حظر يدوي من الأدمن") : null,
    })
    .eq("id", parsed.data.user_id)
    .select("id, comment_banned, comment_ban_reason")
    .maybeSingle();
  if (error) return apiError("تعذر تنفيذ الإجراء", null, 400);
  if (!data) return apiError("المستخدم غير موجود", null, 404);

  return apiSuccess(data, parsed.data.banned ? "تم حظر المستخدم من التعليقات" : "تم فك الحظر");
}

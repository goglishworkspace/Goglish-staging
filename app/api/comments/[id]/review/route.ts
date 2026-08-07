import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { reviewCommentSchema } from "@/lib/validation/comment.schemas";
import { reviewComment } from "@/lib/services/comment-moderation.service";
import { userHasAnyRole } from "@/lib/auth/require-role";

const REVIEW_ROLES = ["admin", "super_admin", "moderator"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, REVIEW_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = reviewCommentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const result = await reviewComment({
    commentId: id,
    reviewerId: user.id,
    decision: parsed.data.decision,
    rejectionReason: parsed.data.rejection_reason ?? null,
  });
  if (!result) return apiError("التعليق غير موجود", null, 404);
  return apiSuccess(result, "تم تحديث حالة التعليق");
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { reportCommentSchema } from "@/lib/validation/comment.schemas";
import { reportComment } from "@/lib/services/comment-moderation.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => ({}));
  const parsed = reportCommentSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  try {
    await reportComment({ commentId: id, reporterUserId: user.id, reason: parsed.data.reason ?? null });
  } catch {
    return apiError("تعذر إرسال البلاغ (ممكن تكون بلّغت عن التعليق ده قبل كده)", null, 400);
  }
  return apiSuccess(null, "تم إرسال البلاغ");
}

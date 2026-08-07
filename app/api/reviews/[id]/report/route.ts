import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { reportReviewSchema } from "@/lib/validation/review.schemas";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => ({}));
  const parsed = reportReviewSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { error } = await supabase
    .from("review_reports")
    .insert({ review_id: id, reporter_user_id: user.id, reason: parsed.data.reason ?? null });
  if (error) return apiError("تعذر إرسال البلاغ (ممكن تكون بلّغت عن التقييم ده قبل كده)", null, 400);
  return apiSuccess(null, "تم إرسال البلاغ");
}

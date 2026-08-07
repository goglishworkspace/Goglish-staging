import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createReviewSchema } from "@/lib/validation/review.schemas";
import { assertReviewEligible, ReviewNotEligibleError } from "@/lib/services/review.service";
import { filterCommentContent } from "@/lib/services/comment-filter.service";

const REVIEW_FILTER_REASON_MESSAGE: Record<string, string> = {
  phone_number: "التقييم فيه رقم تليفون",
  email: "التقييم فيه إيميل",
  link: "التقييم فيه رابط",
  profanity: "التقييم فيه كلام غير لائق",
};

export async function GET(request: NextRequest) {
  const targetType = request.nextUrl.searchParams.get("target_type");
  const targetId = request.nextUrl.searchParams.get("target_id");
  if (!targetType || !targetId) return apiError("target_type وtarget_id مطلوبين", null, 400);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, rating, comment, like_count, created_at")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false });
  if (error) return apiError("تعذر جلب التقييمات", null, 500);
  return apiSuccess(data, "تم جلب التقييمات");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  try {
    await assertReviewEligible(supabase, user.id, parsed.data.target_type, parsed.data.target_id);
  } catch (error) {
    if (error instanceof ReviewNotEligibleError) return apiError(error.message, null, 403);
    throw error;
  }

  if (parsed.data.comment) {
    const filterResult = filterCommentContent(parsed.data.comment);
    if (filterResult.blocked) {
      return apiError(REVIEW_FILTER_REASON_MESSAGE[filterResult.reason!], null, 422);
    }
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      user_id: user.id,
      target_type: parsed.data.target_type,
      target_id: parsed.data.target_id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    })
    .select("id, rating, comment")
    .single();
  if (error) return apiError("تعذر إرسال التقييم (ممكن تكون قيّمت العنصر ده قبل كده)", null, 400);
  return apiSuccess(data, "تم إرسال التقييم", 201);
}

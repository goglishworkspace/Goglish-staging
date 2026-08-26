import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createExamSchema } from "@/lib/validation/exam.schemas";

export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("course_id");
  if (!courseId) return apiError("course_id مطلوب", null, 400);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select(
      "id, course_id, title, time_limit_seconds, passing_score_percent, solutions_visible_at, xp_reward, coin_reward, status, deletion_requested_at, created_at",
    )
    .eq("course_id", courseId);

  if (error) return apiError("تعذر جلب الامتحانات", null, 500);
  return apiSuccess(data, "تم جلب الامتحانات");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createExamSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("exams")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return apiError("تعذر إنشاء الامتحان (لازم تقدر تدير الكورس ده)", null, 403);
  return apiSuccess(data, "تم إنشاء الامتحان", 201);
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { leaveAttemptSchema } from "@/lib/validation/attempt.schemas";
import { finalizeExamAttempt } from "@/lib/services/exam-submit.service";

/**
 * Anti-cheat: "لا يخرج ويرجع (الامتحان يُعتبر مُسلَّم)" (Section 8). Called by
 * the exam-taking page's visibilitychange handler the instant the student
 * leaves the tab - whatever responses were filled in gets auto-submitted.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data: attempt, error } = await supabase
    .from("student_exam_attempts")
    .select("id, exam_id, status, user_id, exams(title, passing_score_percent, xp_reward, coin_reward)")
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError("تعذر جلب المحاولة", null, 500);
  if (!attempt) return apiError("المحاولة غير موجودة", null, 404);
  if (attempt.user_id !== user.id) return apiError("مش مسموح لك بالإجراء ده", null, 403);
  if (attempt.status === "submitted") return apiSuccess({ id }, "المحاولة مُسلَّمة بالفعل");

  const body = await request.json().catch(() => ({}));
  const parsed = leaveAttemptSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();
  const exam = attempt.exams as unknown as {
    title: string;
    passing_score_percent: number;
    xp_reward: number;
    coin_reward: number;
  };

  // student_exam_attempts/student_exam_responses no longer grant authenticated
  // UPDATE (supabase/migrations/20260801100021_security_fix_attempts_rls.sql) -
  // scoring is a trusted server computation, so finalization must write
  // through the admin client. The ownership check above still runs on the
  // session client/RLS.
  const result = await finalizeExamAttempt({
    supabase: createAdminClient(),
    attemptId: id,
    examId: attempt.exam_id,
    userId: user.id,
    passingScorePercent: exam.passing_score_percent,
    xpReward: exam.xp_reward,
    coinReward: exam.coin_reward,
    examTitle: exam.title,
    studentName: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Student",
    responses: parsed.data.responses,
    autoSubmitted: true,
    leftWindowAt: new Date().toISOString(),
  });

  return apiSuccess(result, "تم تسليم الامتحان تلقائياً لأنك سبت الصفحة");
}

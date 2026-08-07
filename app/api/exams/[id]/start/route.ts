import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { hasCourseAccess } from "@/lib/services/entitlement.service";
import {
  buildAttemptQuestions,
  rebuildAttemptQuestions,
  type RandomizedOrder,
} from "@/lib/services/attempt-start.service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id, status, course_id, time_limit_seconds, shuffle_questions")
    .eq("id", id)
    .maybeSingle();
  if (examError) return apiError("تعذر جلب الامتحان", null, 500);
  if (!exam || exam.status !== "published") return apiError("الامتحان غير موجود", null, 404);

  // Same purchase gate as lesson video/quizzes - the exam row is readable
  // pre-purchase (RLS shows published exams), but actually starting an
  // attempt requires the course entitlement. Content owners/staff exempt.
  const { data: canManage } = await supabase.rpc("can_manage_course_content", { p_course_id: exam.course_id });
  const allowed = canManage || (await hasCourseAccess(supabase, user.id, exam.course_id));
  if (!allowed) return apiError("لازم تشتري الكورس الأول عشان تقدر تدخل الامتحان ده", null, 402);

  // "محاولة واحدة فقط... لا استثناءات" - UNIQUE(exam_id, user_id) backs this
  // up at the DB level too, this is just a friendlier error message.
  const { data: existing } = await supabase
    .from("student_exam_attempts")
    .select("id, status, randomized_order, time_limit_seconds, started_at")
    .eq("exam_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.status === "submitted") {
    // Not an error - the client needs this to render the "already taken"
    // view (and link to /api/exam-attempts/[id] for the full result).
    return apiSuccess(
      { already_submitted: true, attempt_id: existing.id },
      "عندك محاولة واحدة بس مسموحة لهذا الامتحان، وخلصتها بالفعل",
    );
  }

  if (existing) {
    const questions = await rebuildAttemptQuestions(
      supabase,
      "exam_id",
      id,
      existing.randomized_order as RandomizedOrder,
    );
    return apiSuccess(
      {
        attempt_id: existing.id,
        questions,
        time_limit_seconds: existing.time_limit_seconds,
        started_at: existing.started_at,
      },
      "استكمال المحاولة الجارية",
    );
  }

  const { questions, randomizedOrder } = await buildAttemptQuestions(
    supabase,
    "exam_id",
    id,
    exam.shuffle_questions,
    false,
  );
  if (questions.length === 0) return apiError("الامتحان ده لسه مفيهوش أسئلة", null, 404);

  const { data: attempt, error: attemptError } = await supabase
    .from("student_exam_attempts")
    .insert({
      exam_id: id,
      user_id: user.id,
      randomized_order: randomizedOrder,
      time_limit_seconds: exam.time_limit_seconds,
    })
    .select("id, started_at")
    .single();

  // 23505 = unique_violation on (exam_id, user_id) - a second request for
  // the same student raced this one (double-click, two tabs, or React
  // Strict Mode's double effect in dev) and lost. Rather than error, resume
  // whatever the winner just created - the student never sees a failure for
  // something that isn't actually their fault.
  if (attemptError?.code === "23505") {
    const { data: raceWinner } = await supabase
      .from("student_exam_attempts")
      .select("id, status, randomized_order, time_limit_seconds, started_at")
      .eq("exam_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (raceWinner && raceWinner.status !== "submitted") {
      const questions = await rebuildAttemptQuestions(
        supabase,
        "exam_id",
        id,
        raceWinner.randomized_order as RandomizedOrder,
      );
      return apiSuccess(
        {
          attempt_id: raceWinner.id,
          questions,
          time_limit_seconds: raceWinner.time_limit_seconds,
          started_at: raceWinner.started_at,
        },
        "استكمال المحاولة الجارية",
      );
    }
  }
  if (attemptError) return apiError("تعذر بدء المحاولة", null, 500);

  return apiSuccess(
    {
      attempt_id: attempt.id,
      questions,
      time_limit_seconds: exam.time_limit_seconds,
      started_at: attempt.started_at,
    },
    "تم بدء المحاولة",
    201,
  );
}

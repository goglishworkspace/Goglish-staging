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

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select(
      "id, status, lesson_id, max_attempts, time_limit_seconds, shuffle_questions, shuffle_options, lessons(module_id, modules(course_id))",
    )
    .eq("id", id)
    .maybeSingle();
  if (quizError) return apiError("تعذر جلب الكويز", null, 500);
  if (!quiz || quiz.status !== "published") return apiError("الكويز غير موجود", null, 404);

  // Quizzes hang off a lesson, which is protected content - the row itself
  // is readable pre-purchase (RLS shows published quizzes so students can
  // see the title), but *taking* it requires the same course entitlement as
  // watching the lesson video. Content owners/staff are exempt so a teacher
  // can preview their own quiz without buying their own course.
  type LessonRel = { modules: { course_id: string } | { course_id: string }[] | null };
  const lessonsRel = quiz.lessons as LessonRel | LessonRel[] | null;
  const lessonRel = Array.isArray(lessonsRel) ? lessonsRel[0] : lessonsRel;
  const modulesRel = lessonRel?.modules;
  const courseId = Array.isArray(modulesRel) ? modulesRel[0]?.course_id : modulesRel?.course_id;
  const { data: canManage } = await supabase.rpc("can_manage_lesson_content", { p_lesson_id: quiz.lesson_id });
  const allowed = canManage || (courseId ? await hasCourseAccess(supabase, user.id, courseId) : false);
  if (!allowed) return apiError("لازم تشتري الكورس الأول عشان تقدر تحل الكويز ده", null, 402);

  // Resume an existing in-progress attempt rather than starting a new one.
  const { data: inProgress } = await supabase
    .from("student_quiz_attempts")
    .select("id, attempt_number, randomized_order, time_limit_seconds, started_at")
    .eq("quiz_id", id)
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  if (inProgress) {
    const questions = await rebuildAttemptQuestions(
      supabase,
      "quiz_id",
      id,
      inProgress.randomized_order as RandomizedOrder,
    );
    return apiSuccess(
      {
        attempt_id: inProgress.id,
        attempt_number: inProgress.attempt_number,
        questions,
        time_limit_seconds: inProgress.time_limit_seconds,
        started_at: inProgress.started_at,
      },
      "استكمال محاولة سابقة",
    );
  }

  const { count: attemptCount } = await supabase
    .from("student_quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", id)
    .eq("user_id", user.id);

  const nextAttemptNumber = (attemptCount ?? 0) + 1;
  if (quiz.max_attempts != null && nextAttemptNumber > quiz.max_attempts) {
    return apiError("وصلت للحد الأقصى من المحاولات المسموحة للكويز ده", null, 403);
  }

  const { questions, randomizedOrder } = await buildAttemptQuestions(
    supabase,
    "quiz_id",
    id,
    quiz.shuffle_questions,
    quiz.shuffle_options,
  );
  if (questions.length === 0) return apiError("الكويز ده لسه مفيهوش أسئلة", null, 404);

  const { data: attempt, error: attemptError } = await supabase
    .from("student_quiz_attempts")
    .insert({
      quiz_id: id,
      user_id: user.id,
      attempt_number: nextAttemptNumber,
      randomized_order: randomizedOrder,
      time_limit_seconds: quiz.time_limit_seconds,
    })
    .select("id, attempt_number, started_at")
    .single();

  // 23505 = unique_violation on (quiz_id, user_id, attempt_number) - a
  // second request for the same student raced this one to the same attempt
  // number (double-click, two tabs, or React Strict Mode's double effect in
  // dev) and lost. Resume whatever the winner just created instead of
  // erroring on something that isn't actually the student's fault.
  if (attemptError?.code === "23505") {
    const { data: raceWinner } = await supabase
      .from("student_quiz_attempts")
      .select("id, attempt_number, randomized_order, time_limit_seconds, started_at")
      .eq("quiz_id", id)
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .maybeSingle();
    if (raceWinner) {
      const questions = await rebuildAttemptQuestions(
        supabase,
        "quiz_id",
        id,
        raceWinner.randomized_order as RandomizedOrder,
      );
      return apiSuccess(
        {
          attempt_id: raceWinner.id,
          attempt_number: raceWinner.attempt_number,
          questions,
          time_limit_seconds: raceWinner.time_limit_seconds,
          started_at: raceWinner.started_at,
        },
        "استكمال محاولة سابقة",
      );
    }
  }
  if (attemptError) return apiError("تعذر بدء المحاولة", null, 500);

  return apiSuccess(
    {
      attempt_id: attempt.id,
      attempt_number: attempt.attempt_number,
      questions,
      time_limit_seconds: quiz.time_limit_seconds,
      started_at: attempt.started_at,
    },
    "تم بدء المحاولة",
    201,
  );
}

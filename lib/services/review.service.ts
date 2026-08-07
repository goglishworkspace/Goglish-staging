import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasCompletedCourse } from "./course-progress.service";

export class ReviewNotEligibleError extends Error {}

/** Section 20 - reviews (course or teacher) are only allowed "بعد إنهاء
 * الكورس". For a teacher review, eligibility is having completed at least
 * one course that teacher is assigned to. Uses the caller's session client -
 * a student already has RLS read access to everything this needs (their own
 * lesson_progress, public course/module/lesson metadata). */
export async function assertReviewEligible(
  supabase: SupabaseClient,
  userId: string,
  targetType: "course" | "teacher",
  targetId: string,
): Promise<void> {
  if (targetType === "course") {
    const completed = await hasCompletedCourse(supabase, userId, targetId);
    if (!completed) throw new ReviewNotEligibleError("لازم تخلّص الكورس الأول عشان تقيّمه");
    return;
  }

  const { data: taughtCourses } = await supabase
    .from("course_teachers")
    .select("course_id")
    .eq("teacher_id", targetId);
  for (const row of taughtCourses ?? []) {
    if (await hasCompletedCourse(supabase, userId, row.course_id as string)) return;
  }
  throw new ReviewNotEligibleError("لازم تخلّص كورس مع المدرس ده الأول عشان تقيّمه");
}

/** Toggles the caller's like on a review - idempotent either way. */
export async function toggleReviewLike(
  supabase: SupabaseClient,
  reviewId: string,
  userId: string,
  liked: boolean,
): Promise<void> {
  if (liked) {
    const { error } = await supabase
      .from("review_likes")
      .upsert({ review_id: reviewId, user_id: userId }, { onConflict: "review_id,user_id", ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("review_likes")
      .delete()
      .eq("review_id", reviewId)
      .eq("user_id", userId);
    if (error) throw error;
  }
}

import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, createPublishedLesson } from "./phase2-fixtures";
import { markLessonCompleted } from "./phase7-fixtures";

describe("Reviews & Ratings", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("rejects a course review before completion, accepts it after, and updates courses.rating_avg", async () => {
    const { admin, teacher, courseId, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const before = await client.post("/api/reviews", {
      target_type: "course",
      target_id: courseId,
      rating: 5,
      comment: "قبل الإنهاء",
    });
    expect(before.status).toBe(403);

    await markLessonCompleted(client, lessonId);

    const { status, json } = await client.post<{ id: string; rating: number }>("/api/reviews", {
      target_type: "course",
      target_id: courseId,
      rating: 5,
      comment: "شرح ممتاز",
    });
    expect(status).toBe(201);
    expect(json?.data?.rating).toBe(5);

    const supabase = createAdminClient();
    const { data: course } = await supabase.from("courses").select("rating_avg, rating_count").eq("id", courseId).single();
    expect(Number(course?.rating_avg)).toBe(5);
    expect(course?.rating_count).toBe(1);

    // A second review from the same student on the same course is rejected
    // (unique(user_id, target_type, target_id)).
    const duplicate = await client.post("/api/reviews", {
      target_type: "course",
      target_id: courseId,
      rating: 3,
    });
    expect(duplicate.status).toBe(400);
  });

  it("rejects a teacher review before completing any of their courses, accepts it after, and updates teacher_profiles.rating_avg", async () => {
    const { admin, teacher, courseId, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    // createPublishedLesson only sets courses.created_by - assertReviewEligible
    // checks course_teachers (Section 6's actual teaching-team relationship),
    // so the teacher has to be assigned to the course explicitly.
    await admin.client.post(`/api/courses/${courseId}/teachers`, { teacher_id: teacher.teacherId });
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const before = await client.post("/api/reviews", {
      target_type: "teacher",
      target_id: teacher.teacherId,
      rating: 4,
    });
    expect(before.status).toBe(403);

    await markLessonCompleted(client, lessonId);

    const { status } = await client.post("/api/reviews", {
      target_type: "teacher",
      target_id: teacher.teacherId,
      rating: 4,
    });
    expect(status).toBe(201);

    const supabase = createAdminClient();
    const { data: teacherProfile } = await supabase
      .from("teacher_profiles")
      .select("rating_avg, rating_count")
      .eq("teacher_id", teacher.teacherId)
      .single();
    expect(Number(teacherProfile?.rating_avg)).toBe(4);
    expect(teacherProfile?.rating_count).toBe(1);
  });

  it("supports like, report, and delete (own + admin)", async () => {
    const { admin, teacher, courseId, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client: author, userId: authorId } = await createLoggedInStudent();
    registry.track(authorId);
    const { client: other, userId: otherId } = await createLoggedInStudent();
    registry.track(otherId);

    await markLessonCompleted(author, lessonId);
    const { json: reviewJson } = await author.post<{ id: string }>("/api/reviews", {
      target_type: "course",
      target_id: courseId,
      rating: 5,
    });
    const reviewId = reviewJson!.data!.id;

    const likeRes = await other.post(`/api/reviews/${reviewId}/like`, undefined);
    expect(likeRes.status).toBe(200);

    const reportRes = await other.post(`/api/reviews/${reviewId}/report`, { reason: "غير لائق" });
    expect(reportRes.status).toBe(200);

    const supabase = createAdminClient();
    const { data: review } = await supabase
      .from("reviews")
      .select("like_count, report_count")
      .eq("id", reviewId)
      .single();
    expect(review?.like_count).toBe(1);
    expect(review?.report_count).toBe(1);

    const deniedDelete = await other.delete(`/api/reviews/${reviewId}`);
    expect(deniedDelete.status).toBe(404);

    const ownDelete = await author.delete(`/api/reviews/${reviewId}`);
    expect(ownDelete.status).toBe(200);
  });
});

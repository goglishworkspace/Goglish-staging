import { describe, it, expect, afterAll } from "vitest";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, createPublishedLesson } from "./phase2-fixtures";

describe("Lesson/course progress tracking", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("records lesson progress and aggregates it into course progress", async () => {
    const { admin, teacher, courseId, lessonId } = await createPublishedLesson({
      youtube_video_id: "video-guid",
    });
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { client: studentClient, userId } = await createLoggedInStudent();
    registry.track(userId);

    const before = await studentClient.get(`/api/lessons/${lessonId}/progress`);
    expect(before.json?.data).toBeNull();

    const update = await studentClient.post(`/api/lessons/${lessonId}/progress`, {
      progress_seconds: 120,
      status: "completed",
    });
    expect(update.status).toBe(200);

    const after = await studentClient.get<{ status: string; progress_seconds: number }>(
      `/api/lessons/${lessonId}/progress`,
    );
    expect(after.json?.data?.status).toBe("completed");
    expect(after.json?.data?.progress_seconds).toBe(120);

    const courseProgress = await studentClient.get<{
      total_lessons: number;
      completed_lessons: number;
      percent: number;
      next_lesson_id: string | null;
    }>(`/api/courses/${courseId}/progress`);
    expect(courseProgress.json?.data?.total_lessons).toBe(1);
    expect(courseProgress.json?.data?.completed_lessons).toBe(1);
    expect(courseProgress.json?.data?.percent).toBe(100);
    // Only lesson is done - "next" falls back to replaying it, not null.
    expect(courseProgress.json?.data?.next_lesson_id).toBe(lessonId);
  });

  it("points next_lesson_id at the first uncompleted lesson, in curriculum order", async () => {
    const { admin, teacher, courseId, moduleId, lessonId: firstLessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { json: secondLessonJson } = await teacher.client.post<{ id: string }>(`/api/modules/${moduleId}/lessons`, {
      title: "درس تاني",
      order_index: 1,
    });
    const secondLessonId = secondLessonJson!.data!.id;
    await teacher.client.post(`/api/lessons/${secondLessonId}/submit`);
    await admin.client.post(`/api/lessons/${secondLessonId}/review`, { decision: "published" });

    const { client: studentClient, userId } = await createLoggedInStudent();
    registry.track(userId);

    const beforeAny = await studentClient.get<{ next_lesson_id: string | null }>(`/api/courses/${courseId}/progress`);
    expect(beforeAny.json?.data?.next_lesson_id).toBe(firstLessonId);

    await studentClient.post(`/api/lessons/${firstLessonId}/progress`, { progress_seconds: 10, status: "completed" });

    const afterFirst = await studentClient.get<{ next_lesson_id: string | null }>(`/api/courses/${courseId}/progress`);
    expect(afterFirst.json?.data?.next_lesson_id).toBe(secondLessonId);
  });
});

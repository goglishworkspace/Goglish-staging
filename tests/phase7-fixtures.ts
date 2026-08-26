import type { TestClient } from "./http-client";

/** Marks a lesson as completed for the given (already logged-in) student -
 * the minimum needed for course-progress.service.ts's hasCompletedCourse()
 * to consider the whole course "finished" when it's the only lesson. */
export async function markLessonCompleted(client: TestClient, lessonId: string) {
  return client.post(`/api/lessons/${lessonId}/progress`, {
    progress_seconds: 600,
    status: "completed",
  });
}

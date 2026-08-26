import { describe, it, expect, afterAll } from "vitest";
import { createTestClient } from "./http-client";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, createPublishedLesson } from "./phase2-fixtures";
import { grantCourseAccess } from "@/lib/services/entitlement.service";

describe("GET /api/lessons/[id]/playback", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("serves a YouTube preview embed without requiring login", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson({
      is_preview: true,
      youtube_preview_video_id: "dQw4w9WgXcQ",
    });
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const anon = createTestClient();
    const { status, json } = await anon.get<{ provider: string; embedUrl: string }>(
      `/api/lessons/${lessonId}/playback`,
    );

    expect(status).toBe(200);
    expect(json?.data?.provider).toBe("youtube");
    expect(json?.data?.embedUrl).toContain("dQw4w9WgXcQ");
  });

  it("requires login, then course access, for a protected (unlisted YouTube) lesson - and returns the video id + a personalized watermark once purchased", async () => {
    const { admin, teacher, courseId, lessonId } = await createPublishedLesson({
      youtube_video_id: "dQw4w9WgXcQ",
    });
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const anon = createTestClient();
    const anonRes = await anon.get(`/api/lessons/${lessonId}/playback`);
    expect(anonRes.status).toBe(401);

    const { client: studentClient, userId } = await createLoggedInStudent();
    registry.track(userId);

    // Logged in but hasn't bought the course (Phase 4 - Section 9 course
    // access policy): playback must be blocked, not just login-gated.
    const noAccessRes = await studentClient.get(`/api/lessons/${lessonId}/playback`);
    expect(noAccessRes.status).toBe(402);

    await grantCourseAccess(userId, courseId, "purchase", null);

    const { status, json } = await studentClient.get<{
      provider: string;
      videoId: string;
      watermark: { nationalId: string | null };
    }>(`/api/lessons/${lessonId}/playback`);

    expect(status).toBe(200);
    expect(json?.data?.provider).toBe("youtube");
    expect(json?.data?.videoId).toBe("dQw4w9WgXcQ");
    expect(json?.data?.watermark.nationalId).toMatch(/^\d{14}$/);
  });
});

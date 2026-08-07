import { describe, it, expect, afterAll } from "vitest";
import { createTestClient } from "./http-client";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, grantCourseAccess } from "./phase2-fixtures";
import { createPublishedQuiz } from "./phase3-fixtures";
import { passQuiz } from "./gamification-fixtures";

describe("Badges", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("GET /api/badges returns the public catalog without login", async () => {
    const anon = createTestClient();
    const { status, json } = await anon.get<Array<{ code: string }>>("/api/badges");
    expect(status).toBe(200);
    expect(json?.data?.some((b) => b.code === "first_quiz")).toBe(true);
  });

  it("awards the first_quiz badge the first time a student passes any quiz", async () => {
    const { admin, teacher, courseId, quizId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const before = await client.get<Array<{ badges: { code: string } }>>("/api/gamification/badges/me");
    expect(before.json?.data).toEqual([]);

    const submitRes = await passQuiz(client, quizId);
    expect(submitRes.json?.data?.passed).toBe(true);

    const after = await client.get<Array<{ badges: { code: string } }>>("/api/gamification/badges/me");
    expect(after.status).toBe(200);
    expect(after.json?.data?.some((row) => row.badges.code === "first_quiz")).toBe(true);
  });
});

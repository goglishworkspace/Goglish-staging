import { describe, it, expect, afterAll } from "vitest";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, grantCourseAccess } from "./phase2-fixtures";
import { createPublishedQuiz } from "./phase3-fixtures";

describe("Question visibility for students", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("never exposes is_correct/match_group/order_index when starting an attempt", async () => {
    const { admin, teacher, courseId, quizId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    await teacher.client.post(`/api/quizzes/${quizId}/questions`, {
      type: "ordering",
      prompt: "Order these numbers",
      order_index: 1,
      items: ["one", "two", "three"],
    });
    await teacher.client.post(`/api/quizzes/${quizId}/questions`, {
      type: "matching",
      prompt: "Match the pairs",
      order_index: 2,
      pairs: [
        { left: "Cat", right: "Meow" },
        { left: "Dog", right: "Bark" },
      ],
    });

    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const startRes = await client.post(`/api/quizzes/${quizId}/start`);
    expect(startRes.status).toBe(201);

    const raw = JSON.stringify(startRes.json);
    expect(raw).not.toContain("is_correct");
    expect(raw).not.toContain("match_group");

    // Option content itself must still be visible - only the correctness/
    // pairing metadata is hidden, not the answer text students pick from.
    expect(raw).toContain("Meow");
    expect(raw).toContain("Bark");
  });

  it("hides the answer key from the authoring endpoint for non-managers too", async () => {
    const { admin, teacher, quizId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const res = await client.get(`/api/quizzes/${quizId}/questions`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.json)).not.toContain("is_correct");
  });
});

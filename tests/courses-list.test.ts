import { describe, it, expect, afterAll } from "vitest";
import { createUserRegistry } from "./cleanup";
import { createPublishedLesson } from "./phase2-fixtures";
import { createTestClient } from "./http-client";

describe("GET /api/courses listing filters", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("caps results with a limit param", async () => {
    const anon = createTestClient();
    const res = await anon.get<Array<{ id: string }>>("/api/courses");
    expect(res.status).toBe(200);

    const limited = await anon.get<Array<{ id: string }>>("/api/courses?limit=1");
    expect(limited.status).toBe(200);
    expect(limited.json?.data?.length).toBe(1);
  });

  it("filters by grade_id, matching only courses whose subject belongs to that grade", async () => {
    const { admin, teacher, courseId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const anon = createTestClient();
    const { json: gradesJson } = await anon.get<Array<{ id: string; slug: string }>>("/api/grades");
    const grade1Id = gradesJson!.data!.find((g) => g.slug === "grade1")!.id;
    const grade2Id = gradesJson!.data!.find((g) => g.slug === "grade2")!.id;

    const matching = await anon.get<Array<{ id: string }>>(`/api/courses?grade_id=${grade1Id}`);
    expect(matching.status).toBe(200);
    expect(matching.json?.data?.some((c) => c.id === courseId)).toBe(true);

    const nonMatching = await anon.get<Array<{ id: string }>>(`/api/courses?grade_id=${grade2Id}`);
    expect(nonMatching.status).toBe(200);
    expect(nonMatching.json?.data?.some((c) => c.id === courseId)).toBe(false);
  });
});

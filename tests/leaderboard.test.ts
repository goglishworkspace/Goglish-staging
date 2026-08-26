import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent } from "./phase2-fixtures";
import { createPublishedQuiz } from "./phase3-fixtures";
import { createTestClient } from "./http-client";

describe("GET /api/leaderboard", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("ranks students by XP, globally and per-subject, after a cache refresh", async () => {
    const { admin, teacher, quizId, subjectId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { userId: userA } = await createLoggedInStudent();
    registry.track(userA);
    const { userId: userB } = await createLoggedInStudent();
    registry.track(userB);

    const supabase = createAdminClient();
    // Seed XP directly (leaderboard refresh + read logic is what's under
    // test here - the actual award path is covered by xp-coins.test.ts).
    await supabase.from("profiles").update({ xp_total: 100 }).eq("id", userA);
    await supabase.from("profiles").update({ xp_total: 50 }).eq("id", userB);
    await supabase.from("xp_transactions").insert([
      { user_id: userA, amount: 100, reason: "quiz_passed", source_type: "quiz", source_id: quizId, subject_id: subjectId },
      { user_id: userB, amount: 50, reason: "quiz_passed", source_type: "quiz", source_id: quizId, subject_id: subjectId },
    ]);

    const { error: refreshError } = await supabase.rpc("refresh_leaderboard_cache");
    expect(refreshError).toBeNull();

    const anon = createTestClient();
    const globalRes = await anon.get<Array<{ user_id: string; rank: number; xp: number }>>(
      "/api/leaderboard?scope=global",
    );
    expect(globalRes.status).toBe(200);
    const globalRows = globalRes.json!.data!;
    const globalA = globalRows.find((r) => r.user_id === userA)!;
    const globalB = globalRows.find((r) => r.user_id === userB)!;
    expect(globalA.rank).toBeLessThan(globalB.rank);
    expect(globalA.xp).toBe(100);

    const subjectRes = await anon.get<Array<{ user_id: string; rank: number; xp: number }>>(
      `/api/leaderboard?scope=subject&subject_id=${subjectId}`,
    );
    expect(subjectRes.status).toBe(200);
    const subjectRows = subjectRes.json!.data!;
    const subjectA = subjectRows.find((r) => r.user_id === userA)!;
    const subjectB = subjectRows.find((r) => r.user_id === userB)!;
    expect(subjectA.rank).toBeLessThan(subjectB.rank);
    expect(subjectA.xp).toBe(100);
    expect(subjectB.xp).toBe(50);
  });

  it("rejects an invalid scope and a missing subject_id", async () => {
    const anon = createTestClient();
    const badScope = await anon.get("/api/leaderboard?scope=nonsense");
    expect(badScope.status).toBe(400);

    const missingSubject = await anon.get("/api/leaderboard?scope=subject");
    expect(missingSubject.status).toBe(400);
  });
});

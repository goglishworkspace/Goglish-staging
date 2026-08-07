import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, grantCourseAccess } from "./phase2-fixtures";
import { createPublishedQuiz } from "./phase3-fixtures";
import { passQuiz } from "./gamification-fixtures";

describe("GET /api/gamification/achievements", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("merges badge earns and level-ups into one chronologically sorted feed", async () => {
    const { admin, teacher, courseId, quizId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    // Earns the first_quiz badge (10 XP + 5 daily-streak XP = 15 total,
    // still under level 2's 100 XP threshold).
    const submitRes = await passQuiz(client, quizId);
    expect(submitRes.json?.data?.passed).toBe(true);

    // Push cumulative XP over the level-2 threshold (100) with a later
    // transaction, so a level_up event shows up after the badge event.
    const supabase = createAdminClient();
    await supabase
      .from("xp_transactions")
      .insert({ user_id: userId, amount: 200, reason: "test_boost", source_type: "streak" });
    await supabase.from("profiles").update({ xp_total: 215 }).eq("id", userId);

    const { status, json } = await client.get<
      Array<{ type: string; at: string; code?: string; level_number?: number }>
    >("/api/gamification/achievements");
    expect(status).toBe(200);
    const feed = json!.data!;

    const badgeEvent = feed.find((e) => e.type === "badge" && e.code === "first_quiz");
    expect(badgeEvent).toBeTruthy();

    const levelUpEvent = feed.find((e) => e.type === "level_up" && e.level_number === 2);
    expect(levelUpEvent).toBeTruthy();

    // Sorted newest-first: the level-up transaction was inserted after the
    // quiz pass, so it must appear earlier in the feed.
    const badgeIndex = feed.indexOf(badgeEvent!);
    const levelUpIndex = feed.indexOf(levelUpEvent!);
    expect(levelUpIndex).toBeLessThan(badgeIndex);
  });
});

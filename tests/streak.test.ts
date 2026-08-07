import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, createPublishedLesson } from "./phase2-fixtures";

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function pingProgress(client: ReturnType<typeof import("./http-client").createTestClient>, lessonId: string) {
  return client.post(`/api/lessons/${lessonId}/progress`, { progress_seconds: 30 });
}

describe("Daily Streak", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("increments on consecutive days, resets after a gap, and is a same-day no-op", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const supabase = createAdminClient();

    // Day 1.
    await pingProgress(client, lessonId);
    let { data: profile } = await supabase
      .from("profiles")
      .select("current_streak_days, longest_streak_days, xp_total, coins_total")
      .eq("id", userId)
      .single();
    expect(profile?.current_streak_days).toBe(1);
    expect(profile?.longest_streak_days).toBe(1);
    expect(profile?.xp_total).toBe(5);
    expect(profile?.coins_total).toBe(2);

    // Same day again - no-op (idempotent).
    await pingProgress(client, lessonId);
    ({ data: profile } = await supabase
      .from("profiles")
      .select("current_streak_days, xp_total")
      .eq("id", userId)
      .single());
    expect(profile?.current_streak_days).toBe(1);
    expect(profile?.xp_total).toBe(5);

    // Simulate "yesterday" so the next ping counts as day 2.
    await supabase.from("profiles").update({ last_activity_date: daysAgoIso(1) }).eq("id", userId);
    await pingProgress(client, lessonId);
    ({ data: profile } = await supabase
      .from("profiles")
      .select("current_streak_days, longest_streak_days, xp_total, coins_total")
      .eq("id", userId)
      .single());
    expect(profile?.current_streak_days).toBe(2);
    expect(profile?.longest_streak_days).toBe(2);
    expect(profile?.xp_total).toBe(10);
    expect(profile?.coins_total).toBe(4);

    // Simulate a gap (3 days ago) - streak resets to 1, longest stays at 2.
    await supabase.from("profiles").update({ last_activity_date: daysAgoIso(3) }).eq("id", userId);
    await pingProgress(client, lessonId);
    ({ data: profile } = await supabase
      .from("profiles")
      .select("current_streak_days, longest_streak_days")
      .eq("id", userId)
      .single());
    expect(profile?.current_streak_days).toBe(1);
    expect(profile?.longest_streak_days).toBe(2);
  });
});

import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInAdmin, createPublishedLesson } from "./phase2-fixtures";
import { createTestClient } from "./http-client";

describe("Academic Calendar", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("validates target_id/target_table/auto_publish combinations", async () => {
    const { client, userId } = await createLoggedInAdmin();
    registry.track(userId);

    const missingTargetId = await client.post("/api/admin/calendar", {
      title: "حدث",
      event_type: "lesson_release",
      scheduled_at: new Date().toISOString(),
      target_table: "lessons",
    });
    expect(missingTargetId.status).toBe(422);

    const autoPublishWithoutTarget = await client.post("/api/admin/calendar", {
      title: "حدث",
      event_type: "lesson_release",
      scheduled_at: new Date().toISOString(),
      auto_publish: true,
    });
    expect(autoPublishWithoutTarget.status).toBe(422);
  });

  it("auto-publishes a due lesson when the cron function runs, and records published_at", async () => {
    const { admin, teacher, moduleId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    // A second, still-draft lesson in the same module.
    const { json: draftLessonJson } = await teacher.client.post<{ id: string }>(`/api/modules/${moduleId}/lessons`, {
      title: "درس مجدول",
      order_index: 1,
    });
    const draftLessonId = draftLessonJson!.data!.id;

    const { status, json } = await admin.client.post<{ id: string }>("/api/admin/calendar", {
      title: "نشر الدرس",
      event_type: "lesson_release",
      scheduled_at: new Date(Date.now() - 60_000).toISOString(), // already due
      target_table: "lessons",
      target_id: draftLessonId,
      auto_publish: true,
    });
    expect(status).toBe(201);
    const eventId = json!.data!.id;

    const supabase = createAdminClient();
    const { error } = await supabase.rpc("publish_due_calendar_events");
    expect(error).toBeNull();

    const { data: lesson } = await supabase.from("lessons").select("status").eq("id", draftLessonId).single();
    expect(lesson?.status).toBe("published");

    const { data: event } = await supabase
      .from("academic_calendar_events")
      .select("published_at")
      .eq("id", eventId)
      .single();
    expect(event?.published_at).toBeTruthy();
  });

  it("lists events publicly and lets admin update/delete them", async () => {
    const { admin, teacher } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { json } = await admin.client.post<{ id: string }>("/api/admin/calendar", {
      title: "إعلان عادي",
      event_type: "announcement",
      scheduled_at: new Date(Date.now() + 3600_000).toISOString(),
    });
    const eventId = json!.data!.id;

    const anon = createTestClient();
    const listRes = await anon.get<Array<{ id: string }>>("/api/admin/calendar");
    expect(listRes.status).toBe(200);
    expect(listRes.json?.data?.some((e) => e.id === eventId)).toBe(true);

    const patchRes = await admin.client.patch(`/api/admin/calendar/${eventId}`, { title: "إعلان معدّل" });
    expect(patchRes.status).toBe(200);

    const deleteRes = await admin.client.delete(`/api/admin/calendar/${eventId}`);
    expect(deleteRes.status).toBe(200);
  });
});

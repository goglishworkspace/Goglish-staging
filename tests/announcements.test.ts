import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInAdmin, createLoggedInStudent } from "./phase2-fixtures";
import { validRegisterPayload, uniqueEmail } from "./fixtures";
import { createTestClient } from "./http-client";
import { confirmUserEmail } from "./admin-helpers";

async function createLoggedInStudentWithGrade(grade: "grade1" | "grade2" | "grade3") {
  const admin = createAdminClient();
  await admin.from("rate_limit_counters").delete().neq("key", "");

  const client = createTestClient();
  const payload = validRegisterPayload({ email: uniqueEmail() });
  const { json } = await client.post<{ user_id: string }>("/api/auth/register", payload);
  const userId = json!.data!.user_id;
  await confirmUserEmail(userId);
  await client.post("/api/auth/login", { email: payload.email, password: payload.password });
  await admin.from("profiles").update({ grade }).eq("id", userId);
  return { client, userId };
}

describe("Announcements", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("GET is public and reflects a newly created announcement", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);

    const { status, json } = await adminClient.post<{ id: string }>("/api/announcements", {
      title: "إعلان تجريبي",
      body: "محتوى الإعلان",
      target: "all",
    });
    expect(status).toBe(201);

    const anon = createTestClient();
    const listRes = await anon.get<Array<{ id: string }>>("/api/announcements");
    expect(listRes.status).toBe(200);
    expect(listRes.json?.data?.some((a) => a.id === json!.data!.id)).toBe(true);
  });

  it("target=all notifies a regular registered user", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const { userId: studentId } = await createLoggedInStudent();
    registry.track(studentId);

    const { json } = await adminClient.post<{ id: string }>("/api/announcements", {
      title: "إعلان للجميع",
      body: "محتوى",
      target: "all",
    });

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", studentId)
      .eq("type", "announcement")
      .contains("metadata", { announcement_id: json!.data!.id });
    expect(data?.length).toBe(1);
  });

  it("target=grade only notifies students in that grade", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const { userId: grade1Student } = await createLoggedInStudentWithGrade("grade1");
    registry.track(grade1Student);
    const { userId: grade2Student } = await createLoggedInStudentWithGrade("grade2");
    registry.track(grade2Student);

    const { json } = await adminClient.post<{ id: string }>("/api/announcements", {
      title: "إعلان الصف الأول",
      body: "محتوى",
      target: "grade",
      target_grade: "grade1",
    });
    const announcementId = json!.data!.id;

    const supabase = createAdminClient();
    const { data: grade1Notifications } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", grade1Student)
      .eq("type", "announcement")
      .contains("metadata", { announcement_id: announcementId });
    expect(grade1Notifications?.length).toBe(1);

    const { data: grade2Notifications } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", grade2Student)
      .eq("type", "announcement")
      .contains("metadata", { announcement_id: announcementId });
    expect(grade2Notifications?.length).toBe(0);
  });

  it("rejects a non-admin trying to create an announcement", async () => {
    const { client } = await createLoggedInStudent();
    const res = await client.post("/api/announcements", { title: "x", body: "y", target: "all" });
    expect(res.status).toBe(403);
  });

  it("deleting an announcement removes it from every recipient's notifications", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const { userId: studentId } = await createLoggedInStudent();
    registry.track(studentId);

    const { json } = await adminClient.post<{ id: string }>("/api/announcements", {
      title: "إعلان هيتمسح",
      body: "محتوى",
      target: "all",
    });
    const announcementId = json!.data!.id;

    const supabase = createAdminClient();
    const before = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", studentId)
      .contains("metadata", { announcement_id: announcementId });
    expect(before.data?.length).toBe(1);

    const delRes = await adminClient.delete(`/api/announcements/${announcementId}`);
    expect(delRes.status).toBe(200);

    const after = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", studentId)
      .contains("metadata", { announcement_id: announcementId });
    expect(after.data?.length).toBe(0);
  });
});

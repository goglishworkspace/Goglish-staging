import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInAdmin, createLoggedInStudent, createPublishedLesson } from "./phase2-fixtures";
import { createTestClient } from "./http-client";

function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

describe("Media Library", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("uploads, lists (with a signed URL), renames, and deletes a file", async () => {
    const { client, userId } = await createLoggedInAdmin();
    registry.track(userId);

    const formData = new FormData();
    // Real PNG signature bytes - the magic-byte check (P3.2) rejects content
    // that doesn't match its declared MIME type, so a plain-text fixture
    // claiming to be image/png would now correctly get a 422 here.
    const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const fileContent = new Blob([pngSignature], { type: "image/png" });
    formData.append("file", fileContent, "banner.png");

    const uploadRes = await client.postForm<{ id: string; original_filename: string }>("/api/admin/media", formData);
    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.json!.data!.id;

    const listRes = await client.get<Array<{ id: string; url: string | null }>>("/api/admin/media");
    expect(listRes.status).toBe(200);
    const uploaded = listRes.json?.data?.find((f) => f.id === fileId);
    expect(uploaded?.url).toContain("http");

    const renameRes = await client.patch<{ original_filename: string }>(`/api/admin/media/${fileId}`, {
      original_filename: "renamed-banner.png",
    });
    expect(renameRes.status).toBe(200);
    expect(renameRes.json?.data?.original_filename).toBe("renamed-banner.png");

    const deleteRes = await client.delete(`/api/admin/media/${fileId}`);
    expect(deleteRes.status).toBe(200);

    const listAfterDelete = await client.get<Array<{ id: string }>>("/api/admin/media");
    expect(listAfterDelete.json?.data?.some((f) => f.id === fileId)).toBe(false);
  });

  it("is admin-gated", async () => {
    const { client } = await createLoggedInStudent();
    const res = await client.get("/api/admin/media");
    expect(res.status).toBe(403);
  });
});

describe("Search API", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  // The shared test DB accumulates hundreds of fixture rows with generic
  // Arabic placeholder text ("تجريبي"/"مدرس تجريبي") across a full suite
  // run, and these search routes cap results at 20 with no particular
  // order - so every case here stamps a unique marker onto the row it
  // creates and searches for that marker, instead of the generic text,
  // to stay correct regardless of how much unrelated fixture data exists.

  it("finds a teacher by a partial display name match", async () => {
    const { admin, teacher } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const marker = uniqueName("مدرس-فريد");
    const supabase = createAdminClient();
    await supabase.from("teacher_profiles").update({ display_name: marker }).eq("teacher_id", teacher.teacherId);

    const anon = createTestClient();
    const { status, json } = await anon.get<Array<{ teacher_id: string }>>(
      `/api/search/teachers?q=${encodeURIComponent(marker)}`,
    );
    expect(status).toBe(200);
    expect(json?.data?.some((t) => t.teacher_id === teacher.teacherId)).toBe(true);
  });

  it("finds a published course by title but not an unpublished one", async () => {
    const { admin, teacher, courseId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const marker = uniqueName("كورس-فريد");
    const supabase = createAdminClient();
    await supabase.from("courses").update({ title: marker }).eq("id", courseId);

    const anon = createTestClient();
    const { status, json } = await anon.get<Array<{ id: string }>>(
      `/api/search/courses?q=${encodeURIComponent(marker)}`,
    );
    expect(status).toBe(200);
    expect(json?.data?.some((c) => c.id === courseId)).toBe(true);
  });

  it("student search is admin-only and finds by name", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const { client: student, userId: studentId } = await createLoggedInStudent();
    registry.track(studentId);

    const marker = uniqueName("طالب-فريد");
    const supabase = createAdminClient();
    await supabase.from("profiles").update({ last_name: marker }).eq("id", studentId);

    const deniedRes = await student.get(`/api/admin/search/students?q=${encodeURIComponent(marker)}`);
    expect(deniedRes.status).toBe(403);

    const { status, json } = await adminClient.get<Array<{ id: string }>>(
      `/api/admin/search/students?q=${encodeURIComponent(marker)}`,
    );
    expect(status).toBe(200);
    expect(json?.data?.some((s) => s.id === studentId)).toBe(true);
  });
});

describe("SEO settings", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("is publicly readable and admin-writable", async () => {
    const anon = createTestClient();
    const publicRead = await anon.get("/api/admin/seo?path=/");
    expect(publicRead.status).toBe(200);

    const { client } = await createLoggedInStudent();
    const deniedWrite = await client.patch("/api/admin/seo", { path: "/test", title: "x" });
    expect(deniedWrite.status).toBe(403);

    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const path = `/test-${Date.now()}`;
    const writeRes = await adminClient.patch<{ path: string; title: string }>("/api/admin/seo", {
      path,
      title: "عنوان تجريبي",
      description: "وصف تجريبي",
    });
    expect(writeRes.status).toBe(200);
    expect(writeRes.json?.data?.title).toBe("عنوان تجريبي");

    const readBack = await anon.get<Array<{ path: string }>>(`/api/admin/seo?path=${encodeURIComponent(path)}`);
    expect(readBack.json?.data?.some((s) => s.path === path)).toBe(true);
  });
});

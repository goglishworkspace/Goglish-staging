import { createAdminClient } from "@/lib/supabase/admin";
import { createTestClient, type TestClient } from "./http-client";
import { validRegisterPayload, uniqueEmail } from "./fixtures";
import { confirmUserEmail } from "./admin-helpers";

async function createLoggedInUser() {
  // Phase 2 fixtures often need more users in one test than the register
  // rate limit (3/hour/IP) allows - the global per-test reset in
  // tests/setup.ts only runs once per `it`, not once per register call.
  const admin = createAdminClient();
  await admin.from("rate_limit_counters").delete().neq("key", "");

  const client = createTestClient();
  const payload = validRegisterPayload({ email: uniqueEmail() });
  const { json } = await client.post<{ user_id: string }>("/api/auth/register", payload);
  const userId = json!.data!.user_id;
  await confirmUserEmail(userId);
  await client.post("/api/auth/login", { email: payload.email, password: payload.password });
  return { client, userId };
}

export async function createLoggedInStudent() {
  return createLoggedInUser();
}

export async function createLoggedInTeacher() {
  const { client, userId } = await createLoggedInUser();
  const admin = createAdminClient();

  const { data: teacher } = await admin
    .from("teachers")
    .insert({ user_id: userId })
    .select()
    .single();
  await admin
    .from("teacher_profiles")
    .update({ display_name: "مدرس تجريبي" })
    .eq("teacher_id", teacher!.id);

  const { data: role } = await admin.from("roles").select("id").eq("name", "teacher").single();
  await admin.from("role_user").insert({ user_id: userId, role_id: role!.id });

  return { client, userId, teacherId: teacher!.id as string };
}

export async function createLoggedInAdmin() {
  const { client, userId } = await createLoggedInUser();
  const admin = createAdminClient();
  const { data: role } = await admin.from("roles").select("id").eq("name", "admin").single();
  await admin.from("role_user").insert({ user_id: userId, role_id: role!.id });
  return { client, userId };
}

/** Grants a permanent course entitlement directly (bypassing the real
 * purchase flow) - for tests that need a student who owns a course to
 * exercise protected content (quizzes/exams/lesson video) without the
 * payment flow being the thing under test. */
export async function grantCourseAccess(userId: string, courseId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("course_entitlements")
    .insert({ user_id: userId, course_id: courseId, source: "purchase" });
  if (error) throw error;
}

function uniqueSlug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/**
 * Builds subject -> course -> module -> lesson, running the full Draft ->
 * submit -> review (published) workflow through the real API each time -
 * this is deliberately not a direct-DB shortcut, since exercising that
 * workflow honestly is the point of these tests.
 */
export async function createPublishedLesson(
  lessonFields: Record<string, unknown> = {},
) {
  const admin = createLoggedInAdmin();
  const teacher = createLoggedInTeacher();
  const [adminUser, teacherUser] = await Promise.all([admin, teacher]);

  const { json: gradesJson } = await adminUser.client.get<Array<{ id: string; slug: string }>>(
    "/api/grades",
  );
  const gradeId = gradesJson!.data!.find((g) => g.slug === "grade1")!.id;

  const { json: subjectJson } = await adminUser.client.post<{ id: string }>("/api/subjects", {
    grade_id: gradeId,
    name: "مادة تجريبية",
    slug: uniqueSlug("subject"),
  });
  const subjectId = subjectJson!.data!.id;

  const { json: courseJson } = await teacherUser.client.post<{ id: string }>("/api/courses", {
    subject_id: subjectId,
    title: "كورس تجريبي",
    slug: uniqueSlug("course"),
  });
  const courseId = courseJson!.data!.id;

  await teacherUser.client.post(`/api/courses/${courseId}/submit`);
  await adminUser.client.post(`/api/courses/${courseId}/review`, { decision: "published" });

  const { json: moduleJson } = await teacherUser.client.post<{ id: string }>(
    `/api/courses/${courseId}/modules`,
    { title: "وحدة تجريبية", order_index: 0 },
  );
  const moduleId = moduleJson!.data!.id;

  const { json: lessonJson } = await teacherUser.client.post<{ id: string }>(
    `/api/modules/${moduleId}/lessons`,
    { title: "درس تجريبي", order_index: 0, ...lessonFields },
  );
  const lessonId = lessonJson!.data!.id;

  await teacherUser.client.post(`/api/lessons/${lessonId}/submit`);
  await adminUser.client.post(`/api/lessons/${lessonId}/review`, { decision: "published" });

  return {
    admin: adminUser as { client: TestClient; userId: string },
    teacher: teacherUser as { client: TestClient; userId: string; teacherId: string },
    subjectId,
    courseId,
    moduleId,
    lessonId,
  };
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchNotificationToMany } from "./notification-dispatch.service";

/** Notifies every student with access to a course when one of its lessons
 * is published - a draft/rejected lesson isn't visible to anyone yet, so
 * this fires from the review workflow's "published" transition, not from
 * lesson creation. Covers students enrolled directly or via a bundle
 * (course_entitlements records both the same way). */
export async function notifyNewLessonPublished(lessonId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: lesson } = await admin
    .from("lessons")
    .select("id, title, modules(course_id, courses(id, title))")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return;

  const moduleRow = Array.isArray(lesson.modules) ? lesson.modules[0] : lesson.modules;
  const course = moduleRow ? (Array.isArray(moduleRow.courses) ? moduleRow.courses[0] : moduleRow.courses) : null;
  if (!course) return;

  const { data: entitlements } = await admin
    .from("course_entitlements")
    .select("user_id")
    .eq("course_id", course.id)
    .is("revoked_at", null);

  await dispatchNotificationToMany((entitlements ?? []).map((entitlement) => entitlement.user_id), {
    type: "new_lesson",
    title: `درس جديد في ${course.title}`,
    body: lesson.title,
    metadata: { course_id: course.id, lesson_id: lesson.id },
  });
}

/** Notifies every student with access to a course when a new exam is
 * published in it - same fan-out as notifyNewLessonPublished, but exams
 * reference course_id directly (no module indirection). */
export async function notifyNewExamPublished(examId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: exam } = await admin
    .from("exams")
    .select("id, title, course_id, courses(title)")
    .eq("id", examId)
    .maybeSingle();
  if (!exam) return;

  const course = Array.isArray(exam.courses) ? exam.courses[0] : exam.courses;
  if (!course) return;

  const { data: entitlements } = await admin
    .from("course_entitlements")
    .select("user_id")
    .eq("course_id", exam.course_id)
    .is("revoked_at", null);

  await dispatchNotificationToMany((entitlements ?? []).map((entitlement) => entitlement.user_id), {
    type: "new_exam",
    title: `امتحان جديد في ${course.title}`,
    body: exam.title,
    metadata: { course_id: exam.course_id, exam_id: exam.id },
  });
}

/** Notifies every student who bought a bundle when new courses are added to
 * it - they already have access to the added courses (grantBundleAccess
 * covers new orders going forward, but existing buyers only get access to
 * what was in the bundle at purchase time, so this is also the only signal
 * they get that more content showed up). */
export async function notifyBundleCoursesAdded(bundleId: string, newCourseIds: string[]): Promise<void> {
  if (!newCourseIds.length) return;
  const admin = createAdminClient();

  const { data: bundle } = await admin.from("course_bundles").select("title").eq("id", bundleId).maybeSingle();
  if (!bundle) return;

  const { data: newCourses } = await admin.from("courses").select("title").in("id", newCourseIds);
  const courseNames = (newCourses ?? []).map((c) => c.title).join("، ");

  const { data: orders } = await admin
    .from("orders")
    .select("user_id")
    .eq("item_type", "bundle")
    .eq("item_id", bundleId)
    .eq("status", "completed");
  const buyerIds = [...new Set((orders ?? []).map((order) => order.user_id))];

  await dispatchNotificationToMany(buyerIds, {
    type: "new_course_in_bundle",
    title: `كورس جديد في باقة ${bundle.title}`,
    body: courseNames,
    metadata: { bundle_id: bundleId, course_ids: newCourseIds },
  });
}

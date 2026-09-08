import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function canUserManageCourse(userId: string, courseId: string): Promise<boolean> {
  const admin = createAdminClient();

  // 1. Check if user has staff role
  const { data: roleRows } = await admin
    .from("role_user")
    .select("roles(name)")
    .eq("user_id", userId);
  const roles = (roleRows ?? [])
    .map((r) => (r.roles as unknown as { name: string } | null)?.name)
    .filter(Boolean);
  if (roles.some((r) => ["admin", "super_admin", "moderator", "content_manager"].includes(r!))) {
    return true;
  }

  // 2. Check if user created the course
  const { data: course } = await admin
    .from("courses")
    .select("created_by")
    .eq("id", courseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (course && course.created_by === userId) {
    return true;
  }

  // 3. Check if user is on the course teaching team
  const { data: teacher } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (teacher) {
    const { data: ct } = await admin
      .from("course_teachers")
      .select("course_id")
      .eq("course_id", courseId)
      .eq("teacher_id", teacher.id)
      .maybeSingle();
    if (ct) return true;
  }

  return false;
}

export async function canUserManageLesson(userId: string, lessonId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: lesson } = await admin
    .from("lessons")
    .select("id, created_by, module_id, modules(course_id)")
    .eq("id", lessonId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!lesson) return false;
  if (lesson.created_by === userId) return true;

  const courseId = (lesson.modules as unknown as { course_id: string } | null)?.course_id;
  if (!courseId) return false;

  return canUserManageCourse(userId, courseId);
}

export async function canUserManageModule(userId: string, moduleId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: mod } = await admin
    .from("modules")
    .select("course_id")
    .eq("id", moduleId)
    .maybeSingle();

  if (!mod?.course_id) return false;
  return canUserManageCourse(userId, mod.course_id);
}

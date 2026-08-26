import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasAnyRole } from "@/lib/auth/require-role";

const REVIEW_ROLES = ["admin", "super_admin", "moderator", "content_manager"];

type DeletionRequestItem = {
  entity_type: "module" | "lesson" | "quiz" | "exam" | "question" | "lesson_resource";
  entity_id: string;
  label: string;
  context: string;
  requested_at: string;
  requested_by_name: string;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, REVIEW_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const admin = createAdminClient();

  const [modulesRes, lessonsRes, quizzesRes, examsRes, questionsRes, resourcesRes] = await Promise.all([
    admin
      .from("modules")
      .select("id, title, deletion_requested_at, deletion_requested_by, courses(title)")
      .not("deletion_requested_at", "is", null),
    admin
      .from("lessons")
      .select("id, title, deletion_requested_at, deletion_requested_by, modules(title, courses(title))")
      .not("deletion_requested_at", "is", null)
      .is("deleted_at", null),
    admin
      .from("quizzes")
      .select("id, title, deletion_requested_at, deletion_requested_by, lessons(title)")
      .not("deletion_requested_at", "is", null),
    admin
      .from("exams")
      .select("id, title, deletion_requested_at, deletion_requested_by, courses(title)")
      .not("deletion_requested_at", "is", null),
    admin
      .from("questions")
      .select("id, prompt, deletion_requested_at, deletion_requested_by, quizzes(title), exams(title)")
      .not("deletion_requested_at", "is", null),
    admin
      .from("lesson_resources")
      .select("id, title, deletion_requested_at, deletion_requested_by, lessons(title)")
      .not("deletion_requested_at", "is", null),
  ]);

  for (const res of [modulesRes, lessonsRes, quizzesRes, examsRes, questionsRes, resourcesRes]) {
    if (res.error) return apiError("تعذر جلب طلبات الحذف", null, 500);
  }

  const requesterIds = new Set<string>();
  for (const res of [modulesRes, lessonsRes, quizzesRes, examsRes, questionsRes, resourcesRes]) {
    for (const row of res.data ?? []) {
      if (row.deletion_requested_by) requesterIds.add(row.deletion_requested_by);
    }
  }
  const { data: requesters } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", Array.from(requesterIds));
  const nameById = new Map((requesters ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));

  const items: DeletionRequestItem[] = [];

  for (const row of modulesRes.data ?? []) {
    const course = row.courses as unknown as { title: string } | null;
    items.push({
      entity_type: "module",
      entity_id: row.id,
      label: row.title,
      context: course?.title ?? "",
      requested_at: row.deletion_requested_at!,
      requested_by_name: nameById.get(row.deletion_requested_by!) ?? "-",
    });
  }
  for (const row of lessonsRes.data ?? []) {
    const mod = row.modules as unknown as { title: string; courses: { title: string } | null } | null;
    items.push({
      entity_type: "lesson",
      entity_id: row.id,
      label: row.title,
      context: mod ? `${mod.courses?.title ?? ""} / ${mod.title}` : "",
      requested_at: row.deletion_requested_at!,
      requested_by_name: nameById.get(row.deletion_requested_by!) ?? "-",
    });
  }
  for (const row of quizzesRes.data ?? []) {
    const lesson = row.lessons as unknown as { title: string } | null;
    items.push({
      entity_type: "quiz",
      entity_id: row.id,
      label: row.title,
      context: lesson?.title ?? "",
      requested_at: row.deletion_requested_at!,
      requested_by_name: nameById.get(row.deletion_requested_by!) ?? "-",
    });
  }
  for (const row of examsRes.data ?? []) {
    const course = row.courses as unknown as { title: string } | null;
    items.push({
      entity_type: "exam",
      entity_id: row.id,
      label: row.title,
      context: course?.title ?? "",
      requested_at: row.deletion_requested_at!,
      requested_by_name: nameById.get(row.deletion_requested_by!) ?? "-",
    });
  }
  for (const row of questionsRes.data ?? []) {
    const quiz = row.quizzes as unknown as { title: string } | null;
    const exam = row.exams as unknown as { title: string } | null;
    items.push({
      entity_type: "question",
      entity_id: row.id,
      label: row.prompt,
      context: quiz?.title ?? exam?.title ?? "",
      requested_at: row.deletion_requested_at!,
      requested_by_name: nameById.get(row.deletion_requested_by!) ?? "-",
    });
  }
  for (const row of resourcesRes.data ?? []) {
    const lesson = row.lessons as unknown as { title: string } | null;
    items.push({
      entity_type: "lesson_resource",
      entity_id: row.id,
      label: row.title,
      context: lesson?.title ?? "",
      requested_at: row.deletion_requested_at!,
      requested_by_name: nameById.get(row.deletion_requested_by!) ?? "-",
    });
  }

  items.sort((a, b) => a.requested_at.localeCompare(b.requested_at));

  return apiSuccess(items, "تم جلب طلبات الحذف");
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, REVIEW_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => null);
  const entityType = body?.entity_type;
  const entityId = body?.entity_id;
  const decision = body?.decision;
  if (
    typeof entityId !== "string" ||
    (decision !== "approved" && decision !== "rejected") ||
    !["module", "lesson", "quiz", "exam", "question", "lesson_resource"].includes(entityType)
  ) {
    return apiError("بيانات غير صالحة", null, 422);
  }

  const admin = createAdminClient();

  if (decision === "rejected") {
    const table = entityType === "lesson_resource" ? "lesson_resources" : `${entityType}s`;
    const { error } = await admin
      .from(table)
      .update({ deletion_requested_at: null, deletion_requested_by: null })
      .eq("id", entityId);
    if (error) return apiError("تعذر رفض الطلب", null, 500);
    return apiSuccess(null, "تم رفض طلب الحذف");
  }

  // decision === "approved" - actually delete the underlying content.
  switch (entityType) {
    case "module": {
      const { error } = await admin.from("modules").delete().eq("id", entityId);
      if (error) return apiError("تعذر حذف الوحدة", null, 500);
      break;
    }
    case "lesson": {
      // Soft delete, matching the existing DELETE /api/lessons/[id] convention.
      const { error } = await admin.from("lessons").update({ deleted_at: new Date().toISOString() }).eq("id", entityId);
      if (error) return apiError("تعذر حذف الدرس", null, 500);
      break;
    }
    case "quiz": {
      const { error } = await admin.from("quizzes").delete().eq("id", entityId);
      if (error) return apiError("تعذر حذف التدريب", null, 500);
      break;
    }
    case "exam": {
      const { error } = await admin.from("exams").delete().eq("id", entityId);
      if (error) return apiError("تعذر حذف الامتحان", null, 500);
      break;
    }
    case "question": {
      const { error } = await admin.from("questions").delete().eq("id", entityId);
      if (error) return apiError("تعذر حذف السؤال", null, 500);
      break;
    }
    case "lesson_resource": {
      const { data: resource } = await admin
        .from("lesson_resources")
        .select("storage_path")
        .eq("id", entityId)
        .maybeSingle();
      const { error } = await admin.from("lesson_resources").delete().eq("id", entityId);
      if (error) return apiError("تعذر حذف الملف", null, 500);
      if (resource?.storage_path) {
        await admin.storage.from("lesson-resources").remove([resource.storage_path]);
      }
      break;
    }
  }

  return apiSuccess(null, "تم تنفيذ الحذف");
}

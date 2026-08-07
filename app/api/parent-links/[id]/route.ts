import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "support"];
const respondSchema = z.object({ status: z.enum(["approved", "rejected"]) });

/** The student on a pending link responds to the parent's request (Section:
 * privacy - only the student's own approval activates a parent's access).
 * Staff can also resolve a stuck request, same as their existing DELETE
 * override below. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data: link } = await supabase
    .from("parent_student_links")
    .select("id, student_user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!link) return apiError("الطلب غير موجود", null, 404);

  const isOwnStudent = link.student_user_id === user.id;
  if (!isOwnStudent && !(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }
  if (link.status !== "pending") return apiError("الطلب ده اتحسم بالفعل", null, 409);

  // RLS only lets staff write this table directly (parent_student_links_
  // manage_admin) - the isOwnStudent/staff check above is the real gate for
  // a student resolving their own request, so the write itself needs the
  // admin client (same pattern as the parent-overview route).
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("parent_student_links")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError("تعذر تحديث حالة الطلب", null, 400);

  return apiSuccess(data, parsed.data.status === "approved" ? "تم قبول الطلب" : "تم رفض الطلب");
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const { error, count } = await supabase.from("parent_student_links").delete({ count: "exact" }).eq("id", id);
  if (error) return apiError("تعذر حذف الربط", null, 400);
  if (!count) return apiError("الربط غير موجود", null, 404);
  return apiSuccess(null, "تم حذف الربط");
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createParentLinkSchema } from "@/lib/validation/parent-link.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "support"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createParentLinkSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  // Staff manually creating this link is itself the trust check (unlike the
  // self-service national-ID flow, which needs the student's own approval) -
  // goes live immediately.
  const { data, error } = await supabase
    .from("parent_student_links")
    .insert({
      parent_user_id: parsed.data.parent_user_id,
      student_user_id: parsed.data.student_user_id,
      status: "approved",
    })
    .select()
    .single();
  if (error) return apiError("تعذر إنشاء الربط (ممكن يكون موجود بالفعل)", null, 400);

  // Mirrors POST /api/teachers: role assignment needs the admin client since
  // not every MANAGE_ROLES member (e.g. support) can write role_user
  // directly under RLS. Without this, a parent account could never pass the
  // Parent Portal's role gate (Phase 11) despite being correctly linked.
  const admin = createAdminClient();
  const { data: parentRole } = await admin.from("roles").select("id").eq("name", "parent").single();
  if (parentRole) {
    await admin
      .from("role_user")
      .upsert(
        { user_id: parsed.data.parent_user_id, role_id: parentRole.id },
        { onConflict: "user_id,role_id", ignoreDuplicates: true },
      );
  }

  return apiSuccess(data, "تم ربط ولي الأمر بالطالب", 201);
}

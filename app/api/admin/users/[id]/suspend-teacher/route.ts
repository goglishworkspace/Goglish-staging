import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { suspendTeacherSchema } from "@/lib/validation/admin-user.schemas";
import { suspendTeacher, reactivateTeacher, TeacherNotFoundError } from "@/lib/services/admin-user-management.service";

const MANAGE_ROLES = ["admin", "super_admin"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = suspendTeacherSchema.safeParse(body ?? {});
  if (!parsed.success) return apiError("بيانات غير صالحة", null, 422);

  try {
    await suspendTeacher(user.id, id, parsed.data.reason ?? null);
  } catch (error) {
    if (error instanceof TeacherNotFoundError) return apiError(error.message, null, 404);
    throw error;
  }
  return apiSuccess(null, "تم إيقاف حساب المدرس");
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

  try {
    await reactivateTeacher(user.id, id);
  } catch (error) {
    if (error instanceof TeacherNotFoundError) return apiError(error.message, null, 404);
    throw error;
  }
  return apiSuccess(null, "تم تفعيل حساب المدرس");
}

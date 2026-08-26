import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { banUserSchema } from "@/lib/validation/admin-user.schemas";
import { banUser, unbanUser } from "@/lib/services/admin-user-management.service";

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
  const parsed = banUserSchema.safeParse(body ?? {});
  if (!parsed.success) return apiError("بيانات غير صالحة", null, 422);

  await banUser(user.id, id, parsed.data.reason ?? null);
  return apiSuccess(null, "تم حظر المستخدم");
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

  await unbanUser(user.id, id);
  return apiSuccess(null, "تم فك الحظر");
}

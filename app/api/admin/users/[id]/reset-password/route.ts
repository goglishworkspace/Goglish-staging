import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { resetUserPassword } from "@/lib/services/admin-user-management.service";

const MANAGE_ROLES = ["admin", "super_admin", "support"];

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

  await resetUserPassword(user.id, id, request.nextUrl.origin);
  return apiSuccess(null, "تم إرسال رابط إعادة تعيين الباسورد لإيميل المستخدم");
}

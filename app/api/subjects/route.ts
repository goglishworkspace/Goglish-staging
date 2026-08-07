import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createSubjectSchema } from "@/lib/validation/subject.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function GET(request: NextRequest) {
  const gradeId = request.nextUrl.searchParams.get("grade_id");
  const supabase = await createClient();

  let query = supabase.from("subjects").select("*").order("name");
  if (gradeId) query = query.eq("grade_id", gradeId);

  const { data, error } = await query;
  if (error) return apiError("تعذر جلب المواد", null, 500);
  return apiSuccess(data, "تم جلب المواد");
}

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
  const parsed = createSubjectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase.from("subjects").insert(parsed.data).select().single();
  if (error) return apiError("تعذر إنشاء المادة (تأكد إن الـ slug مش مكرر في نفس الصف)", null, 400);
  return apiSuccess(data, "تم إنشاء المادة", 201);
}

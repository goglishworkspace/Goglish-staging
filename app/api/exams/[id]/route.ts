import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateExamSchema } from "@/lib/validation/exam.schemas";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.from("exams").select("*").eq("id", id).maybeSingle();
  if (error) return apiError("تعذر جلب الامتحان", null, 500);
  if (!data) return apiError("الامتحان غير موجود", null, 404);
  return apiSuccess(data, "تم جلب الامتحان");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateExamSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("exams")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return apiError("تعذر تحديث الامتحان", null, 400);
  if (!data) return apiError("الامتحان غير موجود أو مش مسموح تعدّله", null, 403);
  return apiSuccess(data, "تم تحديث الامتحان");
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { error, count } = await supabase.from("exams").delete({ count: "exact" }).eq("id", id);
  if (error) return apiError("تعذر حذف الامتحان", null, 400);
  if (!count) return apiError("الامتحان غير موجود أو مش مسموح تحذفه", null, 403);
  return apiSuccess(null, "تم حذف الامتحان");
}

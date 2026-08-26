import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateQuizSchema } from "@/lib/validation/quiz.schemas";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).maybeSingle();
  if (error) return apiError("تعذر جلب الكويز", null, 500);
  if (!data) return apiError("الكويز غير موجود", null, 404);
  return apiSuccess(data, "تم جلب الكويز");
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
  const parsed = updateQuizSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("quizzes")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return apiError("تعذر تحديث الكويز", null, 400);
  if (!data) return apiError("الكويز غير موجود أو مش مسموح تعدّله", null, 403);
  return apiSuccess(data, "تم تحديث الكويز");
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { error, count } = await supabase.from("quizzes").delete({ count: "exact" }).eq("id", id);
  if (error) return apiError("تعذر حذف الكويز", null, 400);
  if (!count) return apiError("الكويز غير موجود أو مش مسموح تحذفه", null, 403);
  return apiSuccess(null, "تم حذف الكويز");
}

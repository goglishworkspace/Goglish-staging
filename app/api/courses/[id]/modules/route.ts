import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createModuleSchema } from "@/lib/validation/module.schemas";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", id)
    .order("order_index");

  if (error) return apiError("تعذر جلب الوحدات", null, 500);
  return apiSuccess(data, "تم جلب الوحدات");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createModuleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("modules")
    .insert({ ...parsed.data, course_id: id })
    .select()
    .single();

  if (error) return apiError("تعذر إنشاء الوحدة (لازم تكون من فريق تدريس الكورس أو أدمن)", null, 403);
  return apiSuccess(data, "تم إنشاء الوحدة", 201);
}

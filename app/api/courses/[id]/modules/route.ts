import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createModuleSchema } from "@/lib/validation/module.schemas";
import { canUserManageCourse } from "@/lib/services/course-permission.service";

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const authorized = await canUserManageCourse(user.id, courseId);
  if (!authorized) {
    return apiError("الكورس غير موجود أو ليس لديك صلاحية لتعديل ترتيب وحداته", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.module_ids) || body.module_ids.length === 0) {
    return apiError("قائمة معرفات الوحدات غير صالحة", null, 400);
  }

  const admin = createAdminClient();
  const moduleIds: string[] = body.module_ids;

  const updatePromises = moduleIds.map((moduleId, index) =>
    admin
      .from("modules")
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq("id", moduleId)
      .eq("course_id", courseId)
  );

  const results = await Promise.all(updatePromises);
  const hasError = results.some((r) => r.error);
  if (hasError) {
    return apiError("تعذر حفظ الترتيب الجديد للوحدات", null, 500);
  }

  const { data: updatedModules, error: fetchError } = await admin
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index");

  if (fetchError) {
    return apiError("تعذر جلب الوحدات بعد إعادة الترتيب", null, 500);
  }

  return apiSuccess(updatedModules, "تم تحديث ترتيب الوحدات بنجاح");
}

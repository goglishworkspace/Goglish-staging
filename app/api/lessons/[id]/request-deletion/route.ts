import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const admin = createAdminClient();
  const { data: lesson, error: lessonError } = await admin
    .from("lessons")
    .select("id, deletion_requested_at")
    .eq("id", id)
    .maybeSingle();
  if (lessonError) return apiError("تعذر جلب الدرس", null, 500);
  if (!lesson) return apiError("الدرس غير موجود", null, 404);

  const { data: canManage, error: rpcError } = await supabase.rpc("can_manage_lesson_content", {
    p_lesson_id: id,
  });
  if (rpcError) return apiError("تعذر التحقق من الصلاحية", null, 500);
  if (!canManage) return apiError("مش مسموح لك بالإجراء ده", null, 403);

  if (lesson.deletion_requested_at) return apiSuccess(lesson, "طلب الحذف مبعوت بالفعل ومنتظر مراجعة الأدمن");

  const { data, error } = await admin
    .from("lessons")
    .update({ deletion_requested_at: new Date().toISOString(), deletion_requested_by: user.id })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError("تعذر إرسال طلب الحذف", null, 500);
  return apiSuccess(data, "تم إرسال طلب الحذف، هيتراجع من الأدمن");
}

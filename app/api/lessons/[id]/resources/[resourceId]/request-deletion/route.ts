import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> },
) {
  const { id, resourceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const admin = createAdminClient();
  const { data: resource, error: resourceError } = await admin
    .from("lesson_resources")
    .select("id, lesson_id, deletion_requested_at")
    .eq("id", resourceId)
    .eq("lesson_id", id)
    .maybeSingle();
  if (resourceError) return apiError("تعذر جلب المورد", null, 500);
  if (!resource) return apiError("المورد غير موجود", null, 404);

  const { data: canManage, error: rpcError } = await supabase.rpc("can_manage_lesson_content", {
    p_lesson_id: resource.lesson_id,
  });
  if (rpcError) return apiError("تعذر التحقق من الصلاحية", null, 500);
  if (!canManage) return apiError("مش مسموح لك بالإجراء ده", null, 403);

  if (resource.deletion_requested_at) return apiSuccess(resource, "طلب الحذف مبعوت بالفعل ومنتظر مراجعة الأدمن");

  const { data, error } = await admin
    .from("lesson_resources")
    .update({ deletion_requested_at: new Date().toISOString(), deletion_requested_by: user.id })
    .eq("id", resourceId)
    .select()
    .single();
  if (error) return apiError("تعذر إرسال طلب الحذف", null, 500);
  return apiSuccess(data, "تم إرسال طلب الحذف، هيتراجع من الأدمن");
}

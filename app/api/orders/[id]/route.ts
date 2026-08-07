import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("orders")
    .select("*, payments(id, provider, status, attempt_number, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError("تعذر جلب الطلب", null, 500);
  if (!data) return apiError("الطلب غير موجود", null, 404);
  return apiSuccess(data, "تم جلب الطلب");
}

import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("certificates")
    .select("id, exam_id, certificate_number, issued_at, exams(title)")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  if (error) return apiError("تعذر جلب الشهادات", null, 500);
  return apiSuccess(data, "تم جلب الشهادات");
}

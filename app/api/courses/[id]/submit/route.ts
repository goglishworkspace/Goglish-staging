import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { submitForReview } from "@/lib/services/content-workflow.service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const data = await submitForReview(supabase, "courses", id).catch(() => null);
  if (!data) return apiError("تعذر إرسال الكورس للمراجعة (تأكد من الصلاحيات وأن الكورس غير محذوف)", null, 403);
  return apiSuccess(data, "تم إرسال الكورس للمراجعة");
}

import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("levels").select("*").order("min_xp");
  if (error) return apiError("تعذر جلب المستويات", null, 500);
  return apiSuccess(data, "تم جلب المستويات");
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return apiError("q مطلوب", null, 400);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("teacher_id, display_name, bio, photo_url, rating_avg, rating_count")
    .ilike("display_name", `%${q}%`)
    .limit(20);
  if (error) return apiError("تعذر البحث عن المدرسين", null, 500);
  return apiSuccess(data, "نتائج البحث");
}

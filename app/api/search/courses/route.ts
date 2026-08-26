import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return apiError("q مطلوب", null, 400);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, slug, cover_image_url, rating_avg, rating_count, price_cents, currency")
    .eq("status", "published")
    .is("deleted_at", null)
    .ilike("title", `%${q}%`)
    .limit(20);
  if (error) return apiError("تعذر البحث عن الكورسات", null, 500);
  return apiSuccess(data, "نتائج البحث");
}

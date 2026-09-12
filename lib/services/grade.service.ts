import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Grade } from "@/lib/api/queries/grades";

export async function getGradesList(supabase: SupabaseClient): Promise<Grade[]> {
  const { data, error } = await supabase.from("grades").select("*").order("order_index");
  if (error || !data) return [];
  return data;
}

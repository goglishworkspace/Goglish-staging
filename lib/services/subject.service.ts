import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subject } from "@/lib/api/queries/subjects";

export async function getSubjectsList(
  supabase: SupabaseClient,
  gradeId?: string | null,
): Promise<Subject[]> {
  let query = supabase.from("subjects").select("*").order("name");
  if (gradeId) query = query.eq("grade_id", gradeId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

export async function getSubjectById(
  supabase: SupabaseClient,
  id: string,
): Promise<Subject | null> {
  const { data, error } = await supabase.from("subjects").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data;
}


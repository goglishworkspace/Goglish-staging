import type { SupabaseClient } from "@supabase/supabase-js";

type WorkflowTable = "courses" | "lessons";
export type ReviewDecision = "published" | "rejected";

/**
 * Shared Draft → Published/Rejected workflow (Section 6) for courses and
 * lessons. Deliberately uses the caller's session-scoped client, not the
 * admin client - RLS's owner/admin policies are the real authorization here,
 * so a 0-row result means "not allowed" rather than needing a manual check.
 */
export async function submitForReview(
  supabase: SupabaseClient,
  table: WorkflowTable,
  id: string,
) {
  const { data, error } = await supabase
    .from(table)
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["draft", "rejected"])
    .select("id, status, submitted_at")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function reviewContent(
  supabase: SupabaseClient,
  table: WorkflowTable,
  id: string,
  reviewerId: string,
  decision: ReviewDecision,
  rejectionReason: string | null,
) {
  const { data, error } = await supabase
    .from(table)
    .update({
      status: decision,
      rejection_reason: decision === "rejected" ? rejectionReason : null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      submitted_at: null,
    })
    .eq("id", id)
    .select("id, status, rejection_reason")
    .maybeSingle();

  if (error) throw error;
  return data;
}

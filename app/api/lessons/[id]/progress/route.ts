import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateProgressSchema } from "@/lib/validation/progress.schemas";
import { recordDailyActivity } from "@/lib/services/streak.service";
import { runGamificationHooks } from "@/lib/services/gamification-hooks.service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("lesson_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return apiError("تعذر جلب التقدم", null, 500);
  return apiSuccess(data, "تم جلب التقدم");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateProgressSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    lesson_id: id,
    progress_seconds: parsed.data.progress_seconds,
    last_watched_at: new Date().toISOString(),
  };
  if (parsed.data.status) {
    payload.status = parsed.data.status;
    if (parsed.data.status === "completed") payload.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("lesson_progress")
    .upsert(payload, { onConflict: "user_id,lesson_id" })
    .select()
    .single();

  if (error) return apiError("تعذر تحديث التقدم", null, 400);

  // Watching a lesson counts as real study activity for the Daily Streak
  // (Section 10), and may itself cross a badge threshold (e.g.
  // "lessons_completed").
  await recordDailyActivity(user.id);
  await runGamificationHooks(user.id);

  return apiSuccess(data, "تم تحديث التقدم");
}

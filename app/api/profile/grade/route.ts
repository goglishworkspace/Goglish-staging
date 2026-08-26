import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateGradeSchema } from "@/lib/validation/profile.schemas";

/** Section 6 - a student can change grade any time; the "everything changes"
 * warning is shown client-side before this is ever called. `grade` is already
 * part of the column-restricted GRANT set up in Phase 3
 * (20260726100001_xp_and_profiles.sql) precisely for self-service writes like
 * this one - no new grant/migration needed. */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateGradeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ grade: parsed.data.grade })
    .eq("id", user.id)
    .select("grade")
    .single();

  if (error) return apiError("تعذر تغيير الصف الدراسي", null, 400);
  return apiSuccess(data, "تم تغيير الصف الدراسي");
}

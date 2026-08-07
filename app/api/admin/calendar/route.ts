import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { createCalendarEventSchema } from "@/lib/validation/calendar.schemas";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

// Deliberately public (see `academic_calendar_events`'s RLS: anon+authenticated
// SELECT) - the academic calendar is meant to be viewable without a session,
// matching seo_settings' equivalent public-read intent. Only POST is staff-only.
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_calendar_events")
    .select("*")
    .order("scheduled_at", { ascending: true });
  if (error) return apiError("تعذر جلب التقويم الدراسي", null, 500);
  return apiSuccess(data, "تم جلب التقويم الدراسي");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createCalendarEventSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("academic_calendar_events")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();
  if (error) return apiError("تعذر إنشاء الحدث", null, 400);
  return apiSuccess(data, "تم إنشاء الحدث", 201);
}

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateCourseSchema } from "@/lib/validation/course.schemas";
import { hasCourseAccess } from "@/lib/services/entitlement.service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return apiError("تعذر جلب الكورس", null, 500);
  if (!data) return apiError("الكورس غير موجود", null, 404);

  // has_access powers the Course Page's Enroll-vs-Continue CTA (Phase 9) -
  // false for anonymous visitors, never a whole new endpoint just for this.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const has_access = user ? await hasCourseAccess(supabase, user.id, id) : false;

  // Same two-step M:M lookup as GET /api/courses - course_teachers isn't a
  // sibling-FK PostgREST can embed directly off `courses`. A dedicated
  // GET /api/courses/[id]/teachers already existed for the admin roster UI,
  // but the course detail page never called it, so "مين بيقدم الكورس ده"
  // never showed up here - inlined instead of an extra client round-trip.
  const { data: teacherRows } = await supabase
    .from("course_teachers")
    .select("teachers(id, teacher_profiles(display_name))")
    .eq("course_id", id);
  const teachers = (teacherRows ?? [])
    .map((row) => row.teachers as unknown as { id: string; teacher_profiles: { display_name: string | null } | null } | null)
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({ id: t.id, display_name: t.teacher_profiles?.display_name ?? null }));

  return apiSuccess({ ...data, has_access, teachers }, "تم جلب الكورس");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateCourseSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  // trailer_youtube_id and price_cents are commercial/marketing attributes
  // meant to be updatable even after the course is published, unlike
  // title/description which RLS locks to draft/rejected rows for the owner -
  // so they go through dedicated RPCs instead of the plain RLS-gated update
  // below.
  const { trailer_youtube_id, price_cents, ...rest } = parsed.data;
  let data: Record<string, unknown> | null = null;

  if (trailer_youtube_id !== undefined) {
    const { data: trailerData, error: trailerError } = await supabase.rpc("update_course_trailer", {
      p_course_id: id,
      p_trailer_youtube_id: trailer_youtube_id,
    });
    if (trailerError) return apiError("تعذر تحديث الكورس", null, 403);
    data = trailerData;
  }

  if (price_cents !== undefined) {
    const { data: priceData, error: priceError } = await supabase.rpc("update_course_price", {
      p_course_id: id,
      p_price_cents: price_cents,
    });
    if (priceError) return apiError("تعذر تحديث سعر الكورس", null, 403);
    data = priceData;
  }

  if (Object.keys(rest).length > 0) {
    const { data: restData, error: restError } = await supabase
      .from("courses")
      .update(rest)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (restError) return apiError("تعذر تحديث الكورس", null, 400);
    if (!restData) return apiError("الكورس غير موجود أو مش مسموح تعدّله (لازم يكون Draft/Rejected)", null, 403);
    data = restData;
  }

  if (!data) return apiError("مفيش بيانات للتحديث", null, 400);
  return apiSuccess(data, "تم تحديث الكورس");
}

// Soft delete only (Section 23) - actual purge is a separate admin/ops concern.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("courses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return apiError("تعذر حذف الكورس", null, 400);
  if (!data) return apiError("الكورس غير موجود أو مش مسموح تحذفه", null, 403);
  return apiSuccess(null, "تم حذف الكورس");
}

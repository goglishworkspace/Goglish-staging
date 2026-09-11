import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { attachTeachers } from "@/lib/services/course-teachers.service";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const gradeSlug = request.nextUrl.searchParams.get("grade")?.trim();
  if (!q && !gradeSlug) return apiError("q مطلوب", null, 400);

  const supabase = await createClient();

  // Find matching grades or subjects if search term is provided
  const matchedSubjectIds: string[] = [];
  if (q) {
    const [{ data: subjects }, { data: grades }] = await Promise.all([
      supabase.from("subjects").select("id").ilike("name", `%${q}%`).limit(10),
      supabase.from("grades").select("id").ilike("name", `%${q}%`).limit(10),
    ]);
    const gradeIds = (grades ?? []).map((g) => g.id);
    if (gradeIds.length > 0) {
      const { data: gradeSubjects } = await supabase
        .from("subjects")
        .select("id")
        .in("grade_id", gradeIds)
        .limit(30);
      for (const s of gradeSubjects ?? []) {
        matchedSubjectIds.push(s.id);
      }
    }
    for (const s of subjects ?? []) {
      matchedSubjectIds.push(s.id);
    }
  }

  let query = supabase
    .from("courses")
    .select(
      "id, title, slug, description, cover_image_url, rating_avg, rating_count, price_cents, currency, subjects(id, name, grades(id, name, slug))",
    )
    .eq("status", "published")
    .is("deleted_at", null);

  if (gradeSlug && gradeSlug !== "all") {
    const { data: gradeRow } = await supabase.from("grades").select("id").eq("slug", gradeSlug).maybeSingle();
    if (gradeRow) {
      const { data: gSubjects } = await supabase.from("subjects").select("id").eq("grade_id", gradeRow.id);
      const sIds = (gSubjects ?? []).map((s) => s.id);
      if (sIds.length > 0) {
        query = query.in("subject_id", sIds);
      } else {
        return apiSuccess([], "نتائج البحث");
      }
    }
  }

  if (q && matchedSubjectIds.length > 0) {
    query = query.or(`title.ilike.%${q}%,subject_id.in.(${matchedSubjectIds.join(",")})`);
  } else if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data, error } = await query.limit(30);
  if (error) return apiError("تعذر البحث عن الكورسات", null, 500);

  const coursesWithTeachers = await attachTeachers(supabase, data ?? []);

  const results = coursesWithTeachers.map((c) => {
    const subject = Array.isArray(c.subjects) ? c.subjects[0] : c.subjects;
    const grades = subject?.grades;
    const grade = Array.isArray(grades) ? grades[0] : grades;
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description ?? null,
      cover_image_url: c.cover_image_url,
      rating_avg: c.rating_avg,
      rating_count: c.rating_count,
      price_cents: c.price_cents,
      currency: c.currency,
      grade_id: grade?.id ?? null,
      grade_name: grade?.name ?? null,
      grade_slug: grade?.slug ?? null,
      subject_name: subject?.name ?? null,
      teachers: c.teachers ?? [],
    };
  });

  return apiSuccess(results, "نتائج البحث");
}

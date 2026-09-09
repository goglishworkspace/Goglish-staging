import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getCourseProgressForStudent } from "@/lib/services/course-progress.service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const courses = await getCourseProgressForStudent(supabase, user.id);
  return apiSuccess(courses, "تم جلب الكورسات بنجاح");
}

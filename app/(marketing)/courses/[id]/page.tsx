import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCourseDetail,
  getCourseModulesWithLessons,
  getCourseExams,
  getCourseReviews,
} from "@/lib/services/course-detail.service";
import { CourseDetailView } from "./CourseDetailView";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  const [course, modules, exams, reviews] = await Promise.all([
    getCourseDetail(supabase, id, user?.id),
    getCourseModulesWithLessons(supabase, id),
    getCourseExams(supabase, id),
    getCourseReviews(supabase, id),
  ]);

  if (!course) {
    notFound();
  }

  queryClient.setQueryData(["course", id], course);
  queryClient.setQueryData(["course-modules", id], modules);
  queryClient.setQueryData(["course-exams", id], exams);
  queryClient.setQueryData(["reviews", "course", id], reviews);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CourseDetailView id={id} />
    </HydrationBoundary>
  );
}

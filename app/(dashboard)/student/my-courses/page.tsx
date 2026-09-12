import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseProgressForStudent } from "@/lib/services/course-progress.service";
import { MyCoursesView } from "./MyCoursesView";

export default async function MyCoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  const courses = await getCourseProgressForStudent(supabase, user.id);
  queryClient.setQueryData(["student", "my-courses"], courses);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyCoursesView />
    </HydrationBoundary>
  );
}

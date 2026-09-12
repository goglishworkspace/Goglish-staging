import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getGradesList } from "@/lib/services/grade.service";
import { getSubjectsList } from "@/lib/services/subject.service";
import { StudentSubjectsView } from "./StudentSubjectsView";

export default async function StudentSubjectsPage() {
  const supabase = await createClient();
  const queryClient = new QueryClient();

  const [grades, subjects] = await Promise.all([
    getGradesList(supabase),
    getSubjectsList(supabase),
  ]);

  queryClient.setQueryData(["grades"], grades);
  queryClient.setQueryData(["subjects", "all"], subjects);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StudentSubjectsView />
    </HydrationBoundary>
  );
}

import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getSubjectById } from "@/lib/services/subject.service";
import { getGradesList } from "@/lib/services/grade.service";
import { StudentSubjectView } from "./StudentSubjectView";

export default async function StudentSubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const queryClient = new QueryClient();

  const [subject, grades] = await Promise.all([
    getSubjectById(supabase, id),
    getGradesList(supabase),
  ]);

  if (subject) {
    queryClient.setQueryData(["subject", id], subject);
  }
  queryClient.setQueryData(["grades"], grades);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StudentSubjectView params={params} />
    </HydrationBoundary>
  );
}

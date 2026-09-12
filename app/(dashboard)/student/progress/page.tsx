import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStudentDashboard } from "@/lib/services/dashboard.service";
import { ProgressView } from "./ProgressView";

export default async function ProgressPage() {
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

  const dashboard = await getStudentDashboard(supabase, user.id);
  queryClient.setQueryData(["dashboard"], dashboard);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProgressView />
    </HydrationBoundary>
  );
}

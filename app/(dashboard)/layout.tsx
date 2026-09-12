import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { resolveOwnDashboardPath } from "@/lib/auth/require-role";
import { getOwnProfile } from "@/lib/services/profile.service";
import { getNotificationsForUser } from "@/lib/services/notification.service";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";

/** complete_registration() unconditionally grants every registrant the
 * "student" role regardless of later promotion, so a teacher/parent/staff
 * account also carries "student" in role_user - this area can't gate on
 * "lacks the student role", only on "has a higher-priority role". */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [userResult, ownDashboard] = await Promise.all([
    supabase.auth.getUser(),
    resolveOwnDashboardPath(supabase),
  ]);
  const user = userResult.data?.user;
  if (!user) redirect("/login");

  if (ownDashboard !== "/student/dashboard") redirect(ownDashboard);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  const [profile, notifications] = await Promise.all([
    getOwnProfile(supabase, user.id, user.email),
    getNotificationsForUser(supabase, user.id),
  ]);

  if (profile) {
    queryClient.setQueryData(["profile"], profile);
  }
  queryClient.setQueryData(["notifications"], notifications);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar />
          <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </HydrationBoundary>
  );
}

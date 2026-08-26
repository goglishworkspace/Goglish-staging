import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveOwnDashboardPath } from "@/lib/auth/require-role";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";

/** complete_registration() unconditionally grants every registrant the
 * "student" role regardless of later promotion, so a teacher/parent/staff
 * account also carries "student" in role_user - this area can't gate on
 * "lacks the student role", only on "has a higher-priority role". */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ownDashboard = await resolveOwnDashboardPath(supabase);
  if (ownDashboard !== "/student/dashboard") redirect(ownDashboard);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar />
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

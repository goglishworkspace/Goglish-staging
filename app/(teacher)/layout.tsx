import { requireRoleOrRedirect } from "@/lib/auth/require-role-or-redirect";
import { ShellSidebar } from "@/components/shell/ShellSidebar";
import { ShellTopbar } from "@/components/shell/ShellTopbar";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireRoleOrRedirect(["teacher"]);

  return (
    <div className="flex min-h-screen w-full">
      <ShellSidebar navKey="teacher" homeHref="/teacher/dashboard" title="لوحة المدرس" />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellTopbar navKey="teacher" title="لوحة المدرس" />
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

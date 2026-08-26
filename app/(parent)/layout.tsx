import { requireRoleOrRedirect } from "@/lib/auth/require-role-or-redirect";
import { ShellSidebar } from "@/components/shell/ShellSidebar";
import { ShellTopbar } from "@/components/shell/ShellTopbar";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  await requireRoleOrRedirect(["parent"]);

  return (
    <div className="flex min-h-screen w-full">
      <ShellSidebar navKey="parent" homeHref="/parent/dashboard" title="بوابة ولي الأمر" />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellTopbar navKey="parent" title="بوابة ولي الأمر" />
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

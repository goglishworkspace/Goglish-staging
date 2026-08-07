import { requireRoleOrRedirect } from "@/lib/auth/require-role-or-redirect";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { ShellSidebar } from "@/components/shell/ShellSidebar";
import { ShellTopbar } from "@/components/shell/ShellTopbar";

/** Section 15/16 Admin Dashboard - entry is gated to any staff role; each
 * page's own API calls further restrict by the specific role that section
 * needs (e.g. Accountant can reach /admin/payments but its API will 403 on
 * /admin/users management actions), matching Section 4's per-role matrix. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRoleOrRedirect(STAFF_ROLES);

  return (
    <div className="flex min-h-screen w-full">
      <ShellSidebar navKey="admin" homeHref="/admin/dashboard" title="لوحة الأدمن" />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellTopbar navKey="admin" title="لوحة الأدمن" />
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

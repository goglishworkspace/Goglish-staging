import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole, resolveOwnDashboardPath } from "./require-role";

/** Server-side role gate for the (admin)/(teacher)/(parent)/(dashboard)
 * route group layouts. Redirects to /login if unauthenticated. If
 * authenticated but lacking any of the required roles, redirects to the
 * user's own dashboard rather than a generic /403 - a logged-in user who
 * mistypes another role's URL should land somewhere useful, never see a
 * flash of the other role's content. */
export async function requireRoleOrRedirect(roles: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await userHasAnyRole(supabase, roles);
  if (!allowed) redirect(await resolveOwnDashboardPath(supabase));

  return { supabase, user };
}

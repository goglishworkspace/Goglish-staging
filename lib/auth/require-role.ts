import type { SupabaseClient } from "@supabase/supabase-js";
import { STAFF_ROLES } from "./roles";

/** Thin wrapper around the `user_has_any_role` SQL function (Phase 1 RLS migration). */
export async function userHasAnyRole(
  supabase: SupabaseClient,
  roles: string[],
): Promise<boolean> {
  const { data, error } = await supabase.rpc("user_has_any_role", { p_roles: roles });
  if (error) throw error;
  return !!data;
}

/** Resolves which of the 4 role areas a user belongs to, in priority order
 * (staff > teacher > parent > student). Priority order matters because
 * complete_registration() unconditionally grants every registrant the
 * "student" role regardless of later promotion - a teacher or admin account
 * also carries "student" in role_user, so gating on "does this user have the
 * student role" would misroute staff/teachers back into /student. */
export async function resolveOwnAreaKey(
  supabase: SupabaseClient,
): Promise<"admin" | "teacher" | "parent" | "student"> {
  const { data, error } = await supabase.rpc("current_user_roles");
  if (error) throw error;
  const roles: string[] = data ?? [];
  if (roles.some((r) => STAFF_ROLES.includes(r))) return "admin";
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("parent")) return "parent";
  return "student";
}

export async function resolveOwnDashboardPath(supabase: SupabaseClient): Promise<string> {
  return `/${await resolveOwnAreaKey(supabase)}/dashboard`;
}

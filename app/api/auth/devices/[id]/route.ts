import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Soft-deactivate rather than hard-delete (same as the admin "reset
 * devices" action) - a hard delete would leave no row for the middleware's
 * per-request check (lib/supabase/middleware.ts) to find, and "no row" is
 * deliberately treated as fail-open there (indistinguishable from a device
 * that was never registered), so the removed device would stay logged in
 * indefinitely. is_active=false is the actual "kicked" signal it looks for. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  // authenticated no longer has UPDATE on devices
  // (supabase/migrations/20260801100022_security_fix_devices_rls.sql) - the
  // ownership check (`.eq("user_id", user.id)`) still runs here, so this
  // stays scoped to the caller's own devices despite the elevated client.
  const admin = createAdminClient();
  const { error, count } = await admin
    .from("devices")
    .update({ is_active: false }, { count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return apiError("تعذر حذف الجهاز", null, 500);
  if (!count) return apiError("الجهاز غير موجود", null, 404);

  return apiSuccess(null, "تم حذف الجهاز");
}

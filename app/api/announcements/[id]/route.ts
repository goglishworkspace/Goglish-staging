import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const { error, count } = await supabase.from("announcements").delete({ count: "exact" }).eq("id", id);
  if (error) return apiError("تعذر حذف الإعلان", null, 400);
  if (!count) return apiError("الإعلان غير موجود", null, 404);

  // Fanned out to each recipient at creation time (createAnnouncementAndNotify)
  // as rows owned by *them*, not this admin - notifications has no DELETE RLS
  // policy for the session client, so this needs the admin client.
  const admin = createAdminClient();
  await admin.from("notifications").delete().eq("type", "announcement").contains("metadata", { announcement_id: id });

  return apiSuccess(null, "تم حذف الإعلان وإشعاراته");
}

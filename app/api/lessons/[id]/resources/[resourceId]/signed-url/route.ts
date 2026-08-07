import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; resourceId: string }> },
) {
  const { id, resourceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  // Session client so RLS confirms the caller can actually see this resource
  // before we hand out a signed download link.
  const { data: resource, error } = await supabase
    .from("lesson_resources")
    .select("id, storage_path")
    .eq("id", resourceId)
    .eq("lesson_id", id)
    .maybeSingle();

  if (error) return apiError("تعذر جلب المورد", null, 500);
  if (!resource) return apiError("المورد غير موجود", null, 404);

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from("lesson-resources")
    .createSignedUrl(resource.storage_path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed) return apiError("تعذر توليد رابط التحميل", null, 500);

  return apiSuccess(
    { url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS },
    "تم توليد رابط التحميل",
  );
}

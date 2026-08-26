import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  // Session client so RLS confirms this certificate belongs to the caller
  // before we hand out a signed download link.
  const { data: certificate, error } = await supabase
    .from("certificates")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError("تعذر جلب الشهادة", null, 500);
  if (!certificate) return apiError("الشهادة غير موجودة", null, 404);

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from("certificates")
    .createSignedUrl(certificate.storage_path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed) return apiError("تعذر توليد رابط التحميل", null, 500);

  return apiSuccess(
    { url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS },
    "تم توليد رابط التحميل",
  );
}
